/**
 * PrepPilot AI Interviewer Client Service
 * 
 * Orchestrates calls to the secure backend AI endpoint (/api/interview-agent or Supabase Edge Function),
 * handles question generation, follow-up reasoning, and full performance evaluations.
 */

import { supabase, isSupabaseConfigured } from '../supabaseClient.js';
import {
  INTERVIEWER_SYSTEM_INSTRUCTION,
  buildFirstQuestionPrompt,
  buildNextQuestionPrompt,
  buildEvaluationPrompt,
  validateQuestionPayload,
  validateEvaluationPayload
} from '../agents/interviewer/interviewerAgent.js';
import { getQuestionsForInterview } from '../data/interviewQuestions.js';

const BACKEND_ENDPOINT = typeof window !== 'undefined' 
  ? '/api/interview-agent' 
  : 'http://localhost:5173/api/interview-agent';

/**
 * Resolves authentication token for the current user session.
 */
async function getAuthHeader() {
  if (!isSupabaseConfigured()) {
    return 'Bearer dev-local-session';
  }
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return `Bearer ${session.access_token}`;
    }
  } catch (_e) {}
  return 'Bearer guest-user-token';
}

/**
 * Sends a prompt request to the backend AI proxy.
 */
async function callAiBackend(action, payload) {
  const authHeader = await getAuthHeader();

  const response = await fetch(BACKEND_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify({
      action,
      ...payload
    })
  });

  if (!response.ok) {
    let errorJson = null;
    try {
      errorJson = await response.json();
    } catch (_e) {}

    const error = new Error(
      errorJson?.message || `AI Interviewer service error (${response.status})`
    );
    error.status = response.status;
    error.code = errorJson?.error || 'BACKEND_ERROR';
    throw error;
  }

  const result = await response.json();
  return result;
}

/**
 * Generates the first interview question using the configured AI agent,
 * with graceful fallback to the curated question bank if offline.
 */
export async function getFirstInterviewQuestion(config) {
  try {
    const prompt = buildFirstQuestionPrompt({ config });
    const result = await callAiBackend('generate_question', {
      systemInstruction: INTERVIEWER_SYSTEM_INSTRUCTION,
      prompt,
      config
    });

    if (result && result.data) {
      return validateQuestionPayload(result.data);
    }
  } catch (err) {
    console.warn('[AIInterviewerService] AI first question generation error, using curated fallback:', err);
  }

  // Fallback to curated question bank
  const fallbacks = getQuestionsForInterview(config, 1);
  return validateQuestionPayload({
    question: fallbacks[0]?.text || 'Could you introduce yourself and tell me about your background and experience?',
    category: fallbacks[0]?.category || config.interviewType || 'Introduction',
    tip: fallbacks[0]?.tip || 'Start with your education/background, highlight 1-2 major achievements, and explain why this role interests you.',
    intent: 'Assess background and communication clarity'
  });
}

/**
 * Generates the next question or an adaptive follow-up based on the candidate's actual answer.
 */
export async function getNextInterviewQuestion({ config, history, latestAnswer, remainingMinutes }) {
  try {
    const prompt = buildNextQuestionPrompt({ config, history, latestAnswer, remainingMinutes });
    const result = await callAiBackend('generate_question', {
      systemInstruction: INTERVIEWER_SYSTEM_INSTRUCTION,
      prompt,
      config,
      history,
      latestAnswer
    });

    if (result && result.data) {
      return validateQuestionPayload(result.data);
    }
  } catch (err) {
    console.warn('[AIInterviewerService] AI follow-up generation error, using curated fallback:', err);
  }

  // Fallback to curated question bank based on turn count
  const nextIdx = history.length;
  const fallbacks = getQuestionsForInterview(config, 8);
  const selected = fallbacks[nextIdx % fallbacks.length];

  return validateQuestionPayload({
    question: selected?.text || 'How do you handle difficult trade-offs or technical disagreements in a team setting?',
    category: selected?.category || config.interviewType || 'Follow-up',
    tip: selected?.tip || 'Use concrete examples with measurable outcomes.',
    intent: 'Assess problem-solving and collaboration'
  });
}

/**
 * Generates the comprehensive final performance evaluation based on the interview transcript.
 */
export async function generateInterviewEvaluation({ config, history, durationSpentSeconds }) {
  const prompt = buildEvaluationPrompt({ config, history, durationSpentSeconds });
  const result = await callAiBackend('evaluate_interview', {
    systemInstruction: INTERVIEWER_SYSTEM_INSTRUCTION,
    prompt,
    config,
    history,
    durationSpentSeconds
  });

  if (!result || !result.data) {
    throw new Error('AI evaluation service returned an empty report.');
  }

  return validateEvaluationPayload(result.data);
}

/**
 * Updates the Supabase mock_interviews row with the final AI evaluation report and transcript.
 */
export async function saveInterviewAnalysisReport({ userId, sessionRecord, report, history }) {
  if (!sessionRecord || !report) return;

  const recordId = sessionRecord.id;
  const localRecId = sessionRecord.local_recording_id || sessionRecord.localRecordingId;

  // 1. Update Supabase if authenticated and ID exists
  if (isSupabaseConfigured() && userId && userId !== 'guest') {
    try {
      const updateData = {
        score: report.overallScore,
        ai_report: report,
        questions_and_answers: history,
        status: 'completed'
      };

      if (recordId && !recordId.startsWith('interview_')) {
        await supabase
          .from('mock_interviews')
          .update(updateData)
          .eq('id', recordId);
      } else if (localRecId) {
        await supabase
          .from('mock_interviews')
          .update(updateData)
          .eq('local_recording_id', localRecId);
      }
    } catch (e) {
      console.warn('[AIInterviewerService] Supabase report update warning:', e);
    }
  }

  // 2. Update localStorage cache
  try {
    const raw = localStorage.getItem('preppilot_last_mock_interview');
    if (raw) {
      const last = JSON.parse(raw);
      const merged = {
        ...last,
        score: report.overallScore,
        ai_report: report,
        aiReport: report,
        questions_and_answers: history,
        questionsAndAnswers: history
      };
      localStorage.setItem('preppilot_last_mock_interview', JSON.stringify(merged));
    }
  } catch (_e) {}
}
