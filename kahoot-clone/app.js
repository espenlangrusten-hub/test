// ===== STATE =====
let quizzes = JSON.parse(localStorage.getItem('quizbattle_quizzes') || '[]');
let currentQuiz = null;
let currentQuestionIndex = 0;
let players = [];
let timerInterval = null;
let timeLeft = 0;
let isHost = false;
let currentPlayerName = '';
let currentPlayerScore = 0;
let gamePin = '';

// ===== SAMPLE QUIZZES =====
const sampleQuizzes = [
    {
        id: 'sample-1',
        title: 'Norsk Allmenvitenskap',
        description: 'Test dine kunnskaper om Norge!',
        questions: [
            {
                text: 'Hva er hovedstaden i Norge?',
                answers: ['Oslo', 'Bergen', 'Trondheim', 'Stavanger'],
                correct: 0,
                time: 20
            },
            {
                text: 'Hvilket år ble Norge selvstendig fra Sverige?',
                answers: ['1814', '1905', '1945', '1850'],
                correct: 1,
                time: 20
            },
            {
                text: 'Hva er den lengste elva i Norge?',
                answers: ['Drammenselva', 'Glomma', 'Numedalslågen', 'Otra'],
                correct: 1,
                time: 20
            },
            {
                text: 'Hvor mange fylker har Norge (2024)?',
                answers: ['11', '15', '18', '19'],
                correct: 1,
                time: 15
            },
            {
                text: 'Hva heter Norges høyeste fjell?',
                answers: ['Snøhetta', 'Galdhøpiggen', 'Glittertind', 'Store Skagastølstind'],
                correct: 1,
                time: 20
            }
        ]
    },
    {
        id: 'sample-2',
        title: 'Fotball Quiz',
        description: 'Hvor mye kan du om fotball?',
        questions: [
            {
                text: 'Hvem vant VM i fotball 2022?',
                answers: ['Brasil', 'Frankrike', 'Argentina', 'Kroatia'],
                correct: 2,
                time: 15
            },
            {
                text: 'Hvor mange spillere er det på et fotballag?',
                answers: ['9', '10', '11', '12'],
                correct: 2,
                time: 10
            },
            {
                text: 'Hva heter fotballstadion til Manchester United?',
                answers: ['Anfield', 'Old Trafford', 'Emirates', 'Stamford Bridge'],
                correct: 1,
                time: 15
            },
            {
                text: 'Hvem har scoret flest mål i Champions League?',
                answers: ['Messi', 'Ronaldo', 'Lewandowski', 'Benzema'],
                correct: 1,
                time: 20
            },
            {
                text: 'Hvilket land har vunnet flest VM-titler?',
                answers: ['Tyskland', 'Italia', 'Argentina', 'Brasil'],
                correct: 3,
                time: 15
            }
        ]
    }
];

// Initialize with samples if no quizzes exist
if (quizzes.length === 0) {
    quizzes = [...sampleQuizzes];
    saveQuizzesToStorage();
}

// ===== HELPERS =====
function generatePin() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateId() {
    return 'quiz-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
}

function saveQuizzesToStorage() {
    localStorage.setItem('quizbattle_quizzes', JSON.stringify(quizzes));
}

// ===== SCREEN NAVIGATION =====
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const screen = document.getElementById(screenId);
    if (screen) {
        screen.classList.add('active');
    }
}

// ===== CREATE QUIZ =====
let editQuestions = [];

function addQuestion() {
    const index = editQuestions.length;
    editQuestions.push({
        text: '',
        answers: ['', '', '', ''],
        correct: 0,
        time: 20
    });
    renderQuestions();
}

function removeQuestion(index) {
    editQuestions.splice(index, 1);
    renderQuestions();
}

function renderQuestions() {
    const container = document.getElementById('questions-container');
    container.innerHTML = editQuestions.map((q, i) => `
        <div class="question-card">
            <div class="question-card-header">
                <h3>Spørsmål ${i + 1}</h3>
                <button class="delete-question-btn" onclick="removeQuestion(${i})">&#10005;</button>
            </div>
            <input type="text" class="input-field" placeholder="Skriv spørsmålet her..."
                value="${escapeHtml(q.text)}" onchange="editQuestions[${i}].text = this.value">
            <div class="answers-edit-grid">
                <div class="answer-edit red">
                    <input type="radio" name="correct-${i}" class="correct-radio"
                        ${q.correct === 0 ? 'checked' : ''} onchange="editQuestions[${i}].correct = 0">
                    <input type="text" placeholder="Svar 1" value="${escapeHtml(q.answers[0])}"
                        onchange="editQuestions[${i}].answers[0] = this.value">
                </div>
                <div class="answer-edit blue">
                    <input type="radio" name="correct-${i}" class="correct-radio"
                        ${q.correct === 1 ? 'checked' : ''} onchange="editQuestions[${i}].correct = 1">
                    <input type="text" placeholder="Svar 2" value="${escapeHtml(q.answers[1])}"
                        onchange="editQuestions[${i}].answers[1] = this.value">
                </div>
                <div class="answer-edit green">
                    <input type="radio" name="correct-${i}" class="correct-radio"
                        ${q.correct === 2 ? 'checked' : ''} onchange="editQuestions[${i}].correct = 2">
                    <input type="text" placeholder="Svar 3" value="${escapeHtml(q.answers[2])}"
                        onchange="editQuestions[${i}].answers[2] = this.value">
                </div>
                <div class="answer-edit yellow">
                    <input type="radio" name="correct-${i}" class="correct-radio"
                        ${q.correct === 3 ? 'checked' : ''} onchange="editQuestions[${i}].correct = 3">
                    <input type="text" placeholder="Svar 4" value="${escapeHtml(q.answers[3])}"
                        onchange="editQuestions[${i}].answers[3] = this.value">
                </div>
            </div>
            <div class="time-select">
                <label>Tid:</label>
                <select onchange="editQuestions[${i}].time = parseInt(this.value)">
                    <option value="10" ${q.time === 10 ? 'selected' : ''}>10 sek</option>
                    <option value="15" ${q.time === 15 ? 'selected' : ''}>15 sek</option>
                    <option value="20" ${q.time === 20 ? 'selected' : ''}>20 sek</option>
                    <option value="30" ${q.time === 30 ? 'selected' : ''}>30 sek</option>
                    <option value="60" ${q.time === 60 ? 'selected' : ''}>60 sek</option>
                </select>
            </div>
        </div>
    `).join('');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function saveQuiz() {
    const title = document.getElementById('quiz-title').value.trim();
    const description = document.getElementById('quiz-description').value.trim();

    if (!title) {
        alert('Du må gi quizzen en tittel!');
        return;
    }

    if (editQuestions.length === 0) {
        alert('Du må legge til minst ett spørsmål!');
        return;
    }

    for (let i = 0; i < editQuestions.length; i++) {
        const q = editQuestions[i];
        if (!q.text.trim()) {
            alert(`Spørsmål ${i + 1} mangler tekst!`);
            return;
        }
        const filledAnswers = q.answers.filter(a => a.trim());
        if (filledAnswers.length < 2) {
            alert(`Spørsmål ${i + 1} må ha minst 2 svaralternativer!`);
            return;
        }
    }

    const quiz = {
        id: generateId(),
        title,
        description,
        questions: editQuestions.map(q => ({...q}))
    };

    quizzes.push(quiz);
    saveQuizzesToStorage();

    // Reset form
    document.getElementById('quiz-title').value = '';
    document.getElementById('quiz-description').value = '';
    editQuestions = [];
    renderQuestions();

    alert('Quiz lagret!');
    showScreen('screen-home');
}

// ===== BROWSE QUIZZES =====
function showBrowse() {
    renderQuizList();
    showScreen('screen-browse');
}

function renderQuizList() {
    const list = document.getElementById('quiz-list');
    const noQuizzes = document.getElementById('no-quizzes');

    if (quizzes.length === 0) {
        list.innerHTML = '';
        noQuizzes.style.display = 'block';
        return;
    }

    noQuizzes.style.display = 'none';
    list.innerHTML = quizzes.map((q, i) => `
        <div class="quiz-list-item">
            <div class="quiz-list-info">
                <h3>${escapeHtml(q.title)}</h3>
                <p>${q.questions.length} spørsmål${q.description ? ' · ' + escapeHtml(q.description) : ''}</p>
            </div>
            <div class="quiz-list-actions">
                <button class="quiz-action-btn play" onclick="hostQuiz(${i})" title="Start quiz">&#9654;</button>
                <button class="quiz-action-btn delete" onclick="deleteQuiz(${i})" title="Slett">&#128465;</button>
            </div>
        </div>
    `).join('');
}

function deleteQuiz(index) {
    if (confirm('Er du sikker på at du vil slette denne quizzen?')) {
        quizzes.splice(index, 1);
        saveQuizzesToStorage();
        renderQuizList();
    }
}

// ===== HOST QUIZ =====
function hostQuiz(index) {
    currentQuiz = quizzes[index];
    currentQuestionIndex = 0;
    isHost = true;
    players = [];
    gamePin = generatePin();

    // Add some simulated players for single-player experience
    addSimulatedPlayers();

    document.getElementById('lobby-pin').textContent = gamePin;
    document.getElementById('player-count').textContent = players.length;
    renderPlayerList();

    showScreen('screen-lobby');
}

function addSimulatedPlayers() {
    const botNames = ['KoolKat', 'QuizMaster', 'NorgesFansen', 'SuperSpiller', 'BrainPower',
                      'SmartCookie', 'LynRask', 'Kunnskapen', 'VitQuiz', 'TopScore'];
    const numBots = 3 + Math.floor(Math.random() * 5); // 3-7 bots
    for (let i = 0; i < numBots; i++) {
        players.push({
            name: botNames[i],
            score: 0,
            isBot: true,
            streak: 0
        });
    }
}

function renderPlayerList() {
    const list = document.getElementById('player-list');
    list.innerHTML = players.map(p => `
        <div class="player-tag">${escapeHtml(p.name)}</div>
    `).join('');
    document.getElementById('player-count').textContent = players.length;
}

// ===== JOIN QUIZ =====
function joinQuiz() {
    const pin = document.getElementById('join-pin').value.trim();
    const name = document.getElementById('player-name').value.trim();

    if (!pin || pin.length < 4) {
        alert('Skriv inn en gyldig PIN!');
        return;
    }
    if (!name) {
        alert('Skriv inn et kallenavn!');
        return;
    }

    // In this local version, joining means playing as a player
    // Find quiz by PIN (we use the stored gamePin or simulate)
    isHost = false;
    currentPlayerName = name;
    currentPlayerScore = 0;

    // If there's an active hosted quiz with matching PIN, join it
    if (pin === gamePin && currentQuiz) {
        players.push({ name, score: 0, isBot: false, streak: 0 });
        document.getElementById('wait-name').textContent = name;
        showScreen('screen-player-wait');
        return;
    }

    // Otherwise start a solo game with a random quiz
    if (quizzes.length === 0) {
        alert('Ingen quiz funnet med denne PIN-en!');
        return;
    }

    const randomQuiz = quizzes[Math.floor(Math.random() * quizzes.length)];
    currentQuiz = randomQuiz;
    currentQuestionIndex = 0;
    players = [{ name, score: 0, isBot: false, streak: 0 }];
    addSimulatedPlayers();

    // Start directly as player
    document.getElementById('wait-name').textContent = name;
    document.getElementById('wait-message').textContent = 'Quizzen starter snart...';
    showScreen('screen-player-wait');

    setTimeout(() => {
        showQuestionPlayer();
    }, 2000);
}

// ===== GAME FLOW =====
function startGame() {
    if (!currentQuiz || currentQuiz.questions.length === 0) {
        alert('Ingen spørsmål i quizzen!');
        return;
    }

    currentQuestionIndex = 0;

    // Reset all scores
    players.forEach(p => {
        p.score = 0;
        p.streak = 0;
    });

    showQuestionHost();
}

function showQuestionHost() {
    const q = currentQuiz.questions[currentQuestionIndex];
    const total = currentQuiz.questions.length;

    document.getElementById('host-question-counter').textContent =
        `Spørsmål ${currentQuestionIndex + 1}/${total}`;
    document.getElementById('host-question-text').textContent = q.text;
    document.getElementById('host-answers-count').textContent = '0 svar';

    // Set answer texts
    const shapes = ['&#9650;', '&#9670;', '&#9679;', '&#9724;'];
    for (let i = 0; i < 4; i++) {
        const card = document.getElementById(`host-answer-${i}`);
        const textEl = document.getElementById(`host-answer-text-${i}`);
        if (q.answers[i] && q.answers[i].trim()) {
            card.style.display = 'flex';
            textEl.textContent = q.answers[i];
            card.classList.remove('correct-reveal', 'wrong-reveal');
        } else {
            card.style.display = 'none';
        }
    }

    // Reset timer
    timeLeft = q.time;
    document.getElementById('host-timer-text').textContent = timeLeft;
    const circle = document.getElementById('timer-circle');
    circle.style.strokeDashoffset = '0';

    showScreen('screen-question-host');

    // Start countdown
    startTimer(q.time, 'host');
}

function showQuestionPlayer() {
    const q = currentQuiz.questions[currentQuestionIndex];
    const total = currentQuiz.questions.length;

    document.getElementById('player-question-counter').textContent =
        `${currentQuestionIndex + 1}/${total}`;
    document.getElementById('player-timer-text').textContent = q.time;

    // Show/hide answer buttons based on available answers
    const btns = document.querySelectorAll('.answer-btn');
    btns.forEach((btn, i) => {
        if (q.answers[i] && q.answers[i].trim()) {
            btn.style.display = 'flex';
            btn.disabled = false;
        } else {
            btn.style.display = 'none';
        }
    });

    timeLeft = q.time;
    showScreen('screen-question-player');

    startTimer(q.time, 'player');
}

function startTimer(duration, mode) {
    clearInterval(timerInterval);
    timeLeft = duration;
    const totalTime = duration;
    const circumference = 283; // 2 * PI * 45

    timerInterval = setInterval(() => {
        timeLeft--;

        if (mode === 'host') {
            document.getElementById('host-timer-text').textContent = timeLeft;
            const offset = circumference * (1 - timeLeft / totalTime);
            document.getElementById('timer-circle').style.strokeDashoffset = offset;
        } else {
            document.getElementById('player-timer-text').textContent = timeLeft;
        }

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            if (mode === 'host') {
                simulateBotAnswers();
                showHostResults();
            } else {
                // Time's up for player
                submitAnswer(-1); // No answer
            }
        }
    }, 1000);
}

// ===== SUBMIT ANSWER =====
function submitAnswer(answerIndex) {
    clearInterval(timerInterval);

    const q = currentQuiz.questions[currentQuestionIndex];
    const isCorrect = answerIndex === q.correct;
    const maxTime = q.time;
    const timeUsed = maxTime - timeLeft;

    // Calculate points (faster = more points, Kahoot style)
    let points = 0;
    if (isCorrect) {
        const timeFraction = Math.max(0, timeLeft) / maxTime;
        points = Math.round(500 + 500 * timeFraction); // 500-1000 points

        // Streak bonus
        const player = players.find(p => !p.isBot);
        if (player) {
            player.streak = (player.streak || 0) + 1;
            if (player.streak > 1) {
                points += 100 * Math.min(player.streak, 5);
            }
        }
    } else {
        const player = players.find(p => !p.isBot);
        if (player) player.streak = 0;
    }

    // Update player score
    const humanPlayer = players.find(p => !p.isBot);
    if (humanPlayer) {
        humanPlayer.score += points;
        currentPlayerScore = humanPlayer.score;
    }

    // Show selected answer animation
    if (answerIndex >= 0) {
        const shapes = ['&#9650;', '&#9670;', '&#9679;', '&#9724;'];
        const colors = ['#e21b3c', '#1368ce', '#26890c', '#d89e00'];
        document.getElementById('selected-shape').innerHTML = shapes[answerIndex];
        document.getElementById('selected-shape').style.color = colors[answerIndex];
    }

    showScreen('screen-answer-selected');

    // Simulate bot answers
    simulateBotAnswers();

    // Show result after delay
    setTimeout(() => {
        showPlayerResult(isCorrect, points);
    }, 1500);
}

function simulateBotAnswers() {
    const q = currentQuiz.questions[currentQuestionIndex];
    players.forEach(p => {
        if (!p.isBot) return;

        // Bots have varying skill levels
        const skillChance = 0.3 + Math.random() * 0.5; // 30-80% chance correct
        const isCorrect = Math.random() < skillChance;

        if (isCorrect) {
            const timeFraction = 0.2 + Math.random() * 0.6;
            const points = Math.round(500 + 500 * timeFraction);
            p.streak = (p.streak || 0) + 1;
            const streakBonus = p.streak > 1 ? 100 * Math.min(p.streak, 5) : 0;
            p.score += points + streakBonus;
        } else {
            p.streak = 0;
        }
    });
}

function showPlayerResult(isCorrect, points) {
    const container = document.querySelector('.player-result-container');
    const emoji = document.getElementById('player-result-emoji');
    const text = document.getElementById('player-result-text');
    const pointsEl = document.getElementById('player-points-earned');
    const totalEl = document.getElementById('player-total-score');

    container.className = 'player-result-container';

    if (isCorrect) {
        document.getElementById('screen-player-result').style.background = '#26890c';
        emoji.textContent = '✓';
        text.textContent = 'Riktig!';
        pointsEl.textContent = `+${points}`;
    } else {
        document.getElementById('screen-player-result').style.background = '#e21b3c';
        emoji.textContent = '✗';
        text.textContent = 'Feil!';
        pointsEl.textContent = '+0';
    }

    totalEl.textContent = currentPlayerScore;
    showScreen('screen-player-result');

    // Auto-advance after showing result
    setTimeout(() => {
        showScoreboard();
    }, 2500);
}

function showHostResults() {
    const q = currentQuiz.questions[currentQuestionIndex];

    // Count answers per option (simulated)
    const counts = [0, 0, 0, 0];
    const totalPlayers = players.length;

    players.forEach(p => {
        // Simulate which answer they picked
        const correct = q.correct;
        if (p.streak > 0) {
            counts[correct]++;
        } else {
            const wrongOptions = [0, 1, 2, 3].filter(i => i !== correct && q.answers[i]?.trim());
            if (wrongOptions.length > 0) {
                counts[wrongOptions[Math.floor(Math.random() * wrongOptions.length)]]++;
            } else {
                counts[correct]++;
            }
        }
    });

    // Show correct answer
    document.getElementById('results-title').textContent =
        `Riktig svar: ${q.answers[q.correct]}`;

    // Highlight correct/wrong answers on host screen
    for (let i = 0; i < 4; i++) {
        const card = document.getElementById(`host-answer-${i}`);
        if (i === q.correct) {
            card.classList.add('correct-reveal');
            card.classList.remove('wrong-reveal');
        } else {
            card.classList.add('wrong-reveal');
            card.classList.remove('correct-reveal');
        }
    }

    // Update result bars
    const maxCount = Math.max(...counts, 1);
    for (let i = 0; i < 4; i++) {
        const bar = document.getElementById(`result-bar-${i}`);
        const height = Math.max(30, (counts[i] / maxCount) * 200);
        bar.style.height = `${height}px`;
        bar.querySelector('span').textContent = counts[i];
        bar.classList.toggle('is-correct', i === q.correct);
    }

    // Show results after a reveal delay
    setTimeout(() => {
        showScreen('screen-question-results');
    }, 2000);
}

function showScoreboard() {
    const sorted = [...players].sort((a, b) => b.score - a.score);
    const list = document.getElementById('scoreboard-list');

    list.innerHTML = sorted.slice(0, 10).map((p, i) => `
        <div class="scoreboard-item" style="animation-delay: ${i * 0.1}s">
            <span class="scoreboard-rank">${i + 1}</span>
            <span class="scoreboard-name">${escapeHtml(p.name)}${!p.isBot ? ' (deg)' : ''}</span>
            <span class="scoreboard-score">${p.score.toLocaleString()}</span>
        </div>
    `).join('');

    const isLast = currentQuestionIndex >= currentQuiz.questions.length - 1;
    const btn = document.getElementById('btn-scoreboard-next');
    btn.textContent = isLast ? 'Se resultater' : 'Neste spørsmål';

    showScreen('screen-scoreboard');
}

function nextQuestion() {
    currentQuestionIndex++;

    if (currentQuestionIndex >= currentQuiz.questions.length) {
        showFinalResults();
        return;
    }

    if (isHost) {
        showQuestionHost();
    } else {
        showQuestionPlayer();
    }
}

// ===== FINAL RESULTS =====
function showFinalResults() {
    clearInterval(timerInterval);
    const sorted = [...players].sort((a, b) => b.score - a.score);

    // Podium
    const podiumData = [
        { el: 'podium-1', index: 0 },
        { el: 'podium-2', index: 1 },
        { el: 'podium-3', index: 2 }
    ];

    podiumData.forEach(({ el, index }) => {
        const element = document.getElementById(el);
        if (sorted[index]) {
            element.querySelector('.podium-name').textContent = sorted[index].name;
            element.querySelector('.podium-score').textContent =
                sorted[index].score.toLocaleString() + ' poeng';
            element.style.display = 'flex';
        } else {
            element.style.display = 'none';
        }
    });

    // Full list (positions 4+)
    const fullList = document.getElementById('final-full-list');
    fullList.innerHTML = sorted.slice(3).map((p, i) => `
        <div class="final-list-item">
            <span class="rank">${i + 4}.</span>
            <span class="name">${escapeHtml(p.name)}${!p.isBot ? ' (deg)' : ''}</span>
            <span class="score">${p.score.toLocaleString()}</span>
        </div>
    `).join('');

    showScreen('screen-final');
}

function resetToHome() {
    clearInterval(timerInterval);
    currentQuiz = null;
    currentQuestionIndex = 0;
    players = [];
    isHost = false;
    currentPlayerName = '';
    currentPlayerScore = 0;
    gamePin = '';

    // Reset create form
    editQuestions = [];
    document.getElementById('quiz-title').value = '';
    document.getElementById('quiz-description').value = '';
    document.getElementById('questions-container').innerHTML = '';

    // Reset join form
    document.getElementById('join-pin').value = '';
    document.getElementById('player-name').value = '';

    showScreen('screen-home');
}

// ===== INIT =====
// Make sure create screen starts fresh
document.addEventListener('DOMContentLoaded', () => {
    showScreen('screen-home');
});
