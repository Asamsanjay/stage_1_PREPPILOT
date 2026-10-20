import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { deleteLocalRecording } from './indexedDBStorage';

const LOCAL_STORAGE_KEY = 'preppilot_mock_interviews';
export const INTERVIEW_RECORDINGS_BUCKET = 'interview-recordings';
export const FALLBACK_RECORDINGS_BUCKET = 'speaking-recordings';

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
 * Normalizes metadata record from Supabase or localStorage.
 */
function normalizeRecord(item) {
  if (!item) return null;
  return {
    id: item.id || `interview_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    user_id: item.user_id || item.userId || 'guest',
    local_recording_id: item.local_recording_id || item.localRecordingId || '',
    recording_path: item.recording_path || item.recordingPath || null,
    recording_bucket: item.recording_bucket || item.recordingBucket || INTERVIEW_RECORDINGS_BUCKET,
    interview_type: item.interview_type || item.interviewType || 'General Interview',
    job_role: item.job_role || item.jobRole || item.interview_type || 'General',
    experience_level: item.experience_level || item.experienceLevel || 'Beginner',
    difficulty: item.difficulty || 'Easy',
    duration: item.duration || '10 minutes',
    completed_at: item.completed_at || item.completedAt || new Date().toISOString(),
    score: item.score ?? null,
    status: item.status || 'completed',
    ai_report: item.ai_report || item.aiReport || null,
    questions_and_answers: item.questions_and_answers || item.questionsAndAnswers || null
  };
}

/**
 * Upload a recorded interview video Blob to Supabase Storage.
 * Path format: {userId}/{localRecordingId}.webm
 *
 * @param {string} userId
 * @param {string} localRecordingId
 * @param {Blob} videoBlob
 * @returns {Promise<{ path: string | null, bucket: string, error: any }>}
 */
export const uploadInterviewRecordingToSupabase = async (userId, localRecordingId, videoBlob) => {
  if (!isSupabaseConfigured() || !videoBlob) {
    return { path: null, bucket: INTERVIEW_RECORDINGS_BUCKET, error: null };
  }

  const effectiveUserId = await resolveUserId(userId);
  if (!effectiveUserId || effectiveUserId === 'guest') {
    console.warn('[InterviewService] Cannot upload recording without authenticated user ID');
    return { path: null, bucket: INTERVIEW_RECORDINGS_BUCKET, error: 'No authenticated user ID' };
  }

  try {
    const ext = videoBlob.type && videoBlob.type.includes('mp4') ? 'mp4' : 'webm';
    const filePath = `${effectiveUserId}/${localRecordingId}.${ext}`;

    // Try primary bucket 'interview-recordings' first
    let bucketToUse = INTERVIEW_RECORDINGS_BUCKET;
    let { data, error } = await supabase.storage
      .from(bucketToUse)
      .upload(filePath, videoBlob, {
        contentType: videoBlob.type || 'video/webm',
        upsert: true
      });

    // If bucket doesn't exist yet, attempt fallback to 'speaking-recordings' bucket
    if (error && (error.message?.includes('Bucket not found') || error.error === 'Bucket not found' || error.statusCode === '404')) {
      console.warn('[InterviewService] Primary bucket not found, attempting upload to fallback bucket:', FALLBACK_RECORDINGS_BUCKET);
      bucketToUse = FALLBACK_RECORDINGS_BUCKET;
      const fallbackResult = await supabase.storage
        .from(bucketToUse)
        .upload(filePath, videoBlob, {
          contentType: videoBlob.type || 'video/webm',
          upsert: true
        });
      data = fallbackResult.data;
      error = fallbackResult.error;
    }

    if (error) {
      console.warn('[InterviewService] Storage upload error (falling back to local IndexedDB):', error.message || error);
      return { path: null, bucket: bucketToUse, error };
    }

    const savedPath = data?.path || filePath;
    console.log('[InterviewService] Video recording successfully uploaded to Supabase Storage:', savedPath, 'in bucket:', bucketToUse);
    return { path: savedPath, bucket: bucketToUse, error: null };
  } catch (err) {
    console.error('[InterviewService] Upload exception:', err);
    return { path: null, bucket: INTERVIEW_RECORDINGS_BUCKET, error: err };
  }
};

/**
 * Generate a temporary signed playback URL for a private recording in Supabase Storage.
 *
 * @param {string} recordingPath - Path in bucket (e.g. {userId}/{id}.webm)
 * @param {number} expiresIn - URL lifespan in seconds (default: 3600 = 1 hour)
 * @param {string} bucketName - Bucket name
 * @returns {Promise<string | null>}
 */
export const getInterviewRecordingSignedUrl = async (recordingPath, expiresIn = 3600, bucketName = INTERVIEW_RECORDINGS_BUCKET) => {
  if (!isSupabaseConfigured() || !recordingPath) {
    return null;
  }

  try {
    // 1. Try specified bucket
    let { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(recordingPath, expiresIn);

    // 2. If not found in specified bucket, check fallback bucket
    if ((error || !data?.signedUrl) && bucketName !== FALLBACK_RECORDINGS_BUCKET) {
      const fallback = await supabase.storage
        .from(FALLBACK_RECORDINGS_BUCKET)
        .createSignedUrl(recordingPath, expiresIn);
      if (fallback.data?.signedUrl) {
        return fallback.data.signedUrl;
      }
    }

    if (error) {
      console.warn('[InterviewService] Failed to create signed URL:', error.message || error);
      return null;
    }

    return data?.signedUrl || null;
  } catch (err) {
    console.warn('[InterviewService] Exception creating signed URL:', err);
    return null;
  }
};

/**
 * Get all mock interviews for the current user.
 * Merges Supabase records with local metadata so recordings are never lost on reload.
 *
 * @param {string} userId
 * @returns {Promise<Array>}
 */
export const getInterviewHistory = async (userId = 'guest') => {
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
      console.error('[InterviewService] Failed to parse local interview history:', e);
    }
  });

  // 2. Fetch from Supabase if authenticated and table exists
  if (isSupabaseConfigured() && effectiveUserId && effectiveUserId !== 'guest') {
    try {
      const { data, error } = await supabase
        .from('mock_interviews')
        .select('*')
        .eq('user_id', effectiveUserId)
        .order('completed_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        data.forEach((item) => {
          const norm = normalizeRecord(item);
          if (norm) {
            const dedupeKey = norm.local_recording_id || norm.id;
            localMap.set(dedupeKey, norm);
          }
        });
      } else if (error) {
        console.warn('[InterviewService] Supabase mock_interviews query warning (using local cache):', error.message || error);
      }
    } catch (err) {
      console.warn('[InterviewService] Supabase fetch exception:', err.message || err);
    }
  }

  const merged = Array.from(localMap.values())
    .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at));

  // Keep local cache up to date with unified history
  try {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_${effectiveUserId}`, JSON.stringify(merged));
  } catch (storageErr) {
    console.warn('[InterviewService] Local metadata sync warning:', storageErr);
  }

  return merged;
};

/**
 * Calculate stats from interview history.
 */
export const calculateInterviewStats = (interviews = []) => {
  if (!interviews || interviews.length === 0) {
    return {
      totalInterviews: 0,
      completedInterviews: 0,
      averageScore: '—',
      averageDuration: '—',
    };
  }

  const total = interviews.length;
  const completed = interviews.filter((i) => i.status === 'completed' || !i.status);

  // Calculate scores if any numeric scores exist
  const scoredInterviews = completed.filter((i) => typeof i.score === 'number' && i.score > 0);
  let avgScore = '—';
  if (scoredInterviews.length > 0) {
    const totalScore = scoredInterviews.reduce((acc, curr) => acc + curr.score, 0);
    avgScore = `${Math.round(totalScore / scoredInterviews.length)}%`;
  }

  // Calculate average duration in minutes
  let totalMinutes = 0;
  let durationCount = 0;

  completed.forEach((i) => {
    if (i.duration) {
      const parsed = parseInt(i.duration, 10);
      if (!isNaN(parsed) && parsed > 0) {
        totalMinutes += parsed;
        durationCount += 1;
      }
    }
  });

  let avgDuration = '—';
  if (durationCount > 0) {
    avgDuration = `${Math.round(totalMinutes / durationCount)} min`;
  }

  return {
    totalInterviews: total,
    completedInterviews: completed.length,
    averageScore: avgScore,
    averageDuration: avgDuration,
  };
};

/**
 * Save a completed mock interview record.
 * Supports local_recording_id and recording_path for video replay.
 *
 * @param {string} userId
 * @param {Object} interviewData
 * @param {string} [localRecordingId='']
 * @param {string|null} [recordingPath=null]
 * @param {string} [recordingBucket=INTERVIEW_RECORDINGS_BUCKET]
 * @returns {Promise<Object>} saved metadata record
 */
export const saveInterviewRecord = async (
  userId = 'guest',
  interviewData = {},
  localRecordingId = '',
  recordingPath = null,
  recordingBucket = INTERVIEW_RECORDINGS_BUCKET
) => {
  const effectiveUserId = await resolveUserId(userId);

  const newRecord = {
    id: `interview_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    user_id: effectiveUserId,
    interview_type: interviewData.interviewType || interviewData.interview_type || 'General Interview',
    experience_level: interviewData.experienceLevel || interviewData.experience_level || 'Beginner',
    difficulty: interviewData.difficulty || 'Easy',
    duration: interviewData.duration || '10 minutes',
    completed_at: new Date().toISOString(),
    score: null,
    status: 'completed',
    local_recording_id: localRecordingId || '',
    recording_path: recordingPath || null,
    recording_bucket: recordingBucket || INTERVIEW_RECORDINGS_BUCKET
  };

  // Helper to safely append to localStorage array
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
      console.error('[InterviewService] Failed to cache interview to localStorage:', e);
    }
  };

  // 1. Cache metadata locally in localStorage immediately
  appendLocal(`${LOCAL_STORAGE_KEY}_${effectiveUserId}`);
  if (effectiveUserId !== 'guest') {
    appendLocal(`${LOCAL_STORAGE_KEY}_guest`);
  }

  // 2. Insert metadata into Supabase mock_interviews table if authenticated
  if (isSupabaseConfigured() && effectiveUserId && effectiveUserId !== 'guest') {
    try {
      const { data, error } = await supabase
        .from('mock_interviews')
        .insert([{
          user_id: effectiveUserId,
          interview_type: newRecord.interview_type,
          experience_level: newRecord.experience_level,
          difficulty: newRecord.difficulty,
          duration: newRecord.duration,
          completed_at: newRecord.completed_at,
          score: null,
          status: 'completed',
          local_recording_id: newRecord.local_recording_id,
          recording_path: newRecord.recording_path
        }])
        .select();

      if (!error && data && data.length > 0) {
        newRecord.id = data[0].id;
        appendLocal(`${LOCAL_STORAGE_KEY}_${effectiveUserId}`);
      } else if (error) {
        console.warn('[InterviewService] Supabase mock_interviews insert warning:', error.message || error);
      }
    } catch (err) {
      console.warn('[InterviewService] Supabase insert exception:', err.message || err);
    }
  }

  return newRecord;
};

/**
 * Permanently delete a mock interview and its recording:
 * 1. Removes video from Supabase Storage ('interview-recordings' or fallback bucket).
 * 2. Deletes row from 'mock_interviews' database table.
 * 3. Deletes local video Blob from IndexedDB.
 * 4. Cleans up localStorage cache.
 *
 * @param {string} userId
 * @param {Object} record - The interview record
 * @returns {Promise<{ success: boolean, error?: any }>}
 */
export const deleteMockInterview = async (userId = 'guest', record) => {
  if (!record) return { success: false, error: 'No record provided' };

  const effectiveUserId = await resolveUserId(userId);
  const dbId = record.id;
  const localRecId = record.local_recording_id || record.localRecordingId;
  const storagePath = record.recording_path || record.recordingPath;
  const bucket = record.recording_bucket || record.recordingBucket || INTERVIEW_RECORDINGS_BUCKET;

  // 1. Delete video from Supabase Storage
  if (isSupabaseConfigured() && storagePath) {
    try {
      await supabase.storage.from(bucket).remove([storagePath]);
      // Also check fallback bucket
      if (bucket !== FALLBACK_RECORDINGS_BUCKET) {
        await supabase.storage.from(FALLBACK_RECORDINGS_BUCKET).remove([storagePath]);
      }
    } catch (e) {
      console.warn('[InterviewService] Storage remove exception:', e);
    }
  }

  // 2. Delete row from Supabase Database
  if (isSupabaseConfigured() && effectiveUserId && effectiveUserId !== 'guest') {
    try {
      if (dbId && !dbId.startsWith('interview_')) {
        await supabase.from('mock_interviews').delete().eq('id', dbId);
      } else if (localRecId) {
        await supabase.from('mock_interviews').delete().eq('local_recording_id', localRecId);
      }
    } catch (e) {
      console.warn('[InterviewService] Supabase delete exception:', e);
    }
  }

  // 3. Delete local video Blob from IndexedDB
  if (localRecId) {
    try {
      await deleteLocalRecording(localRecId);
    } catch (e) {
      console.warn('[InterviewService] IndexedDB delete error:', e);
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

  // Clear last interview cache if matches
  try {
    const rawLast = localStorage.getItem('preppilot_last_mock_interview');
    if (rawLast) {
      const lastObj = JSON.parse(rawLast);
      if (lastObj.id === dbId || (localRecId && (lastObj.local_recording_id === localRecId || lastObj.localRecordingId === localRecId))) {
        localStorage.removeItem('preppilot_last_mock_interview');
      }
    }
  } catch (_e) {}

  return { success: true };
};
