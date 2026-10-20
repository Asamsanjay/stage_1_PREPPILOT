import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Mic, 
  Play, 
  BarChart2, 
  Clock, 
  CheckCircle2, 
  ArrowLeft, 
  ArrowRight, 
  Search, 
  Shuffle, 
  Edit3, 
  Check, 
  Sparkles,
  Zap,
  HelpCircle,
  Eye,
  Award,
  Camera,
  AlertCircle,
  Calendar,
  Cloud,
  Video,
  Trash2,
  Loader2
} from 'lucide-react';
import { beginnerTopics, intermediateTopics, advancedTopics } from '../../data/speakingTopics';
import SpeakingChallengeSession from './SpeakingChallengeSession';
import SpeakingChallengeResult from './SpeakingChallengeResult';
import SpeakingRecordingModal from './SpeakingRecordingModal';
import { useMediaStream } from '../../hooks/useMediaStream';
import { getSpeakingHistory, calculateSpeakingStats, deleteSpeakingChallenge } from '../../utils/speakingService';
import { getAllLocalRecordingIds } from '../../utils/indexedDBStorage';
import './SpeakingChallenge.css';

export default function SpeakingChallengeView({ user, onGoHome, onSessionStateChange, initialTopic }) {
  // Current view mode: 'main' | 'setup' | 'prep_timer' | 'session' | 'result'
  const [viewMode, setViewMode] = useState(() => {
    const path = window.location.pathname;
    if (path === '/speaking-challenge/session' || path.endsWith('/session')) return 'session';
    if (path === '/speaking-challenge/result' || path.endsWith('/result')) return 'result';
    return 'main';
  });

  // Notify parent of session active state
  useEffect(() => {
    if (onSessionStateChange) {
      onSessionStateChange(viewMode === 'session');
    }
  }, [viewMode, onSessionStateChange]);

  // Sync state with popstate browser navigation
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path.endsWith('/session')) {
        setViewMode('session');
      } else if (path.endsWith('/result')) {
        setViewMode('result');
      } else {
        setViewMode('main');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Setup Wizard State
  const [currentStep, setCurrentStep] = useState(1); // 1, 2, 3, 4
  const [selectedDifficulty, setSelectedDifficulty] = useState(null); // 'Beginner' | 'Intermediate' | 'Advanced'
  const [selectedTopic, setSelectedTopic] = useState(() => {
    if (initialTopic && typeof initialTopic === 'string') return initialTopic;
    const randomIndex = Math.floor(Math.random() * beginnerTopics.length);
    return beginnerTopics[randomIndex];
  });

  // Sync initialTopic if passed
  useEffect(() => {
    if (initialTopic && typeof initialTopic === 'string') {
      setSelectedTopic(initialTopic);
    }
  }, [initialTopic]);

  const [selectedDuration, setSelectedDuration] = useState(null); // { seconds, label, desc }
  const [selectedPrep, setSelectedPrep] = useState(null); // 'now' | '5min'

  // Topic Search & Random Topic State
  const [searchQuery, setSearchQuery] = useState('');

  // 5-Minute Prep Timer State
  const [prepTimeLeft, setPrepTimeLeft] = useState(300); // 300s = 5m

  // MediaStream hook
  const {
    stream: mediaStream,
    requestMedia,
    stopMedia,
    attachVideo,
    error: mediaHookError,
    isLoading: isEnablingMedia
  } = useMediaStream();

  const [cameraChecked, setCameraChecked] = useState(false);
  const [micChecked, setMicChecked] = useState(false);
  const [mediaError, setMediaError] = useState('');
  const previewVideoRef = useRef(null);

  // Sync video element with mediaStream
  useEffect(() => {
    if (mediaStream && mediaStream.active) {
      const vTracks = mediaStream.getVideoTracks();
      const aTracks = mediaStream.getAudioTracks();
      setCameraChecked(vTracks.length > 0 && vTracks[0].readyState === 'live');
      setMicChecked(aTracks.length > 0 && aTracks[0].readyState === 'live');
    }
    if (previewVideoRef.current && mediaStream) {
      attachVideo(previewVideoRef, mediaStream);
    }
  }, [mediaStream, currentStep, attachVideo]);

  // Completed challenges history (fetched from Supabase and client metadata cache)
  const [history, setHistory] = useState([]);
  const [localRecordingIds, setLocalRecordingIds] = useState(new Set());
  const [selectedRecordingSession, setSelectedRecordingSession] = useState(null);
  const [confirmDeleteSession, setConfirmDeleteSession] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Active Session Result Data (with cached metadata fallback for page refresh)
  const [lastSessionData, setLastSessionData] = useState(() => {
    try {
      const cached = localStorage.getItem('preppilot_last_speaking_session');
      return cached ? JSON.parse(cached) : null;
    } catch (_e) {
      return null;
    }
  });

  const userId = user?.id || 'guest';

  const handleExecuteDelete = async () => {
    if (!confirmDeleteSession) return;
    setIsDeleting(true);
    try {
      await deleteSpeakingChallenge(userId, confirmDeleteSession);
      if (selectedRecordingSession && (
        selectedRecordingSession.id === confirmDeleteSession.id ||
        (selectedRecordingSession.local_recording_id && selectedRecordingSession.local_recording_id === confirmDeleteSession.local_recording_id)
      )) {
        setSelectedRecordingSession(null);
      }
      await refreshHistory();
      setConfirmDeleteSession(null);
    } catch (err) {
      console.error('[SpeakingChallengeView] Delete failed:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Load history from Supabase / local cache and check IndexedDB local recording IDs
  const refreshHistory = useCallback(async () => {
    try {
      const [list, ids] = await Promise.all([
        getSpeakingHistory(userId),
        getAllLocalRecordingIds()
      ]);
      setHistory(list);
      setLocalRecordingIds(new Set(ids));
    } catch (err) {
      console.error('[SpeakingChallengeView] Failed to refresh history:', err);
    }
  }, [userId]);

  // Initial and user-change refresh
  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  // Proactively refresh whenever returning to 'main' view
  useEffect(() => {
    if (viewMode === 'main') {
      refreshHistory();
    }
  }, [viewMode, refreshHistory]);

  // 5-minute prep timer countdown
  useEffect(() => {
    let timer = null;
    if (viewMode === 'prep_timer') {
      if (prepTimeLeft <= 0) {
        setViewMode('session');
        window.history.pushState(null, '', '/speaking-challenge/session');
      } else {
        timer = setInterval(() => {
          setPrepTimeLeft(prev => prev - 1);
        }, 1000);
      }
    }
    return () => clearInterval(timer);
  }, [viewMode, prepTimeLeft]);

  // Get active topic list based on selected difficulty
  const getTopicList = () => {
    if (selectedDifficulty === 'Beginner') return beginnerTopics;
    if (selectedDifficulty === 'Intermediate') return intermediateTopics;
    if (selectedDifficulty === 'Advanced') return advancedTopics;
    return [];
  };

  // Filtered topics based on search query
  const filteredTopics = getTopicList().filter(topic =>
    topic.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  // Handle Random Topic selection
  const handleRandomTopic = () => {
    const list = getTopicList();
    const pool = list.length > 0 ? list : beginnerTopics;
    const randomIndex = Math.floor(Math.random() * pool.length);
    setSelectedTopic(pool[randomIndex]);
  };

  // Start Challenge Flow (Open Step 1)
  const handleStartFlow = () => {
    setSelectedDifficulty(null);
    if (!selectedTopic) {
      const randomIndex = Math.floor(Math.random() * beginnerTopics.length);
      setSelectedTopic(beginnerTopics[randomIndex]);
    }
    setSelectedDuration(null);
    setSelectedPrep(null);
    setSearchQuery('');
    setCurrentStep(1);
    setViewMode('setup');
  };

  // Duration options
  const durationOptions = [
    { seconds: 5, label: '5 seconds', desc: 'Quick confidence challenge' },
    { seconds: 30, label: '30 seconds', desc: 'Short response' },
    { seconds: 60, label: '1 minute', desc: 'Focused speaking' },
    { seconds: 120, label: '2 minutes', desc: 'Detailed response' },
    { seconds: 300, label: '5 minutes', desc: 'Extended speaking' }
  ];

  // Handle Step 4 Start Speaking click
  const handleStartSpeakingClick = () => {
    if (selectedPrep === '5min') {
      setPrepTimeLeft(300);
      setViewMode('prep_timer');
    } else {
      setViewMode('session');
      window.history.pushState(null, '', '/speaking-challenge/session');
    }
  };

  // Handle completed session from SpeakingChallengeSession component
  const handleSessionComplete = (sessionData) => {
    // Add to history state immediately with deduplication
    setHistory(prev => {
      const idA = sessionData.local_recording_id || sessionData.localRecordingId || sessionData.id;
      const exists = prev.some(p => (p.local_recording_id || p.localRecordingId || p.id) === idA);
      return exists ? prev : [sessionData, ...prev];
    });

    const recId = sessionData.localRecordingId || sessionData.local_recording_id;
    if (recId) {
      setLocalRecordingIds(prev => new Set([...prev, recId]));
    }

    // Cache metadata only for result page refresh resilience (NO BLOBS in localStorage!)
    try {
      const metaOnly = { ...sessionData, videoBlob: undefined };
      localStorage.setItem('preppilot_last_speaking_session', JSON.stringify(metaOnly));
    } catch (_e) {}

    setLastSessionData(sessionData);
    setViewMode('result');
    window.history.pushState(null, '', '/speaking-challenge/result');

    // Trigger full background refresh to ensure Supabase and local caches are unified
    refreshHistory();
  };

  // Reset to setup wizard for "Try Another Challenge"
  const handleTryAnother = () => {
    setSelectedDifficulty(null);
    setSelectedTopic('');
    setSelectedDuration(null);
    setSelectedPrep(null);
    setSearchQuery('');
    setCurrentStep(1);
    setViewMode('setup');
    window.history.pushState(null, '', '/speaking-challenge');
    refreshHistory();
  };

  // Re-attempt the same challenge topic
  const handleRetryTopic = (topicToRetry, diffToRetry, durationSecs) => {
    setSelectedTopic(topicToRetry || selectedTopic);
    setSelectedDifficulty(diffToRetry || selectedDifficulty || 'Beginner');
    setSelectedDuration({
      seconds: durationSecs || 60,
      label: `${durationSecs || 60} seconds`,
      desc: 'Selected practice'
    });
    setSelectedPrep('now');
    setViewMode('session');
    window.history.pushState(null, '', '/speaking-challenge/session');
  };

  // Helper stats computation via speakingService
  const stats = calculateSpeakingStats(history);
  const totalChallenges = stats.totalChallenges;
  const completedChallenges = stats.completedChallenges;
  const avgScore = stats.averageScore;
  const avgSpeakingTime = stats.averageSpeakingTime;

  // Format date helper for cards & table
  const formatCardDate = (dateStr) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (_e) {
      return dateStr;
    }
  };

  // Format duration helper for cards & table
  const formatCardDuration = (secs) => {
    if (!secs || secs <= 0) return '0s';
    if (secs < 60) return `${secs}s`;
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  };

  // Format MM:SS for 5-minute prep timer
  const formatPrepTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  /* =========================================================================
     1. SPEAKING CHALLENGE MAIN PAGE VIEW
     ========================================================================= */
  if (viewMode === 'main') {
    return (
      <div className="speaking-challenge-main-container">
        {/* HEADER */}
        <div className="speaking-header-section">
          <div className="speaking-header-icon-box">
            <Mic size={28} />
          </div>
          <div>
            <h2 className="speaking-header-title">Speaking Challenge</h2>
            <p className="speaking-header-desc">
              Improve your communication skills by speaking on random topics and challenging yourself to speak clearly and confidently.
            </p>
          </div>
        </div>

        {/* START SPEAKING CHALLENGE CARD */}
        <div className="start-challenge-hero-card">
          <div className="hero-card-content">
            <div className="hero-badge-tag">spontaneous practice</div>
            <h3 className="hero-card-title">Start Speaking Challenge</h3>
            <p className="hero-card-desc">
              Choose a topic, prepare your thoughts, and speak confidently for the selected duration.
            </p>
            <button className="btn-start-hero" onClick={handleStartFlow}>
              <span>Start Challenge →</span>
            </button>
          </div>
        </div>

        {/* PREVIOUS SPEAKING STATS */}
        <div className="stats-section-container">
          <h3 className="section-subheading">Previous Speaking Stats</h3>
          <div className="stats-grid-4">
            <div className="stat-card">
              <span className="stat-card-title">Total Challenges</span>
              <span className="stat-card-value">{totalChallenges}</span>
            </div>
            <div className="stat-card">
              <span className="stat-card-title">Completed Challenges</span>
              <span className="stat-card-value">{completedChallenges}</span>
            </div>
            <div className="stat-card">
              <span className="stat-card-title">Average Score</span>
              <span className="stat-card-value">{avgScore}</span>
            </div>
            <div className="stat-card">
              <span className="stat-card-title">Average Speaking Time</span>
              <span className="stat-card-value">{avgSpeakingTime}</span>
            </div>
          </div>
        </div>

        {/* RECENT CHALLENGES */}
        <div className="recent-section-container">
          <h3 className="section-subheading">Recent Challenges</h3>

          {history.length > 0 ? (
            <div className="recent-challenges-table-card">
              <table className="recent-table">
                <thead>
                  <tr>
                    <th>Topic</th>
                    <th>Difficulty</th>
                    <th>Date</th>
                    <th>Score</th>
                    <th>Speaking Duration</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item, idx) => {
                    const actualSecs = item.spent_seconds ?? item.spentSeconds ?? 0;
                    const plannedSecs = item.duration_seconds ?? item.durationSeconds ?? 60;
                    const dateVal = item.completed_at || item.completedAt;
                    return (
                      <tr key={item.id || idx}>
                        <td className="cell-topic">{item.topic}</td>
                        <td>
                          <span className={`pill-diff ${item.difficulty?.toLowerCase()}`}>
                            {item.difficulty}
                          </span>
                        </td>
                        <td className="cell-date">
                          {formatCardDate(dateVal)}
                        </td>
                        <td className="cell-score">
                          {item.score !== null && item.score !== undefined && !isNaN(Number(item.score)) ? (
                            <span className="pill-score-table">{item.score}/100</span>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>—</span>
                          )}
                        </td>
                        <td className="cell-duration">
                          {formatCardDuration(actualSecs)} ({item.duration_label || item.durationLabel || `${plannedSecs}s`})
                        </td>
                        <td className="cell-actions-flex">
                          <button 
                            className="btn-view-link"
                            onClick={() => {
                              setLastSessionData(item);
                              setViewMode('result');
                              window.history.pushState(null, '', '/speaking-challenge/result');
                            }}
                          >
                            View →
                          </button>
                          <button 
                            className="btn-delete-table-row"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteSession(item);
                            }}
                            title="Delete speaking challenge & recording"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-recent-card">
              <HelpCircle size={40} color="#94a3b8" style={{ marginBottom: '12px' }} />
              <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                No speaking challenges yet
              </h4>
              <p style={{ fontSize: '13.5px', color: '#64748b' }}>
                Complete your first speaking challenge to track your progress.
              </p>
            </div>
          )}
        </div>

        {/* MY RECORDINGS SECTION */}
        <div className="my-recordings-section-container">
          <div className="section-title-row">
            <div>
              <h3 className="section-subheading" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Video size={18} color="#0066ff" />
                <span>My Recordings</span>
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                Practice recordings stored in your Supabase account and local device cache.
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
                const actualSecs = item.spent_seconds ?? item.spentSeconds ?? 0;
                const plannedSecs = item.duration_seconds ?? item.durationSeconds ?? 60;
                const dateVal = item.completed_at || item.completedAt;

                return (
                  <div key={item.id || idx} className="my-recording-card">
                    <div className="card-top-row">
                      <span className={`pill-diff ${item.difficulty?.toLowerCase()}`}>
                        {item.difficulty}
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

                    <h4 className="my-recording-topic" title={item.topic}>
                      "{item.topic}"
                    </h4>

                    <div className="my-recording-meta-list">
                      <div className="meta-row">
                        <Calendar size={13} color="#64748b" />
                        <span className="meta-text">{formatCardDate(dateVal)}</span>
                      </div>
                      <div className="meta-row">
                        <Clock size={13} color="#0066ff" />
                        <span className="meta-text">
                          Speaking Duration: <strong>{formatCardDuration(actualSecs)}</strong>
                          <span style={{ color: '#94a3b8', marginLeft: '4px' }}>
                            (Goal: {item.duration_label || item.durationLabel || `${plannedSecs}s`})
                          </span>
                        </span>
                      </div>
                    </div>

                    <div className="card-action-footer">
                      <button
                        className={`btn-watch-recording ${!isPlayable ? 'btn-watch-muted' : ''}`}
                        onClick={() => setSelectedRecordingSession(item)}
                      >
                        <Play size={14} fill={isPlayable ? "currentColor" : "none"} />
                        <span>Watch Recording</span>
                      </button>

                      <button
                        className="btn-delete-card"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteSession(item);
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
            <div className="empty-recordings-card">
              <Video size={40} color="#94a3b8" style={{ marginBottom: '12px' }} />
              <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                No recordings yet
              </h4>
              <p style={{ fontSize: '13.5px', color: '#64748b' }}>
                Complete your first Speaking Challenge to see your recordings here.
              </p>
            </div>
          )}
        </div>

        {/* Replay Modal */}
        {selectedRecordingSession && (
          <SpeakingRecordingModal
            session={selectedRecordingSession}
            onClose={() => setSelectedRecordingSession(null)}
            onDelete={(sess) => {
              setSelectedRecordingSession(null);
              setConfirmDeleteSession(sess);
            }}
          />
        )}

        {/* Delete Confirmation Modal */}
        {confirmDeleteSession && (
          <div className="modal-overlay" onClick={() => !isDeleting && setConfirmDeleteSession(null)}>
            <div className="delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
              <div className="delete-confirm-icon-box">
                <Trash2 size={26} color="#ef4444" />
              </div>
              <h3 className="delete-confirm-title">Delete Speaking Recording?</h3>
              <p className="delete-confirm-desc">
                Are you sure you want to permanently delete this challenge recording? It will be removed from your Supabase storage, database, and local cache.
              </p>

              <div className="delete-confirm-details">
                <div className="delete-detail-row">
                  <span className="detail-label">Topic</span>
                  <span className="detail-val">"{confirmDeleteSession.topic}"</span>
                </div>
                <div className="delete-detail-row">
                  <span className="detail-label">Difficulty</span>
                  <span className="detail-val">{confirmDeleteSession.difficulty}</span>
                </div>
                <div className="delete-detail-row">
                  <span className="detail-label">Date</span>
                  <span className="detail-val">{formatCardDate(confirmDeleteSession.completed_at || confirmDeleteSession.completedAt)}</span>
                </div>
                <div className="delete-detail-row">
                  <span className="detail-label">Duration</span>
                  <span className="detail-val">{formatCardDuration(confirmDeleteSession.spent_seconds ?? confirmDeleteSession.spentSeconds ?? 0)}</span>
                </div>
              </div>

              <div className="delete-confirm-actions">
                <button 
                  className="btn-secondary" 
                  onClick={() => setConfirmDeleteSession(null)}
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

  // Handle Enable Media in Step 4
  const handleEnableMedia = async () => {
    setMediaError('');
    const newStream = await requestMedia();
    if (newStream && newStream.active) {
      const v = newStream.getVideoTracks();
      const a = newStream.getAudioTracks();
      setCameraChecked(v.length > 0 && v[0].readyState === 'live');
      setMicChecked(a.length > 0 && a[0].readyState === 'live');
      if (previewVideoRef.current) {
        attachVideo(previewVideoRef, newStream);
      }
    } else {
      setCameraChecked(false);
      setMicChecked(false);
      setMediaError(
        mediaHookError || 'Unable to access your camera and microphone. Please try again.'
      );
    }
  };

  /* =========================================================================
     5-MINUTE PREPARATION TIMER VIEW
     ========================================================================= */
  if (viewMode === 'prep_timer') {
    return (
      <div className="prep-timer-view-container">
        <div className="prep-timer-card">
          <div className="prep-timer-header">
            <Clock size={28} color="#0066ff" />
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>Preparation Time</h3>
          </div>

          <div className="prep-timer-clock-display">
            {formatPrepTime(prepTimeLeft)}
          </div>

          <div className="prep-summary-box">
            <div className="prep-summary-row">
              <span className="prep-summary-label">Topic:</span>
              <span className="prep-summary-val topic-highlight">{selectedTopic}</span>
            </div>
            <div className="prep-summary-row">
              <span className="prep-summary-label">Difficulty:</span>
              <span className="prep-summary-val">{selectedDifficulty}</span>
            </div>
            <div className="prep-summary-row">
              <span className="prep-summary-label">Speaking Duration:</span>
              <span className="prep-summary-val">{selectedDuration?.label}</span>
            </div>
          </div>

          <p style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', marginBottom: '24px' }}>
            Take up to 5 minutes to outline your key points. No AI response will be generated for you.
          </p>

          <button 
            className="btn-primary" 
            style={{ width: '100%', padding: '14px', fontSize: '15px' }}
            onClick={() => setViewMode('session')}
          >
            <span>Start Speaking Now →</span>
          </button>
        </div>
      </div>
    );
  }

  /* =========================================================================
     STEP 5 — SPEAKING SESSION VIEW
     ========================================================================= */
  if (viewMode === 'session') {
    return (
      <SpeakingChallengeSession
        topic={selectedTopic}
        difficulty={selectedDifficulty}
        duration={selectedDuration}
        prepType={selectedPrep}
        mediaStream={mediaStream}
        user={user}
        onComplete={handleSessionComplete}
        onCancel={() => {
          stopMedia();
          setViewMode('main');
        }}
      />
    );
  }

  /* =========================================================================
     RESULT VIEW
     ========================================================================= */
  if (viewMode === 'result') {
    return (
      <SpeakingChallengeResult
        sessionData={lastSessionData || (history.length > 0 ? history[0] : null)}
        user={user}
        onTryAnother={handleTryAnother}
        onRetryTopic={handleRetryTopic}
        onGoHome={() => {
          setViewMode('main');
          window.history.pushState(null, '', '/speaking-challenge');
          refreshHistory();
        }}
      />
    );
  }

  /* =========================================================================
     2. START CHALLENGE WIZARD FLOW (STEP 1, 2, 3, 4)
     ========================================================================= */
  return (
    <div className="speaking-setup-container">
      {/* Top Wizard Navigation / Progress Indicator */}
      <div className="wizard-progress-bar">
        {[
          { step: 1, label: 'Difficulty' },
          { step: 2, label: 'Topic' },
          { step: 3, label: 'Duration' },
          { step: 4, label: 'Preparation' },
          { step: 5, label: 'Session' }
        ].map(item => {
          const isCurrent = currentStep === item.step;
          const isCompleted = currentStep > item.step;
          return (
            <div 
              key={item.step} 
              className={`progress-step-item ${isCurrent ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
            >
              <div className="step-num-badge">
                {isCompleted ? <Check size={12} /> : item.step}
              </div>
              <span className="step-label-text">{item.label}</span>
            </div>
          );
        })}
      </div>

      {/* STEP 1 — SELECT DIFFICULTY */}
      {currentStep === 1 && (
        <div className="step-content-card">
          <div className="step-header">
            <h2 className="step-title">Choose Your Difficulty</h2>
            <p className="step-desc">
              Select a difficulty level that matches your speaking ability.
            </p>
          </div>

          <div className="difficulty-cards-grid">
            <div 
              className={`difficulty-card ${selectedDifficulty === 'Beginner' ? 'selected' : ''}`}
              onClick={() => setSelectedDifficulty('Beginner')}
            >
              <div className="card-radio-indicator">
                {selectedDifficulty === 'Beginner' && <Check size={14} color="#ffffff" />}
              </div>
              <h3 className="diff-card-title">Beginner</h3>
              <p className="diff-card-desc">
                Simple everyday topics that help you build speaking confidence.
              </p>
            </div>

            <div 
              className={`difficulty-card ${selectedDifficulty === 'Intermediate' ? 'selected' : ''}`}
              onClick={() => setSelectedDifficulty('Intermediate')}
            >
              <div className="card-radio-indicator">
                {selectedDifficulty === 'Intermediate' && <Check size={14} color="#ffffff" />}
              </div>
              <h3 className="diff-card-title">Intermediate</h3>
              <p className="diff-card-desc">
                Topics that require opinions, explanations, examples, and reasoning.
              </p>
            </div>

            <div 
              className={`difficulty-card ${selectedDifficulty === 'Advanced' ? 'selected' : ''}`}
              onClick={() => setSelectedDifficulty('Advanced')}
            >
              <div className="card-radio-indicator">
                {selectedDifficulty === 'Advanced' && <Check size={14} color="#ffffff" />}
              </div>
              <h3 className="diff-card-title">Advanced</h3>
              <p className="diff-card-desc">
                Challenging topics that require analysis, arguments, examples, and deeper reasoning.
              </p>
            </div>
          </div>

          <div className="wizard-action-footer">
            <button className="btn-secondary" onClick={() => setViewMode('main')}>
              ← Back
            </button>
            <button 
              className="btn-primary" 
              disabled={!selectedDifficulty}
              onClick={() => setCurrentStep(2)}
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* STEP 2 — SELECT TOPIC */}
      {currentStep === 2 && (
        <div className="step-content-card">
          <div className="step-header">
            <h2 className="step-title">Choose Your Topic</h2>
            <p className="step-desc-badge">
              {selectedDifficulty} Topics
            </p>
          </div>

          {/* Search & Random Topic bar */}
          <div className="topic-toolbar">
            <div className="search-input-box">
              <Search size={16} color="#64748b" />
              <input
                type="text"
                placeholder="Search topics..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            <button className="btn-random-topic" onClick={handleRandomTopic}>
              <Shuffle size={15} />
              <span>Random Topic</span>
            </button>
          </div>

          {/* Topics List Grid */}
          <div className="topics-list-container">
            {filteredTopics.length > 0 ? (
              <div className="topics-grid">
                {filteredTopics.map((topic, idx) => {
                  const isSelected = selectedTopic === topic;
                  return (
                    <div 
                      key={idx} 
                      className={`topic-item-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedTopic(topic)}
                    >
                      <span className="topic-item-text">{topic}</span>
                      {isSelected && (
                        <div className="topic-check-badge">
                          <Check size={12} color="#ffffff" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="no-topics-found">
                <Search size={32} color="#94a3b8" />
                <p>No topics found</p>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                  Try clearing your search query.
                </span>
              </div>
            )}
          </div>

          <div className="wizard-action-footer">
            <button className="btn-secondary" onClick={() => setCurrentStep(1)}>
              ← Back
            </button>
            <button 
              className="btn-primary" 
              disabled={!selectedTopic}
              onClick={() => setCurrentStep(3)}
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 — SPEAKING DURATION */}
      {currentStep === 3 && (
        <div className="step-content-card">
          <div className="step-header">
            <h2 className="step-title">Choose Speaking Duration</h2>
            <p className="step-desc">
              Select how long you want to speak.
            </p>
          </div>

          <div className="duration-options-list">
            {durationOptions.map((opt) => {
              const isSelected = selectedDuration?.seconds === opt.seconds;
              return (
                <div 
                  key={opt.seconds}
                  className={`duration-option-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedDuration(opt)}
                >
                  <div className="duration-left-content">
                    <Clock size={20} color={isSelected ? '#0066ff' : '#64748b'} />
                    <div>
                      <h4 className="duration-title">{opt.label}</h4>
                      <p className="duration-desc">{opt.desc}</p>
                    </div>
                  </div>

                  <div className="duration-check-box">
                    {isSelected && <Check size={14} color="#ffffff" />}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="wizard-action-footer">
            <button className="btn-secondary" onClick={() => setCurrentStep(2)}>
              ← Back
            </button>
            <button 
              className="btn-primary" 
              disabled={!selectedDuration}
              onClick={() => setCurrentStep(4)}
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* STEP 4 — PREPARATION & CAMERA CHECK */}
      {currentStep === 4 && (
        <div className="step-content-card">
          <div className="step-header">
            <h2 className="step-title">Ready to Speak?</h2>
            <p className="step-desc">
              Review your setup summary, choose preparation, and enable your camera & mic.
            </p>
          </div>

          {/* Setup Summary Table */}
          <div className="setup-summary-card">
            <div className="summary-row-item">
              <div>
                <span className="summary-label">Difficulty</span>
                <span className="summary-value">{selectedDifficulty}</span>
              </div>
              <button className="btn-edit-row" onClick={() => setCurrentStep(1)}>
                Edit
              </button>
            </div>

            <div className="summary-row-item">
              <div>
                <span className="summary-label">Topic</span>
                <span className="summary-value">{selectedTopic}</span>
              </div>
              <button className="btn-edit-row" onClick={() => setCurrentStep(2)}>
                Edit
              </button>
            </div>

            <div className="summary-row-item">
              <div>
                <span className="summary-label">Duration</span>
                <span className="summary-value">{selectedDuration?.label}</span>
              </div>
              <button className="btn-edit-row" onClick={() => setCurrentStep(3)}>
                Edit
              </button>
            </div>
          </div>

          {/* Preparation Options */}
          <h3 className="prep-options-heading">Preparation Options</h3>
          <div className="prep-options-grid">
            <div 
              className={`prep-option-card ${selectedPrep === 'now' ? 'selected' : ''}`}
              onClick={() => setSelectedPrep('now')}
            >
              <div className="card-radio-indicator">
                {selectedPrep === 'now' && <Check size={14} color="#ffffff" />}
              </div>
              <h4 className="prep-title">Speak Now</h4>
              <p className="prep-desc">
                Start speaking immediately without preparation.
              </p>
            </div>

            <div 
              className={`prep-option-card ${selectedPrep === '5min' ? 'selected' : ''}`}
              onClick={() => setSelectedPrep('5min')}
            >
              <div className="card-radio-indicator">
                {selectedPrep === '5min' && <Check size={14} color="#ffffff" />}
              </div>
              <h4 className="prep-title">Prepare for 5 Minutes</h4>
              <p className="prep-desc">
                Take up to 5 minutes to organize your thoughts before speaking.
              </p>
            </div>
          </div>

          {/* Camera & Microphone Section */}
          <div className="device-check-section" style={{ marginTop: '20px' }}>
            <div className="step-header">
              <h3 className="device-section-title" style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                Camera & Microphone
              </h3>
              <p className="step-desc">
                Allow camera and microphone access to start your speaking challenge.
              </p>
            </div>

            <div className="device-status-grid">
              {/* Camera Status */}
              <div className={`device-card ${cameraChecked ? 'connected' : ''}`}>
                <div className="device-icon-box">
                  <Camera size={20} color={cameraChecked ? '#10b981' : '#64748b'} />
                </div>
                <div>
                  <div className="device-title">Camera</div>
                  <div className={`device-status-text ${cameraChecked ? 'connected' : ''}`}>
                    {cameraChecked ? '✓ Connected' : 'Not checked'}
                  </div>
                </div>
              </div>

              {/* Microphone Status */}
              <div className={`device-card ${micChecked ? 'connected' : ''}`}>
                <div className="device-icon-box">
                  <Mic size={20} color={micChecked ? '#10b981' : '#64748b'} />
                </div>
                <div>
                  <div className="device-title">Microphone</div>
                  <div className={`device-status-text ${micChecked ? 'connected' : ''}`}>
                    {micChecked ? '✓ Connected' : 'Not checked'}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '14px' }}>
              <button
                className="btn-secondary"
                onClick={handleEnableMedia}
                disabled={isEnablingMedia}
              >
                <span>{isEnablingMedia ? 'Requesting Access...' : (cameraChecked && micChecked ? 'Camera & Mic Enabled ✓' : 'Enable Camera & Mic')}</span>
              </button>
            </div>

            {/* Live Camera Preview */}
            {mediaStream && cameraChecked && (
              <div className="video-preview-wrapper" style={{ marginTop: '16px' }}>
                <div className="preview-label">Live Preview</div>
                <video
                  ref={(node) => {
                    previewVideoRef.current = node;
                    if (node && mediaStream) {
                      attachVideo(node, mediaStream);
                    }
                  }}
                  autoPlay
                  playsInline
                  muted
                  className="preview-video-element"
                />
              </div>
            )}

            {/* Media Error Message */}
            {(mediaError || mediaHookError) && (
              <div className="media-error-box" style={{ marginTop: '14px' }}>
                <AlertCircle size={18} color="#ef4444" style={{ flexShrink: 0 }} />
                <span>{mediaError || mediaHookError}</span>
              </div>
            )}
          </div>

          <div className="wizard-action-footer">
            <button className="btn-secondary" onClick={() => setCurrentStep(3)}>
              ← Back
            </button>
            <button 
              className="btn-primary" 
              disabled={!selectedPrep || !cameraChecked || !micChecked}
              onClick={handleStartSpeakingClick}
            >
              Start Speaking →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
