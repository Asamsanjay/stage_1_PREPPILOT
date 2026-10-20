// Supabase Edge Function: speaking-coach
// Evaluates speaking challenge audio using Gemini AI with full user auth verification.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are PREPPILOT SPEAKING COACH, an expert, objective speech and communication evaluation AI agent.
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "UNAUTHORIZED", message: "Missing Authorization header." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user JWT with Supabase Auth
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "UNAUTHORIZED", message: "Invalid or expired authentication session." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { audioBase64, mimeType, topic, difficulty, durationSeconds, spentSeconds } = body;

    if (!audioBase64) {
      return new Response(
        JSON.stringify({ error: "BAD_REQUEST", message: "Audio payload is required for analysis." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check AI provider key
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "AI_NOT_CONFIGURED",
          message: "PrepPilot Speaking Coach is not yet configured with an AI API key. Please configure GEMINI_API_KEY in your Supabase Edge Function secrets.",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userPrompt = `Evaluate this speaking challenge response:
- Topic: "${topic || 'General Practice'}"
- Target Difficulty: ${difficulty || 'Beginner'}
- Target Duration: ${durationSeconds || 60}s
- Actual Duration: ${spentSeconds || 0}s

Provide the full JSON evaluation according to the PrepPilot Speaking Coach rubric.`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;
    const payload = {
      system_instruction: {
        parts: [{ text: SYSTEM_PROMPT }],
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              inline_data: {
                mime_type: mimeType || "audio/wav",
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
        response_mime_type: "application/json",
        temperature: 0.2,
      },
    };

    const aiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": apiKey
      },
      body: JSON.stringify(payload),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("[SpeakingCoachEdge] Gemini error:", aiRes.status, errText);
      return new Response(
        JSON.stringify({ error: "AI_PROVIDER_ERROR", message: `AI provider error (${aiRes.status}): ${errText}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiRes.json();
    const candidateText = aiData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      throw new Error("No evaluation generated by the AI provider.");
    }

    const cleanedText = candidateText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    const parsed = JSON.parse(cleanedText);

    return new Response(
      JSON.stringify({ success: true, evaluation: parsed, userId: user.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[SpeakingCoachEdge] Exception:", err);
    return new Response(
      JSON.stringify({ error: "INTERNAL_ERROR", message: err.message || "Speaking Coach analysis failed." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
