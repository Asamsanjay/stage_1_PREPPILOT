import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  CameraOff, 
  Mic, 
  MicOff, 
  PhoneOff, 
  Clock, 
  AlertCircle,
  Video,
  Send,
  Maximize2,
  Minimize2,
  HardDrive
} from 'lucide-react';

import { useMediaStream } from '../../hooks/useMediaStream';
import { beginnerTopics } from '../../data/speakingTopics';
import { saveLocalRecording } from '../../utils/indexedDBStorage';
import { saveSpeakingSessionMetadata } from '../../utils/speakingService';

export default function SpeakingChallengeSession({ 
  topic, 
  difficulty, 
  duration, 
  prepType, 
  mediaStream: propMediaStream,
  user,
  onComplete, 
  onCancel 
}) {
  const {
    stream: contextStream,
    streamRef,
    requestMedia,
    toggleCamera: toggleContextCamera,
    toggleMicrophone: toggleContextMic,
    stopMedia,
    attachVideo,
    cameraEnabled,
    microphoneEnabled
  } = useMediaStream();

  const activeStream = propMediaStream || contextStream;

  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  // Default fallback topic from actual topic dataset
  const fallbackTopic = beginnerTopics[0] || "Describe a skill you want to learn and why.";
  const displayTopic = topic && topic.trim() ? `"${topic.trim()}"` : `"${fallbackTopic}"`;

  // Synchronize track states from real MediaStream
  const getInitialCameraState = () => {
    const s = activeStream || streamRef?.current;
    if (s) {
      const vTrack = s.getVideoTracks()[0];
      if (vTrack) return vTrack.enabled;
    }
    return cameraEnabled !== undefined ? cameraEnabled : true;
  };

  const getInitialMicState = () => {
    const s = activeStream || streamRef?.current;
    if (s) {
      const aTrack = s.getAudioTracks()[0];
      if (aTrack) return aTrack.enabled;
    }
    return microphoneEnabled !== undefined ? microphoneEnabled : true;
  };

  const [isCameraOn, setIsCameraOn] = useState(getInitialCameraState);
  const [isMicOn, setIsMicOn] = useState(getInitialMicState);
  const [cameraError, setCameraError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSavingRecording, setIsSavingRecording] = useState(false);

  // Real-time voice activity detection state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  // Duration in seconds (e.g. 5, 30, 60, 120, 300)
  const totalSeconds = duration?.seconds || 60;
  const [timeLeft, setTimeLeft] = useState(totalSeconds);
  const [showEndModal, setShowEndModal] = useState(false);

  // Initialize camera and microphone stream
  useEffect(() => {
    let currentStream = activeStream || streamRef?.current;

    async function initMedia() {
      if (
        !currentStream ||
        !currentStream.active ||
        !currentStream.getVideoTracks().some((t) => t.readyState === 'live')
      ) {
        console.log('[SpeakingChallengeSession] Requesting media stream...');
        currentStream = await requestMedia();
      }

      if (currentStream) {
        const vTrack = currentStream.getVideoTracks()[0];
        const aTrack = currentStream.getAudioTracks()[0];
        if (vTrack) setIsCameraOn(vTrack.enabled);
        if (aTrack) setIsMicOn(aTrack.enabled);

        if (videoRef.current) {
          attachVideo(videoRef, currentStream);
        }
      } else {
        setCameraError('Camera access is unavailable. Please check permissions.');
      }
    }

    initMedia();
  }, [activeStream, requestMedia, attachVideo, streamRef]);

  // Helper to find supported MediaRecorder MIME type
  const getSupportedMimeType = () => {
    if (typeof MediaRecorder === 'undefined') return '';
    const candidates = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=h264,opus',
      'video/webm',
      'video/mp4;codecs=avc1,mp4a.40.2',
      'video/mp4'
    ];
    for (const t of candidates) {
      if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) {
        return t;
      }
    }
    return '';
  };

  // Start MediaRecorder once stream is active
  useEffect(() => {
    const s = activeStream || streamRef?.current;
    if (!s || !s.active || isSavingRecording) return;

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      return;
    }

    try {
      const mimeType = getSupportedMimeType();
      const options = mimeType ? { mimeType } : undefined;
      const recorder = new MediaRecorder(s, options);

      recordedChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = (e) => {
        console.error('[SpeakingChallengeSession] MediaRecorder error:', e);
      };

      // 1000ms timeslice to flush chunks periodically
      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      console.log('[SpeakingChallengeSession] MediaRecorder started with format:', recorder.mimeType);
    } catch (err) {
      console.error('[SpeakingChallengeSession] Error starting MediaRecorder:', err);
    }

    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {}
      }
    };
  }, [activeStream, streamRef, isSavingRecording]);

  // Web Audio API Real-Time Microphone Activity Detection
  useEffect(() => {
    const s = activeStream || streamRef?.current;
    const audioTrack = s?.getAudioTracks()[0];

    // If mic is turned OFF or no audio track exists/enabled, reset state & return
    if (!isMicOn || !audioTrack || !audioTrack.enabled || audioTrack.readyState !== 'live') {
      setIsSpeaking(false);
      setAudioLevel(0);
      return;
    }

    let isSubscribed = true;
    let audioCtx = null;
    let sourceNode = null;
    let analyserNode = null;
    let animFrameId = null;
    let silenceFramesCount = 0;

    const cleanupAudio = () => {
      if (animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      }
      if (sourceNode) {
        try { sourceNode.disconnect(); } catch (e) {}
        sourceNode = null;
      }
      if (analyserNode) {
        try { analyserNode.disconnect(); } catch (e) {}
        analyserNode = null;
      }
      if (audioCtx && audioCtx.state !== 'closed') {
        try { audioCtx.close(); } catch (e) {}
        audioCtx = null;
      }
      if (isSubscribed) {
        setIsSpeaking(false);
        setAudioLevel(0);
      }
    };

    async function initAudioAnalysis() {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;

        audioCtx = new AudioCtx();
        if (audioCtx.state === 'suspended') {
          await audioCtx.resume().catch(() => {});
        }

        sourceNode = audioCtx.createMediaStreamSource(s);
        analyserNode = audioCtx.createAnalyser();
        analyserNode.fftSize = 512;
        analyserNode.smoothingTimeConstant = 0.4;

        sourceNode.connect(analyserNode);

        const bufferLength = analyserNode.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        // Configurable speaking volume threshold (RMS calculation)
        const SPEAKING_THRESHOLD = 0.018;

        const processAudioFrame = () => {
          if (!isSubscribed) return;

          analyserNode.getByteTimeDomainData(dataArray);

          let sumSquares = 0;
          for (let i = 0; i < dataArray.length; i++) {
            const norm = (dataArray[i] - 128) / 128;
            sumSquares += norm * norm;
          }
          const rms = Math.sqrt(sumSquares / dataArray.length);

          // Update normalized 0..1 audio level for visual waveform meter
          const currentLevel = Math.min(1, rms * 6);
          setAudioLevel(currentLevel);

          if (rms >= SPEAKING_THRESHOLD) {
            silenceFramesCount = 0;
            setIsSpeaking(true);
          } else {
            silenceFramesCount++;
            // Require ~18 consecutive quiet frames (~300ms at 60fps) before ending speaking state
            if (silenceFramesCount > 18) {
              setIsSpeaking(false);
            }
          }

          animFrameId = requestAnimationFrame(processAudioFrame);
        };

        processAudioFrame();
      } catch (err) {
        console.warn('[SpeakingChallengeSession] Web Audio API init error:', err);
      }
    }

    initAudioAnalysis();

    return () => {
      isSubscribed = false;
      cleanupAudio();
    };
  }, [isMicOn, activeStream, streamRef]);

  // Handle browser Fullscreen API events
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Timer countdown logic
  useEffect(() => {
    if (showEndModal || isSavingRecording) return;

    if (timeLeft <= 0) {
      handleSessionEnd(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, showEndModal, isSavingRecording]);

  // Toggle Camera
  const toggleCamera = () => {
    const s = activeStream || streamRef?.current;
    if (s) {
      const videoTracks = s.getVideoTracks();
      if (videoTracks.length > 0) {
        const nextState = !videoTracks[0].enabled;
        videoTracks.forEach((t) => {
          t.enabled = nextState;
        });
        setIsCameraOn(nextState);
        return;
      }
    }
    toggleContextCamera();
    setIsCameraOn(prev => !prev);
  };

  // Toggle Microphone
  const toggleMic = () => {
    const s = activeStream || streamRef?.current;
    if (s) {
      const audioTracks = s.getAudioTracks();
      if (audioTracks.length > 0) {
        const nextState = !audioTracks[0].enabled;
        audioTracks.forEach((t) => {
          t.enabled = nextState;
        });
        setIsMicOn(nextState);
        if (!nextState) {
          setIsSpeaking(false);
          setAudioLevel(0);
        }
        return;
      }
    }
    toggleContextMic();
    setIsMicOn(prev => !prev);
  };

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch((err) => {
          console.warn('Fullscreen request failed:', err);
        });
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch((err) => {
          console.warn('Fullscreen exit failed:', err);
        });
      }
    }
  };

  // Handle Session End (Auto countdown or Manual User Click)
  const handleSessionEnd = async (completed = true) => {
    if (isSavingRecording) return;
    setIsSavingRecording(true);
    setShowEndModal(false);

    // 1. Immediately disconnect audio levels
    setIsSpeaking(false);
    setAudioLevel(0);

    // 2. Detach video feed
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    const durationSpentSeconds = totalSeconds - timeLeft;
    const finalSpentSeconds = durationSpentSeconds > 0 ? durationSpentSeconds : 1;

    // 3. Stop MediaRecorder and collect all final recording chunks
    let finalBlob = null;
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      finalBlob = await new Promise((resolve) => {
        recorder.onstop = () => {
          const mime = recorder.mimeType || 'video/webm';
          const blob = new Blob(recordedChunksRef.current, { type: mime });
          resolve(blob);
        };

        try {
          if (recorder.state === 'recording') {
            recorder.requestData();
          }
        } catch (e) {
          console.warn('MediaRecorder requestData error:', e);
        }

        try {
          recorder.stop();
        } catch (e) {
          const mime = recorder.mimeType || 'video/webm';
          resolve(new Blob(recordedChunksRef.current, { type: mime }));
        }
      });
    } else if (recordedChunksRef.current.length > 0) {
      finalBlob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
    }

    // 4. Stop camera and microphone hardware tracks (Requirement 12)
    stopMedia();

    // 5. Generate unique local_recording_id
    const localRecordingId = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // 6. Save completed video Blob in browser's IndexedDB (instant local access)
    if (finalBlob && finalBlob.size > 0) {
      try {
        await saveLocalRecording({
          id: localRecordingId,
          blob: finalBlob,
          mimeType: finalBlob.type || 'video/webm',
          duration: finalSpentSeconds,
          topic: topic || fallbackTopic,
          difficulty: difficulty || 'Beginner',
          createdAt: new Date().toISOString()
        });
        console.log('[SpeakingChallengeSession] Video saved to IndexedDB. Size:', finalBlob.size);
      } catch (dbErr) {
        console.error('[SpeakingChallengeSession] IndexedDB save error:', dbErr);
      }
    }

    // 7. Privacy Protection: Video recordings remain strictly on the user's device in IndexedDB.
    // Video recordings are NOT uploaded to Supabase Storage.
    const recordingPath = null;

    // 8. Save session metadata to Supabase (including recording_path)
    let savedMetadata = null;
    try {
      savedMetadata = await saveSpeakingSessionMetadata(user?.id, {
        topic: topic || fallbackTopic,
        difficulty: difficulty || 'Beginner',
        durationSeconds: totalSeconds,
        durationLabel: duration?.label || `${totalSeconds} seconds`,
        spentSeconds: finalSpentSeconds,
        prepType: prepType || 'now',
        completedAt: new Date().toISOString()
      }, localRecordingId, recordingPath);
    } catch (metaErr) {
      console.error('[SpeakingChallengeSession] Supabase metadata save error:', metaErr);
    }

    // 9. Navigate to /speaking-challenge/result only after recording finalization and saves
    setIsSavingRecording(false);
    onComplete({
      ...(savedMetadata || {}),
      topic: topic || fallbackTopic,
      difficulty: difficulty || 'Beginner',
      durationLabel: duration?.label || `${totalSeconds} seconds`,
      durationSeconds: totalSeconds,
      spentSeconds: finalSpentSeconds,
      prepType: prepType || 'now',
      completedAt: savedMetadata?.completed_at || new Date().toISOString(),
      localRecordingId,
      local_recording_id: localRecordingId,
      recording_path: recordingPath,
      recordingPath,
      videoBlob: finalBlob // Pass in-memory Blob for immediate playback
    });
  };

  // Format MM:SS
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="speaking-session-container">
      {/* Dedicated Session Header Bar */}
      <div className="speaking-session-header">
        <div className="session-brand">
          <div className="session-logo-box">
            <Send size={18} />
          </div>
          <span className="session-brand-name">PrepPilot</span>
        </div>

        <div className="session-topic-banner">
          <span className="topic-banner-label">TOPIC</span>
          <h1 className="topic-banner-title">
            {displayTopic}
          </h1>
        </div>

        <div className="session-timer-box">
          <Clock size={16} />
          <span className="session-timer-text">{formatTime(timeLeft)}</span>
        </div>
      </div>

      {/* Main Video Viewport Area */}
      <div className="speaking-session-body">
        <div className="video-viewport-card">
          {/* Top Status Indicators */}
          <div className="video-overlay-badges">
            <div className={`status-pill ${isCameraOn ? 'active' : 'inactive'}`}>
              <span className="status-dot"></span>
              <span>{isCameraOn ? 'Camera On' : 'Camera Off'}</span>
            </div>
            <div className={`status-pill ${!isMicOn ? 'muted' : isSpeaking ? 'speaking' : 'active'}`}>
              <span className="status-dot"></span>
              <span>{!isMicOn ? 'Muted' : isSpeaking ? '● Speaking' : 'Mic On'}</span>
            </div>
            <div className="status-pill recording-active-pill">
              <span className="status-dot red-pulse"></span>
              <span>REC</span>
            </div>
          </div>

          {/* Camera Error or Off Overlay */}
          {cameraError ? (
            <div className="camera-fallback-msg">
              <AlertCircle size={44} color="#ef4444" />
              <p style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc', margin: '12px 0 4px 0' }}>
                Camera Access Issue
              </p>
              <p style={{ fontSize: '13px', color: '#94a3b8' }}>{cameraError}</p>
            </div>
          ) : !isCameraOn ? (
            <div className="camera-off-overlay">
              <div className="avatar-placeholder">
                <CameraOff size={44} color="#94a3b8" />
              </div>
              <p style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', margin: '12px 0 4px 0' }}>
                Camera Off
              </p>
              <p style={{ fontSize: '13px', color: '#64748b' }}>Your camera stream is currently paused</p>
            </div>
          ) : null}

          {/* User Video Feed */}
          <video
            ref={(node) => {
              videoRef.current = node;
              if (node && (activeStream || streamRef?.current)) {
                attachVideo(node, activeStream || streamRef?.current);
              }
            }}
            autoPlay
            playsInline
            muted
            className={`user-video-stream ${!isCameraOn || cameraError ? 'hidden' : ''}`}
          />

          {/* Saving / Finalizing Recording Overlay */}
          {isSavingRecording && (
            <div className="session-saving-overlay">
              <div className="recording-spinner"></div>
              <h3 style={{ color: '#ffffff', fontSize: '18px', fontWeight: 800, marginTop: '16px' }}>
                Finalizing Recording...
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '13.5px', marginTop: '6px' }}>
                Saving your recording to Supabase and preparing your results.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Full Bottom Control Bar */}
      <div className="speaking-session-controls">
        <div className="controls-center-group">
          <button 
            className={`btn-control-pill ${!isMicOn ? 'off' : isSpeaking ? 'speaking' : 'active'}`}
            onClick={toggleMic}
            disabled={isSavingRecording}
            title={!isMicOn ? 'Unmute Microphone' : isSpeaking ? 'Microphone (Speaking)' : 'Turn Off Microphone'}
            aria-label={!isMicOn ? 'Microphone Muted' : isSpeaking ? 'Microphone (Speaking)' : 'Microphone On'}
          >
            {!isMicOn ? (
              <MicOff size={19} />
            ) : (
              <Mic size={19} className={isSpeaking ? 'mic-speaking-icon' : ''} />
            )}
            <span className="btn-control-label">
              {!isMicOn ? 'Muted' : isSpeaking ? 'Speaking' : 'Microphone'}
            </span>

            {/* Real-time reactive audio meter bars */}
            {isMicOn && (
              <div className="mini-audio-meter">
                <span className="bar" style={{ height: isSpeaking ? `${Math.max(4, Math.min(16, audioLevel * 18))}px` : '4px' }}></span>
                <span className="bar" style={{ height: isSpeaking ? `${Math.max(4, Math.min(16, audioLevel * 24))}px` : '4px' }}></span>
                <span className="bar" style={{ height: isSpeaking ? `${Math.max(4, Math.min(16, audioLevel * 20))}px` : '4px' }}></span>
                <span className="bar" style={{ height: isSpeaking ? `${Math.max(4, Math.min(16, audioLevel * 14))}px` : '4px' }}></span>
              </div>
            )}
          </button>

          <button 
            className={`btn-control-pill ${isCameraOn ? 'active' : 'off'}`}
            onClick={toggleCamera}
            disabled={isSavingRecording}
            title={isCameraOn ? 'Turn Camera Off' : 'Turn Camera On'}
            aria-label="Toggle Camera"
          >
            {isCameraOn ? <Video size={19} /> : <CameraOff size={19} />}
            <span className="btn-control-label">{isCameraOn ? 'Camera' : 'Cam Off'}</span>
          </button>

          <button 
            className={`btn-control-pill ${isFullscreen ? 'active' : ''}`}
            onClick={toggleFullscreen}
            disabled={isSavingRecording}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 size={19} /> : <Maximize2 size={19} />}
            <span className="btn-control-label">{isFullscreen ? 'Exit Full' : 'Fullscreen'}</span>
          </button>

          <button 
            className="btn-control-end"
            onClick={() => setShowEndModal(true)}
            disabled={isSavingRecording}
            title="End Speaking Challenge"
            aria-label="End Challenge"
          >
            <PhoneOff size={18} />
            <span>End Challenge</span>
          </button>
        </div>
      </div>

      {/* End Challenge Confirmation Modal */}
      {showEndModal && !isSavingRecording && (
        <div className="modal-overlay" onClick={() => setShowEndModal(false)}>
          <div className="modal-card modal-confirm" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <AlertCircle size={24} color="#ef4444" />
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                End Speaking Challenge?
              </h3>
            </div>
            <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.5, marginBottom: '24px' }}>
              Are you sure you want to end this challenge? Your speaking video will be saved to your browser's local storage and you'll navigate to your challenge results.
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setShowEndModal(false)}>
                Continue Speaking
              </button>
              <button className="btn-danger" onClick={() => handleSessionEnd(false)}>
                End Challenge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
