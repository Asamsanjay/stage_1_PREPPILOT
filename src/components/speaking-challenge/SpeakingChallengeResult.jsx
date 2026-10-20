import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Home, 
  RotateCcw, 
  Clock, 
  Target, 
  Sparkles, 
  Video, 
  Calendar, 
  HardDrive, 
  AlertCircle,
  ShieldCheck,
  Layers
} from 'lucide-react';
import { getLocalRecording } from '../../utils/indexedDBStorage';
import { getRecordingSignedUrl } from '../../utils/speakingService';
import { 
  analyzeSpeakingRecording, 
  getSpeakingReportForSession, 
  getAllSpeakingReports 
} from '../../utils/aiSpeakingService';
import SpeakingAnalysisModal from './SpeakingAnalysisModal';
import SpeakingAnalysisReport from './SpeakingAnalysisReport';

export default function SpeakingChallengeResult({ 
  sessionData, 
  user,
  onTryAnother, 
  onGoHome,
  onRetryTopic
}) {
  const {
    topic,
    difficulty,
    durationLabel,
    duration_label,
    durationSeconds,
    duration_seconds,
    spentSeconds,
    spent_seconds,
    prepType,
    prep_type,
    completedAt,
    completed_at,
    localRecordingId,
    local_recording_id,
    recording_path,
    recordingPath,
    videoBlob: initialVideoBlob
  } = sessionData || {};

  const recordingId = localRecordingId || local_recording_id;
  const storagePath = recording_path || recordingPath;
  const plannedSeconds = durationSeconds ?? duration_seconds ?? 60;
  const actualDuration = spentSeconds ?? spent_seconds ?? 0;
  const dateStr = completedAt || completed_at || new Date().toISOString();
  const plannedLabel = durationLabel || duration_label || `${plannedSeconds} seconds`;
  const prep = prepType || prep_type || 'now';

  const [videoBlob, setVideoBlob] = useState(initialVideoBlob || null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [isCloudSource, setIsCloudSource] = useState(false);
  const [loadingVideo, setLoadingVideo] = useState(!initialVideoBlob && Boolean(recordingId || storagePath));
  const [recordingMissing, setRecordingMissing] = useState(false);

  // AI Speaking Coach Analysis State
  const [analysisReport, setAnalysisReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(true);
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState({ stage: 'idle', label: '' });
  const [analysisError, setAnalysisError] = useState(null);

  // Previous reports list & modal
  const [allReports, setAllReports] = useState([]);
  const [showPreviousReportsModal, setShowPreviousReportsModal] = useState(false);

  // 1. Fetch Video Blob
  useEffect(() => {
    let active = true;
    let localCreatedUrl = null;

    async function fetchVideo() {
      if (initialVideoBlob && initialVideoBlob instanceof Blob && initialVideoBlob.size > 0) {
        localCreatedUrl = URL.createObjectURL(initialVideoBlob);
        setVideoUrl(localCreatedUrl);
        setVideoBlob(initialVideoBlob);
        setIsCloudSource(false);
        setLoadingVideo(false);
        setRecordingMissing(false);
        return;
      }

      setLoadingVideo(true);

      // Try local IndexedDB
      if (recordingId) {
        try {
          const record = await getLocalRecording(recordingId);
          if (record && record.blob && record.blob.size > 0) {
            if (!active) return;
            localCreatedUrl = URL.createObjectURL(record.blob);
            setVideoUrl(localCreatedUrl);
            setVideoBlob(record.blob);
            setIsCloudSource(false);
            setRecordingMissing(false);
            setLoadingVideo(false);
            return;
          }
        } catch (dbErr) {
          console.warn('[SpeakingChallengeResult] IndexedDB lookup error, trying Supabase Cloud:', dbErr);
        }
      }

      // Try Supabase Storage Signed URL if cloud path exists
      if (storagePath) {
        try {
          const signedUrl = await getRecordingSignedUrl(storagePath);
          if (!active) return;
          if (signedUrl) {
            setVideoUrl(signedUrl);
            setIsCloudSource(true);
            setRecordingMissing(false);
            setLoadingVideo(false);
            return;
          }
        } catch (cloudErr) {
          console.warn('[SpeakingChallengeResult] Supabase signed URL error:', cloudErr);
        }
      }

      if (active) {
        setRecordingMissing(true);
        setLoadingVideo(false);
      }
    }

    fetchVideo();

    return () => {
      active = false;
      if (localCreatedUrl) {
        URL.revokeObjectURL(localCreatedUrl);
      }
    };
  }, [initialVideoBlob, recordingId, storagePath]);

  // Clean up Object URL
  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  // 2. Fetch Existing Speaking Analysis Report
  useEffect(() => {
    let active = true;
    async function loadReport() {
      if (!recordingId) {
        setLoadingReport(false);
        return;
      }

      try {
        const [savedReport, allSaved] = await Promise.all([
          getSpeakingReportForSession(user?.id, recordingId),
          getAllSpeakingReports(user?.id)
        ]);

        if (active) {
          if (savedReport) {
            setAnalysisReport(savedReport);
          }
          if (Array.isArray(allSaved)) {
            setAllReports(allSaved);
          }
        }
      } catch (err) {
        console.warn('[SpeakingChallengeResult] Error checking existing report:', err);
      } finally {
        if (active) setLoadingReport(false);
      }
    }

    loadReport();
    return () => { active = false; };
  }, [recordingId, user?.id]);

  // 3. Trigger Speaking Coach Analysis Flow
  const handleStartAnalysisClick = () => {
    setAnalysisError(null);
    setIsConsentModalOpen(true);
  };

  const handleConfirmAnalysis = async ({ allowSaveTranscript }) => {
    if (!videoBlob) {
      setAnalysisError({ message: 'Recording blob could not be loaded. Please ensure you have completed a recording.' });
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const generatedReport = await analyzeSpeakingRecording({
        videoBlob,
        sessionData,
        user,
        allowSaveTranscript,
        onProgress: (p) => setAnalysisProgress(p)
      });

      setAnalysisReport(generatedReport);
      setIsConsentModalOpen(false);

      // Refresh all reports
      const updatedReports = await getAllSpeakingReports(user?.id);
      setAllReports(updatedReports);
    } catch (err) {
      console.error('[SpeakingChallengeResult] Analysis error:', err);
      setAnalysisError({
        code: err.code || 'ANALYSIS_ERROR',
        message: err.message || 'Failed to complete speech analysis.'
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatDuration = (secs) => {
    if (!secs || secs <= 0) return '0s';
    if (secs < 60) return `${secs}s`;
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  };

  const formatDate = (dateInput) => {
    try {
      const d = new Date(dateInput);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateInput;
    }
  };

  return (
    <div className="speaking-result-wrapper">
      {/* Header Badge */}
      <div className="result-header-card">
        <div className="result-icon-box">
          <Trophy size={32} color="#ffffff" />
        </div>
        <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
          Challenge Completed
        </h2>
        <p style={{ fontSize: '14px', color: '#64748b' }}>
          Great job! Review your recording and receive feedback from PrepPilot Speaking Coach.
        </p>
      </div>

      {/* RECORDED VIDEO PLAYBACK CARD */}
      <div className="widget-card result-video-playback-card">
        <div className="result-video-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Video size={18} color="#0066ff" />
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Your Challenge Recording
            </h3>
          </div>
          <span className="badge-indexeddb-pill">
            <HardDrive size={12} color="#10b981" />
            <span>Stored Locally (IndexedDB)</span>
          </span>
        </div>

        {loadingVideo ? (
          <div className="result-video-loading">
            <div className="recording-spinner"></div>
            <p style={{ marginTop: '12px', fontSize: '13.5px', color: '#64748b' }}>
              Loading recorded video from local storage...
            </p>
          </div>
        ) : videoUrl ? (
          <div className="result-video-viewport">
            <video
              key={videoUrl}
              src={videoUrl}
              controls
              playsInline
              className="challenge-result-video-element"
            />
          </div>
        ) : (
          <div className="result-video-missing-box">
            <AlertCircle size={28} color="#f59e0b" style={{ flexShrink: 0 }} />
            <div>
              <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                Recording Kept On Device
              </h4>
              <p style={{ fontSize: '13.5px', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
                This recording is stored in your local browser storage. If you cleared your browser data, the video may be unavailable.
              </p>
            </div>
          </div>
        )}

        {/* Video Metadata Chip Bar */}
        <div className="result-video-meta-chips">
          <div className="result-chip">
            <span className="result-chip-label">Topic:</span>
            <span className="result-chip-val" title={topic}>
              "{topic || 'Untitled Challenge'}"
            </span>
          </div>

          <div className="result-chip">
            <span className="result-chip-label">Difficulty:</span>
            <span className={`pill-diff ${difficulty?.toLowerCase()}`}>
              {difficulty || 'Beginner'}
            </span>
          </div>

          <div className="result-chip">
            <Clock size={13} color="#0066ff" />
            <span className="result-chip-label">Duration:</span>
            <span className="result-chip-val">
              <strong>{formatDuration(actualDuration)}</strong>
              <span style={{ color: '#94a3b8', marginLeft: '4px' }}>
                (Goal: {plannedLabel})
              </span>
            </span>
          </div>

          <div className="result-chip">
            <Calendar size={13} color="#64748b" />
            <span className="result-chip-label">Date:</span>
            <span className="result-chip-val">{formatDate(dateStr)}</span>
          </div>
        </div>
      </div>

      {/* AI SPEAKING COACH EVALUATION REPORT OR ANALYZE PROMPT */}
      {analysisReport ? (
        <SpeakingAnalysisReport
          report={analysisReport}
          topic={topic}
          difficulty={difficulty}
          onRetryTopic={() => onRetryTopic && onRetryTopic(topic, difficulty, plannedSeconds)}
          onOpenPreviousReports={() => setShowPreviousReportsModal(true)}
          hasOtherReports={allReports.length > 1}
        />
      ) : (
        /* Analyze My Speech Action Banner */
        <div className="widget-card analyze-cta-banner-card">
          <div className="analyze-cta-content">
            <div className="analyze-cta-icon-box">
              <Sparkles size={28} color="#ffffff" />
            </div>
            <div>
              <div className="analyze-pill-tag">AI Agent Assessment</div>
              <h3 className="analyze-cta-title">PrepPilot Speaking Coach</h3>
              <p className="analyze-cta-desc">
                Evaluate your speech for fluency, filler words, grammar corrections, vocabulary richness, and receive an improved sample answer.
              </p>
              <div className="analyze-privacy-note">
                <ShieldCheck size={14} color="#10b981" />
                <span>Your video stays on your device. Only audio is sent for AI analysis upon your consent.</span>
              </div>
            </div>
          </div>

          <div className="analyze-cta-actions">
            <button 
              className="btn-analyze-speech-hero"
              onClick={handleStartAnalysisClick}
              disabled={loadingVideo || (!videoBlob && !recordingId)}
            >
              <Sparkles size={18} />
              <span>Analyze My Speech</span>
            </button>

            {allReports.length > 0 && (
              <button 
                className="btn-secondary"
                onClick={() => setShowPreviousReportsModal(true)}
                style={{ padding: '10px 18px', fontSize: '13.5px' }}
              >
                <Layers size={14} />
                <span>Previous Reports ({allReports.length})</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Session Details Summary */}
      <div className="widget-card" style={{ marginBottom: '28px', padding: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Target size={18} color="#0066ff" />
          Challenge Summary
        </h3>

        <div className="summary-grid">
          <div className="summary-card-item">
            <span className="summary-item-label">Topic</span>
            <span className="summary-item-val" style={{ fontWeight: 700, color: '#0f172a' }}>
              {topic || 'N/A'}
            </span>
          </div>

          <div className="summary-card-item">
            <span className="summary-item-label">Difficulty</span>
            <span className="summary-item-val badge-diff">
              {difficulty || 'N/A'}
            </span>
          </div>

          <div className="summary-card-item">
            <span className="summary-item-label">Speaking Duration</span>
            <span className="summary-item-val">
              {formatDuration(actualDuration)} / {plannedLabel}
            </span>
          </div>

          <div className="summary-card-item">
            <span className="summary-item-label">Preparation</span>
            <span className="summary-item-val">
              {prep === '5min' ? '5 Minutes' : 'Speak Now'}
            </span>
          </div>
        </div>
      </div>

      {/* Footer Navigation Buttons */}
      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button 
          className="btn-secondary" 
          onClick={onGoHome}
          style={{ padding: '12px 24px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <Home size={16} />
          <span>Back to Challenges</span>
        </button>

        {onRetryTopic && (
          <button 
            className="btn-secondary" 
            onClick={() => onRetryTopic(topic, difficulty, plannedSeconds)}
            style={{ padding: '12px 24px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <RotateCcw size={16} />
            <span>Retry This Topic</span>
          </button>
        )}

        <button 
          className="btn-primary" 
          onClick={onTryAnother}
          style={{ padding: '12px 28px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <span>Try Another Challenge →</span>
        </button>
      </div>

      {/* Consent & Analysis Modal */}
      <SpeakingAnalysisModal
        isOpen={isConsentModalOpen}
        onClose={() => setIsConsentModalOpen(false)}
        onConfirm={handleConfirmAnalysis}
        isAnalyzing={isAnalyzing}
        analysisProgress={analysisProgress}
        analysisError={analysisError}
      />

      {/* Previous Reports Modal */}
      {showPreviousReportsModal && (
        <div className="modal-overlay" onClick={() => setShowPreviousReportsModal(false)}>
          <div className="speaking-reports-history-modal" onClick={(e) => e.stopPropagation()}>
            <div className="reports-history-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={18} color="#0066ff" />
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Your Saved Speaking Reports
                </h3>
              </div>
              <button className="modal-close-btn" onClick={() => setShowPreviousReportsModal(false)}>
                ✕
              </button>
            </div>

            <div className="reports-history-list">
              {allReports.map((r, idx) => (
                <div 
                  key={r.id || idx} 
                  className={`reports-history-item ${analysisReport?.id === r.id ? 'active-report' : ''}`}
                  onClick={() => {
                    setAnalysisReport(r);
                    setShowPreviousReportsModal(false);
                  }}
                >
                  <div className="rep-item-left">
                    <span className="rep-score-badge">
                      {r.overall_score !== null ? `${r.overall_score}/100` : '—'}
                    </span>
                    <div>
                      <h4 className="rep-item-title">"{topic || 'Challenge Report'}"</h4>
                      <span className="rep-item-date">{formatDate(r.created_at)}</span>
                    </div>
                  </div>
                  <button className="btn-view-rep">
                    Open →
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
