// Supabase Edge Function: interview-agent
// Conducts interactive AI interview question generation, follow-up reasoning, and full performance report generation.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    if (supabaseUrl && !supabaseUrl.includes("placeholder")) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: "UNAUTHORIZED", message: "Invalid or expired session." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const body = await req.json();
    const { action, systemInstruction, prompt } = body;

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "BAD_REQUEST", message: "Prompt is required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check AI provider key
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "AI_NOT_CONFIGURED",
          message: "PrepPilot Interviewer Agent requires GEMINI_API_KEY in your Supabase Edge Function secrets.",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const candidateModels = [
      "gemini-3.5-flash-lite",
      "gemini-flash-lite-latest",
      "gemini-3.7-flash",
      "gemini-3.5-flash",
      "gemini-flash-latest"
    ];

    const payload = {
      system_instruction: systemInstruction ? {
        parts: [{ text: systemInstruction }]
      } : undefined,
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        response_mime_type: "application/json",
        temperature: action === "evaluate_interview" ? 0.2 : 0.6
      }
    };

    let aiData = null;
    let lastError = null;

    for (const model of candidateModels) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const aiRes = await fetch(geminiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-goog-api-key": apiKey,
          },
          body: JSON.stringify(payload),
        });

        if (aiRes.ok) {
          aiData = await aiRes.json();
          break;
        } else {
          const errText = await aiRes.text();
          lastError = `Model ${model} returned ${aiRes.status}: ${errText}`;
          console.warn(`[interviewAgent] ${model} failed (${aiRes.status}), trying next candidate...`);
        }
      } catch (e) {
        lastError = `Model ${model} network error: ${e.message}`;
      }
    }

    if (!aiData) {
      return new Response(
        JSON.stringify({ error: "AI_PROVIDER_ERROR", message: `All AI models failed: ${lastError}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const candidateText = aiData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      throw new Error("AI returned an empty response.");
    }

    const cleanedText = candidateText.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    const parsed = JSON.parse(cleanedText);

    return new Response(
      JSON.stringify({ success: true, data: parsed }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[interviewAgentEdgeFunction] Error:", err);
    return new Response(
      JSON.stringify({ error: "INTERNAL_ERROR", message: err.message || "Interview service error." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
