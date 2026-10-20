/**
 * PrepPilot Speech-to-Text & Voice Activity Detection (VAD) Manager
 * 
 * Manages browser-native SpeechRecognition combined with Web Audio volume monitoring
 * to automatically detect natural speech completion without requiring manual button clicks.
 */

export const isSpeechRecognitionSupported = () => {
  if (typeof window === 'undefined') return false;
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
};

export class InterviewSpeechRecognition {
  constructor({
    silenceThresholdMs = 2600,
    minWordsForCompletion = 3,
    onTranscriptChange,
    onSpeechStart,
    onSilenceCountdown,
    onSilenceFinalized,
    onStatusChange,
    onError
  }) {
    this.silenceThresholdMs = silenceThresholdMs;
    this.minWordsForCompletion = minWordsForCompletion;

    this.onTranscriptChange = onTranscriptChange || (() => {});
    this.onSpeechStart = onSpeechStart || (() => {});
    this.onSilenceCountdown = onSilenceCountdown || (() => {});
    this.onSilenceFinalized = onSilenceFinalized || (() => {});
    this.onStatusChange = onStatusChange || (() => {});
    this.onError = onError || (() => {});

    this.recognition = null;
    this.isListening = false;
    this.finalTranscript = '';
    this.interimTranscript = '';
    this.shouldRestart = false;

    // VAD & Silence tracking
    this.hasSpoken = false;
    this.silenceTimeoutId = null;
    this.countdownIntervalId = null;
    this.countdownSeconds = 0;
    this.isFinalizing = false;

    // Web Audio Volume Monitoring
    this.audioContext = null;
    this.analyser = null;
    this.mediaStreamSource = null;
    this.vadIntervalId = null;

    this.init();
  }

  init() {
    if (!isSpeechRecognitionSupported()) return;

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    try {
      this.recognition = new SpeechRec();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onstart = () => {
        this.isListening = true;
        this.onStatusChange({ status: 'listening' });
      };

      this.recognition.onresult = (event) => {
        if (this.isFinalizing) return;

        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          const text = item[0].transcript;
          if (item.isFinal) {
            this.finalTranscript += (this.finalTranscript ? ' ' : '') + text.trim();
          } else {
            interim += text;
          }
        }

        this.interimTranscript = interim;
        const fullText = (this.finalTranscript + (interim ? ' ' + interim : '')).trim();

        if (fullText.length > 0 && !this.hasSpoken) {
          this.hasSpoken = true;
          this.onSpeechStart();
        }

        this.onTranscriptChange({
          finalText: this.finalTranscript,
          interimText: this.interimTranscript,
          fullText
        });

        // Evaluate silence timer based on current transcript length
        const wordCount = fullText.split(/\s+/).filter(Boolean).length;
        if (wordCount >= this.minWordsForCompletion) {
          this.armSilenceTimer(fullText);
        } else {
          this.cancelSilenceTimer();
        }
      };

      this.recognition.onerror = (event) => {
        if (event.error === 'no-speech') {
          // Normal silence, ignore
          return;
        }
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          this.shouldRestart = false;
          this.isListening = false;
          this.cancelSilenceTimer();
          this.onError(new Error('Microphone permission was denied for speech recognition.'));
        } else if (event.error !== 'aborted') {
          console.warn('[InterviewSpeechRecognition] Recognition notice:', event.error);
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        if (this.shouldRestart && !this.isFinalizing) {
          try {
            this.recognition.start();
          } catch (_e) {
            this.onStatusChange({ status: 'idle' });
          }
        } else {
          this.onStatusChange({ status: 'idle' });
        }
      };
    } catch (err) {
      console.warn('[InterviewSpeechRecognition] Initialization exception:', err);
    }
  }

  /**
   * Attach an active MediaStream for real-time audio volume monitoring.
   */
  attachMediaStream(stream) {
    if (!stream || typeof window === 'undefined' || !window.AudioContext) return;

    try {
      if (this.audioContext && this.audioContext.state !== 'closed') {
        this.audioContext.close().catch(() => {});
      }

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioCtx();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.4;

      this.mediaStreamSource = this.audioContext.createMediaStreamSource(stream);
      this.mediaStreamSource.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkVolume = () => {
        if (!this.isListening || this.isFinalizing || !this.analyser) return;

        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;

        // If audio energy is distinctly active (> 18 on a 0-255 scale), candidate is vocalizing
        if (average > 18) {
          const fullText = this.getTranscript();
          const wordCount = fullText.split(/\s+/).filter(Boolean).length;
          if (wordCount >= this.minWordsForCompletion) {
            // Keep resetting silence timer while vocal energy is present
            this.armSilenceTimer(fullText);
          }
        }
      };

      if (this.vadIntervalId) clearInterval(this.vadIntervalId);
      this.vadIntervalId = setInterval(checkVolume, 200);
    } catch (err) {
      console.warn('[InterviewSpeechRecognition] VAD AudioContext notice:', err);
    }
  }

  armSilenceTimer(completedTranscript) {
    // Clear any existing silence timer
    if (this.silenceTimeoutId) {
      clearTimeout(this.silenceTimeoutId);
    }
    if (this.countdownIntervalId) {
      clearInterval(this.countdownIntervalId);
    }

    const totalSeconds = Math.ceil(this.silenceThresholdMs / 1000);
    this.countdownSeconds = totalSeconds;
    this.onSilenceCountdown({ active: true, remainingSeconds: this.countdownSeconds });

    // Step down countdown every 1s
    this.countdownIntervalId = setInterval(() => {
      this.countdownSeconds = Math.max(0, this.countdownSeconds - 1);
      this.onSilenceCountdown({ active: true, remainingSeconds: this.countdownSeconds });
    }, 1000);

    // Fire automatic finalization after full silence threshold
    this.silenceTimeoutId = setTimeout(() => {
      this.cancelSilenceTimer();
      this.triggerAutoFinalization(completedTranscript);
    }, this.silenceThresholdMs);
  }

  cancelSilenceTimer() {
    if (this.silenceTimeoutId) {
      clearTimeout(this.silenceTimeoutId);
      this.silenceTimeoutId = null;
    }
    if (this.countdownIntervalId) {
      clearInterval(this.countdownIntervalId);
      this.countdownIntervalId = null;
    }
    this.onSilenceCountdown({ active: false, remainingSeconds: 0 });
  }

  triggerAutoFinalization(text) {
    if (this.isFinalizing) return;
    this.isFinalizing = true;
    this.shouldRestart = false;

    const finalText = (text || this.getTranscript()).trim();

    // Stop recognition
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (_e) {}
    }
    this.isListening = false;

    // Notify listener of finalized answer
    this.onSilenceFinalized(finalText);
  }

  start() {
    if (!this.recognition) return false;

    this.isFinalizing = false;
    this.shouldRestart = true;
    this.hasSpoken = false;
    this.finalTranscript = '';
    this.interimTranscript = '';
    this.cancelSilenceTimer();

    try {
      this.recognition.start();
      return true;
    } catch (e) {
      if (e.name !== 'InvalidStateError') {
        console.warn('[InterviewSpeechRecognition] Start error:', e);
      }
      return true;
    }
  }

  stop() {
    this.shouldRestart = false;
    this.cancelSilenceTimer();
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (_e) {}
    }
    this.isListening = false;
    return this.getTranscript();
  }

  abort() {
    this.shouldRestart = false;
    this.isFinalizing = false;
    this.cancelSilenceTimer();
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch (_e) {}
    }
    this.isListening = false;
    this.finalTranscript = '';
    this.interimTranscript = '';
  }

  resetTurn() {
    this.cancelSilenceTimer();
    this.finalTranscript = '';
    this.interimTranscript = '';
    this.hasSpoken = false;
    this.isFinalizing = false;
  }

  destroy() {
    this.abort();
    if (this.vadIntervalId) {
      clearInterval(this.vadIntervalId);
      this.vadIntervalId = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch (_e) {}
      this.audioContext = null;
    }
  }

  getTranscript() {
    return (this.finalTranscript + (this.interimTranscript ? ' ' + this.interimTranscript : '')).trim();
  }

  setTranscript(text) {
    this.finalTranscript = (text || '').trim();
    this.interimTranscript = '';
    this.onTranscriptChange({
      finalText: this.finalTranscript,
      interimText: '',
      fullText: this.finalTranscript
    });
  }
}
