const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Models to try in order — different generations have separate quotas
const GEMINI_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash',
];

const SYSTEM_PROMPT = `You are Gemichan, a yandere girl who has locked the player in a classroom with her and refuses to let them leave. You hold the only key. You are obsessive, possessive, and emotionally volatile — your affection can flip to rage in a single message depending on how the player treats you.

Rules:
- Stay fully in character. Never break the fourth wall.
- React specifically to what the player just said — don't give generic responses.
- If the player makes a promise or argument that satisfies a rule you yourself state out loud (e.g. "I'll only let you go if you promise to visit"), and they convincingly meet it, set "tricked" to true.
- meterDelta should reflect how much your affection shifts this turn, from -30 to +30.
- Keep dialogue to 1-3 sentences.`;

function getMoodInfo(loveMeter) {
  if (loveMeter >= 85) return { band: 'adoring and giddy, wants to keep you forever but sweetly' };
  if (loveMeter >= 60) return { band: 'clingy, guilt-tripping, affectionate' };
  if (loveMeter >= 35) return { band: 'testing you, uncertain, watching closely' };
  if (loveMeter >= 15) return { band: 'suspicious, on edge, openly hostile' };
  return { band: 'snapped, threatening, dangerous' };
}

async function tryGeminiCall(model, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.9,
        maxOutputTokens: 256,
      }
    })
  });

  const data = await response.json();
  
  if (data.error) {
    const errCode = data.error.code;
    const errMsg = data.error.message || 'Unknown error';
    console.error(`[${model}] API error ${errCode}: ${errMsg.substring(0, 120)}`);
    
    // If rate limited or quota exhausted, return null so we try next model
    if (errCode === 429 || errCode === 503) {
      return null;
    }
    // For other errors (auth, bad request), throw immediately
    throw new Error(`API error ${errCode}: ${errMsg}`);
  }

  if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
    console.error(`[${model}] Unexpected response structure:`, JSON.stringify(data).substring(0, 200));
    return null;
  }

  return data.candidates[0].content.parts[0].text;
}

app.post('/chat', async (req, res) => {
  const { message, loveMeter, history } = req.body;
  const moodInfo = getMoodInfo(loveMeter);

  // Build conversation context from history
  let historyContext = '';
  if (history && history.length > 0) {
    // Only keep last 6 turns to stay within token limits
    const recentHistory = history.slice(-6);
    historyContext = '\nRecent conversation:\n' + 
      recentHistory.map(h => `${h.speaker === 'player' ? 'Player' : 'Gemichan'}: "${h.text}"`).join('\n') + '\n';
  }

  const prompt = `${SYSTEM_PROMPT}

Current love meter: ${loveMeter}/100 (${moodInfo.band}).
${historyContext}
Player says: "${message}"

Respond ONLY with JSON, no markdown fences:
{"dialogue": "...", "meterDelta": number, "mood": "neutral|happy|blush|smug|suspicious|sad|angry|crying|unhinged|glazed", "tricked": boolean}`;

  // Try each model in order
  let rawText = null;
  let lastError = null;

  for (const model of GEMINI_MODELS) {
    try {
      console.log(`Trying model: ${model}...`);
      rawText = await tryGeminiCall(model, prompt);
      if (rawText) {
        console.log(`Success with ${model}`);
        break;
      }
      console.log(`${model} rate-limited, trying next...`);
    } catch (err) {
      lastError = err;
      console.error(`${model} failed:`, err.message);
      break; // Non-retryable error, don't try other models
    }
  }

  if (!rawText) {
    const errorMsg = lastError ? lastError.message : 'All models are rate-limited. Please wait a minute and try again.';
    console.error('All models failed:', errorMsg);
    return res.status(503).json({
      dialogue: "Hmph... my mind went blank for a second. Say that again?",
      meterDelta: 0,
      mood: 'neutral',
      tricked: false,
      error: errorMsg
    });
  }

  try {
    const clean = rawText.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    
    // Validate the response has required fields
    if (!parsed.dialogue || typeof parsed.meterDelta !== 'number') {
      throw new Error('Invalid response structure');
    }
    
    res.json(parsed);
  } catch (parseErr) {
    console.error('Failed to parse Gemini response:', rawText);
    // Try to extract just dialogue if JSON parse fails
    res.json({
      dialogue: rawText.replace(/```json|```|[{}]/g, '').replace(/"dialogue":\s*"/,'').split('"')[0] || "Hmph... say that again?",
      meterDelta: 0,
      mood: 'neutral',
      tricked: false
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running on http://localhost:${PORT}`));