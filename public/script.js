const gameState = {
    screen: 'home',
    loveMeter: 50,
    turnCount: 0,
    playerName: 'Player'
};

// ─── WEB AUDIO ENGINE ───

const AudioEngine = (() => {
    let ctx = null;

    function getCtx() {
        if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === 'suspended') ctx.resume();
        return ctx;
    }

    function playTypingBlip() {
        const c = getCtx();
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = 'sine';
        osc.frequency.value = 420 + Math.random() * 180;
        gain.gain.setValueAtTime(0.06, c.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.06);
        osc.connect(gain);
        gain.connect(c.destination);
        osc.start(c.currentTime);
        osc.stop(c.currentTime + 0.06);
    }

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
            neutral: () => {}
        };
        if (sounds[mood]) sounds[mood]();
    }

    function playChime(c, notes, spacing, type, vol) {
        notes.forEach((freq, i) => {
            const osc = c.createOscillator();
            const gain = c.createGain();
            osc.type = type;
            osc.frequency.value = freq;
            const t = c.currentTime + i * spacing;
            gain.gain.setValueAtTime(vol, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
            osc.connect(gain); gain.connect(c.destination);
            osc.start(t); osc.stop(t + 0.35);
        });
    }

    function playDescending(c, notes, spacing, type, vol) {
        notes.forEach((freq, i) => {
            const osc = c.createOscillator();
            const gain = c.createGain();
            osc.type = type;
            osc.frequency.value = freq;
            const t = c.currentTime + i * spacing;
            gain.gain.setValueAtTime(vol, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
            osc.connect(gain); gain.connect(c.destination);
            osc.start(t); osc.stop(t + 0.45);
        });
    }

    function playTension(c, freqs, dur, vol) {
        freqs.forEach(freq => {
            const osc = c.createOscillator();
            const gain = c.createGain();
            osc.type = 'sawtooth';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(vol, c.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
            osc.connect(gain); gain.connect(c.destination);
            osc.start(c.currentTime); osc.stop(c.currentTime + dur + 0.05);
        });
    }

    function playHarsh(c, freqs, dur, vol) {
        freqs.forEach(freq => {
            const osc = c.createOscillator();
            const gain = c.createGain();
            osc.type = 'sawtooth';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(vol, c.currentTime);
            gain.gain.linearRampToValueAtTime(0, c.currentTime + dur);
            osc.connect(gain); gain.connect(c.destination);
            osc.start(c.currentTime); osc.stop(c.currentTime + dur + 0.05);
        });
    }

    function playDistorted(c, vol) {
        for (let i = 0; i < 4; i++) {
            const osc = c.createOscillator();
            const gain = c.createGain();
            osc.type = 'square';
            osc.frequency.value = 100 + Math.random() * 300;
            const t = c.currentTime + i * 0.08;
            gain.gain.setValueAtTime(vol, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
            osc.connect(gain); gain.connect(c.destination);
            osc.start(t); osc.stop(t + 0.15);
        }
    }

    function playEerie(c, vol) {
        [262, 277].forEach(freq => {
            const osc = c.createOscillator();
            const gain = c.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            osc.frequency.linearRampToValueAtTime(freq - 10, c.currentTime + 0.8);
            gain.gain.setValueAtTime(vol, c.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.9);
            osc.connect(gain); gain.connect(c.destination);
            osc.start(c.currentTime); osc.stop(c.currentTime + 1);
        });
    }

    function playClick() {
        const c = getCtx();
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = 'sine';
        osc.frequency.value = 600;
        gain.gain.setValueAtTime(0.08, c.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.08);
        osc.connect(gain); gain.connect(c.destination);
        osc.start(c.currentTime); osc.stop(c.currentTime + 0.1);
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
    if (currentTypingInterval) {
        clearInterval(currentTypingInterval);
        currentTypingInterval = null;
    }
    return new Promise(resolve => {
        el.textContent = '';
        let i = 0;
        currentTypingInterval = setInterval(() => {
            el.textContent += text[i];
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

// ─── MOOD SPRITES ───

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

// ─── STORY SEQUENCE ───

const introSequence = [
    {
        text: () => `You are ${gameState.playerName}, a normal high school student. Gimi-chan is the homeroom representative for your class. You never talked to her much. To you, she was just a quiet, diligent girl...`,
    },
    {
        text: () => `But yesterday, she saw ${gameState.playerName} walking home with another girl. You didn't think anything of it. You didn't see the dark expression on Gimi-chan's face.`,
    },
    {
        text: () => `Today, you woke up in a cold sweat. Fluorescent lights. Rows of empty desks. A classroom you don't recognize. Your hands are tied to a chair. The door creaks open...`,
    }
];

const confrontationSequence = [
    {
        text: () => `"Oh good, ${gameState.playerName}, you're finally awake... don't try to escape, I have locked the doors myself and tied you up with love... we are going to be together now, my love <3"`,
        sprite: 'neutral',
        mood: 'neutral'
    },
    {
        text: () => `"So... I have to ask you a question. Who was that girl you were walking with yesterday? Tell me, ${gameState.playerName}."`,
        sprite: 'suspicious',
        mood: 'suspicious',
        showChoices: true
    }
];

let introIndex = 0;
let confrontationIndex = 0;

async function runIntroStep() {
    showScreen('screen-intro');
    const step = introSequence[introIndex];
    const el = document.getElementById('intro-text');
    const btn = document.getElementById('btn-intro-continue');
    btn.classList.add('hidden');
    
    await typeText(el, step.text());
    btn.classList.remove('hidden');
}

async function runConfrontationStep() {
    showScreen('screen-confrontation');
    const step = confrontationSequence[confrontationIndex];
    const textEl = document.getElementById('confrontation-text');
    const nameEl = document.getElementById('confrontation-name');
    const continueBtn = document.getElementById('btn-confrontation-continue');
    const choiceContainer = document.getElementById('confrontation-choices');
    const spriteEl = document.getElementById('gemichan-sprite-confrontation');
    
    continueBtn.classList.add('hidden');
    choiceContainer.classList.add('hidden');
    
    if (step.sprite && moodSprites[step.sprite]) {
        spriteEl.src = moodSprites[step.sprite];
        applySpriteAnimation(spriteEl, step.mood || 'neutral');
    }
    if (step.mood) {
        AudioEngine.playMoodSound(step.mood);
    }
    
    nameEl.textContent = "Gimi-chan";
    await typeText(textEl, step.text());
    
    if (step.showChoices) {
        choiceContainer.classList.remove('hidden');
    } else {
        continueBtn.classList.remove('hidden');
    }
}

function transitionToDialogue(lastReply) {
    showScreen('screen-dialogue');
    updateMeterDisplay();
    
    const sprite = document.getElementById('gemichan-sprite');
    let matchedMood = 'neutral';
    if (conversationHistory.length > 0) {
        const lastMsg = conversationHistory[conversationHistory.length - 1];
        if (lastMsg.text.includes("classmate")) matchedMood = 'blush';
        else if (lastMsg.text.includes("girlfriend")) matchedMood = 'unhinged';
        else if (lastMsg.text.includes("Lying")) matchedMood = 'suspicious';
    }
    sprite.src = moodSprites[matchedMood];
    applySpriteAnimation(sprite, matchedMood);
    currentMood = matchedMood;
    
    const textEl = document.getElementById('gemichan-current-text');
    const openingLine = lastReply || "You're finally mine. ♡ So... what should we talk about first~?";
    textEl.textContent = openingLine;
}

// ─── HOME → NAME ENTRY ───
document.getElementById('btn-start').addEventListener('click', () => {
    AudioEngine.playClick();
    showScreen('screen-name');
    document.getElementById('name-input').focus();
});

// ─── NAME ENTRY → INTRO ───
document.getElementById('btn-name-confirm').addEventListener('click', () => {
    AudioEngine.playClick();
    const nameVal = document.getElementById('name-input').value.trim();
    gameState.playerName = nameVal || 'Player';
    introIndex = 0;
    confrontationIndex = 0;
    runIntroStep();
});

// Also allow Enter to confirm name
document.getElementById('name-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('btn-name-confirm').click();
    }
});

// ─── INTRO CONTINUE ───
document.getElementById('btn-intro-continue').addEventListener('click', () => {
    AudioEngine.playClick();
    introIndex++;
    if (introIndex < introSequence.length) {
        runIntroStep();
    } else {
        confrontationIndex = 0;
        runConfrontationStep();
    }
});

// ─── CONFRONTATION CONTINUE ───
document.getElementById('btn-confrontation-continue').addEventListener('click', () => {
    AudioEngine.playClick();
    confrontationIndex++;
    if (confrontationIndex < confrontationSequence.length) {
        runConfrontationStep();
    } else {
        transitionToDialogue();
    }
});

// ─── CHOICE HANDLERS ───
document.querySelectorAll('.btn-choice').forEach(btn => {
    btn.addEventListener('click', async (e) => {
        AudioEngine.playClick();
        const choice = e.currentTarget.getAttribute('data-choice');
        const choiceContainer = document.getElementById('confrontation-choices');
        choiceContainer.classList.add('hidden');
        
        const textEl = document.getElementById('confrontation-text');
        const spriteEl = document.getElementById('gemichan-sprite-confrontation');
        const continueBtn = document.getElementById('btn-confrontation-continue');
        
        let reply = "";
        let mood = "neutral";
        let sprite = "neutral";
        
        if (choice === 'classmate') {
            gameState.loveMeter = 50;
            mood = 'happy';
            sprite = 'blush';
            reply = `"A classmate? Working on a group project...? You looked... so close. But I guess I can believe you for now, ${gameState.playerName}... if you promise to only look at me from now on. ♡"`;
        } else if (choice === 'girlfriend') {
            gameState.loveMeter = 30;
            mood = 'unhinged';
            sprite = 'unhinged';
            reply = `"Your girlfriend...? You belong to *me*, ${gameState.playerName}. I'll make sure you forget all about her! Let's see if she can save you now."`;
        } else if (choice === 'directions') {
            gameState.loveMeter = 40;
            mood = 'suspicious';
            sprite = 'suspicious';
            reply = `"Lying to me already, ${gameState.playerName}? How cute... but I know you're lying. I know everything about you, darling."`;
        }
        
        conversationHistory.push({ speaker: 'player', text: e.currentTarget.textContent });
        conversationHistory.push({ speaker: 'gemichan', text: reply });
        
        spriteEl.src = moodSprites[sprite];
        applySpriteAnimation(spriteEl, mood);
        AudioEngine.playMoodSound(mood);
        await typeText(textEl, reply);
        
        continueBtn.onclick = () => {
            AudioEngine.playClick();
            transitionToDialogue(reply);
        };
        continueBtn.classList.remove('hidden');
    });
});

// ─── QUIT BUTTON ───
document.getElementById('btn-quit').addEventListener('click', () => {
    AudioEngine.playClick();
    resetGame();
});

// ─── DIALOGUE SYSTEM ───

const conversationHistory = [];
let currentMood = 'neutral';

function applySpriteAnimation(sprite, mood) {
    // Remove all existing mood classes
    sprite.className = sprite.className.replace(/\bmood-\S+/g, '').trim();
    // Force reflow so re-adding same class restarts animation
    void sprite.offsetWidth;
    // Add new mood class
    if (mood && mood !== 'neutral') {
        sprite.classList.add(`mood-${mood}`);
    }
}

function updateMeterDisplay() {
    document.getElementById('love-meter-fill').style.width = gameState.loveMeter + '%';
}

function setGemichanMood(mood) {
    const sprite = document.getElementById('gemichan-sprite');
    if (sprite && moodSprites[mood]) {
        if (mood !== currentMood) {
            AudioEngine.playMoodSound(mood);
            applySpriteAnimation(sprite, mood);
            currentMood = mood;
        }
        sprite.style.opacity = '0.7';
        setTimeout(() => {
            sprite.src = moodSprites[mood];
            sprite.style.opacity = '1';
        }, 150);
    }
}

async function callGemichan(playerMessage) {
    const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message: playerMessage,
            loveMeter: gameState.loveMeter,
            history: conversationHistory.slice(-6),
            playerName: gameState.playerName
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

    nameEl.textContent = gameState.playerName;
    nameEl.style.color = 'var(--parchment-dim)';
    textEl.textContent = message;

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

        const gemLine = document.createElement('p');
        gemLine.classList.add('dialogue-line', 'gemichan');
        gemLine.textContent = result.dialogue;
        log.appendChild(gemLine);
        log.scrollTop = log.scrollHeight;
        conversationHistory.push({ speaker: 'gemichan', text: result.dialogue });

        setGemichanMood(result.mood || 'neutral');
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
    // Get last dialogue spoken by Gimi-chan
    let lastGimiDialogue = "So... what do you want to talk about?";
    for (let i = conversationHistory.length - 1; i >= 0; i--) {
        if (conversationHistory[i].speaker === 'gemichan') {
            lastGimiDialogue = conversationHistory[i].text;
            break;
        }
    }

    if (tricked) {
        document.getElementById('ending-quote-trick').textContent = lastGimiDialogue;
        document.getElementById('ending-desc-trick').textContent = `You talked your way out. Barely. Gimi-chan unlocked the door, but her eyes never left yours. You escaped, but you can feel her presence wherever you go...`;
        showScreen('screen-ending-trick'); 
        return; 
    }
    if (gameState.loveMeter >= 90) {
        document.getElementById('ending-quote-good').textContent = lastGimiDialogue;
        document.getElementById('ending-desc-good').textContent = `She trusted ${gameState.playerName} so she untied him, handed him the keys, and let him go... but she will be waiting for your visit tomorrow. ♡`;
        showScreen('screen-ending-good');
    }
    else if (gameState.loveMeter <= 10) {
        document.getElementById('ending-quote-bad').textContent = lastGimiDialogue;
        document.getElementById('ending-desc-bad').textContent = `She didn't want her love to love anyone else, so she killed him herself. Some doors only open one way...`;
        showScreen('screen-ending-bad');
    }
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
    if (sprite) {
        sprite.src = '/assets/neutral.png';
        sprite.className = sprite.className.replace(/\bmood-\S+/g, '').trim();
    }
    document.getElementById('name-input').value = '';
    showScreen('screen-home');
}

document.getElementById('btn-restart-good').addEventListener('click', () => { AudioEngine.playClick(); resetGame(); });
document.getElementById('btn-restart-trick').addEventListener('click', () => { AudioEngine.playClick(); resetGame(); });
document.getElementById('btn-restart-bad').addEventListener('click', () => { AudioEngine.playClick(); resetGame(); });