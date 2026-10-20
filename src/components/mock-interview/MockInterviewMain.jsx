import React, { useState, useEffect, useCallback } from 'react';
import { 
  Video, 
  CheckCircle2, 
  Star, 
  Clock, 
  ArrowRight, 
  Code, 
  Users, 
  Sparkles, 
  Briefcase, 
  HelpCircle, 
  FileQuestion,
  Play,
  Calendar,
  Cloud,
  AlertCircle,
  Trash2,
  Loader2
} from 'lucide-react';
import { getInterviewHistory, calculateInterviewStats, deleteMockInterview } from '../../utils/interviewService';
import { getAllLocalRecordingIds } from '../../utils/indexedDBStorage';
import MockInterviewRecordingModal from './MockInterviewRecordingModal';

export default function MockInterviewMain({ user, onStartInterview, onViewResult }) {
  const [history, setHistory] = useState([]);
  const [localRecordingIds, setLocalRecordingIds] = useState(new Set());
  const [selectedRecordingSession, setSelectedRecordingSession] = useState(null);
  const [confirmDeleteRecord, setConfirmDeleteRecord] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [stats, setStats] = useState({
    totalInterviews: 0,
    completedInterviews: 0,
    averageScore: '—',
    averageDuration: '—'
  });
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const [data, ids] = await Promise.all([
        getInterviewHistory(user?.id || 'guest'),
        getAllLocalRecordingIds()
      ]);
      setHistory(data);
      setLocalRecordingIds(new Set(ids));
      setStats(calculateInterviewStats(data));
    } catch (err) {
      console.error('[MockInterviewMain] Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const handleExecuteDelete = async () => {
    if (!confirmDeleteRecord) return;
    setIsDeleting(true);
    try {
      await deleteMockInterview(user?.id || 'guest', confirmDeleteRecord);
      if (selectedRecordingSession && (
        selectedRecordingSession.id === confirmDeleteRecord.id ||
        (selectedRecordingSession.local_recording_id && selectedRecordingSession.local_recording_id === confirmDeleteRecord.local_recording_id)
      )) {
        setSelectedRecordingSession(null);
      }
      await fetchHistory();
      setConfirmDeleteRecord(null);
    } catch (err) {
      console.error('[MockInterviewMain] Delete failed:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const getInterviewIcon = (type) => {
    switch (type) {
      case 'Technical Interview':
        return <Code size={20} className="text-blue-600" />;
      case 'HR Interview':
        return <Users size={20} className="text-purple-600" />;
      case 'Behavioral Interview':
        return <Sparkles size={20} className="text-amber-600" />;
      default:
        return <Briefcase size={20} className="text-sky-600" />;
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="mock-main-container">
      {/* 1. Page Header */}
      <div className="mock-header-card">
        <div className="mock-header-content">
          <h1 className="mock-header-title">Mock Interview</h1>
          <p className="mock-header-subtitle">
            Practice realistic interview questions with an AI interviewer, record your responses, and review your recordings anytime.
          </p>
        </div>
        <div className="mock-header-illustration">
          <div className="illustration-avatar-box">
            <Video size={36} color="#0066ff" />
            <div className="illustration-pulse-ring"></div>
          </div>
        </div>
      </div>

      {/* 2. Start Your Mock Interview Main Card */}
      <div className="start-interview-card">
        <div className="start-interview-left">
          <div className="start-icon-badge">
            <Video size={32} color="#0066ff" />
          </div>
          <div>
            <h2 className="start-card-title">Start Your Mock Interview</h2>
            <p className="start-card-desc">
              Get ready for your next opportunity! Practice with realistic interview questions and review your video performance.
            </p>
          </div>
        </div>
        <div className="start-interview-right">
          <button className="btn-primary start-btn-lg" onClick={onStartInterview}>
            <span>Start Interview</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>

      {/* 3. Previous Interview Stats */}
      <div className="mock-section">
        <h3 className="mock-section-title">Previous Interview Stats</h3>
        
        <div className="stats-cards-grid">
          {/* Card 1: Total Interviews */}
          <div className="stat-card">
            <div className="stat-card-top">
              <div className="stat-icon-wrapper blue">
                <FileQuestion size={20} />
              </div>
              <span className="stat-card-label">Total Interviews</span>
            </div>
            <div className="stat-card-value">{loading ? '...' : stats.totalInterviews}</div>
          </div>

          {/* Card 2: Completed Interviews */}
          <div className="stat-card">
            <div className="stat-card-top">
              <div className="stat-icon-wrapper green">
                <CheckCircle2 size={20} />
              </div>
              <span className="stat-card-label">Completed Interviews</span>
            </div>
            <div className="stat-card-value">{loading ? '...' : stats.completedInterviews}</div>
          </div>

          {/* Card 3: Average Score */}
          <div className="stat-card">
            <div className="stat-card-top">
              <div className="stat-icon-wrapper amber">
                <Star size={20} />
              </div>
              <span className="stat-card-label">Average Score</span>
            </div>
            <div className="stat-card-value">{loading ? '...' : stats.averageScore}</div>
          </div>

          {/* Card 4: Average Duration */}
          <div className="stat-card">
            <div className="stat-card-top">
              <div className="stat-icon-wrapper purple">
                <Clock size={20} />
              </div>
              <span className="stat-card-label">Average Duration</span>
            </div>
            <div className="stat-card-value">{loading ? '...' : stats.averageDuration}</div>
          </div>
        </div>
      </div>

      {/* 4. Recent Mock Interviews */}
      <div className="mock-section">
        <div className="mock-section-header">
          <h3 className="mock-section-title">Recent Mock Interviews</h3>
        </div>

        {history.length === 0 ? (
          <div className="empty-history-card">
            <div className="empty-icon-circle">
              <HelpCircle size={32} color="#94a3b8" />
            </div>
            <h4 className="empty-title">No mock interviews yet</h4>
            <p className="empty-subtitle">
              Complete your first mock interview to see your performance and recordings here.
            </p>
            <button className="btn-primary" style={{ marginTop: '16px' }} onClick={onStartInterview}>
              <span>Start Your First Interview</span>
              <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          <div className="recent-interviews-list">
            {history.map((record) => {
              const recId = record.local_recording_id || record.localRecordingId;
              const hasCloud = Boolean(record.recording_path || record.recordingPath);
              const isPlayable = Boolean((recId && localRecordingIds.has(recId)) || hasCloud);

              return (
                <div key={record.id} className="recent-interview-item">
                  <div className="recent-item-info">
                    <div className="recent-item-icon">
                      {getInterviewIcon(record.interview_type)}
                    </div>
                    <div>
                      <div className="recent-item-type">{record.interview_type}</div>
                      <div className="recent-item-date">{formatDate(record.completed_at)}</div>
                    </div>
                  </div>

                  <div className="recent-item-meta">
                    <div className="recent-score-pill">
                      {record.score !== null ? `${record.score}%` : 'Completed'}
                    </div>

                    <div className="recent-duration">
                      <Clock size={14} />
                      <span>{record.duration}</span>
                    </div>

                    {isPlayable && (
                      <button 
                        className="btn-watch-link"
                        onClick={() => setSelectedRecordingSession(record)}
                        title="Watch Interview Video Recording"
                      >
                        <Play size={13} fill="currentColor" />
                        <span>Recording</span>
                      </button>
                    )}

                    <button 
                      className="view-details-btn"
                      onClick={() => onViewResult && onViewResult(record)}
                    >
                      <span>View</span>
                      <ArrowRight size={14} />
                    </button>

                    <button 
                      className="btn-delete-row"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteRecord(record);
                      }}
                      title="Delete interview recording"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. My Recordings Section */}
      <div className="mock-section">
        <div className="mock-section-header">
          <div>
            <h3 className="mock-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Video size={20} color="#0066ff" />
              <span>My Interview Recordings</span>
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
              Interview recordings stored in your Supabase account and local device cache.
            </p>
          </div>
        </div>

        {history.length > 0 ? (
          <div className="my-recordings-cards-grid">
            {history.map((item, idx) => {
              const recId = item.local_recording_id || item.localRecordingId;
              const isAvailableLocally = Boolean(recId && localRecordingIds.has(recId));
              const hasCloudRecording = Boolean(item.recording_path || item.recordingPath);
              const isPlayable = isAvailableLocally || hasCloudRecording;
              const dateVal = item.completed_at || item.completedAt;

              return (
                <div key={item.id || idx} className="my-recording-card">
                  <div className="card-top-row">
                    <span className="pill-diff beginner">
                      {item.difficulty || 'Easy'}
                    </span>
                    <span className={`badge-avail ${isPlayable ? 'available' : 'missing'}`}>
                      {isAvailableLocally ? (
                        <>
                          <CheckCircle2 size={12} />
                          <span>Available (Supabase & Local)</span>
                        </>
                      ) : hasCloudRecording ? (
                        <>
                          <Cloud size={12} />
                          <span>Available in Supabase</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle size={12} />
                          <span>Not available on this device</span>
                        </>
                      )}
                    </span>
                  </div>

                  <h4 className="my-recording-topic">
                    {item.interview_type || 'Mock Interview'}
                  </h4>

                  <div className="my-recording-meta-list">
                    <div className="meta-row">
                      <Calendar size={13} color="#64748b" />
                      <span className="meta-text">{formatDate(dateVal)}</span>
                    </div>
                    <div className="meta-row">
                      <Clock size={13} color="#0066ff" />
                      <span className="meta-text">
                        Duration: <strong>{item.duration || '10 minutes'}</strong>
                        <span style={{ color: '#94a3b8', marginLeft: '6px' }}>
                          • {item.experience_level || 'Beginner'}
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="card-action-footer">
                    <button
                      className={`btn-watch-recording ${!isPlayable ? 'btn-watch-muted' : ''}`}
                      onClick={() => {
                        if (isPlayable) {
                          setSelectedRecordingSession(item);
                        } else if (onViewResult) {
                          onViewResult(item);
                        }
                      }}
                    >
                      <Play size={14} fill={isPlayable ? "currentColor" : "none"} />
                      <span>{isPlayable ? 'Watch Recording' : 'View Session'}</span>
                    </button>

                    <button
                      className="btn-delete-card"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteRecord(item);
                      }}
                      title="Delete recording"
                    >
                      <Trash2 size={15} />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-history-card">
            <Video size={40} color="#94a3b8" style={{ marginBottom: '12px' }} />
            <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
              No interview recordings yet
            </h4>
            <p style={{ fontSize: '13.5px', color: '#64748b' }}>
              Complete your first Mock Interview session to see and watch your recordings here.
            </p>
          </div>
        )}
      </div>

      {/* Replay Modal */}
      {selectedRecordingSession && (
        <MockInterviewRecordingModal
          session={selectedRecordingSession}
          onClose={() => setSelectedRecordingSession(null)}
          onDelete={(rec) => {
            setSelectedRecordingSession(null);
            setConfirmDeleteRecord(rec);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteRecord && (
        <div className="modal-overlay" onClick={() => !isDeleting && setConfirmDeleteRecord(null)}>
          <div className="delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="delete-confirm-icon-box">
              <Trash2 size={26} color="#ef4444" />
            </div>
            <h3 className="delete-confirm-title">Delete Interview Recording?</h3>
            <p className="delete-confirm-desc">
              Are you sure you want to permanently delete this interview recording? It will be removed from your Supabase storage, database, and local cache.
            </p>

            <div className="delete-confirm-details">
              <div className="delete-detail-row">
                <span className="detail-label">Type</span>
                <span className="detail-val">{confirmDeleteRecord.interview_type || confirmDeleteRecord.interviewType || 'Mock Interview'}</span>
              </div>
              <div className="delete-detail-row">
                <span className="detail-label">Date</span>
                <span className="detail-val">{formatDate(confirmDeleteRecord.completed_at || confirmDeleteRecord.completedAt)}</span>
              </div>
              <div className="delete-detail-row">
                <span className="detail-label">Duration</span>
                <span className="detail-val">{confirmDeleteRecord.duration || '10 minutes'}</span>
              </div>
            </div>

            <div className="delete-confirm-actions">
              <button 
                className="btn-secondary" 
                onClick={() => setConfirmDeleteRecord(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button 
                className="btn-danger-solid" 
                onClick={handleExecuteDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={15} className="spin-animate" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={15} />
                    <span>Delete Permanently</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
