const gameState = {
    screen: 'home',
    loveMeter: 50,
    turnCount: 0
};

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    gameState.screen = id;
}

function typeText(el, text, speed = 30) {
    return new Promise(resolve => {
        el.textContent = '';
        let i = 0;
        const interval = setInterval(() => {
        el.textContent += text[i];
        i++;
        if (i >= text.length) {
            clearInterval(interval);
            resolve();
        }
        }, speed);
    });
}

document.getElementById('btn-start').addEventListener('click', async () => {
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

document.getElementById('btn-intro-continue').addEventListener('click', async () => {
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

document.getElementById('btn-confrontation-continue').addEventListener('click', () => {
    showScreen('screen-dialogue');
    updateMeterDisplay();
    addDialogueLine('gemichan', "So... what do you want to talk about?");
});

// Track conversation history for context
const conversationHistory = [];

function addDialogueLine(speaker, text) {
    const log = document.getElementById('dialogue-log');
    const line = document.createElement('p');
    line.classList.add('dialogue-line', speaker);
    line.textContent = text;
    log.appendChild(line);
    log.scrollTop = log.scrollHeight;
    
    // Track history
    conversationHistory.push({ speaker, text });
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
    if (sprite && moodSprites[mood]) sprite.src = moodSprites[mood];
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
    const sendBtn = document.querySelector('.dialogue-form .btn-primary');
    const message = input.value.trim();
    if (!message) return;

    addDialogueLine('player', message);
    input.value = '';
    input.disabled = true;
    sendBtn.disabled = true;
    sendBtn.textContent = '...';
    gameState.turnCount++;

    try {
        const result = await callGemichan(message);
        gameState.loveMeter = Math.max(0, Math.min(100, gameState.loveMeter + result.meterDelta));
        addDialogueLine('gemichan', result.dialogue);
        setGemichanMood(result.mood || 'neutral');
        updateMeterDisplay();
        checkEndingConditions(result.tricked);
    } catch (err) {
        addDialogueLine('gemichan', "Hmph... something went wrong. Try again.");
        console.error(err);
    }

    input.disabled = false;
    sendBtn.disabled = false;
    sendBtn.textContent = 'Send';
    input.focus();
});

function checkEndingConditions(tricked) {
    if (tricked) { showScreen('screen-ending-trick'); return; }
    if (gameState.loveMeter >= 90) showScreen('screen-ending-good');
    else if (gameState.loveMeter <= 10) showScreen('screen-ending-bad');
}

function resetGame() {
    gameState.loveMeter = 50;
    gameState.turnCount = 0;
    document.getElementById('dialogue-log').innerHTML = '';
    showScreen('screen-home');
}

document.getElementById('btn-restart-good').addEventListener('click', resetGame);
document.getElementById('btn-restart-trick').addEventListener('click', resetGame);
document.getElementById('btn-restart-bad').addEventListener('click', resetGame);