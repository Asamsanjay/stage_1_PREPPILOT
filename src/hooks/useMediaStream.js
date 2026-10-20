import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';

/**
 * Utility function to translate media stream errors to user-friendly error messages.
 */
export function getMediaErrorMessage(err) {
  if (!err) return 'Unable to access your camera and microphone. Please try again.';

  const name = err.name || err.toString();

  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return 'Camera and microphone access was denied. Please allow access in your browser settings.';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'No camera was found. Please connect a webcam and try again.';
    case 'NotReadableError':
    case 'TrackStartError':
      return 'Your camera is being used by another application. Close other apps using the camera and try again.';
    case 'OverconstrainedError':
    case 'ConstraintNotSatisfiedError':
      return 'Camera or microphone settings could not be satisfied. Please try again.';
    case 'SecurityError':
    case 'TypeError':
      return 'Camera access is unavailable in this browser or page.';
    case 'AbortError':
      return 'Unable to access your camera and microphone. Please try again.';
    default:
      return 'Unable to access your camera and microphone. Please try again.';
  }
}

const MediaStreamContext = createContext(null);

export function MediaStreamProvider({ children }) {
  const [stream, setStream] = useState(null);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const streamRef = useRef(null);

  // Request camera and microphone access
  const requestMedia = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    // Verify browser supports mediaDevices
    if (
      typeof window === 'undefined' ||
      !navigator ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== 'function'
    ) {
      const errMsg = 'Camera and microphone access is not supported in this browser.';
      setError(errMsg);
      setIsLoading(false);
      return null;
    }

    try {
      // Check if existing stream is already active and healthy
      if (
        streamRef.current &&
        streamRef.current.active &&
        streamRef.current.getVideoTracks().some((t) => t.readyState === 'live') &&
        streamRef.current.getAudioTracks().some((t) => t.readyState === 'live')
      ) {
        console.log('[MediaStreamProvider] Reusing existing active MediaStream:', streamRef.current);
        setStream(streamRef.current);
        const vTrack = streamRef.current.getVideoTracks()[0];
        const aTrack = streamRef.current.getAudioTracks()[0];
        setCameraEnabled(Boolean(vTrack && vTrack.enabled));
        setMicrophoneEnabled(Boolean(aTrack && aTrack.enabled));
        setIsLoading(false);
        return streamRef.current;
      }

      console.log('[MediaStreamProvider] Requesting new MediaStream via getUserMedia...');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      streamRef.current = mediaStream;
      setStream(mediaStream);

      const videoTrack = mediaStream.getVideoTracks()[0];
      const audioTrack = mediaStream.getAudioTracks()[0];

      setCameraEnabled(Boolean(videoTrack && videoTrack.enabled));
      setMicrophoneEnabled(Boolean(audioTrack && audioTrack.enabled));
      setIsLoading(false);
      return mediaStream;
    } catch (err) {
      console.error('[MediaStreamProvider] getUserMedia error:', err);
      setCameraEnabled(false);
      setMicrophoneEnabled(false);
      setStream(null);
      streamRef.current = null;

      const userMsg = getMediaErrorMessage(err);
      setError(userMsg);
      setIsLoading(false);
      return null;
    }
  }, []);

  // Toggle Camera (video track)
  const toggleCamera = useCallback(() => {
    if (streamRef.current) {
      const videoTracks = streamRef.current.getVideoTracks();
      if (videoTracks.length > 0) {
        const nextState = !videoTracks[0].enabled;
        videoTracks.forEach((t) => {
          t.enabled = nextState;
        });
        setCameraEnabled(nextState);
      }
    }
  }, []);

  // Toggle Microphone (audio track)
  const toggleMicrophone = useCallback(() => {
    if (streamRef.current) {
      const audioTracks = streamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        const nextState = !audioTracks[0].enabled;
        audioTracks.forEach((t) => {
          t.enabled = nextState;
        });
        setMicrophoneEnabled(nextState);
      }
    }
  }, []);

  // Stop Media Stream completely
  const stopMedia = useCallback(() => {
    console.log('[MediaStreamProvider] Stopping all media tracks explicitly.');
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }
    setStream(null);
    setCameraEnabled(false);
    setMicrophoneEnabled(false);
  }, []);

  // Helper to attach stream to HTML5 video element safely
  const attachVideo = useCallback((videoTarget, targetStream = null) => {
    const s = targetStream || streamRef.current;
    const element = videoTarget && 'current' in videoTarget ? videoTarget.current : videoTarget;
    if (element && s) {
      if (element.srcObject !== s) {
        element.srcObject = s;
      }
      element.play().catch((err) => {
        console.warn('[MediaStreamProvider] Video play warning:', err);
      });
    }
  }, []);

  // Cleanup ONLY on total Provider unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
        streamRef.current = null;
      }
    };
  }, []);

  const value = {
    stream,
    streamRef,
    cameraEnabled,
    microphoneEnabled,
    requestMedia,
    toggleCamera,
    toggleMicrophone,
    stopMedia,
    attachVideo,
    error,
    isLoading,
    setError,
    setStream
  };

  return React.createElement(MediaStreamContext.Provider, { value }, children);
}

export function useMediaStream() {
  const context = useContext(MediaStreamContext);
  if (!context) {
    throw new Error('useMediaStream must be used within a MediaStreamProvider');
  }
  return context;
}

export default useMediaStream;


