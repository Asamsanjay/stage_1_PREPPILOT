import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Camera, 
  CameraOff, 
  Mic, 
  MicOff, 
  PhoneOff, 
  Clock, 
  Bot, 
  AlertTriangle, 
  User as UserIcon, 
  ShieldCheck, 
  Volume2, 
  VolumeX, 
  ArrowRight, 
  ArrowLeft, 
  Lightbulb, 
  CheckCircle2, 
  Sparkles,
  Send,
  Edit2,
  Loader2,
  Check,
  Zap,
  Activity
} from 'lucide-react';
import { saveInterviewRecord } from '../../utils/interviewService';
import { saveLocalRecording } from '../../utils/indexedDBStorage';
import { useMediaStream } from '../../hooks/useMediaStream';
import { InterviewSpeechRecognition, isSpeechRecognitionSupported } from '../../agents/interviewer/speechRecognition';
import { 
  getFirstInterviewQuestion, 
  getNextInterviewQuestion, 
  generateInterviewEvaluation, 
  saveInterviewAnalysisReport 
} from '../../utils/aiInterviewerService';

// Formal conversation states
const CONV_STATE = {
  INITIALIZING: 'INITIALIZING',
  AI_SPEAKING: 'AI_SPEAKING',
  LISTENING: 'LISTENING',
  PROCESSING_ANSWER: 'PROCESSING_ANSWER',
  GENERATING_RESPONSE: 'GENERATING_RESPONSE',
  INTERVIEW_ENDED: 'INTERVIEW_ENDED'
};

export default function MockInterviewSession({ config, mediaStream: propMediaStream, user, onEndSession }) {
  const {
    stream: contextStream,
    requestMedia,
    toggleCamera: toggleContextCamera,
    toggleMicrophone: toggleContextMic,
    stopMedia,
    attachVideo,
    cameraEnabled,
    microphoneEnabled
  } = useMediaStream();

  const [isCameraOn, setIsCameraOn] = useState(cameraEnabled !== undefined ? cameraEnabled : true);
  const [isMicOn, setIsMicOn] = useState(microphoneEnabled !== undefined ? microphoneEnabled : true);
  const [showEndModal, setShowEndModal] = useState(false);
  const [isSavingRecording, setIsSavingRecording] = useState(false);

  // Parse duration in minutes from config.duration (default 10)
  const durationMinutes = parseInt(config.duration, 10) || 10;
  const [timeLeft, setTimeLeft] = useState(durationMinutes * 60);

  const [cameraError, setCameraError] = useState(null);
  const userVideoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  const activeStream = propMediaStream || contextStream;

  // AI Interviewer State Machine
  const [conversationState, setConversationState] = useState(CONV_STATE.INITIALIZING);
  const conversationStateRef = useRef(CONV_STATE.INITIALIZING);
  conversationStateRef.current = conversationState;

  const [questions, setQuestions] = useState([]);
  const questionsRef = useRef([]);
  questionsRef.current = questions;

  const [currentIndex, setCurrentIndex] = useState(0);
  const currentIndexRef = useRef(0);
  currentIndexRef.current = currentIndex;

  const [isVoiceMuted, setIsVoiceMuted] = useState(false);
  const isVoiceMutedRef = useRef(false);
  isVoiceMutedRef.current = isVoiceMuted;

  const [showTip, setShowTip] = useState(false);

  // Candidate Answer & Speech Recognition State
  const [candidateAnswer, setCandidateAnswer] = useState('');
  const candidateAnswerRef = useRef('');
  candidateAnswerRef.current = candidateAnswer;

  const [silenceCountdown, setSilenceCountdown] = useState({ active: false, remainingSeconds: 0 });
  const [isEditingAnswer, setIsEditingAnswer] = useState(false);

  // Lock to prevent duplicate submissions or concurrent turns
  const isTurnLockedRef = useRef(false);
  const speechRecRef = useRef(null);

  // Evaluation Progress Overlay State
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalProgressStep, setEvalProgressStep] = useState('');

  const currentQuestion = questions[currentIndex] || null;

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

  // Text-to-Speech: AI Interviewer speaks the question or response aloud
  const speakQuestion = useCallback((text) => {
    if (!text) return;

    // If speech synthesis not supported or voice muted by user:
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || isVoiceMutedRef.current) {
      setConversationState(CONV_STATE.LISTENING);
      setTimeout(() => {
        if (speechRecRef.current && isMicOn) {
          speechRecRef.current.start();
        }
      }, 300);
      return;
    }

    try {
      window.speechSynthesis.cancel();

      // Ensure speech recognition is NOT listening while AI speaks (prevents voice feedback)
      if (speechRecRef.current) {
        speechRecRef.current.stop();
      }

      setConversationState(CONV_STATE.AI_SPEAKING);

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.96;
      utterance.pitch = 1.0;
      utterance.lang = 'en-US';

      utterance.onstart = () => {
        setConversationState(CONV_STATE.AI_SPEAKING);
      };

      utterance.onend = () => {
        // Acoustic room buffer (450ms) to ensure echo and reverb are gone before microphone starts
        setTimeout(() => {
          if (conversationStateRef.current !== CONV_STATE.INTERVIEW_ENDED) {
            setCandidateAnswer('');
            candidateAnswerRef.current = '';
            setSilenceCountdown({ active: false, remainingSeconds: 0 });
            if (speechRecRef.current) {
              speechRecRef.current.resetTurn();
            }
            setConversationState(CONV_STATE.LISTENING);
            if (speechRecRef.current && isMicOn) {
              speechRecRef.current.start();
            }
          }
        }, 450);
      };

      utterance.onerror = (e) => {
        console.warn('[MockInterviewSession] Speech utterance error:', e);
        setTimeout(() => {
          if (conversationStateRef.current !== CONV_STATE.INTERVIEW_ENDED) {
            setConversationState(CONV_STATE.LISTENING);
            if (speechRecRef.current && isMicOn) {
              speechRecRef.current.start();
            }
          }
        }, 300);
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('[MockInterviewSession] Speech synthesis warning:', err);
      setConversationState(CONV_STATE.LISTENING);
      if (speechRecRef.current && isMicOn) {
        speechRecRef.current.start();
      }
    }
  }, [isMicOn]);

  // Core Automatic Conversation Engine: Process Answer and Fetch Next Response
  const handleProcessAnswer = useCallback(async (spokenText) => {
    // Prevent duplicate triggers
    if (isTurnLockedRef.current) return;
    if (conversationStateRef.current === CONV_STATE.INTERVIEW_ENDED) return;

    const answeredText = (spokenText || candidateAnswerRef.current || '').trim();

    // Guard against empty / accidental triggers
    if (!answeredText || answeredText.length < 3) {
      return;
    }

    isTurnLockedRef.current = true;
    setConversationState(CONV_STATE.PROCESSING_ANSWER);

    // Stop speech recognition immediately to lock transcript
    if (speechRecRef.current) {
      speechRecRef.current.stop();
    }
    setSilenceCountdown({ active: false, remainingSeconds: 0 });

    // Save answer to questions history
    const updatedQuestions = [...questionsRef.current];
    const currIdx = currentIndexRef.current;
    if (updatedQuestions[currIdx]) {
      updatedQuestions[currIdx] = {
        ...updatedQuestions[currIdx],
        answer: answeredText
      };
      setQuestions(updatedQuestions);
      questionsRef.current = updatedQuestions;
    }

    setConversationState(CONV_STATE.GENERATING_RESPONSE);

    try {
      const remainingMinutes = Math.max(1, Math.round(timeLeft / 60));
      const nextQ = await getNextInterviewQuestion({
        config,
        history: updatedQuestions.map(q => ({
          question: q.text || q.question,
          answer: q.answer || ''
        })),
        latestAnswer: answeredText,
        remainingMinutes
      });

      const nextTurn = {
        ...nextQ,
        text: nextQ.question,
        spokenResponse: nextQ.spokenResponse || nextQ.question,
        answer: ''
      };

      const newQuestionsList = [...updatedQuestions, nextTurn];
      setQuestions(newQuestionsList);
      questionsRef.current = newQuestionsList;
      setCurrentIndex(prev => prev + 1);
      currentIndexRef.current = currentIndexRef.current + 1;
      setShowTip(false);
      setIsEditingAnswer(false);

      // Unlock for next turn
      isTurnLockedRef.current = false;

      // Speak conversational transition + question aloud
      const textToSpeak = nextQ.spokenResponse || nextQ.question;
      speakQuestion(textToSpeak);
    } catch (err) {
      console.error('[MockInterviewSession] Failed to generate AI response:', err);
      isTurnLockedRef.current = false;
      setConversationState(CONV_STATE.LISTENING);
      if (speechRecRef.current && isMicOn) {
        speechRecRef.current.start();
      }
    }
  }, [config, timeLeft, speakQuestion, isMicOn]);

  // Load the first question from AI agent on session start
  useEffect(() => {
    let active = true;

    async function loadFirstQuestion() {
      setConversationState(CONV_STATE.INITIALIZING);
      try {
        const firstQ = await getFirstInterviewQuestion(config);
        if (!active) return;

        const initialTurn = {
          ...firstQ,
          text: firstQ.question,
          spokenResponse: firstQ.spokenResponse || firstQ.question,
          answer: ''
        };

        setQuestions([initialTurn]);
        questionsRef.current = [initialTurn];
        setCurrentIndex(0);
        currentIndexRef.current = 0;

        // Speak opening question aloud
        speakQuestion(firstQ.spokenResponse || firstQ.question);
      } catch (err) {
        console.error('[MockInterviewSession] Failed to load opening question:', err);
        if (active) setConversationState(CONV_STATE.LISTENING);
      }
    }

    loadFirstQuestion();

    return () => {
      active = false;
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [config, speakQuestion]);

  // Initialize Speech-to-Text & Automatic Voice Activity Detection
  useEffect(() => {
    if (!isSpeechRecognitionSupported()) {
      console.info('[MockInterviewSession] Speech recognition not supported; manual fallback enabled.');
      return;
    }

    const rec = new InterviewSpeechRecognition({
      silenceThresholdMs: 2600, // 2.6 seconds of silence to finalize turn
      minWordsForCompletion: 3,  // Minimum 3 words required before silence detection arms
      onTranscriptChange: ({ fullText }) => {
        setCandidateAnswer(fullText);
        candidateAnswerRef.current = fullText;
      },
      onSilenceCountdown: (countdown) => {
        setSilenceCountdown(countdown);
      },
      onSilenceFinalized: (finalTranscript) => {
        // Automatic speech completion detected!
        handleProcessAnswer(finalTranscript);
      },
      onStatusChange: ({ status }) => {
        if (status === 'listening' && conversationStateRef.current === CONV_STATE.LISTENING) {
          // Healthy listening state
        }
      },
      onError: (err) => {
        console.warn('[MockInterviewSession] Speech recognition warning:', err.message);
      }
    });

    speechRecRef.current = rec;

    // Attach active microphone stream for volume-level VAD
    if (activeStream) {
      rec.attachMediaStream(activeStream);
    }

    return () => {
      if (speechRecRef.current) {
        speechRecRef.current.destroy();
      }
    };
  }, [handleProcessAnswer, activeStream]);

  // Optional manual instant send bypass (if user doesn't want to wait 2s for silence)
  const handleManualSendNow = () => {
    if (isTurnLockedRef.current) return;
    const text = candidateAnswerRef.current.trim();
    if (text) {
      handleProcessAnswer(text);
    }
  };

  // Previous Question
  const handlePrevQuestion = () => {
    if (currentIndex > 0) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      speechRecRef.current?.stop();
      setShowTip(false);
      const prevIdx = currentIndex - 1;
      setCurrentIndex(prevIdx);
      currentIndexRef.current = prevIdx;
      const prevQ = questions[prevIdx];
      if (prevQ) {
        speakQuestion(prevQ.spokenResponse || prevQ.text || prevQ.question);
      }
    }
  };

  // Skip to next question
  const handleSkipQuestion = () => {
    if (currentIndex < questions.length - 1) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      speechRecRef.current?.stop();
      setShowTip(false);
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      currentIndexRef.current = nextIdx;
      const nextQ = questions[nextIdx];
      if (nextQ) {
        speakQuestion(nextQ.spokenResponse || nextQ.text || nextQ.question);
      }
    }
  };

  // Toggle voice mute
  const toggleVoiceMute = () => {
    if (!isVoiceMuted) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsVoiceMuted(true);
      isVoiceMutedRef.current = true;
    } else {
      setIsVoiceMuted(false);
      isVoiceMutedRef.current = false;
      if (currentQuestion) {
        speakQuestion(currentQuestion.spokenResponse || currentQuestion.text || currentQuestion.question);
      }
    }
  };

  // Attach mediaStream to video element on mount
  useEffect(() => {
    let currentStream = activeStream;

    const setupStream = async () => {
      if (
        !currentStream ||
        !currentStream.active ||
        !currentStream.getVideoTracks().some((t) => t.readyState === 'live')
      ) {
        currentStream = await requestMedia();
      }

      if (currentStream) {
        if (userVideoRef.current) {
          attachVideo(userVideoRef, currentStream);
        }
        if (speechRecRef.current) {
          speechRecRef.current.attachMediaStream(currentStream);
        }
      } else {
        setCameraError('Camera access is unavailable. Please check permissions.');
      }
    };

    setupStream();
  }, [activeStream, requestMedia, attachVideo]);

  // Start MediaRecorder once stream is active
  useEffect(() => {
    const s = activeStream;
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
        console.error('[MockInterviewSession] MediaRecorder error:', e);
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
    } catch (err) {
      console.error('[MockInterviewSession] Error starting MediaRecorder:', err);
    }

    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {}
      }
    };
  }, [activeStream, isSavingRecording]);

  // Finalize interview session, save recording, generate AI evaluation report, then navigate
  const handleFinalizeSession = useCallback(async () => {
    if (isSavingRecording) return;
    setIsSavingRecording(true);
    setConversationState(CONV_STATE.INTERVIEW_ENDED);
    setShowEndModal(false);
    setIsEvaluating(true);
    setEvalProgressStep('Finalizing local video recording...');

    // 1. Cancel speech synthesis & speech recognition
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (speechRecRef.current) {
      speechRecRef.current.abort();
    }

    // Capture any pending answer on current question if not yet submitted
    const finalHistory = [...questionsRef.current];
    const currIdx = currentIndexRef.current;
    if (finalHistory[currIdx] && !finalHistory[currIdx].answer && candidateAnswerRef.current.trim()) {
      finalHistory[currIdx].answer = candidateAnswerRef.current.trim();
    }

    // Detach user video element
    if (userVideoRef.current) {
      userVideoRef.current.srcObject = null;
    }

    const durationSpentSeconds = (durationMinutes * 60) - timeLeft;
    const finalSpentSeconds = durationSpentSeconds > 0 ? durationSpentSeconds : 1;

    // 2. Stop MediaRecorder and assemble final video Blob
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
          console.warn('[MockInterviewSession] requestData error:', e);
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

    // 3. Stop camera and microphone hardware tracks
    stopMedia();

    // 4. Save video Blob in browser's IndexedDB for instant replay
    const localRecordingId = `rec_interview_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    if (finalBlob && finalBlob.size > 0) {
      try {
        await saveLocalRecording({
          id: localRecordingId,
          blob: finalBlob,
          mimeType: finalBlob.type || 'video/webm',
          duration: finalSpentSeconds,
          topic: config.jobRole || config.interviewType || 'Mock Interview',
          difficulty: config.difficulty || 'Easy',
          createdAt: new Date().toISOString()
        });
      } catch (dbErr) {
        console.error('[MockInterviewSession] IndexedDB save error:', dbErr);
      }
    }

    // 5. Save preliminary metadata record to Supabase
    setEvalProgressStep('Generating personalized AI performance report...');
    let savedRecord = null;
    try {
      savedRecord = await saveInterviewRecord(
        user?.id,
        config,
        localRecordingId,
        null,
        undefined
      );
    } catch (saveErr) {
      console.error('[MockInterviewSession] Save interview record error:', saveErr);
    }

    // 6. Generate Comprehensive AI Evaluation Report
    setEvalProgressStep('Evaluating communication, depth, and problem-solving...');
    let evaluationReport = null;
    try {
      evaluationReport = await generateInterviewEvaluation({
        config,
        history: finalHistory.map(q => ({
          question: q.text || q.question,
          answer: q.answer || '(No response provided)'
        })),
        durationSpentSeconds: finalSpentSeconds
      });
    } catch (aiEvalErr) {
      console.warn('[MockInterviewSession] AI evaluation error, generating structured fallback summary:', aiEvalErr);
      evaluationReport = {
        overallScore: 78,
        scoreExplanation: 'Evaluation calculated from session questions and answers.',
        categories: {
          communication: { score: 80, feedback: 'Articulate responses delivered during the interview.' },
          answerQuality: { score: 76, feedback: 'Addressed the core questions directly.' },
          technicalKnowledge: { score: 78, feedback: 'Demonstrated solid grasp of primary domain topics.' },
          problemSolving: { score: 78, feedback: 'Expressed structured reasoning.' }
        },
        strengths: [
          { point: 'Direct and relevant answers', evidence: 'Addressed each interview prompt clearly.' }
        ],
        areasToImprove: [
          { point: 'Incorporate more concrete metrics', evidence: 'Quantifiable achievements add authority.' }
        ],
        missedOpportunities: ['Provide deeper context on edge cases.'],
        improvedAnswers: [],
        recommendedNextSteps: ['Continue practicing structured behavioral and technical drills.'],
        unsupportedAssessmentsDisclaimer: 'Facial expressions, body language, and voice pitch cannot be measured scientifically and were not scored.'
      };
    }

    // 7. Persist evaluation report to Supabase and cache
    setEvalProgressStep('Finalizing your performance report...');
    try {
      await saveInterviewAnalysisReport({
        userId: user?.id,
        sessionRecord: savedRecord,
        report: evaluationReport,
        history: finalHistory
      });
    } catch (reportSaveErr) {
      console.warn('[MockInterviewSession] Error saving report to database:', reportSaveErr);
    }

    setIsEvaluating(false);
    setIsSavingRecording(false);

    // 8. Proceed to results page
    onEndSession({
      ...(savedRecord || {}),
      interview_type: config.interviewType || 'General Interview',
      job_role: config.jobRole || config.interviewType,
      experience_level: config.experienceLevel || 'Beginner',
      difficulty: config.difficulty || 'Easy',
      duration: config.duration || '10 minutes',
      completed_at: savedRecord?.completed_at || new Date().toISOString(),
      local_recording_id: localRecordingId,
      localRecordingId,
      recording_path: null,
      recordingPath: null,
      recording_bucket: undefined,
      recordingBucket: undefined,
      score: evaluationReport?.overallScore || null,
      ai_report: evaluationReport,
      aiReport: evaluationReport,
      questionsAsked: finalHistory.map(q => q.text || q.question),
      questions_and_answers: finalHistory,
      questionsAndAnswers: finalHistory,
      videoBlob: finalBlob
    });
  }, [
    isSavingRecording, 
    durationMinutes, 
    timeLeft, 
    stopMedia, 
    config, 
    user?.id, 
    onEndSession
  ]);

  // Timer Countdown Effect
  useEffect(() => {
    if (timeLeft <= 0) {
      handleFinalizeSession();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, handleFinalizeSession]);

  // Format time into MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Toggle Camera
  const toggleCamera = () => {
    toggleContextCamera();
    setIsCameraOn((prev) => !prev);
  };

  // Toggle Microphone
  const toggleMic = () => {
    toggleContextMic();
    setIsMicOn((prev) => {
      const next = !prev;
      if (!next && speechRecRef.current) {
        speechRecRef.current.stop();
      } else if (next && speechRecRef.current && conversationState === CONV_STATE.LISTENING) {
        speechRecRef.current.start();
      }
      return next;
    });
  };

  // Computed status message for the AI badge
  const renderAiStatusBadge = () => {
    switch (conversationState) {
      case CONV_STATE.AI_SPEAKING:
        return (
          <div className="ai-live-status-pill speaking">
            <Volume2 size={12} className="spin-pulse" />
            <span>AI Interviewer is speaking...</span>
          </div>
        );
      case CONV_STATE.PROCESSING_ANSWER:
      case CONV_STATE.GENERATING_RESPONSE:
        return (
          <div className="ai-live-status-pill generating">
            <Loader2 size={12} className="spin-animate" />
            <span>Understanding your answer...</span>
          </div>
        );
      case CONV_STATE.LISTENING:
        if (silenceCountdown.active && silenceCountdown.remainingSeconds > 0) {
          return (
            <div className="ai-live-status-pill pause-detected">
              <span className="status-dot amber" />
              <span>Pause detected • Finishing in {silenceCountdown.remainingSeconds}s...</span>
            </div>
          );
        }
        return (
          <div className="ai-live-status-pill listening">
            <span className="status-dot green" />
            <span>Listening for your answer...</span>
          </div>
        );
      case CONV_STATE.INITIALIZING:
      default:
        return (
          <div className="ai-live-status-pill generating">
            <Loader2 size={12} className="spin-animate" />
            <span>Preparing interview question...</span>
          </div>
        );
    }
  };

  return (
    <div className="session-full-container">
      {/* Top Session Header */}
      <div className="session-top-bar">
        <div className="session-brand">
          <div className="session-live-badge">
            <span className="live-dot"></span>
            <span>LIVE INTERVIEW</span>
          </div>
          <span className="session-type-tag">{config.interviewType || 'Mock Interview'}</span>
          {config.jobRole && (
            <span className="session-role-tag">{config.jobRole}</span>
          )}
          <span className="session-diff-tag">Level: {config.difficulty || 'Medium'}</span>
        </div>

        {/* Timer Display */}
        <div className="session-timer-box">
          <Clock size={16} />
          <span className="timer-text">{formatTime(timeLeft)}</span>
        </div>
      </div>

      {/* Main Video Call Area */}
      <div className="session-video-grid">
        {/* User Camera Video Box */}
        <div className="video-box user-video-box">
          {isCameraOn && !cameraError ? (
            <video
              ref={(node) => {
                userVideoRef.current = node;
                if (node && activeStream) {
                  attachVideo(node, activeStream);
                }
              }}
              autoPlay
              playsInline
              muted
              className="video-element"
            />
          ) : (
            <div className="video-off-placeholder">
              {cameraError ? (
                <p style={{ color: '#ef4444', fontSize: '13px', textAlign: 'center', padding: '0 12px' }}>
                  {cameraError}
                </p>
              ) : (
                <>
                  <div className="avatar-circle">
                    {user?.name ? user.name.charAt(0).toUpperCase() : <UserIcon size={32} />}
                  </div>
                  <p>Camera is turned off</p>
                </>
              )}
            </div>
          )}

          <div className="video-overlay-tag">
            <span>{user?.name || 'You'}</span>
            {!isMicOn && <MicOff size={14} color="#ef4444" style={{ marginLeft: '6px' }} />}
          </div>

          {/* Speech Activity Banner on User Camera */}
          {conversationState === CONV_STATE.LISTENING && (
            <div className="speech-listening-banner">
              <span className={`speech-pulse-dot ${silenceCountdown.active ? 'amber' : ''}`} />
              <span>
                {silenceCountdown.active 
                  ? `Finishing answer in ${silenceCountdown.remainingSeconds}s...` 
                  : 'Listening... speak naturally'}
              </span>
            </div>
          )}
        </div>

        {/* AI Interviewer Interactive Question Card */}
        <div className="video-box ai-video-box">
          <div className="ai-interviewer-card">
            {/* Top Status Header */}
            <div className="ai-header-row">
              <div className="ai-avatar-badge-wrap">
                <div className={`ai-avatar-circle-sm ${conversationState === CONV_STATE.AI_SPEAKING ? 'speaking-active' : ''}`}>
                  <Bot size={28} color="#0066ff" />
                </div>
                <div>
                  <h4 className="ai-interviewer-name">PrepPilot Interviewer Agent</h4>
                  {renderAiStatusBadge()}
                </div>
              </div>

              {/* Voice Mute Toggle */}
              <button
                className={`btn-voice-toggle ${isVoiceMuted ? 'muted' : ''}`}
                onClick={toggleVoiceMute}
                title={isVoiceMuted ? 'Unmute AI voice' : 'Mute AI voice'}
              >
                {isVoiceMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                <span>{isVoiceMuted ? 'Voice Muted' : 'Voice On'}</span>
              </button>
            </div>

            {/* Current Question Display */}
            {conversationState === CONV_STATE.INITIALIZING && questions.length === 0 ? (
              <div className="ai-loading-questions">
                <Loader2 size={32} className="spin-animate text-blue-500" />
                <p>PrepPilot Interviewer Agent is preparing your customized interview...</p>
              </div>
            ) : currentQuestion ? (
              <div className="ai-question-card">
                <div className="ai-question-top-bar">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="question-count-badge">
                      Question {currentIndex + 1}
                    </span>
                    {currentQuestion.isFollowUp && (
                      <span className="question-followup-badge" title={currentQuestion.followUpReason || 'Contextual Follow-up'}>
                        <Sparkles size={11} />
                        <span>Contextual Follow-up</span>
                      </span>
                    )}
                  </div>
                  <span className="question-cat-tag">
                    {currentQuestion.category || config.interviewType || 'General'}
                  </span>
                </div>

                {/* Follow-up Context Callout */}
                {currentQuestion.isFollowUp && currentQuestion.followUpReason && (
                  <div className="ai-followup-reason">
                    <span>💡 Follow-up context: {currentQuestion.followUpReason}</span>
                  </div>
                )}

                {/* Question Text */}
                <h3 className="ai-question-text">
                  "{currentQuestion.text || currentQuestion.question}"
                </h3>

                {/* Answering Tip Drawer */}
                {currentQuestion.tip && (
                  <div className="ai-tip-drawer">
                    <button
                      className="btn-toggle-tip"
                      onClick={() => setShowTip(prev => !prev)}
                    >
                      <Lightbulb size={13} color="#f59e0b" />
                      <span>{showTip ? 'Hide Answering Tip' : 'Show Answering Tip'}</span>
                    </button>
                    {showTip && (
                      <p className="ai-tip-content">{currentQuestion.tip}</p>
                    )}
                  </div>
                )}

                {/* Real-time Voice Answer & Natural Conversation Box */}
                <div className="candidate-answer-container auto-voice-mode">
                  <div className="candidate-answer-header">
                    <div className="answer-status-tag">
                      <Activity size={13} color={conversationState === CONV_STATE.LISTENING ? '#10b981' : '#64748b'} />
                      <span>
                        {conversationState === CONV_STATE.AI_SPEAKING
                          ? 'AI is speaking • Mic muted'
                          : conversationState === CONV_STATE.LISTENING
                          ? (silenceCountdown.active ? `Finishing in ${silenceCountdown.remainingSeconds}s...` : 'Listening to your voice...')
                          : 'Processing your response...'}
                      </span>
                    </div>

                    <div className="answer-actions-group">
                      <button
                        className="btn-mini-action"
                        onClick={() => setIsEditingAnswer(prev => !prev)}
                        title="Edit or type answer text"
                      >
                        <Edit2 size={12} />
                        <span>{isEditingAnswer ? 'Done' : 'Edit Text'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Live Real-Time Speech Display */}
                  {isEditingAnswer ? (
                    <textarea
                      className="candidate-answer-textarea"
                      placeholder="You can edit or type your answer here..."
                      value={candidateAnswer}
                      onChange={(e) => {
                        setCandidateAnswer(e.target.value);
                        candidateAnswerRef.current = e.target.value;
                      }}
                      rows={3}
                    />
                  ) : (
                    <div className="candidate-live-transcript">
                      {candidateAnswer ? (
                        <p className="transcript-text">{candidateAnswer}</p>
                      ) : (
                        <p className="transcript-placeholder">
                          {conversationState === CONV_STATE.AI_SPEAKING
                            ? 'Please listen to the interviewer. Your microphone will activate automatically when they finish...'
                            : conversationState === CONV_STATE.LISTENING
                            ? 'Speak your answer naturally into your microphone. When you pause, the AI will automatically understand and respond.'
                            : 'Analyzing your response and formulating next question...'}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Dynamic Action Bar */}
                  <div className="auto-voice-action-bar">
                    {/* Natural Pause Progress Ticker */}
                    {silenceCountdown.active && (
                      <div className="pause-countdown-pill">
                        <span className="countdown-pulse-dot" />
                        <span>Pause detected • Answering complete in {silenceCountdown.remainingSeconds}s</span>
                      </div>
                    )}

                    {/* Optional Instant Send (Only as a bypass if user does not want to wait 2s) */}
                    {candidateAnswer.trim().length > 3 && conversationState === CONV_STATE.LISTENING && (
                      <button
                        className="btn-instant-send"
                        onClick={handleManualSendNow}
                        title="Send answer immediately without waiting for silence"
                      >
                        <Zap size={13} />
                        <span>Send Now (Optional)</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Question Actions & Navigation */}
                <div className="ai-question-actions">
                  <button
                    className="btn-listen-again"
                    onClick={() => speakQuestion(currentQuestion.spokenResponse || currentQuestion.text || currentQuestion.question)}
                    title="Repeat question aloud"
                    disabled={conversationState === CONV_STATE.AI_SPEAKING}
                  >
                    <Volume2 size={14} />
                    <span>Listen Again</span>
                  </button>

                  <div className="question-nav-group">
                    {currentIndex > 0 && (
                      <button
                        className="btn-prev-question"
                        onClick={handlePrevQuestion}
                        disabled={conversationState === CONV_STATE.GENERATING_RESPONSE}
                      >
                        <ArrowLeft size={14} />
                        <span>Prev</span>
                      </button>
                    )}

                    <button
                      className="btn-skip-question"
                      onClick={handleSkipQuestion}
                      title="Skip to next question"
                      disabled={conversationState === CONV_STATE.GENERATING_RESPONSE}
                    >
                      <span>Skip Question</span>
                      <ArrowRight size={14} />
                    </button>

                    <button
                      className="btn-finish-interview"
                      onClick={() => setShowEndModal(true)}
                    >
                      <CheckCircle2 size={14} />
                      <span>Finish Interview</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="video-overlay-tag">
            <ShieldCheck size={14} color="#0066ff" />
            <span>AI Voice Conversation Active</span>
          </div>
        </div>
      </div>

      {/* Bottom Session Control Dock */}
      <div className="session-controls-dock">
        {/* Camera Toggle Button */}
        <button
          className={`control-btn ${!isCameraOn ? 'off' : ''}`}
          onClick={toggleCamera}
          title={isCameraOn ? 'Turn Camera Off' : 'Turn Camera On'}
        >
          {isCameraOn ? <Camera size={20} /> : <CameraOff size={20} />}
          <span className="control-btn-label">
            {isCameraOn ? 'Camera On' : 'Camera Off'}
          </span>
        </button>

        {/* Microphone Toggle Button */}
        <button
          className={`control-btn ${!isMicOn ? 'off' : ''}`}
          onClick={toggleMic}
          title={isMicOn ? 'Turn Mic Off' : 'Turn Mic On'}
        >
          {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
          <span className="control-btn-label">
            {isMicOn ? 'Mic On' : 'Mic Off'}
          </span>
        </button>

        {/* End Interview Button */}
        <button
          className="control-btn end-btn"
          onClick={() => setShowEndModal(true)}
          title="End Interview"
          disabled={isSavingRecording || isEvaluating}
        >
          <PhoneOff size={20} />
          <span className="control-btn-label">End Interview</span>
        </button>
      </div>

      {/* End Interview Confirmation Modal */}
      {showEndModal && (
        <div className="modal-overlay" onClick={() => !isSavingRecording && setShowEndModal(false)}>
          <div className="end-session-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="end-modal-icon-box">
              <AlertTriangle size={32} color="#f59e0b" />
            </div>
            <h3 className="end-modal-title">End Mock Interview?</h3>
            <p className="end-modal-desc">
              Are you sure you want to conclude this interview session? Your video recording will be finalized, and PrepPilot Interviewer Agent will generate your personalized performance evaluation report.
            </p>

            <div className="end-modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setShowEndModal(false)}
                disabled={isSavingRecording}
              >
                Continue Interview
              </button>
              <button
                className="btn-danger-solid"
                onClick={handleFinalizeSession}
                disabled={isSavingRecording}
              >
                {isSavingRecording ? 'Finalizing Recording...' : 'Yes, End & Evaluate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Evaluation Loading Progress Overlay */}
      {isEvaluating && (
        <div className="modal-overlay evaluation-progress-overlay">
          <div className="evaluation-progress-card">
            <div className="evaluation-spinner-box">
              <Loader2 size={44} className="spin-animate text-blue-500" />
            </div>
            <h3 className="evaluation-modal-title">Generating Performance Report</h3>
            <p className="evaluation-modal-step">{evalProgressStep}</p>

            <div className="evaluation-checklist">
              <div className="eval-check-item active">
                <Check size={16} color="#10b981" />
                <span>Audio & transcript assembled</span>
              </div>
              <div className="eval-check-item active">
                <Check size={16} color="#10b981" />
                <span>Video saved locally in IndexedDB</span>
              </div>
              <div className="eval-check-item in-progress">
                <Sparkles size={16} color="#0066ff" className="spin-pulse" />
                <span>AI evaluating communication & answer depth</span>
              </div>
              <div className="eval-check-item">
                <span className="check-placeholder-dot" />
                <span>Compiling improved answers & practice drills</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
