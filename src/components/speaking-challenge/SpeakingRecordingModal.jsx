import React, { useState, useEffect } from 'react';
import { 
  X, 
  Play, 
  Clock, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  HardDrive, 
  Cloud,
  Award,
  Video,
  Trash2
} from 'lucide-react';
import { getLocalRecording } from '../../utils/indexedDBStorage';
import { getRecordingSignedUrl } from '../../utils/speakingService';

/**
 * Modal to replay a previously recorded Speaking Challenge video from Supabase Storage or local IndexedDB.
 *
 * Rules:
 * - Uses real video element: <video controls playsInline />
 * - Tries local IndexedDB Blob first for instant response.
 * - Falls back to Supabase Storage signed URL (enabling cross-device playback).
 * - Revokes object URLs when closed or unmounted.
 * - If recording is missing from both cloud and local, displays honest message.
 * - Never renders a fake player.
 */
export default function SpeakingRecordingModal({ session, onClose, onDelete }) {
  const [loading, setLoading] = useState(true);
  const [videoBlob, setVideoBlob] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [storageSource, setStorageSource] = useState('local'); // 'local' | 'cloud'
  const [isMissing, setIsMissing] = useState(false);

  const {
    topic = 'Untitled Challenge',
    difficulty = 'Beginner',
    duration_seconds,
    durationSeconds,
    duration_label,
    durationLabel,
    spent_seconds,
    spentSeconds,
    completed_at,
    completedAt,
    local_recording_id,
    localRecordingId,
    recording_path,
    recordingPath
  } = session || {};

  const recordingId = local_recording_id || localRecordingId;
  const storagePath = recording_path || recordingPath;
  const actualDuration = spent_seconds ?? spentSeconds ?? 0;
  const plannedSeconds = duration_seconds ?? durationSeconds ?? 60;
  const completionDate = completed_at || completedAt || new Date().toISOString();

  // Load video from local IndexedDB or Supabase Storage Signed URL
  useEffect(() => {
    let active = true;
    let createdUrl = null;

    async function loadRecording() {
      setLoading(true);

      // 1. Check local IndexedDB first
      if (recordingId) {
        try {
          const record = await getLocalRecording(recordingId);
          if (active && record && record.blob && record.blob.size > 0) {
            setVideoBlob(record.blob);
            createdUrl = URL.createObjectURL(record.blob);
            setVideoUrl(createdUrl);
            setStorageSource('local');
            setIsMissing(false);
            setLoading(false);
            return;
          }
        } catch (dbErr) {
          console.warn('[SpeakingRecordingModal] IndexedDB lookup error, checking Supabase Cloud:', dbErr);
        }
      }

      // 2. Fall back to Supabase Storage private signed URL
      if (storagePath) {
        try {
          const signedUrl = await getRecordingSignedUrl(storagePath);
          if (active && signedUrl) {
            setVideoUrl(signedUrl);
            setStorageSource('cloud');
            setVideoBlob(null);
            setIsMissing(false);
            setLoading(false);
            return;
          }
        } catch (cloudErr) {
          console.warn('[SpeakingRecordingModal] Supabase signed URL error:', cloudErr);
        }
      }

      if (active) {
        setIsMissing(true);
        setVideoBlob(null);
        setVideoUrl(null);
        setLoading(false);
      }
    }

    loadRecording();

    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [recordingId, storagePath]);

  // Clean up object URL on unmount or URL change
  useEffect(() => {
    return () => {
      if (videoUrl && videoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const formatDuration = (secs) => {
    if (!secs || secs <= 0) return '0s';
    if (secs < 60) return `${secs}s`;
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  };

  const formatDate = (dateStr) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (_e) {
      return dateStr;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-card speaking-recording-modal-card" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="recording-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="modal-header-icon-box">
              <Video size={18} color="#ffffff" />
            </div>
            <div>
              <h3 className="recording-modal-title">Challenge Recording</h3>
              <p className="recording-modal-subtitle">
                {storageSource === 'cloud' ? 'Stored in Supabase Cloud Storage' : 'Stored on this device'}
              </p>
            </div>
          </div>
          <button 
            className="btn-modal-close" 
            onClick={onClose} 
            title="Close"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="recording-modal-body">
          {loading ? (
            <div className="recording-loading-box">
              <div className="recording-spinner"></div>
              <p style={{ marginTop: '14px', fontSize: '14px', color: '#64748b', fontWeight: 600 }}>
                Loading recording...
              </p>
            </div>
          ) : isMissing ? (
            /* Missing Recording Honest Warning */
            <div className="recording-missing-banner">
              <div className="missing-icon-box">
                <AlertCircle size={32} color="#f59e0b" />
              </div>
              <h4 className="missing-title">Recording Not Available</h4>
              <p className="missing-message">
                This recording is not available. It may have been deleted or removed from your Supabase storage.
              </p>
              <div className="missing-privacy-notice">
                <Cloud size={14} color="#64748b" />
                <span>
                  PrepPilot stores user recordings in your private Supabase account bucket protected by Row Level Security (RLS).
                </span>
              </div>
            </div>
          ) : (
            /* Real Video Player */
            <div className="recording-player-wrapper">
              <video
                key={videoUrl}
                src={videoUrl}
                controls
                playsInline
                className="challenge-playback-video"
              />
            </div>
          )}

          {/* Metadata Card */}
          <div className="recording-metadata-card">
            <div className="meta-topic-row">
              <span className="meta-label">Topic</span>
              <h4 className="meta-topic-title">"{topic}"</h4>
            </div>

            <div className="meta-grid">
              <div className="meta-item">
                <span className="meta-item-label">Difficulty</span>
                <span className={`pill-diff ${difficulty?.toLowerCase()}`}>
                  {difficulty}
                </span>
              </div>

              <div className="meta-item">
                <span className="meta-item-label">Completion Date</span>
                <span className="meta-item-value" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Calendar size={13} color="#64748b" />
                  {formatDate(completionDate)}
                </span>
              </div>

              <div className="meta-item">
                <span className="meta-item-label">Speaking Duration</span>
                <span className="meta-item-value" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Clock size={13} color="#0066ff" />
                  <strong>{formatDuration(actualDuration)}</strong>
                  <span style={{ color: '#94a3b8', fontSize: '12px' }}>
                    (Goal: {duration_label || durationLabel || `${plannedSeconds}s`})
                  </span>
                </span>
              </div>

              <div className="meta-item">
                <span className="meta-item-label">Storage Location</span>
                <span className="meta-item-value" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  {storageSource === 'cloud' ? (
                    <>
                      <Cloud size={13} color="#0066ff" />
                      <span style={{ color: '#0066ff', fontWeight: 600 }}>Supabase Storage (Signed URL)</span>
                    </>
                  ) : (
                    <>
                      <HardDrive size={13} color="#10b981" />
                      <span style={{ color: '#10b981', fontWeight: 600 }}>Supabase & IndexedDB Cache</span>
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="recording-modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {onDelete ? (
            <button 
              className="btn-danger-outline"
              onClick={() => onDelete(session)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: '10px', fontSize: '13.5px', color: '#ef4444', background: '#fef2f2', border: '1px solid #fecaca', cursor: 'pointer', fontWeight: 600 }}
            >
              <Trash2 size={15} />
              <span>Delete Recording</span>
            </button>
          ) : <div />}

          <button className="btn-secondary" onClick={onClose} style={{ padding: '9px 20px' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
