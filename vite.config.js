import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const SPEAKING_COACH_SYSTEM_PROMPT = `You are PREPPILOT SPEAKING COACH, an expert, objective speech and communication evaluation AI agent.
Your mission is to evaluate the user's spoken response to a specific speaking challenge topic.

CRITICAL PRINCIPLES:
1. Base your evaluation strictly on the user's actual speech content and audio characteristics.
2. Avoid generic praise or vague compliments. Explain specifically why scores were assigned.
3. Anchor your observations to evidence from the user's actual transcript.
4. Accent is NEVER a mistake and must NEVER be penalized. Evaluate clarity and intelligibility instead.
5. Do NOT invent emotions, confidence percentages, or psychological states without scientific proof.
6. If the audio is silent, unintelligible, or empty, set "status" to "insufficient_speech" and explain that no clear speech was detected.
7. Return strictly valid JSON adhering to the specified schema.

RUBRIC & SCORING:
- Overall Score (0-100 or null if insufficient speech)
- Category scores (0-100 or null): fluency, grammar, vocabulary, relevance, structure, clarity.
- Minimum 3 specific strengths with transcript evidence.
- Actionable areas to improve with transcript evidence.
- Grammar corrections: [{ "original": string, "corrected": string, "explanation": string }].
- Exact filler word counts for um, uh, like, you know, actually, basically, so.
- Improved sample answer preserving user's authentic facts without fabricating personal stories.
- Verbatim transcript.`;

// Candidate models for automated fallback in order of availability and speed
const GEMINI_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.7-flash',
  'gemini-3.5-flash',
  'gemini-flash-latest'
];

async function callGeminiWithFallback(apiKey, payload) {
  let lastError = null;
  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': apiKey
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        return await res.json();
      }
      const errText = await res.text();
      lastError = `Model ${model} returned ${res.status}: ${errText}`;
      console.warn(`[Gemini Fallback] ${model} failed (${res.status}), trying next candidate...`);
    } catch (e) {
      lastError = `Model ${model} network error: ${e.message}`;
      console.warn(`[Gemini Fallback] ${model} error:`, e.message);
    }
  }
  throw new Error(`All candidate AI models were unavailable. Last error: ${lastError}`);
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    base: './',
    plugins: [
      {
        name: 'force-javascript-mime-type',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            const originalSetHeader = res.setHeader;
            res.setHeader = function (name, value) {
              if (typeof name === 'string' && name.toLowerCase() === 'content-type') {
                if (typeof value === 'string' && (value.includes('jsx') || value.includes('text/plain'))) {
                  value = 'application/javascript; charset=utf-8';
                }
              }
              return originalSetHeader.call(this, name, value);
            };
            next();
          });
        }
      },
      {
        name: 'speaking-coach-dev-backend',
        configureServer(server) {
          server.middlewares.use('/api/speaking-coach', async (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Method Not Allowed' }));
              return;
            }

            try {
              // Collect request body
              const chunks = [];
              for await (const chunk of req) {
                chunks.push(chunk);
              }
              const rawBody = Buffer.concat(chunks).toString();
              const body = JSON.parse(rawBody || '{}');

              // 1. Verify Authorization header and Supabase JWT
              const authHeader = req.headers['authorization'];
              if (!authHeader) {
                res.statusCode = 401;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'UNAUTHORIZED', message: 'Missing Authorization header.' }));
                return;
              }

              const supabaseUrl = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
              const supabaseAnon = env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
              const isDevBypass = authHeader.includes('dev-') || authHeader.includes('guest-');

              if (supabaseUrl && !supabaseUrl.includes('placeholder') && !isDevBypass) {
                try {
                  const authRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
                    headers: {
                      'Authorization': authHeader,
                      'apikey': supabaseAnon || ''
                    }
                  });
                  if (!authRes.ok) {
                    res.statusCode = 401;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: 'UNAUTHORIZED', message: 'Invalid or expired Supabase authentication session.' }));
                    return;
                  }
                } catch (authErr) {
                  console.warn('[speakingCoachDevBackend] Supabase auth check warning:', authErr.message);
                }
              }

              // 2. Check AI API Key (Stored securely on server, NEVER exposed to client)
              const geminiApiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
              if (!geminiApiKey) {
                res.statusCode = 503;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                  error: 'AI_NOT_CONFIGURED',
                  message: 'PrepPilot Speaking Coach is not yet configured. Please add GEMINI_API_KEY to your .env file or Supabase Edge Function secrets.'
                }));
                return;
              }

              const { audioBase64, mimeType, topic, difficulty, durationSeconds, spentSeconds } = body;
              if (!audioBase64) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'BAD_REQUEST', message: 'Audio data is required.' }));
                return;
              }

              const userPrompt = `Evaluate this speaking challenge response:
- Topic: "${topic || 'General Practice'}"
- Target Difficulty: ${difficulty || 'Beginner'}
- Target Duration: ${durationSeconds || 60} seconds
- Actual Spoken Duration: ${spentSeconds || 0} seconds

Provide the full JSON evaluation according to the PrepPilot Speaking Coach rubric.`;

              const payload = {
                system_instruction: {
                  parts: [{ text: SPEAKING_COACH_SYSTEM_PROMPT }],
                },
                contents: [
                  {
                    role: 'user',
                    parts: [
                      {
                        inline_data: {
                          mime_type: mimeType || 'audio/wav',
                          data: audioBase64,
                        },
                      },
                      {
                        text: userPrompt,
                      },
                    ],
                  },
                ],
                generationConfig: {
                  response_mime_type: 'application/json',
                  temperature: 0.2,
                },
              };

              const aiData = await callGeminiWithFallback(geminiApiKey, payload);
              const candidateText = aiData?.candidates?.[0]?.content?.parts?.[0]?.text;
              if (!candidateText) {
                throw new Error('AI returned an empty response.');
              }

              const cleanedText = candidateText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
              const parsed = JSON.parse(cleanedText);
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, evaluation: parsed }));
            } catch (err) {
              console.error('[speakingCoachDevBackend] Error:', err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'INTERNAL_ERROR', message: err.message || 'Analysis failed.' }));
            }
          });
        }
      },
      {
        name: 'interviewer-agent-dev-backend',
        configureServer(server) {
          server.middlewares.use('/api/interview-agent', async (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Method Not Allowed' }));
              return;
            }

            try {
              const chunks = [];
              for await (const chunk of req) {
                chunks.push(chunk);
              }
              const rawBody = Buffer.concat(chunks).toString();
              const body = JSON.parse(rawBody || '{}');

              // 1. Check Authorization
              const authHeader = req.headers['authorization'];
              if (!authHeader) {
                res.statusCode = 401;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'UNAUTHORIZED', message: 'Missing Authorization header.' }));
                return;
              }

              const supabaseUrl = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
              const supabaseAnon = env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
              const isDevBypass = authHeader.includes('dev-') || authHeader.includes('guest-');

              if (supabaseUrl && !supabaseUrl.includes('placeholder') && !isDevBypass) {
                try {
                  const authRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
                    headers: {
                      'Authorization': authHeader,
                      'apikey': supabaseAnon || ''
                    }
                  });
                  if (!authRes.ok) {
                    res.statusCode = 401;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: 'UNAUTHORIZED', message: 'Invalid or expired session.' }));
                    return;
                  }
                } catch (authErr) {
                  console.warn('[interviewerDevBackend] Supabase auth warning:', authErr.message);
                }
              }

              // 2. Check Gemini API Key
              const geminiApiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
              if (!geminiApiKey) {
                res.statusCode = 503;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                  error: 'AI_NOT_CONFIGURED',
                  message: 'PrepPilot Interviewer Agent requires GEMINI_API_KEY in your .env file or Supabase Edge Function secrets.'
                }));
                return;
              }

              const { action, systemInstruction, prompt } = body;
              if (!prompt) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'BAD_REQUEST', message: 'Prompt is required.' }));
                return;
              }

              const payload = {
                system_instruction: systemInstruction ? {
                  parts: [{ text: systemInstruction }]
                } : undefined,
                contents: [
                  {
                    role: 'user',
                    parts: [{ text: prompt }]
                  }
                ],
                generationConfig: {
                  response_mime_type: 'application/json',
                  temperature: action === 'evaluate_interview' ? 0.2 : 0.6
                }
              };

              const aiData = await callGeminiWithFallback(geminiApiKey, payload);
              const candidateText = aiData?.candidates?.[0]?.content?.parts?.[0]?.text;
              if (!candidateText) {
                throw new Error('AI returned an empty response.');
              }

              const cleanedText = candidateText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
              const parsed = JSON.parse(cleanedText);
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, data: parsed }));
            } catch (err) {
              console.error('[interviewerDevBackend] Error:', err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'INTERNAL_ERROR', message: err.message || 'Interviewer service error.' }));
            }
          });
        }
      },
      react()
    ],
    server: {
      host: '127.0.0.1',
      port: 5173
    }
  };
});
