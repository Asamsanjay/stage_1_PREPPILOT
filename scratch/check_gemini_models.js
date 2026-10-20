// Check available models or test gemini-1.5-flash / gemini-2.0-flash
import { config } from 'dotenv';
config();

const apiKey = process.env.GEMINI_API_KEY;

async function checkModels() {
  console.log('Checking model availability with API key...');

  const modelsToTest = [
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b',
    'gemini-1.5-pro',
    'gemini-2.0-flash-exp'
  ];

  for (const model of modelsToTest) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': apiKey
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Hello, reply with 1 word.' }] }]
        })
      });

      console.log(`Model [${model}]: HTTP ${res.status}`);
      if (res.ok) {
        const data = await res.json();
        console.log(` -> SUCCESS! Response:`, data.candidates?.[0]?.content?.parts?.[0]?.text?.trim());
      } else {
        const err = await res.text();
        console.log(` -> Error:`, err.substring(0, 100));
      }
    } catch (e) {
      console.log(`Model [${model}] failed:`, e.message);
    }
  }
}

checkModels();
