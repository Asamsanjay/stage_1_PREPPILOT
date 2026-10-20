import { supabase, isSupabaseConfigured } from '../supabaseClient.js';
import { deleteLocalRecording } from './indexedDBStorage.js';

const LOCAL_STORAGE_KEY = 'preppilot_speaking_meta';
export const RECORDINGS_BUCKET = 'speaking-recordings';

/**
 * Normalizes metadata record from Supabase or localStorage.
 */
function normalizeRecord(item) {
  if (!item) return null;
  return {
    id: item.id || `speaking_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    user_id: item.user_id || item.userId || 'guest',
    local_recording_id: item.local_recording_id || item.localRecordingId || '',
    recording_path: item.recording_path || item.recordingPath || null,
    topic: item.topic || 'Untitled Challenge',
    difficulty: item.difficulty || 'Beginner',
    duration_seconds: item.duration_seconds ?? item.durationSeconds ?? 60,
    duration_label: item.duration_label || item.durationLabel || `${item.duration_seconds ?? item.durationSeconds ?? 60} seconds`,
    spent_seconds: item.spent_seconds ?? item.spentSeconds ?? 0,
    prep_type: item.prep_type || item.prepType || 'now',
    completed_at: item.completed_at || item.completedAt || new Date().toISOString(),
    score: item.score ?? null,
    status: item.status || 'completed'
  };
}

/**
 * Resolves the authenticated user ID.
 * Falls back to Supabase auth session if userId is missing or 'guest'.
 *
 * @param {string} userId
 * @returns {Promise<string>}
 */
export const resolveUserId = async (userId) => {
  if (userId && userId !== 'guest') {
    return userId;
  }
  if (isSupabaseConfigured()) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        return session.user.id;
      }
    } catch (_e) {}
  }
  return userId || 'guest';
};

/**
 * Upload a recorded video Blob to the user's private folder in Supabase Storage.
 * Path format: {userId}/{localRecordingId}.webm
 *
 * @param {string} userId
 * @param {string} localRecordingId
 * @param {Blob} videoBlob
 * @returns {Promise<{ path: string | null, error: any }>}
 */
export const uploadRecordingToSupabase = async (userId, localRecordingId, videoBlob) => {
  if (!isSupabaseConfigured() || !videoBlob) {
    return { path: null, error: null };
  }

  const effectiveUserId = await resolveUserId(userId);
  if (!effectiveUserId || effectiveUserId === 'guest') {
    console.warn('[SpeakingService] Cannot upload recording without authenticated user ID');
    return { path: null, error: 'No authenticated user ID' };
  }

  try {
    const ext = videoBlob.type && videoBlob.type.includes('mp4') ? 'mp4' : 'webm';
    const filePath = `${effectiveUserId}/${localRecordingId}.${ext}`;

    const { data, error } = await supabase.storage
      .from(RECORDINGS_BUCKET)
      .upload(filePath, videoBlob, {
        contentType: videoBlob.type || 'video/webm',
        upsert: true
      });

    if (error) {
      console.warn('[SpeakingService] Supabase Storage upload error (falling back to local IndexedDB):', error.message || error);
      return { path: null, error };
    }

    console.log('[SpeakingService] Video recording successfully uploaded to Supabase Storage:', data?.path || filePath);
    return { path: data?.path || filePath, error: null };
  } catch (err) {
    console.error('[SpeakingService] Upload exception:', err);
    return { path: null, error: err };
  }
};

/**
 * Generate a temporary signed playback URL for a private recording in Supabase Storage.
 *
 * @param {string} recordingPath - Path in 'speaking-recordings' bucket (e.g. {userId}/{id}.webm)
 * @param {number} expiresIn - URL lifespan in seconds (default: 3600 = 1 hour)
 * @returns {Promise<string | null>}
 */
export const getRecordingSignedUrl = async (recordingPath, expiresIn = 3600) => {
  if (!isSupabaseConfigured() || !recordingPath) {
    return null;
  }

  try {
    const { data, error } = await supabase.storage
      .from(RECORDINGS_BUCKET)
      .createSignedUrl(recordingPath, expiresIn);

    if (error) {
      console.warn('[SpeakingService] Failed to create signed URL from Supabase Storage:', error.message || error);
      return null;
    }

    return data?.signedUrl || null;
  } catch (err) {
    console.warn('[SpeakingService] Exception creating signed URL:', err);
    return null;
  }
};

/**
 * Fetch speaking challenge metadata history for the user.
 * Sorted by completion date, newest first. Merges Supabase records with local metadata.
 *
 * @param {string} userId
 * @returns {Promise<Array>}
 */
export const getSpeakingHistory = async (userId = 'guest') => {
  const effectiveUserId = await resolveUserId(userId);

  // 1. Gather all local metadata cached under effective user AND 'guest'
  const localMap = new Map();
  const keysToInspect = new Set([
    `${LOCAL_STORAGE_KEY}_${effectiveUserId}`,
    `${LOCAL_STORAGE_KEY}_guest`
  ]);

  keysToInspect.forEach((k) => {
    try {
      const raw = localStorage.getItem(k);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach((item) => {
            const norm = normalizeRecord(item);
            if (norm) {
              const dedupeKey = norm.local_recording_id || norm.id;
              if (dedupeKey) localMap.set(dedupeKey, norm);
            }
          });
        }
      }
    } catch (e) {
      console.error('[SpeakingService] Failed to parse local speaking metadata:', e);
    }
  });

  // 2. Fetch from Supabase if authenticated
  if (isSupabaseConfigured() && effectiveUserId && effectiveUserId !== 'guest') {
    try {
      const { data, error } = await supabase
        .from('speaking_challenges')
        .select('*')
        .eq('user_id', effectiveUserId)
        .order('completed_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        // Merge Supabase items into records map
        data.forEach((item) => {
          const norm = normalizeRecord(item);
          if (norm) {
            const dedupeKey = norm.local_recording_id || norm.id;
            // Supabase data is primary source of truth for database id & cloud recording path
            localMap.set(dedupeKey, norm);
          }
        });
      } else if (error) {
        console.warn('[SpeakingService] Supabase speaking_challenges select warning (falling back to local cache):', error.message || error);
      }
    } catch (err) {
      console.warn('[SpeakingService] Supabase fetch exception:', err.message || err);
    }
  }

  const merged = Array.from(localMap.values())
    .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at));

  // Keep local cache up to date with merged history
  try {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_${effectiveUserId}`, JSON.stringify(merged));
  } catch (storageErr) {
    console.warn('[SpeakingService] Local metadata sync warning:', storageErr);
  }

  return merged;
};

/**
 * Save session metadata to Supabase and client cache.
 * Video Blobs are stored in Supabase Storage & IndexedDB.
 *
 * @param {string} userId
 * @param {Object} sessionData
 * @param {string} localRecordingId - unique ID reference to IndexedDB Blob
 * @param {string|null} recordingPath - path in Supabase Storage bucket
 * @returns {Promise<Object>} saved metadata record
 */
export const saveSpeakingSessionMetadata = async (
  userId = 'guest',
  sessionData,
  localRecordingId = '',
  recordingPath = null
) => {
  const effectiveUserId = await resolveUserId(userId);

  const newRecord = {
    id: `speaking_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    user_id: effectiveUserId,
    local_recording_id: localRecordingId,
    recording_path: recordingPath || null,
    topic: sessionData.topic || 'Untitled Challenge',
    difficulty: sessionData.difficulty || 'Beginner',
    duration_seconds: sessionData.durationSeconds || 60,
    duration_label: sessionData.durationLabel || `${sessionData.durationSeconds || 60} seconds`,
    spent_seconds: sessionData.spentSeconds || 0,
    prep_type: sessionData.prepType || 'now',
    completed_at: sessionData.completedAt || new Date().toISOString(),
    score: null,
    status: 'completed',
  };

  // Helper to append to localStorage array safely
  const appendLocal = (key) => {
    try {
      const raw = localStorage.getItem(key);
      const list = raw ? JSON.parse(raw) : [];
      const filtered = list.filter((r) => {
        const idA = r.local_recording_id || r.localRecordingId || r.id;
        const idB = newRecord.local_recording_id || newRecord.id;
        return idA !== idB;
      });
      filtered.unshift(newRecord);
      localStorage.setItem(key, JSON.stringify(filtered));
    } catch (e) {
      console.error('[SpeakingService] Failed to cache metadata to localStorage:', e);
    }
  };

  // 1. Cache metadata locally in localStorage immediately
  appendLocal(`${LOCAL_STORAGE_KEY}_${effectiveUserId}`);
  if (effectiveUserId !== 'guest') {
    appendLocal(`${LOCAL_STORAGE_KEY}_guest`);
  }

  // 2. Insert metadata into Supabase speaking_challenges table if authenticated
  if (isSupabaseConfigured() && effectiveUserId && effectiveUserId !== 'guest') {
    try {
      const { data, error } = await supabase
        .from('speaking_challenges')
        .insert([{
          user_id: effectiveUserId,
          local_recording_id: newRecord.local_recording_id,
          recording_path: newRecord.recording_path,
          topic: newRecord.topic,
          difficulty: newRecord.difficulty,
          duration_seconds: newRecord.duration_seconds,
          spent_seconds: newRecord.spent_seconds,
          prep_type: newRecord.prep_type,
          completed_at: newRecord.completed_at,
          score: null,
          status: 'completed',
        }])
        .select();

      if (!error && data && data.length > 0) {
        newRecord.id = data[0].id;
        appendLocal(`${LOCAL_STORAGE_KEY}_${effectiveUserId}`);
      } else if (error) {
        console.warn('[SpeakingService] Could not insert into Supabase speaking_challenges:', error.message || error);
      }
    } catch (err) {
      console.warn('[SpeakingService] Supabase insert exception:', err.message || err);
    }
  }

  return newRecord;
};

/**
 * Calculate summary statistics from speaking history.
 */
export const calculateSpeakingStats = (history = []) => {
  if (!history || history.length === 0) {
    return {
      totalChallenges: 0,
      completedChallenges: 0,
      averageScore: '—',
      averageSpeakingTime: '—',
    };
  }

  const total = history.length;
  const completed = history.filter((h) => (h.spent_seconds || h.spentSeconds) > 0);

  const totalSecs = history.reduce((sum, h) => sum + (h.spent_seconds || h.spentSeconds || 0), 0);
  const avgSecs = Math.round(totalSecs / history.length);

  let avgTimeStr = '—';
  if (avgSecs < 60) {
    avgTimeStr = `${avgSecs}s`;
  } else {
    const mins = Math.floor(avgSecs / 60);
    const secs = avgSecs % 60;
    avgTimeStr = secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }

  // Calculate real average score from evaluated reports
  const scoredItems = history.filter(
    (h) => h.score !== null && h.score !== undefined && !isNaN(Number(h.score))
  );
  const avgScore = scoredItems.length > 0
    ? `${Math.round(scoredItems.reduce((acc, h) => acc + Number(h.score), 0) / scoredItems.length)}/100`
    : '—';

  return {
    totalChallenges: total,
    completedChallenges: completed.length,
    averageScore: avgScore,
    averageSpeakingTime: avgTimeStr,
  };
};

/**
 * Permanently delete a speaking challenge and its recording:
 * 1. Removes the video file from Supabase Storage ('speaking-recordings').
 * 2. Deletes the database row from 'speaking_challenges' table.
 * 3. Deletes the local video Blob from IndexedDB.
 * 4. Cleans up localStorage cache.
 *
 * @param {string} userId
 * @param {Object} session - The challenge record
 * @returns {Promise<{ success: boolean, error?: any }>}
 */
export const deleteSpeakingChallenge = async (userId = 'guest', session) => {
  if (!session) return { success: false, error: 'No session provided' };

  const effectiveUserId = await resolveUserId(userId);
  const dbId = session.id;
  const localRecId = session.local_recording_id || session.localRecordingId;
  const storagePath = session.recording_path || session.recordingPath;

  // 1. Delete video from Supabase Storage
  if (isSupabaseConfigured() && storagePath) {
    try {
      const { error: storageErr } = await supabase.storage
        .from(RECORDINGS_BUCKET)
        .remove([storagePath]);
      if (storageErr) {
        console.warn('[SpeakingService] Storage file deletion warning:', storageErr);
      }
    } catch (e) {
      console.warn('[SpeakingService] Storage remove exception:', e);
    }
  }

  // 2. Delete from Supabase Database
  if (isSupabaseConfigured() && effectiveUserId && effectiveUserId !== 'guest') {
    try {
      if (dbId && !dbId.startsWith('speaking_')) {
        await supabase
          .from('speaking_challenges')
          .delete()
          .eq('id', dbId);
      } else if (localRecId) {
        await supabase
          .from('speaking_challenges')
          .delete()
          .eq('local_recording_id', localRecId);
      }
    } catch (e) {
      console.warn('[SpeakingService] Supabase delete exception:', e);
    }
  }

  // 3. Delete local video Blob from IndexedDB
  if (localRecId) {
    try {
      await deleteLocalRecording(localRecId);
    } catch (e) {
      console.warn('[SpeakingService] IndexedDB delete error:', e);
    }
  }

  // 4. Remove from localStorage cache
  const removeLocal = (key) => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          const filtered = list.filter((item) => {
            const matchId = item.id === dbId;
            const matchRec = localRecId && (item.local_recording_id === localRecId || item.localRecordingId === localRecId);
            return !matchId && !matchRec;
          });
          localStorage.setItem(key, JSON.stringify(filtered));
        }
      }
    } catch (_e) {}
  };

  removeLocal(`${LOCAL_STORAGE_KEY}_${effectiveUserId}`);
  removeLocal(`${LOCAL_STORAGE_KEY}_guest`);

  // Clear cached last session if it matches the deleted one
  try {
    const rawLast = localStorage.getItem('preppilot_last_speaking_session');
    if (rawLast) {
      const lastObj = JSON.parse(rawLast);
      if (lastObj.id === dbId || (localRecId && (lastObj.local_recording_id === localRecId || lastObj.localRecordingId === localRecId))) {
        localStorage.removeItem('preppilot_last_speaking_session');
      }
    }
  } catch (_e) {}

  return { success: true };
};
