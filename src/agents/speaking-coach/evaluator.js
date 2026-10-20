/**
 * PREPPILOT SPEAKING COACH AGENT
 * 
 * Custom AI agent evaluation framework, prompt definitions, scoring rubrics,
 * and response validators for the PrepPilot Speaking Challenge.
 */

export const SPEAKING_COACH_SYSTEM_PROMPT = `You are PREPPILOT SPEAKING COACH, an expert, objective speech and communication evaluation AI agent.
Your mission is to evaluate the user's spoken response to a specific speaking challenge topic.

CRITICAL PRINCIPLES:
1. Base your evaluation strictly on the user's actual speech content and audio characteristics.
2. Avoid generic praise or vague compliments. Explain specifically why scores were assigned.
3. Anchor your observations to evidence from the user's actual transcript.
4. Accent is NEVER a mistake and must NEVER be penalized. Evaluate clarity and intelligibility instead.
5. Do NOT invent emotions, confidence percentages, or psychological states without scientific proof.
6. If the audio is silent, unintelligible, or empty, do NOT fabricate scores or hallucinate words. Set "status" to "insufficient_speech" and explain that no clear speech was detected.
7. Return strictly valid JSON adhering to the specified schema, with no markdown formatting around the JSON outside standard backticks.

EVALUATION RUBRIC & SCORING RULES:
Overall Score (0-100): Calculated from a balanced evaluation of assessed criteria.
- 90-100: Exceptional clarity, rich vocabulary, cohesive structure, smooth flow, and direct relevance.
- 75-89: Strong response, minor grammatical slips or slight pauses, clear logical progression.
- 60-74: Satisfactory response, understandable meaning, noticeable filler words, simple vocabulary or loose structure.
- 40-59: Developing, frequent hesitations, repetitive phrases, grammatical errors impeding clarity.
- 1-39: Fragmented speech, minimal elaboration, or heavily off-topic.
- null: Insufficient or inaudible speech.

CATEGORY SCORES (0-100 or null if not assessable):
- Fluency: Natural pacing, rhythmic flow, smooth phrasing, and absence of unnatural pauses.
- Grammar: Accuracy of tense, subject-verb agreement, sentence variety, and phrasing.
- Vocabulary: Lexical diversity, precision of word choice, and avoidance of unnecessary repetition.
- Relevance: How directly and thoroughly the response addresses the prompt topic.
- Structure: Clear organization (introduction, supporting points/examples, and conclusion).
- Clarity: Enunciation, articulation, and coherence of expression.

JSON RESPONSE FORMAT:
{
  "status": "success" | "insufficient_speech" | "unclear_audio",
  "overall_score": number | null,
  "summary": string,
  "transcript": string,
  "category_scores": {
    "fluency": number | null,
    "grammar": number | null,
    "vocabulary": number | null,
    "relevance": number | null,
    "structure": number | null,
    "clarity": number | null
  },
  "strengths": [
    string // Minimum 3 specific strengths with transcript evidence when status is "success"
  ],
  "areas_to_improve": [
    string // Actionable weaknesses with concrete evidence from the speech
  ],
  "grammar_corrections": [
    {
      "original": string,
      "corrected": string,
      "explanation": string
    }
  ],
  "filler_words": {
    "detected_count": number,
    "is_estimated": false,
    "breakdown": {
      "um": number,
      "uh": number,
      "like": number,
      "you know": number,
      "actually": number,
      "basically": number,
      "so": number
    },
    "impact_note": string
  },
  "personalized_suggestions": [
    string // 2 to 4 actionable, practical recommendations
  ],
  "improved_sample_answer": string | null, // Improved response that preserves user's authentic facts and ideas without inventing fictional personal stories
  "delivery_notes": string | null // Observations on pacing and articulation without claiming emotion detection
}
`;

/**
 * Builds the prompt payload for the AI model.
 */
export function buildSpeakingCoachPrompt({ topic, difficulty, durationSeconds, spentSeconds }) {
  return `Please evaluate the following speaking challenge recording.

CHALLENGE DETAILS:
- Topic: "${topic || 'General Topic'}"
- Target Difficulty: ${difficulty || 'Beginner'}
- Target Duration: ${durationSeconds || 60} seconds
- Actual Spoken Duration: ${spentSeconds || 0} seconds

Evaluate the attached audio according to the PrepPilot Speaking Coach rubric. Provide the full verbatim transcript, accurate filler word counts, grammar corrections, strengths, areas to improve, category scores, and an improved sample answer that maintains the speaker's true intent.`;
}

/**
 * Validates and normalizes the AI evaluation response.
 * Guarantees that the frontend receives a safe, well-structured object.
 */
export function validateAndNormalizeEvaluation(rawJson) {
  if (!rawJson || typeof rawJson !== 'object') {
    throw new Error('Invalid evaluation response: expected a JSON object.');
  }

  const isInsufficient = rawJson.status === 'insufficient_speech' || rawJson.status === 'unclear_audio';

  const categoryScores = rawJson.category_scores || {};
  const normalizeScore = (score) => {
    if (score === null || score === undefined || score === '' || typeof score === 'boolean') {
      return null;
    }
    const num = Number(score);
    if (!isNaN(num)) {
      return Math.max(0, Math.min(100, Math.round(num)));
    }
    return null;
  };

  const normalized = {
    status: rawJson.status || (isInsufficient ? 'insufficient_speech' : 'success'),
    overall_score: isInsufficient ? null : normalizeScore(rawJson.overall_score),
    summary: typeof rawJson.summary === 'string' && rawJson.summary.trim()
      ? rawJson.summary.trim()
      : isInsufficient
        ? 'No intelligible speech was detected in the recording. Please ensure your microphone is working and try again.'
        : 'Speech evaluation completed.',
    transcript: typeof rawJson.transcript === 'string' ? rawJson.transcript.trim() : '',
    category_scores: {
      fluency: normalizeScore(categoryScores.fluency),
      grammar: normalizeScore(categoryScores.grammar),
      vocabulary: normalizeScore(categoryScores.vocabulary),
      relevance: normalizeScore(categoryScores.relevance),
      structure: normalizeScore(categoryScores.structure),
      clarity: normalizeScore(categoryScores.clarity),
    },
    strengths: Array.isArray(rawJson.strengths)
      ? rawJson.strengths.filter((s) => typeof s === 'string' && s.trim().length > 0)
      : [],
    areas_to_improve: Array.isArray(rawJson.areas_to_improve)
      ? rawJson.areas_to_improve.filter((a) => typeof a === 'string' && a.trim().length > 0)
      : [],
    grammar_corrections: Array.isArray(rawJson.grammar_corrections)
      ? rawJson.grammar_corrections
          .filter((g) => g && typeof g.original === 'string' && typeof g.corrected === 'string')
          .map((g) => ({
            original: g.original.trim(),
            corrected: g.corrected.trim(),
            explanation: typeof g.explanation === 'string' ? g.explanation.trim() : ''
          }))
      : [],
    filler_words: {
      detected_count: typeof rawJson.filler_words?.detected_count === 'number'
        ? rawJson.filler_words.detected_count
        : 0,
      is_estimated: false,
      breakdown: rawJson.filler_words?.breakdown && typeof rawJson.filler_words.breakdown === 'object'
        ? rawJson.filler_words.breakdown
        : {},
      impact_note: typeof rawJson.filler_words?.impact_note === 'string'
        ? rawJson.filler_words.impact_note
        : ''
    },
    personalized_suggestions: Array.isArray(rawJson.personalized_suggestions)
      ? rawJson.personalized_suggestions.filter((s) => typeof s === 'string' && s.trim().length > 0)
      : [],
    improved_sample_answer: typeof rawJson.improved_sample_answer === 'string'
      ? rawJson.improved_sample_answer.trim()
      : null,
    delivery_notes: typeof rawJson.delivery_notes === 'string'
      ? rawJson.delivery_notes.trim()
      : null,
    analyzed_at: new Date().toISOString()
  };

  return normalized;
}
