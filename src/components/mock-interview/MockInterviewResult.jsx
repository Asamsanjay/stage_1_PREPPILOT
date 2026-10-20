import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  ArrowLeft, 
  RotateCcw, 
  Info, 
  Sparkles,
  BarChart,
  MessageSquare,
  Award,
  Zap,
  Clock,
  Video,
  Calendar,
  Cloud,
  HardDrive,
  AlertCircle
} from 'lucide-react';
import { getLocalRecording } from '../../utils/indexedDBStorage';
import { getInterviewRecordingSignedUrl } from '../../utils/interviewService';
import MockInterviewAiReport from './MockInterviewAiReport';

export default function MockInterviewResult({ config: propConfig, sessionData: propSessionData, onBackToMain, onStartAnother }) {
  // Fallback to cached session for reload resilience
  const [cachedSession] = useState(() => {
    try {
      const raw = localStorage.getItem('preppilot_last_mock_interview');
      return raw ? JSON.parse(raw) : null;
    } catch (_e) {
      return null;
    }
  });

  const session = propSessionData || cachedSession || propConfig || {};

  const interviewType = session.interview_type || session.interviewType || propConfig?.interviewType || 'General Interview';
  const jobRole = session.job_role || session.jobRole || propConfig?.jobRole || '';
  const experienceLevel = session.experience_level || session.experienceLevel || propConfig?.experienceLevel || 'Beginner';
  const difficulty = session.difficulty || propConfig?.difficulty || 'Easy';
  const duration = session.duration || propConfig?.duration || '10 minutes';
  const completedAt = session.completed_at || session.completedAt || new Date().toISOString();
  const recordingId = session.local_recording_id || session.localRecordingId || '';
  const storagePath = session.recording_path || session.recordingPath || '';
  const storageBucket = session.recording_bucket || session.recordingBucket || undefined;
  const initialVideoBlob = session.videoBlob || null;
  const aiReport = session.ai_report || session.aiReport || null;
  const questionsAndAnswers = session.questions_and_answers || session.questionsAndAnswers || null;

  const [videoBlob, setVideoBlob] = useState(initialVideoBlob);
  const [videoUrl, setVideoUrl] = useState(null);
  const [isCloudSource, setIsCloudSource] = useState(false);
  const [loadingVideo, setLoadingVideo] = useState(!initialVideoBlob && Boolean(recordingId || storagePath));
  const [recordingMissing, setRecordingMissing] = useState(false);

  // Load video Blob from IndexedDB or Supabase Storage signed URL
  useEffect(() => {
    let active = true;
    let localCreatedUrl = null;

    async function fetchVideo() {
      // 1. In-memory blob from active session
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

      // 2. Try local IndexedDB
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
          console.warn('[MockInterviewResult] IndexedDB lookup error, trying Supabase Storage:', dbErr);
        }
      }

      // 3. Try Supabase Storage Signed URL
      if (storagePath) {
        try {
          const signedUrl = await getInterviewRecordingSignedUrl(storagePath, 3600, storageBucket);
          if (!active) return;
          if (signedUrl) {
            setVideoUrl(signedUrl);
            setIsCloudSource(true);
            setRecordingMissing(false);
            setLoadingVideo(false);
            return;
          }
        } catch (cloudErr) {
          console.warn('[MockInterviewResult] Supabase signed URL error:', cloudErr);
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
  }, [initialVideoBlob, recordingId, storagePath, storageBucket]);

  // Clean up Object URL on unmount
  useEffect(() => {
    return () => {
      if (videoUrl && !isCloudSource) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl, isCloudSource]);

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
    } catch (_e) {
      return dateInput;
    }
  };

  return (
    <div className="mock-result-container">
      {/* Header Banner */}
      <div className="result-header-card">
        <div className="result-success-badge">
          <CheckCircle2 size={32} color="#10b981" />
        </div>
        <h1 className="result-title">Interview Completed</h1>
        <p className="result-subtitle">
          Great job! You have successfully completed your mock interview session.
        </p>
      </div>

      {/* RECORDED VIDEO PLAYBACK CARD */}
      <div className="result-video-card">
        <div className="result-video-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Video size={18} color="#0066ff" />
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Interview Recording
            </h3>
          </div>
          <span className="badge-source-pill">
            {isCloudSource ? (
              <>
                <Cloud size={12} color="#0066ff" />
                <span>Saved in Supabase Storage</span>
              </>
            ) : (
              <>
                <HardDrive size={12} color="#10b981" />
                <span>Saved in Supabase & Local</span>
              </>
            )}
          </span>
        </div>

        {loadingVideo ? (
          <div className="result-video-loading">
            <div className="recording-spinner"></div>
            <p style={{ marginTop: '12px', fontSize: '13.5px', color: '#64748b' }}>
              Loading recorded video from Supabase...
            </p>
          </div>
        ) : videoUrl ? (
          <div className="result-video-viewport">
            {/* Real HTML5 Video Player with Native Controls (Play/Pause, Seek bar, Time, Volume) */}
            <video
              key={videoUrl}
              src={videoUrl}
              controls
              playsInline
              className="mock-result-video-element"
            />
          </div>
        ) : (
          <div className="result-video-empty">
            <AlertCircle size={32} color="#94a3b8" />
            <p style={{ marginTop: '8px', fontSize: '13.5px', color: '#64748b' }}>
              {recordingMissing
                ? 'Recording file was not saved for this session.'
                : 'No video recording available.'}
            </p>
          </div>
        )}

        {/* Recording Details Meta Chips */}
        <div className="result-video-meta-bar">
          <div className="meta-chip">
            <Calendar size={13} color="#64748b" />
            <span>Completed: {formatDate(completedAt)}</span>
          </div>
          <div className="meta-chip">
            <Clock size={13} color="#0066ff" />
            <span>Duration: {duration}</span>
          </div>
          <div className="meta-chip">
            <span style={{ fontWeight: 600, color: '#0f172a' }}>{interviewType}</span>
            <span style={{ color: '#94a3b8' }}>•</span>
            <span>{difficulty}</span>
          </div>
        </div>
      </div>

      {/* Interview Parameters Overview */}
      <div className="result-summary-card">
        <h3 className="result-section-heading">Session Configuration</h3>
        
        <div className="result-params-grid">
          <div className="result-param-item">
            <span className="param-label">Interview Type</span>
            <span className="param-value">{interviewType}</span>
          </div>

          <div className="result-param-item">
            <span className="param-label">Experience Level</span>
            <span className="param-value">{experienceLevel}</span>
          </div>

          <div className="result-param-item">
            <span className="param-label">Difficulty</span>
            <span className="param-value">{difficulty}</span>
          </div>

          <div className="result-param-item">
            <span className="param-label">Duration</span>
            <span className="param-value">{duration}</span>
          </div>
        </div>
      </div>

      {/* Questions Covered in this Session */}
      {session.questionsAsked && session.questionsAsked.length > 0 && (
        <div className="result-summary-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h3 className="result-section-heading" style={{ margin: 0 }}>
              Questions Covered by AI ({session.questionsAsked.length})
            </h3>
            <span style={{ fontSize: '12px', color: '#0066ff', fontWeight: 600, background: '#eff6ff', padding: '3px 10px', borderRadius: '12px' }}>
              Interview Questions
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {session.questionsAsked.map((q, idx) => (
              <div key={idx} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '12px 14px',
                background: '#f8fafc',
                borderRadius: '10px',
                border: '1px solid #e2e8f0'
              }}>
                <span style={{
                  background: '#0066ff',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 700,
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '1px'
                }}>
                  {idx + 1}
                </span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', lineHeight: 1.5 }}>
                  {q}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Performance Evaluation Report */}
      {aiReport ? (
        <MockInterviewAiReport
          report={aiReport}
          questionsAndAnswers={questionsAndAnswers}
          sessionConfig={{ jobRole, interviewType, experienceLevel, difficulty, duration }}
        />
      ) : (
        <div className="result-analysis-section">
          <h3 className="result-section-heading">AI Performance Analysis</h3>

          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-top">
                <Award size={18} className="text-blue-500" />
                <span className="metric-label">Overall Score</span>
              </div>
              <div className="metric-placeholder-value">—</div>
            </div>

            <div className="metric-card">
              <div className="metric-top">
                <MessageSquare size={18} className="text-purple-500" />
                <span className="metric-label">Communication</span>
              </div>
              <div className="metric-placeholder-value">—</div>
            </div>

            <div className="metric-card">
              <div className="metric-top">
                <BarChart size={18} className="text-emerald-500" />
                <span className="metric-label">Answer Quality</span>
              </div>
              <div className="metric-placeholder-value">—</div>
            </div>

            <div className="metric-card">
              <div className="metric-top">
                <Zap size={18} className="text-amber-500" />
                <span className="metric-label">Confidence</span>
              </div>
              <div className="metric-placeholder-value">—</div>
            </div>
          </div>

          <div className="feedback-notice-card">
            <Info size={20} color="#0066ff" style={{ flexShrink: 0 }} />
            <p className="notice-text">
              Detailed AI feedback will appear here after the AI interview session is completed.
            </p>
          </div>
        </div>
      )}

      {/* Bottom Actions */}
      <div className="result-actions">
        <button className="btn-secondary" onClick={onBackToMain}>
          <ArrowLeft size={16} />
          <span>Back to Mock Interviews</span>
        </button>

        <button className="btn-primary" onClick={onStartAnother}>
          <RotateCcw size={16} />
          <span>Start Another Interview</span>
        </button>
      </div>
    </div>
  );
}
