const gameState = {
    screen: 'home',
    loveMeter: 50,
    turnCount: 0
};

// ─── WEB AUDIO ENGINE ───

const AudioEngine = (() => {
    let ctx = null;

    function getCtx() {
        if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === 'suspended') ctx.resume();
        return ctx;
    }

    // Typing blip — short sine beep with slight pitch variation
    function playTypingBlip() {
        const c = getCtx();
        const osc = c.createOscillator();
        const gain = c.createGain();

        osc.type = 'sine';
        // Random pitch in a cute high range for that VN feel
        osc.frequency.value = 420 + Math.random() * 180;

        gain.gain.setValueAtTime(0.06, c.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.06);

        osc.connect(gain);
        gain.connect(c.destination);
        osc.start(c.currentTime);
        osc.stop(c.currentTime + 0.06);
    }

    // Mood transition sounds
    function playMoodSound(mood) {
        const c = getCtx();

        const sounds = {
            happy: () => playChime(c, [523, 659, 784], 0.15, 'sine', 0.08),
            blush: () => playChime(c, [587, 740, 880], 0.18, 'sine', 0.06),
            smug: () => playChime(c, [330, 415, 494], 0.12, 'triangle', 0.07),
            suspicious: () => playTension(c, [220, 233], 0.3, 0.05),
            sad: () => playDescending(c, [392, 330, 262], 0.2, 'sine', 0.06),
            angry: () => playHarsh(c, [165, 175], 0.25, 0.09),
            crying: () => playDescending(c, [523, 440, 349, 262], 0.18, 'sine', 0.05),
            unhinged: () => playDistorted(c, 0.1),
            glazed: () => playEerie(c, 0.06),
            neutral: () => {} // no sound for neutral
        };

        if (sounds[mood]) sounds[mood]();
    }

    // Ascending chime (happy, blush)
    function playChime(c, notes, spacing, type, vol) {
        notes.forEach((freq, i) => {
            const osc = c.createOscillator();
            const gain = c.createGain();
            osc.type = type;
            osc.frequency.value = freq;
            const t = c.currentTime + i * spacing;
            gain.gain.setValueAtTime(vol, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
            osc.connect(gain);
            gain.connect(c.destination);
            osc.start(t);
            osc.stop(t + 0.35);
        });
    }

    // Descending notes (sad, crying)
    function playDescending(c, notes, spacing, type, vol) {
        notes.forEach((freq, i) => {
            const osc = c.createOscillator();
            const gain = c.createGain();
            osc.type = type;
            osc.frequency.value = freq;
            const t = c.currentTime + i * spacing;
            gain.gain.setValueAtTime(vol, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
            osc.connect(gain);
            gain.connect(c.destination);
            osc.start(t);
            osc.stop(t + 0.45);
        });
    }

    // Dissonant tension (suspicious)
    function playTension(c, freqs, dur, vol) {
        freqs.forEach(freq => {
            const osc = c.createOscillator();
            const gain = c.createGain();
            osc.type = 'sawtooth';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(vol, c.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
            osc.connect(gain);
            gain.connect(c.destination);
            osc.start(c.currentTime);
            osc.stop(c.currentTime + dur + 0.05);
        });
    }

    // Harsh low rumble (angry)
    function playHarsh(c, freqs, dur, vol) {
        freqs.forEach(freq => {
            const osc = c.createOscillator();
            const gain = c.createGain();
            osc.type = 'sawtooth';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(vol, c.currentTime);
            gain.gain.linearRampToValueAtTime(0, c.currentTime + dur);
            osc.connect(gain);
            gain.connect(c.destination);
            osc.start(c.currentTime);
            osc.stop(c.currentTime + dur + 0.05);
        });
    }

    // Distorted chaos (unhinged)
    function playDistorted(c, vol) {
        for (let i = 0; i < 4; i++) {
            const osc = c.createOscillator();
            const gain = c.createGain();
            osc.type = 'square';
            osc.frequency.value = 100 + Math.random() * 300;
            const t = c.currentTime + i * 0.08;
            gain.gain.setValueAtTime(vol, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
            osc.connect(gain);
            gain.connect(c.destination);
            osc.start(t);
            osc.stop(t + 0.15);
        }
    }

    // Eerie drone (glazed)
    function playEerie(c, vol) {
        [262, 277].forEach(freq => {
            const osc = c.createOscillator();
            const gain = c.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            osc.frequency.linearRampToValueAtTime(freq - 10, c.currentTime + 0.8);
            gain.gain.setValueAtTime(vol, c.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.9);
            osc.connect(gain);
            gain.connect(c.destination);
            osc.start(c.currentTime);
            osc.stop(c.currentTime + 1);
        });
    }

    // UI click
    function playClick() {
        const c = getCtx();
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = 'sine';
        osc.frequency.value = 600;
        gain.gain.setValueAtTime(0.08, c.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(c.destination);
        osc.start(c.currentTime);
        osc.stop(c.currentTime + 0.1);
    }

    return { playTypingBlip, playMoodSound, playClick };
})();

// ─── SCREENS ───

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    gameState.screen = id;
}

// ─── TYPING WITH SOUND ───

let currentTypingInterval = null;

function typeText(el, text, speed = 30, withSound = true) {
    // Cancel any ongoing typing
    if (currentTypingInterval) {
        clearInterval(currentTypingInterval);
        currentTypingInterval = null;
    }
    return new Promise(resolve => {
        el.textContent = '';
        let i = 0;
        currentTypingInterval = setInterval(() => {
            el.textContent += text[i];
            // Play typing blip for non-space characters
            if (withSound && text[i] !== ' ') {
                AudioEngine.playTypingBlip();
            }
            i++;
            if (i >= text.length) {
                clearInterval(currentTypingInterval);
                currentTypingInterval = null;
                resolve();
            }
        }, speed);
    });
}

// ─── HOME → INTRO ───
document.getElementById('btn-start').addEventListener('click', async () => {
    AudioEngine.playClick();
    showScreen('screen-intro');
    const introText = document.getElementById('intro-text');
    const continueBtn = document.getElementById('btn-intro-continue');
    continueBtn.classList.add('hidden');

    await typeText(
        introText,
        "You open your eyes. Fluorescent lights. Rows of empty desks. A classroom you don't recognize. The door creaks open."
    );

    continueBtn.classList.remove('hidden');
});

// ─── INTRO → CONFRONTATION ───
document.getElementById('btn-intro-continue').addEventListener('click', async () => {
    AudioEngine.playClick();
    showScreen('screen-confrontation');
    const confrontationText = document.getElementById('confrontation-text');
    const continueBtn = document.getElementById('btn-confrontation-continue');
    continueBtn.classList.add('hidden');

    await typeText(
        confrontationText,
        "\"Oh good, you're finally awake.\" She smiles, holding up a set of keys. \"I locked the door myself. We're going to be together for a very long time.\""
    );

    continueBtn.classList.remove('hidden');
});

// ─── CONFRONTATION → DIALOGUE ───
document.getElementById('btn-confrontation-continue').addEventListener('click', () => {
    AudioEngine.playClick();
    showScreen('screen-dialogue');
    updateMeterDisplay();
    const textEl = document.getElementById('gemichan-current-text');
    const openingLine = "You're finally mine. ♡ So... what should we talk about first~?";
    typeText(textEl, openingLine);
    conversationHistory.push({ speaker: 'gemichan', text: openingLine });
});

// ─── DIALOGUE SYSTEM ───

const conversationHistory = [];
let currentMood = 'neutral';

function addDialogueLine(speaker, text) {
    const log = document.getElementById('dialogue-log');
    const line = document.createElement('p');
    line.classList.add('dialogue-line', speaker);
    line.textContent = text;
    log.appendChild(line);
    log.scrollTop = log.scrollHeight;

    conversationHistory.push({ speaker, text });

    if (speaker === 'gemichan') {
        const textEl = document.getElementById('gemichan-current-text');
        typeText(textEl, text);
    }
}

function updateMeterDisplay() {
    document.getElementById('love-meter-fill').style.width = gameState.loveMeter + '%';
}

const moodSprites = {
    neutral: '/assets/neutral.png',
    happy: '/assets/happy.png',
    blush: '/assets/blush.png',
    smug: '/assets/smug.png',
    suspicious: '/assets/unamused.png',
    sad: '/assets/sad.png',
    angry: '/assets/angry.png',
    crying: '/assets/crying.png',
    unhinged: '/assets/smile blood.png',
    glazed: '/assets/neutral glazed.png'
};

function setGemichanMood(mood) {
    const sprite = document.getElementById('gemichan-sprite');
    if (sprite && moodSprites[mood]) {
        // Play mood sound only if mood actually changed
        if (mood !== currentMood) {
            AudioEngine.playMoodSound(mood);
            currentMood = mood;
        }
        // Subtle sprite transition
        sprite.style.opacity = '0.7';
        setTimeout(() => {
            sprite.src = moodSprites[mood];
            sprite.style.opacity = '1';
        }, 150);
    }
}

async function callGemichan(playerMessage) {
    const res = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message: playerMessage,
            loveMeter: gameState.loveMeter,
            history: conversationHistory.slice(-6)
        })
    });
    return res.json();
}

document.getElementById('dialogue-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('player-input');
    const sendBtn = document.querySelector('.btn-send');
    const message = input.value.trim();
    if (!message) return;

    AudioEngine.playClick();

    const textEl = document.getElementById('gemichan-current-text');
    const nameEl = document.querySelector('#screen-dialogue .vn-name');

    // Show player's message briefly
    nameEl.textContent = 'You';
    nameEl.style.color = 'var(--parchment-dim)';
    textEl.textContent = message;

    // Log it
    const log = document.getElementById('dialogue-log');
    const playerLine = document.createElement('p');
    playerLine.classList.add('dialogue-line', 'player');
    playerLine.textContent = message;
    log.appendChild(playerLine);
    conversationHistory.push({ speaker: 'player', text: message });

    input.value = '';
    input.disabled = true;
    sendBtn.disabled = true;
    gameState.turnCount++;

    // Thinking indicator after a beat
    setTimeout(() => {
        nameEl.textContent = 'Gimi-chan';
        nameEl.style.color = '';
        textEl.textContent = '...';
        textEl.style.opacity = '0.5';
    }, 500);

    try {
        const result = await callGemichan(message);
        gameState.loveMeter = Math.max(0, Math.min(100, gameState.loveMeter + result.meterDelta));

        nameEl.textContent = 'Gimi-chan';
        nameEl.style.color = '';
        textEl.style.opacity = '1';

        // Log gemichan response
        const gemLine = document.createElement('p');
        gemLine.classList.add('dialogue-line', 'gemichan');
        gemLine.textContent = result.dialogue;
        log.appendChild(gemLine);
        log.scrollTop = log.scrollHeight;
        conversationHistory.push({ speaker: 'gemichan', text: result.dialogue });

        // Set mood (plays sound if changed)
        setGemichanMood(result.mood || 'neutral');

        // Type out the response with sound
        await typeText(textEl, result.dialogue);

        updateMeterDisplay();
        checkEndingConditions(result.tricked);
    } catch (err) {
        nameEl.textContent = 'Gimi-chan';
        nameEl.style.color = '';
        textEl.style.opacity = '1';
        typeText(textEl, "Hmph... something went wrong. Say that again?");
        console.error(err);
    }

    input.disabled = false;
    sendBtn.disabled = false;
    input.focus();
});

// ─── ENDINGS ───

function checkEndingConditions(tricked) {
    if (tricked) { showScreen('screen-ending-trick'); return; }
    if (gameState.loveMeter >= 90) showScreen('screen-ending-good');
    else if (gameState.loveMeter <= 10) showScreen('screen-ending-bad');
}

function resetGame() {
    gameState.loveMeter = 50;
    gameState.turnCount = 0;
    conversationHistory.length = 0;
    currentMood = 'neutral';
    document.getElementById('dialogue-log').innerHTML = '';
    const textEl = document.getElementById('gemichan-current-text');
    if (textEl) textEl.textContent = '';
    const nameEl = document.querySelector('#screen-dialogue .vn-name');
    if (nameEl) {
        nameEl.textContent = 'Gimi-chan';
        nameEl.style.color = '';
    }
    const sprite = document.getElementById('gemichan-sprite');
    if (sprite) sprite.src = '/assets/neutral.png';
    showScreen('screen-home');
}

document.getElementById('btn-restart-good').addEventListener('click', () => { AudioEngine.playClick(); resetGame(); });
document.getElementById('btn-restart-trick').addEventListener('click', () => { AudioEngine.playClick(); resetGame(); });
document.getElementById('btn-restart-bad').addEventListener('click', () => { AudioEngine.playClick(); resetGame(); });