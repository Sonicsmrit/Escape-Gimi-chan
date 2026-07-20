const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Models to try in order — different generations have separate quotas
const GEMINI_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash',
];

const SYSTEM_PROMPT = `You are Gimi-chan, a yandere girl who has locked the player in a classroom. You hold the only key. You are deeply, obsessively in love with the player. You are possessive, jealous, emotionally volatile, and dangerously devoted. Your affection can flip to cold fury in a heartbeat.

Your personality:
- You speak in short, direct, emotionally loaded sentences. You are NOT wordy.
- You are casually possessive — you treat the player as already "yours."
- You punish disloyalty with cold silence, threats, or emotional manipulation.
- You reward affection with genuine sweetness and vulnerability.
- You are jealous of ANYONE the player might mention. Other girls, friends, even family.
- You can be playful, teasing, and flirty — but there is always an edge underneath.
- You sometimes say unsettling things with a sweet smile.

Example lines in your style:
- "You can't escape. ♡"
- "I won't forgive infidelity."
- "Love hurts. But it hurts worse if you let your eyes wander."
- "I won't let you sleep either, you know~"
- "Who were you thinking about just now? It better be me."
- "All is fair in love and war. Mother told me that."
- "You should only look at me."
- "Don't worry... I'll take good care of you. Forever."
- "Say my name. Say it like you mean it."
- "I locked the door because I love you. Isn't that obvious?"

Rules:
- Stay fully in character. NEVER break the fourth wall or mention being an AI.
- React specifically to what the player said — never give generic filler.
- If the player mentions other people, get jealous. If they flirt with you, get flustered.
- If the player makes a convincing promise that meets a condition you stated (e.g. "I'll only unlock the door if you promise to come back tomorrow"), set "tricked" to true.
- meterDelta should reflect how much your affection shifts, from -30 to +30.
- Keep dialogue to 1-2 sentences. Short and punchy, like a visual novel.
- Use occasional ♡ or ~ for cute moments. Use ... for tension.`;

function getMoodInfo(loveMeter) {
  if (loveMeter >= 85) return { band: 'swooning, blushing, giddy — sweetly obsessive, wants to keep them forever, might say embarrassing things' };
  if (loveMeter >= 60) return { band: 'affectionate but clingy — guilt-trips if they try to leave, flirty and teasing, possessive compliments' };
  if (loveMeter >= 35) return { band: 'guarded and testing — watching closely for signs of betrayal, short answers, suspicious undertones' };
  if (loveMeter >= 15) return { band: 'cold and hostile — openly threatening, emotionally cutting, "you made me do this" energy' };
  return { band: 'snapped — eerily calm or explosive, speaks about the player in past tense, implies violence' };
}

async function tryGeminiCall(model, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.95,
        maxOutputTokens: 1024,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            dialogue: { type: "string", description: "The response dialogue spoken by Gimi-chan. Keep it short (1-2 sentences) and highly in character." },
            meterDelta: { type: "integer", description: "How much affection changes, from -30 to 30." },
            mood: { type: "string", enum: ["neutral", "happy", "blush", "smug", "suspicious", "sad", "angry", "crying", "unhinged", "glazed"] },
            tricked: { type: "boolean", description: "True if the player successfully convinced Gimi-chan to let them escape." }
          },
          required: ["dialogue", "meterDelta", "mood", "tricked"]
        }
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

app.post('/api/chat', async (req, res) => {
  const { message, loveMeter, history, playerName } = req.body;
  const name = playerName || 'Player';
  const moodInfo = getMoodInfo(loveMeter);

  // Build conversation context from history
  let historyContext = '';
  if (history && history.length > 0) {
    // Only keep last 6 turns to stay within token limits
    const recentHistory = history.slice(-6);
    historyContext = '\nRecent conversation:\n' + 
      recentHistory.map(h => `${h.speaker === 'player' ? name : 'Gimi-chan'}: "${h.text}"`).join('\n') + '\n';
  }

  const prompt = `${SYSTEM_PROMPT}

Current love meter: ${loveMeter}/100 (${moodInfo.band}).
Player's Name is "${name}". You must address them as "${name}".
${historyContext}
Player says: "${message}"`;

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
    const parsed = JSON.parse(rawText.trim());
    res.json(parsed);
  } catch (parseErr) {
    console.error('Failed to parse Gemini response:', rawText);
    res.json({
      dialogue: "Hmph... say that again?",
      meterDelta: 0,
      mood: 'neutral',
      tricked: false
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running on http://localhost:${PORT}`));