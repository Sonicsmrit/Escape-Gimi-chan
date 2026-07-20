# Escape Gimi-chan! ヾ(๑╹◡╹)ﾉ🔪

Escape Gimi-chan is an AI-powered visual novel dating simulator with a cute-horror twist! Locked in an empty classroom by your homeroom representative, Gimi-chan, you must talk your way out. 

Inspired by classic visual novels and early-internet browser games, this project reimagines interactive fiction with modern AI. Gimi-chan does not follow scripted dialogue branches; she listens, reacts, remembers, shifts her mood, and decides your fate dynamically based on what you type. Every choice and message shifts her Love Meter, leading to unique outcomes!

It has 3 endings: Good Ending (1 of 3) → Trick Ending (2 of 3) → Bad Ending (3 of 3).

---

## Why I'm Proud of It
I am proud of creating a game where each player's conversational style shapes the outcome. Gimi-chan does not have a fixed set of answers. Instead, the Gemini API acts as a dynamic personality engine, adjusting her volatility, jealousy, and affection level on the fly. Combining nostalgic visual novel mechanics with state-of-the-art AI creates a highly interactive and immersive experience!

---

## Features
* **Name Entry Panel**: Personalizes the story, narration, and AI responses with the player's custom name.
* **Interactive VN Intro & Backstory**: Introduces the plot before the chat begins, letting the player make a critical initial choice.
* **Dynamic Web Audio Synth Engine**: 
  * Typewriter sound effects matching text rendering.
  * Adaptive ambient mood chimes that trigger when Gimi-chan's emotions shift (happy, sad, suspicious, unhinged, angry).
  * Retro sound effects for UI clicks.
* **Mood Sprite Animations**: 8+ expressive emotional sprites with custom CSS animations (shaking for angry, bouncing for happy, drooping for sad, pulsing red glow for unhinged).
* **Vercel Ready**: Structured to easily deploy statically and run serverlessly.

---

## Tech Stack
Escape Gimi-chan was built as a full-stack web application.

* **Frontend**:
  * HTML5 & CSS3 (Glassmorphic, retro anime visual style)
  * Vanilla JavaScript
  * Web Audio API (real-time synthesizer sound generation)
* **Backend**:
  * Node.js + Express server
  * Vercel serverless integration
  * Gemini API integration
* **AI System**:
  * Gemini acts as Gimi-chan's personality engine.
  * Custom prompts structure Gimi-chan's speech patterns to match yandere templates.
  * Uses Gemini's structured output JSON schemas to ensure Gimi-chan's responses never cut off and return valid data every single turn.

---

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environmental variables**:
   Create a `.env` file in the root directory:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   PORT=3000
   ```
   *You can get a free Gemini API key from [Google AI Studio](https://aistudio.google.com).*

3. **Start the server**:
   ```bash
   npm start
   ```

4. **Play the game**:
   Open your browser to:
   ```
   http://localhost:3000
   ```

---

## Project Structure
```
Escape Gimi-chan/
├── api/
│   └── chat.js            # Vercel serverless API function
│
├── public/
│   ├── assets/            # Sprites, classroom, and menu backgrounds
│   ├── index.html         # Visual novel screens & layout
│   ├── styles.css         # Anime visual novel glassmorphism styles
│   └── script.js          # VN state machine & audio synthesis
│
├── server.js              # Local Node.js Express server
├── vercel.json            # Vercel deployment rewrites
├── package.json           
├── .env                   
├── .gitignore             
└── README.md              
```
