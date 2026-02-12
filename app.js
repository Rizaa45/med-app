/**
 * SLM System Core Engine 2026
 * Version: 2.7 - Exam Simulator & Smart Drill
 */

let currentQuestions = [];
let currentIndex = 0;
let currentModuleId = 9; 
let currentMode = 'classic'; 
let activeCase = null;
let userAnswersLog = []; 

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
        
        // Titel setzen
        document.getElementById('mod-title').innerText = data.moduleName || `Modul ${id}`;
        
        // Lerninhalte (PDF-Liste) rendern
        const pdfList = document.getElementById('pdf-list');
        if (pdfList && data.pdfs) {
            pdfList.innerHTML = data.pdfs.map(pdf => `
                <div class="bg-white p-5 rounded-2xl border border-slate-200 flex justify-between items-center hover:shadow-md transition-all">
                    <div class="flex items-center gap-4">
                        <div class="bg-red-50 text-red-500 p-3 rounded-xl font-bold text-xs tracking-tighter">PDF</div>
                        <span class="font-bold text-slate-700">${pdf.name}</span>
                    </div>
                    <a href="${pdf.url}" target="_blank" class="bg-slate-100 hover:bg-indigo-600 hover:text-white px-4 py-2 rounded-lg text-xs font-black uppercase transition-all">Öffnen</a>
                </div>
            `).join('');
        }
    } catch (err) {
        console.error("Fehler beim Laden der Moduldaten:", err);
    }
}

// --- TAB WECHSEL ---
function switchTab(tab) {
    const inhalt = document.getElementById('section-inhalt');
    const quiz = document.getElementById('section-quiz');
    const btnInhalt = document.getElementById('tab-inhalt');
    const btnQuiz = document.getElementById('tab-quiz');

    if (tab === 'inhalt') {
        inhalt.classList.remove('hidden');
        quiz.classList.add('hidden');
        btnInhalt.className = "flex-1 py-3 rounded-xl font-bold transition-all duration-300 bg-white text-indigo-600 shadow-sm border border-slate-200/50";
        btnQuiz.className = "flex-1 py-3 rounded-xl font-bold transition-all duration-300 text-slate-500 hover:text-slate-700";
    } else {
        inhalt.classList.add('hidden');
        quiz.classList.remove('hidden');
        btnQuiz.className = "flex-1 py-3 rounded-xl font-bold transition-all duration-300 bg-white text-indigo-600 shadow-sm border border-slate-200/50";
        btnInhalt.className = "flex-1 py-3 rounded-xl font-bold transition-all duration-300 text-slate-500 hover:text-slate-700";
    }
}

// --- QUIZ MODUS STARTEN ---
async function startQuizMode(mode) {
    currentMode = mode;
    userAnswersLog = [];
    document.getElementById('quiz-selection').classList.add('hidden');
    document.getElementById('quiz-container').classList.remove('hidden');

    try {
        if (mode === 'drill') {
            const response = await fetch('data/klausur27_questions.json');
            const allQuestions = await response.json();
            currentQuestions = allQuestions.sort(() => 0.5 - Math.random()).slice(0, 30);
            document.getElementById('scenario-display').classList.add('hidden');
        
        } else if (mode === 'simulator') {
            const casesResp = await fetch('data/klausur27_cases.json');
            const drillResp = await fetch('data/klausur27_questions.json');
            const cases = await casesResp.json();
            const drills = await drillResp.json();

            activeCase = cases[Math.floor(Math.random() * cases.length)];
            const randomDrills = drills.sort(() => 0.5 - Math.random()).slice(0, 2);
            currentQuestions = [...activeCase.questions, ...randomDrills];

            document.getElementById('scenario-display').classList.remove('hidden');
            document.getElementById('scenario-text').innerText = activeCase.scenario;
            document.getElementById('setting-badge').innerText = "Klausur 27.02.26";

        } else if (mode === 'cases') {
            const response = await fetch(`data/mod${currentModuleId}_cases_master.json`);
            const data = await response.json();
            activeCase = data[Math.floor(Math.random() * data.length)];
            currentQuestions = activeCase.questions;
            document.getElementById('scenario-display').classList.remove('hidden');
            document.getElementById('scenario-text').innerText = activeCase.scenario;
        } else {
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
    }
}

// --- FRAGE ANZEIGEN ---
function showQuestion() {
    if (currentIndex >= currentQuestions.length) {
        finishQuiz();
        return;
    }

    const q = currentQuestions[currentIndex];
    document.getElementById('q-current').innerText = currentIndex + 1;
    document.getElementById('question-text').innerText = q.question || q.q;
    document.getElementById('type-badge').innerText = q.type ? q.type.toUpperCase() : "FRAGE";
    
    document.getElementById('feedback').classList.add('hidden');
    const grid = document.getElementById('options-grid');
    grid.innerHTML = "";

    if (q.type === "nennen_offen" || q.type === "lueckentext") {
        renderOpenQuestion(q, grid);
    } else {
        renderMCQuestion(q, grid);
    }
}

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

function revealOpenSol() {
    document.getElementById('sol-btn').classList.add('hidden');
    document.getElementById('sol-area').classList.remove('hidden');
}

function handleAnswer(selectedIndex, btn, q) {
    const isCorrect = selectedIndex === q.correct_answer;
    userAnswersLog.push({ question: q.question, userAnswer: q.options[selectedIndex], correct: isCorrect, type: 'mc' });
    const all = document.querySelectorAll('#options-grid button');
    all.forEach(b => b.disabled = true);
    btn.classList.add(isCorrect ? 'bg-green-100' : 'bg-red-100');
    btn.classList.add(isCorrect ? 'border-green-500' : 'border-red-500');
    processResult(isCorrect, q);
}

function handleSelfCheck(isCorrect) {
    const q = currentQuestions[currentIndex];
    const userText = document.getElementById('user-open-answer').value;
    userAnswersLog.push({ question: q.question, userAnswer: userText, correct: isCorrect, type: 'open' });
    processResult(isCorrect, q);
}

function processResult(isCorrect, q) {
    const feedback = document.getElementById('feedback');
    const txt = document.getElementById('feedback-text');
    
    if (!isCorrect && currentMode === 'drill') {
        txt.innerText = "WIEDERHOLUNG!";
        txt.className = "text-orange-600 font-black text-xl uppercase";
        currentQuestions.push(q);
        document.getElementById('q-total').innerText = currentQuestions.length;
    } else {
        txt.innerText = isCorrect ? "KORREKT" : "FALSCH";
        txt.className = isCorrect ? "text-green-600 font-black text-xl uppercase" : "text-red-600 font-black text-xl uppercase";
    }
    document.getElementById('hint-text').innerText = q.hint || "";
    feedback.classList.remove('hidden');
}

function nextQuestion() {
    currentIndex++;
    showQuestion();
}

function exitQuiz() {
    document.getElementById('quiz-selection').classList.remove('hidden');
    document.getElementById('quiz-container').classList.add('hidden');
}

async function finishQuiz() {
    const container = document.getElementById('quiz-container');
    if (currentMode === 'simulator') {
        container.innerHTML = `<div class="text-center py-20 bg-white rounded-[2.5rem] shadow-xl border border-slate-100"><div class="animate-bounce text-6xl mb-6">🤖</div><h2 class="text-2xl font-black text-slate-900 uppercase">Klausur eingereicht</h2><div id="ai-grading-result" class="max-w-xl mx-auto text-left space-y-4"></div></div>`;
        await calculateExamGrade();
    } else {
        container.innerHTML = `<div class="text-center py-20 bg-white rounded-[2.5rem] shadow-xl border border-slate-100"><div class="text-6xl mb-6">🏁</div><h2 class="text-3xl font-black text-slate-900 uppercase">Training Beendet</h2><button onclick="location.reload()" class="mt-8 bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold">Zurück</button></div>`;
    }
}

// PRODIGY SIDEBAR LOGIK
function toggleProdigy() {
    const sidebar = document.getElementById('prodigy-sidebar');
    const overlay = document.getElementById('prodigy-overlay');
    const isOpen = sidebar.style.transform === 'translateX(0%)';
    
    if(isOpen) {
        sidebar.style.transform = 'translateX(100%)';
        overlay.classList.add('hidden');
        overlay.style.opacity = '0';
    } else {
        sidebar.style.transform = 'translateX(0%)';
        overlay.classList.remove('hidden');
        setTimeout(() => overlay.style.opacity = '1', 10);
    }
}
