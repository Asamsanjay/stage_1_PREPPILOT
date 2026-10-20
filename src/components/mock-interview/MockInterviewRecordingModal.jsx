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
  Video, 
  Briefcase,
  Trash2
} from 'lucide-react';
import { getLocalRecording } from '../../utils/indexedDBStorage';
import { getInterviewRecordingSignedUrl } from '../../utils/interviewService';

/**
 * Modal to replay a previously recorded Mock Interview video from Supabase Storage or local IndexedDB.
 */
export default function MockInterviewRecordingModal({ session, onClose, onDelete }) {
  const [loading, setLoading] = useState(true);
  const [videoBlob, setVideoBlob] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [storageSource, setStorageSource] = useState('local'); // 'local' | 'cloud'
  const [isMissing, setIsMissing] = useState(false);

  const {
    interview_type = 'Mock Interview',
    interviewType,
    experience_level = 'Beginner',
    experienceLevel,
    difficulty = 'Easy',
    duration = '10 minutes',
    completed_at,
    completedAt,
    local_recording_id,
    localRecordingId,
    recording_path,
    recordingPath,
    recording_bucket,
    recordingBucket
  } = session || {};

  const type = interview_type || interviewType || 'Mock Interview';
  const exp = experience_level || experienceLevel || 'Beginner';
  const recordingId = local_recording_id || localRecordingId;
  const storagePath = recording_path || recordingPath;
  const bucket = recording_bucket || recordingBucket;
  const completionDate = completed_at || completedAt || new Date().toISOString();

  // Load video from local IndexedDB or Supabase Storage Signed URL
  useEffect(() => {
    let active = true;
    let createdUrl = null;

    async function loadRecording() {
      setLoading(true);

      // 1. Check local IndexedDB first for instant access
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
          console.warn('[MockInterviewRecordingModal] IndexedDB lookup error, checking Supabase Cloud:', dbErr);
        }
      }

      // 2. Fall back to Supabase Storage signed URL
      if (storagePath) {
        try {
          const signedUrl = await getInterviewRecordingSignedUrl(storagePath, 3600, bucket);
          if (active && signedUrl) {
            setVideoUrl(signedUrl);
            setStorageSource('cloud');
            setVideoBlob(null);
            setIsMissing(false);
            setLoading(false);
            return;
          }
        } catch (cloudErr) {
          console.warn('[MockInterviewRecordingModal] Supabase signed URL error:', cloudErr);
        }
      }

      if (active) {
        setIsMissing(true);
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
  }, [recordingId, storagePath, bucket]);

  // Clean up object URL on close/unmount
  useEffect(() => {
    return () => {
      if (videoUrl && storageSource === 'local') {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl, storageSource]);

  const formatDate = (isoString) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (_e) {
      return isoString;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-card recording-modal-card" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '820px', width: '92%', maxHeight: '92vh', overflowY: 'auto' }}
      >
        {/* Modal Header */}
        <div className="modal-header-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="modal-header-icon-box">
              <Video size={20} color="#0066ff" />
            </div>
            <div>
              <h3 className="modal-title" style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                Interview Recording
              </h3>
              <p className="modal-subtitle" style={{ fontSize: '13px', color: '#64748b' }}>
                {type} • {exp}
              </p>
            </div>
          </div>
          <button className="btn-close-modal" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {/* Video Player Box */}
        <div className="recording-player-box" style={{ marginTop: '16px' }}>
          {loading ? (
            <div className="recording-player-loading" style={{ minHeight: '360px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#090f1d', borderRadius: '14px', color: '#fff' }}>
              <div className="recording-spinner"></div>
              <p style={{ marginTop: '14px', fontSize: '14px', color: '#94a3b8' }}>
                Loading interview recording from Supabase...
              </p>
            </div>
          ) : isMissing ? (
            <div className="recording-player-missing" style={{ minHeight: '320px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#090f1d', borderRadius: '14px', padding: '32px', textAlign: 'center' }}>
              <AlertCircle size={48} color="#ef4444" style={{ marginBottom: '12px' }} />
              <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', marginBottom: '6px' }}>
                Recording Not Available
              </h4>
              <p style={{ fontSize: '13.5px', color: '#94a3b8', maxWidth: '380px' }}>
                This recording could not be retrieved from Supabase storage or your browser cache.
              </p>
            </div>
          ) : videoUrl ? (
            <div className="recording-video-wrapper" style={{ background: '#000', borderRadius: '14px', overflow: 'hidden' }}>
              <video
                key={videoUrl}
                src={videoUrl}
                controls
                playsInline
                autoPlay={false}
                style={{ width: '100%', maxHeight: '440px', display: 'block' }}
              />
            </div>
          ) : null}
        </div>

        {/* Storage Source & Metadata Row */}
        <div className="recording-info-grid" style={{ marginTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: '#475569' }}>
              <Calendar size={14} color="#64748b" />
              <span>{formatDate(completionDate)}</span>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: '#475569' }}>
              <Clock size={14} color="#0066ff" />
              <span>Duration: <strong>{duration}</strong></span>
            </span>
            <span style={{ fontSize: '12.5px', background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>
              {difficulty}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 600, color: storageSource === 'cloud' ? '#0066ff' : '#10b981' }}>
            {storageSource === 'cloud' ? (
              <>
                <Cloud size={14} />
                <span>Supabase Storage</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={14} />
                <span>Supabase & Local</span>
              </>
            )}
          </div>
        </div>

        {/* Modal Action Footer */}
        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
          <button className="btn-secondary" onClick={onClose} style={{ padding: '10px 22px' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
