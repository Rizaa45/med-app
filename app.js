/**
 * SLM System Core Engine 2026
 * Version: 2.7 - Exam Simulator & Smart Drill
 */

let currentQuestions = [];
let currentIndex = 0;
let currentModuleId = 9; // Default auf 9 für Klausurvorbereitung
let currentMode = 'classic'; 
let activeCase = null;
let userAnswersLog = []; // Speichert Antworten für die KI-Notengebung

window.onload = () => {
    const isDashboard = document.getElementById('total-percent') !== null;
    const isModulePage = document.getElementById('mod-title') !== null;

    if (isDashboard) {
        initDashboard();
    } else if (isModulePage) {
        const params = new URLSearchParams(window.location.search);
        currentModuleId = params.get('id') || 9;
        loadModuleData(currentModuleId);
    }
};

// --- DASHBOARD LOGIK ---
function initDashboard() {
    let totalSum = 0;
    const activeModules = [1, 9]; 
    activeModules.forEach(id => {
        const p = parseInt(localStorage.getItem(`mod${id}_percent`)) || 0;
        totalSum += p;
        const bar = document.getElementById(`mod${id}-bar`);
        const text = document.getElementById(`mod${id}-percent`);
        if (bar) bar.style.width = p + '%';
        if (text) text.innerText = p + '%';
    });
    const avg = Math.round(totalSum / activeModules.length);
    if(document.getElementById('total-progress-bar')) {
        document.getElementById('total-progress-bar').style.width = avg + '%';
        document.getElementById('total-percent').innerText = avg + '%';
    }
}

// --- DATEN LADEN (BASIS) ---
async function loadModuleData(id) {
    const jsonPath = `data/mod_${id}.json`;
    try {
        const response = await fetch(jsonPath);
        const data = await response.json();
        document.getElementById('mod-title').innerText = data.moduleName || `Modul ${id}`;
        // PDF Render Logik hier... (wie gehabt)
    } catch (err) {
        console.log("Basisdaten geladen oder übersprungen.");
    }
}

// --- QUIZ MODUS STARTEN ---
async function startQuizMode(mode) {
    currentMode = mode;
    userAnswersLog = []; // Reset Log
    document.getElementById('quiz-selection').classList.add('hidden');
    document.getElementById('quiz-container').classList.remove('hidden');

    try {
        if (mode === 'drill') {
            // Lade 150 Fragen, wähle 30 zufällige
            const response = await fetch('data/klausur27_questions.json');
            const allQuestions = await response.json();
            // Shuffle und nimm 30
            currentQuestions = allQuestions.sort(() => 0.5 - Math.random()).slice(0, 30);
            document.getElementById('scenario-display').classList.add('hidden');
        
        } else if (mode === 'simulator') {
            // Lade 1 Fall + 2 Drill Fragen
            const casesResp = await fetch('data/klausur27_cases.json');
            const drillResp = await fetch('data/klausur27_questions.json');
            const cases = await casesResp.json();
            const drills = await drillResp.json();

            // 1. Zufälliger Fall
            activeCase = cases[Math.floor(Math.random() * cases.length)];
            const caseQuestions = activeCase.questions; // ca 12 Stück

            // 2. Zwei zufällige Drill Fragen
            const randomDrills = drills.sort(() => 0.5 - Math.random()).slice(0, 2);

            // 3. Kombinieren
            currentQuestions = [...caseQuestions, ...randomDrills];

            // UI Setup
            document.getElementById('scenario-display').classList.remove('hidden');
            document.getElementById('scenario-text').innerText = activeCase.scenario;
            document.getElementById('setting-badge').innerText = "Klausur 27.02.26";

        } else if (mode === 'cases') {
            const response = await fetch(`data/mod${currentModuleId}_cases_master.json`); // Oder klausur27_cases
            const data = await response.json();
            activeCase = data[Math.floor(Math.random() * data.length)];
            currentQuestions = activeCase.questions;
            document.getElementById('scenario-display').classList.remove('hidden');
            document.getElementById('scenario-text').innerText = activeCase.scenario;
        } else {
            // Classic
            const response = await fetch(`data/mod_${currentModuleId}.json`);
            const data = await response.json();
            currentQuestions = data.questions;
            document.getElementById('scenario-display').classList.add('hidden');
        }

        currentIndex = 0;
        document.getElementById('q-total').innerText = currentQuestions.length;
        showQuestion();

    } catch (err) {
        alert("Fehler beim Laden: " + err.message);
        console.error(err);
    }
}

// --- FRAGE ANZEIGEN ---
function showQuestion() {
    if (currentIndex >= currentQuestions.length) {
        finishQuiz();
        return;
    }

    const q = currentQuestions[currentIndex];
    
    // UI Updates
    document.getElementById('q-current').innerText = currentIndex + 1;
    document.getElementById('question-text').innerText = q.question || q.q;
    document.getElementById('type-badge').innerText = q.type ? q.type.toUpperCase() : "FRAGE";
    
    // Bild-Logik
    const imgContainer = document.getElementById('image-container') || createImageContainer();
    if (q.image) {
        imgContainer.innerHTML = `<img src="${q.image}" class="max-h-64 rounded-xl mx-auto mb-6 shadow-md border border-slate-200">`;
        imgContainer.classList.remove('hidden');
    } else {
        imgContainer.classList.add('hidden');
    }

    // Feedback verstecken & Grid leeren
    document.getElementById('feedback').classList.add('hidden');
    const grid = document.getElementById('options-grid');
    grid.innerHTML = "";

    if (q.type === "nennen_offen" || q.type === "lueckentext") {
        renderOpenQuestion(q, grid);
    } else {
        renderMCQuestion(q, grid);
    }
}

function createImageContainer() {
    const div = document.createElement('div');
    div.id = 'image-container';
    div.className = "hidden";
    const parent = document.getElementById('question-text').parentNode;
    parent.insertBefore(div, document.getElementById('question-text'));
    return div;
}

// --- RENDER FUNKTIONEN ---
function renderMCQuestion(q, grid) {
    q.options.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.className = "w-full text-left p-5 rounded-2xl border-2 border-slate-100 hover:border-indigo-400 transition-all font-medium mb-2 bg-white text-slate-700";
        btn.innerText = opt;
        btn.onclick = () => handleAnswer(i, btn, q);
        grid.appendChild(btn);
    });
}

function renderOpenQuestion(q, grid) {
    const container = document.createElement('div');
    container.className = "space-y-4 w-full";
    container.innerHTML = `
        <textarea id="user-open-answer" class="w-full p-5 rounded-2xl border-2 border-slate-200 focus:border-indigo-500 outline-none text-sm h-32" placeholder="Antwort eingeben..."></textarea>
        <button id="sol-btn" onclick="revealOpenSol()" class="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold uppercase text-xs tracking-widest">Lösung prüfen</button>
        <div id="sol-area" class="hidden space-y-4 fade-in">
            <div class="p-4 bg-indigo-50 rounded-xl border border-indigo-100 text-sm">
                <span class="font-bold text-indigo-600 block mb-1">Musterlösung:</span>
                ${q.correct_answer}
            </div>
            <div class="flex gap-2">
                <button onclick="handleSelfCheck(true)" class="flex-1 bg-green-500 text-white py-3 rounded-xl font-bold text-xs">RICHTIG</button>
                <button onclick="handleSelfCheck(false)" class="flex-1 bg-red-400 text-white py-3 rounded-xl font-bold text-xs">FALSCH</button>
            </div>
        </div>
    `;
    grid.appendChild(container);
}

// --- ANTWORT LOGIK ---
function revealOpenSol() {
    document.getElementById('sol-btn').classList.add('hidden');
    document.getElementById('sol-area').classList.remove('hidden');
}

function handleAnswer(selectedIndex, btn, q) {
    const isCorrect = selectedIndex === q.correct_answer;
    
    // Log für KI
    userAnswersLog.push({
        question: q.question,
        userAnswer: q.options[selectedIndex],
        correct: isCorrect,
        type: 'mc'
    });

    // Visuelles Feedback
    const all = document.querySelectorAll('#options-grid button');
    all.forEach(b => b.disabled = true);
    btn.classList.add(isCorrect ? 'bg-green-100' : 'bg-red-100');
    btn.classList.add(isCorrect ? 'border-green-500' : 'border-red-500');
    
    processResult(isCorrect, q);
}

function handleSelfCheck(isCorrect) {
    const q = currentQuestions[currentIndex];
    const userText = document.getElementById('user-open-answer').value;
    
    // Log für KI
    userAnswersLog.push({
        question: q.question,
        userAnswer: userText,
        correct: isCorrect,
        type: 'open'
    });

    processResult(isCorrect, q);
}

function processResult(isCorrect, q) {
    const feedback = document.getElementById('feedback');
    const txt = document.getElementById('feedback-text');
    
    // DRILL MODE LOGIC: Wiederholung bei Fehler
    if (!isCorrect && currentMode === 'drill') {
        txt.innerText = "WIEDERHOLUNG!";
        txt.className = "text-orange-600 font-black text-xl uppercase";
        document.getElementById('hint-text').innerText = "Diese Frage wird hinten angestellt, bis du sie kannst.";
        // Frage hinten anfügen
        currentQuestions.push(q);
        document.getElementById('q-total').innerText = currentQuestions.length; // Update Counter
    } else {
        txt.innerText = isCorrect ? "KORREKT" : "FALSCH";
        txt.className = isCorrect ? "text-green-600 font-black text-xl uppercase" : "text-red-600 font-black text-xl uppercase";
        document.getElementById('hint-text').innerText = q.hint || "";
    }

    feedback.classList.remove('hidden');
}

function nextQuestion() {
    currentIndex++;
    showQuestion();
}

// --- FINISH & GRADING ---
async function finishQuiz() {
    const container = document.getElementById('quiz-container');
    
    if (currentMode === 'simulator') {
        // KI Notengebung starten
        container.innerHTML = `
            <div class="text-center py-20 bg-white rounded-[2.5rem] shadow-xl border border-slate-100">
                <div class="animate-bounce text-6xl mb-6">🤖</div>
                <h2 class="text-2xl font-black text-slate-900 uppercase">Klausur eingereicht</h2>
                <p class="text-slate-500 mt-2 mb-8">Prodigy berechnet deine Note (1-6)...</p>
                <div id="ai-grading-result" class="max-w-xl mx-auto text-left space-y-4"></div>
            </div>`;
        
        await calculateExamGrade();
    } else {
        // Standard Ende
        container.innerHTML = `
            <div class="text-center py-20 bg-white rounded-[2.5rem] shadow-xl border border-slate-100">
                <div class="text-6xl mb-6">🏁</div>
                <h2 class="text-3xl font-black text-slate-900 uppercase">Training Beendet</h2>
                <button onclick="location.reload()" class="mt-8 bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold">Zurück</button>
            </div>`;
    }
}

async function calculateExamGrade() {
    const API_KEY = "DEIN_KEY_HIER"; // Füge hier deinen Key ein
    const resultDiv = document.getElementById('ai-grading-result');
    
    // Daten für Prompt aufbereiten
    const summary = userAnswersLog.map((log, i) => 
        `F${i+1}: ${log.question.substring(0, 50)}... | Antwort: ${log.userAnswer} | War: ${log.correct ? "Richtig" : "Falsch"}`
    ).join('\n');

    const PROMPT = `
    Handle als strenger deutscher Lehrer. Bewerte diese Klausur-Leistung (Notenschlüssel 1-6).
    
    Daten:
    ${summary}
    
    Ausgabeformat:
    <h1>Note: [X]</h1>
    <p>Kurzes Feedback (max 3 Sätze).</p>
    `;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: PROMPT }] }] })
        });
        const data = await response.json();
        const html = data.candidates[0].content.parts[0].text;
        
        resultDiv.innerHTML = `<div class="bg-slate-50 p-6 rounded-2xl border border-slate-200 prose prose-indigo">${html}</div>
        <button onclick="location.reload()" class="w-full mt-4 bg-indigo-600 text-white py-3 rounded-xl font-bold">Neue Klausur</button>`;
        
    } catch (e) {
        resultDiv.innerHTML = `<p class="text-red-500">Fehler bei der Benotung. Bitte Netzwerk prüfen.</p>`;
    }
}

// Prodigy Sidebar (bleibt gleich)
function toggleProdigy() { /* ... wie vorher ... */ }
function askProdigy() { /* ... wie vorher ... */ }
function switchTab(t) { /* ... wie vorher ... */ }
