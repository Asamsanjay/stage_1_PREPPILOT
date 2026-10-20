/**
 * PREPPILOT SPEAKING COACH SERVICE
 * 
 * Secure client-side orchestration for:
 * 1. Client-side audio extraction from local video recording.
 * 2. Secure transmission to backend AI evaluation endpoint (Supabase Edge Function or Dev Backend).
 * 3. Validation and normalization of AI evaluation response.
 * 4. Persisting permitted reports and scores to Supabase and client cache.
 */

import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { extractAudioFromRecording, blobToBase64 } from '../agents/speaking-coach/audioExtractor';
import { validateAndNormalizeEvaluation } from '../agents/speaking-coach/evaluator';

const LOCAL_REPORTS_KEY = 'preppilot_speaking_reports';

/**
 * Normalizes report structure.
 */
function normalizeReportRecord(item) {
  if (!item) return null;
  return {
    id: item.id || `report_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    user_id: item.user_id || 'guest',
    challenge_id: item.challenge_id || null,
    local_recording_id: item.local_recording_id || item.localRecordingId || '',
    overall_score: item.overall_score ?? null,
    category_scores: item.category_scores || {},
    strengths: item.strengths || [],
    areas_to_improve: item.areas_to_improve || [],
    grammar_corrections: item.grammar_corrections || [],
    filler_words: item.filler_words || { detected_count: 0, breakdown: {}, impact_note: '' },
    personalized_suggestions: item.personalized_suggestions || [],
    improved_sample_answer: item.improved_sample_answer || null,
    delivery_notes: item.delivery_notes || null,
    transcript: item.transcript || null,
    summary: item.summary || '',
    status: item.status || 'success',
    created_at: item.created_at || new Date().toISOString()
  };
}

/**
 * Execute AI Speaking Analysis on a recorded session.
 * 
 * @param {Object} params
 * @param {Blob} params.videoBlob - The local recording blob from IndexedDB
 * @param {Object} params.sessionData - Challenge session metadata
 * @param {Object} params.user - Current user object
 * @param {boolean} params.allowSaveTranscript - User consent for transcript persistence
 * @param {Function} [params.onProgress] - Optional progress callback
 * @returns {Promise<Object>} The verified evaluation report
 */
export async function analyzeSpeakingRecording({
  videoBlob,
  sessionData,
  user,
  allowSaveTranscript = false,
  onProgress = () => {}
}) {
  if (!videoBlob) {
    throw new Error('Recording file is required for analysis.');
  }

  // 1. Get authenticated user session
  let token = null;
  let effectiveUserId = user?.id || null;

  if (isSupabaseConfigured()) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        token = session.access_token;
        effectiveUserId = session.user?.id || effectiveUserId;
      }
    } catch (_e) {}
  }

  if (!token) {
    throw new Error('Authentication required. Please sign in to analyze your speaking challenge.');
  }

  // 2. Extract only the audio track on client device (Privacy protection)
  onProgress({ stage: 'extracting_audio', label: 'Extracting audio securely on your device...' });
  const { audioBlob, mimeType } = await extractAudioFromRecording(videoBlob);

  onProgress({ stage: 'encoding_audio', label: 'Preparing speech data...' });
  const audioBase64 = await blobToBase64(audioBlob);

  // 3. Build payload
  const payload = {
    audioBase64,
    mimeType,
    topic: sessionData?.topic || '',
    difficulty: sessionData?.difficulty || 'Beginner',
    durationSeconds: sessionData?.durationSeconds ?? sessionData?.duration_seconds ?? 60,
    spentSeconds: sessionData?.spentSeconds ?? sessionData?.spent_seconds ?? 0,
    localRecordingId: sessionData?.localRecordingId || sessionData?.local_recording_id || ''
  };

  onProgress({ stage: 'calling_ai', label: 'Connecting to PrepPilot Speaking Coach...' });

  let rawEvaluation = null;
  let backendError = null;

  // Try Supabase Edge Function first
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.functions.invoke('speaking-coach', {
        body: payload
      });
      if (!error && data?.evaluation) {
        rawEvaluation = data.evaluation;
      } else if (error) {
        backendError = error;
      }
    } catch (e) {
      backendError = e;
    }
  }

  // Fallback to local Vite dev backend endpoint
  if (!rawEvaluation) {
    try {
      const res = await fetch('/api/speaking-coach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (json.error === 'AI_NOT_CONFIGURED') {
          const cfgErr = new Error(json.message || 'PrepPilot Speaking Coach is not yet configured.');
          cfgErr.code = 'AI_NOT_CONFIGURED';
          throw cfgErr;
        }
        throw new Error(json.message || `Backend service returned error ${res.status}`);
      }

      if (json.evaluation) {
        rawEvaluation = json.evaluation;
      } else {
        throw new Error('No evaluation received from backend.');
      }
    } catch (fetchErr) {
      if (fetchErr.code === 'AI_NOT_CONFIGURED') {
        throw fetchErr;
      }
      if (backendError) {
        console.error('[aiSpeakingService] Both Supabase Edge Function and Dev Backend failed:', backendError, fetchErr);
      }
      throw fetchErr;
    }
  }

  // 4. Validate and normalize evaluation response
  onProgress({ stage: 'processing_report', label: 'Processing evaluation and scoring...' });
  const validated = validateAndNormalizeEvaluation(rawEvaluation);

  // Filter transcript according to user consent
  const transcriptToStore = allowSaveTranscript ? validated.transcript : null;

  const localRecordingId = sessionData?.localRecordingId || sessionData?.local_recording_id || '';
  const challengeId = sessionData?.id && !sessionData.id.startsWith('speaking_') ? sessionData.id : null;

  const reportRecord = {
    id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    user_id: effectiveUserId,
    challenge_id: challengeId,
    local_recording_id: localRecordingId,
    overall_score: validated.overall_score,
    category_scores: validated.category_scores,
    strengths: validated.strengths,
    areas_to_improve: validated.areas_to_improve,
    grammar_corrections: validated.grammar_corrections,
    filler_words: validated.filler_words,
    personalized_suggestions: validated.personalized_suggestions,
    improved_sample_answer: validated.improved_sample_answer,
    delivery_notes: validated.delivery_notes,
    transcript: transcriptToStore,
    summary: validated.summary,
    status: validated.status,
    created_at: new Date().toISOString()
  };

  // 5. Cache locally in browser
  saveReportLocally(effectiveUserId, reportRecord);

  // 6. Persist to Supabase speaking_analysis_reports table if authenticated
  if (isSupabaseConfigured() && effectiveUserId && effectiveUserId !== 'guest') {
    try {
      const { data: dbData, error: dbErr } = await supabase
        .from('speaking_analysis_reports')
        .insert([{
          user_id: effectiveUserId,
          challenge_id: reportRecord.challenge_id,
          local_recording_id: reportRecord.local_recording_id,
          overall_score: reportRecord.overall_score,
          category_scores: reportRecord.category_scores,
          strengths: reportRecord.strengths,
          areas_to_improve: reportRecord.areas_to_improve,
          grammar_corrections: reportRecord.grammar_corrections,
          filler_words: reportRecord.filler_words,
          personalized_suggestions: reportRecord.personalized_suggestions,
          improved_sample_answer: reportRecord.improved_sample_answer,
          delivery_notes: reportRecord.delivery_notes,
          transcript: reportRecord.transcript
        }])
        .select();

      if (!dbErr && dbData && dbData.length > 0) {
        reportRecord.id = dbData[0].id;
        saveReportLocally(effectiveUserId, reportRecord);
      } else if (dbErr) {
        console.warn('[aiSpeakingService] Note: Supabase reports table not ready or write warning (cached locally):', dbErr.message);
      }

      // Also update the score in speaking_challenges table
      if (reportRecord.overall_score !== null) {
        if (challengeId) {
          await supabase
            .from('speaking_challenges')
            .update({ score: reportRecord.overall_score })
            .eq('id', challengeId);
        } else if (localRecordingId) {
          await supabase
            .from('speaking_challenges')
            .update({ score: reportRecord.overall_score })
            .eq('local_recording_id', localRecordingId);
        }
      }
    } catch (saveErr) {
      console.warn('[aiSpeakingService] Supabase report persistence warning:', saveErr);
    }
  }

  // Update session score in local cache as well
  updateLocalSessionScore(effectiveUserId, localRecordingId, reportRecord.overall_score);

  return {
    ...reportRecord,
    // Provide live transcript for display even if user chose not to store it permanently
    displayTranscript: validated.transcript
  };
}

/**
 * Cache report in localStorage.
 */
function saveReportLocally(userId, report) {
  try {
    const key = `${LOCAL_REPORTS_KEY}_${userId || 'guest'}`;
    const raw = localStorage.getItem(key);
    const list = raw ? JSON.parse(raw) : [];
    const filtered = list.filter(r => r.local_recording_id !== report.local_recording_id && r.id !== report.id);
    filtered.unshift(report);
    localStorage.setItem(key, JSON.stringify(filtered));
  } catch (e) {
    console.warn('[aiSpeakingService] Failed to cache report locally:', e);
  }
}

/**
 * Update score in speaking session metadata cache.
 */
function updateLocalSessionScore(userId, localRecordingId, score) {
  if (!localRecordingId) return;
  const updateList = (k) => {
    try {
      const raw = localStorage.getItem(k);
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          let modified = false;
          const updated = list.map(item => {
            if ((item.local_recording_id || item.localRecordingId) === localRecordingId) {
              modified = true;
              return { ...item, score };
            }
            return item;
          });
          if (modified) {
            localStorage.setItem(k, JSON.stringify(updated));
          }
        }
      }
    } catch (_e) {}
  };

  updateList(`preppilot_speaking_meta_${userId}`);
  updateList(`preppilot_speaking_meta_guest`);

  try {
    const rawLast = localStorage.getItem('preppilot_last_speaking_session');
    if (rawLast) {
      const last = JSON.parse(rawLast);
      if ((last.local_recording_id || last.localRecordingId) === localRecordingId) {
        last.score = score;
        localStorage.setItem('preppilot_last_speaking_session', JSON.stringify(last));
      }
    }
  } catch (_e) {}
}

/**
 * Fetch saved report for a given challenge session.
 */
export async function getSpeakingReportForSession(userId = 'guest', localRecordingId) {
  if (!localRecordingId) return null;

  // 1. Check local cache
  try {
    const key = `${LOCAL_REPORTS_KEY}_${userId || 'guest'}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const list = JSON.parse(raw);
      const found = list.find(r => r.local_recording_id === localRecordingId);
      if (found) return normalizeReportRecord(found);
    }
  } catch (_e) {}

  // 2. Fetch from Supabase
  if (isSupabaseConfigured() && userId && userId !== 'guest') {
    try {
      const { data, error } = await supabase
        .from('speaking_analysis_reports')
        .select('*')
        .eq('user_id', userId)
        .eq('local_recording_id', localRecordingId)
        .maybeSingle();

      if (!error && data) {
        return normalizeReportRecord(data);
      }
    } catch (err) {
      console.warn('[aiSpeakingService] Supabase get report error:', err);
    }
  }

  return null;
}

/**
 * Fetch all speaking reports for the user.
 */
export async function getAllSpeakingReports(userId = 'guest') {
  const map = new Map();

  // 1. Local cache
  try {
    const key = `${LOCAL_REPORTS_KEY}_${userId || 'guest'}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        list.forEach(r => {
          if (r.local_recording_id) map.set(r.local_recording_id, normalizeReportRecord(r));
        });
      }
    }
  } catch (_e) {}

  // 2. Supabase
  if (isSupabaseConfigured() && userId && userId !== 'guest') {
    try {
      const { data, error } = await supabase
        .from('speaking_analysis_reports')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        data.forEach(r => {
          if (r.local_recording_id) map.set(r.local_recording_id, normalizeReportRecord(r));
        });
      }
    } catch (_e) {}
  }

  return Array.from(map.values()).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}
