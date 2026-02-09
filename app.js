/**
 * SLM System Core Engine 2026
 * Version: 2.6 - Multimodal Quiz (Classic & Case Study)
 */

let currentQuestions = [];
let currentIndex = 0;
let currentModuleId = 1;
let currentMode = 'classic'; // 'classic' oder 'cases'
let activeCase = null; // Speichert das gewählte Fallbeispiel

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

    const avg = Math.round(totalSum / (activeModules.length || 1));
    const totalBar = document.getElementById('total-progress-bar');
    const totalText = document.getElementById('total-percent');
    if (totalBar) totalBar.style.width = avg + '%';
    if (totalText) totalText.innerText = avg + '%';
}

// --- DATEN LADEN ---
async function loadModuleData(id) {
    const jsonPath = `data/mod_${id}.json`;
    try {
        const response = await fetch(jsonPath);
        const data = await response.json();
        document.getElementById('mod-title').innerText = data.moduleName || `Modul ${id}`;
        
        if (data.pdfs) {
            const pdfList = document.getElementById('pdf-list');
            pdfList.innerHTML = data.pdfs.map(fileName => `
                <div class="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                    <div class="flex items-center">
                        <div class="bg-indigo-50 text-indigo-600 p-3 rounded-xl mr-4 font-bold text-xs uppercase">PDF</div>
                        <span class="text-slate-900 font-bold text-sm">${fileName}</span>
                    </div>
                    <a href="docs/m${id}/${fileName}" target="_blank" class="bg-slate-900 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">Öffnen</a>
                </div>`).join('');
        }
    } catch (err) {
        console.error("Fehler beim Laden der Basisdaten:", err);
    }
}

// --- QUIZ MODUS AUSWAHL ---
async function startQuizMode(mode) {
    currentMode = mode;
    document.getElementById('quiz-selection').classList.add('hidden');
    document.getElementById('quiz-container').classList.remove('hidden');

    const path = mode === 'cases' ? `data/mod${currentModuleId}_cases_master.json` : `data/mod_${currentModuleId}.json`;

    try {
        const response = await fetch(path);
        const data = await response.json();

        if (mode === 'cases') {
            // Wähle ein zufälliges Fallbeispiel aus den 24 verfügbaren
            const randomIndex = Math.floor(Math.random() * data.length);
            activeCase = data[randomIndex];
            currentQuestions = activeCase.questions;
            
            // Szenario anzeigen
            document.getElementById('scenario-display').classList.remove('hidden');
            document.getElementById('scenario-text').innerText = activeCase.scenario;
            document.getElementById('setting-badge').innerText = activeCase.setting || "Klinik";
        } else {
            currentQuestions = data.questions;
            document.getElementById('scenario-display').classList.add('hidden');
        }

        currentIndex = 0;
        document.getElementById('q-total').innerText = currentQuestions.length;
        showQuestion();
    } catch (err) {
        alert("Fehler beim Laden der Fragen: " + err.message);
    }
}

// --- QUIZ ANZEIGE ---
function showQuestion() {
    if (currentIndex >= currentQuestions.length) {
        finishQuiz();
        return;
    }

    const q = currentQuestions[currentIndex];
    document.getElementById('q-current').innerText = currentIndex + 1;
    document.getElementById('question-text').innerText = q.q || q.question; // Support für beide JSON Formate
    document.getElementById('type-badge').innerText = q.type ? q.type.replace('_', ' ') : "Multiple Choice";
    
    const feedback = document.getElementById('feedback');
    feedback.classList.add('hidden');
    
    const grid = document.getElementById('options-grid');
    grid.innerHTML = "";

    // Differenzierung nach Frage-Typ
    if (q.type === "nennen_offen" || q.type === "lueckentext") {
        renderOpenQuestion(q, grid);
    } else {
        renderMCQuestion(q, grid);
    }
}

// Rendert Multiple Choice
function renderMCQuestion(q, grid) {
    const options = q.options;
    options.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.className = "w-full text-left p-5 rounded-2xl border-2 border-slate-100 hover:border-indigo-400 transition-all font-medium mb-2 bg-white";
        btn.innerText = opt;
        btn.onclick = () => checkMCAnswer(i, btn, q.correct_answer || q.answer);
        grid.appendChild(btn);
    });
}

// Rendert Offene Fragen (Self-Assessment)
function renderOpenQuestion(q, grid) {
    const container = document.createElement('div');
    container.className = "space-y-4 w-full";
    container.innerHTML = `
        <textarea id="user-open-answer" class="w-full p-5 rounded-2xl border-2 border-slate-200 focus:border-indigo-500 outline-none text-sm h-32" placeholder="Deine Antwort hier eingeben..."></textarea>
        <button id="show-solution-btn" onclick="revealOpenSolution()" class="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest">Lösung vergleichen</button>
        <div id="open-solution-area" class="hidden space-y-4 fade-in">
            <div class="p-5 bg-indigo-50 rounded-2xl border border-indigo-100">
                <span class="text-[10px] font-black text-indigo-600 uppercase">Musterlösung:</span>
                <p class="text-slate-800 text-sm mt-1">${q.correct_answer}</p>
            </div>
            <div class="flex gap-2">
                <button onclick="confirmOpenAnswer(true)" class="flex-1 bg-green-500 text-white py-3 rounded-xl font-bold text-xs uppercase">✅ Passt</button>
                <button onclick="confirmOpenAnswer(false)" class="flex-1 bg-slate-400 text-white py-3 rounded-xl font-bold text-xs uppercase">❌ Nicht ganz</button>
            </div>
        </div>
    `;
    grid.appendChild(container);
}

// --- LOGIK FÜR ANTWORTEN ---
function checkMCAnswer(idx, btn, correctIdx) {
    const all = document.querySelectorAll('#options-grid button');
    all.forEach(b => b.disabled = true);
    
    const isCorrect = idx == correctIdx;
    btn.classList.add(isCorrect ? 'border-green-500' : 'border-red-500');
    btn.classList.add(isCorrect ? 'bg-green-50' : 'bg-red-50');
    
    if (!isCorrect) {
        all[correctIdx].classList.add('border-green-500', 'bg-green-50');
    }

    showFeedback(isCorrect);
}

function revealOpenSolution() {
    document.getElementById('show-solution-btn').classList.add('hidden');
    document.getElementById('open-solution-area').classList.remove('hidden');
}

function confirmOpenAnswer(isCorrect) {
    showFeedback(isCorrect);
}

function showFeedback(isCorrect) {
    const q = currentQuestions[currentIndex];
    const feedback = document.getElementById('feedback');
    const feedbackText = document.getElementById('feedback-text');
    
    feedbackText.innerText = isCorrect ? "KORREKT" : "INFO";
    feedbackText.className = isCorrect ? "font-black text-lg text-green-600" : "font-black text-lg text-orange-600";
    
    document.getElementById('hint-text').innerText = q.hint || "Kein zusätzlicher Hinweis verfügbar.";
    feedback.classList.remove('hidden');
}

function nextQuestion() {
    currentIndex++;
    if (currentMode === 'classic') {
        localStorage.setItem(`mod${currentModuleId}_index`, currentIndex);
        localStorage.setItem(`mod${currentModuleId}_percent`, Math.round((currentIndex / currentQuestions.length) * 100));
    }
    showQuestion();
}

function finishQuiz() {
    const container = document.getElementById('quiz-container');
    container.innerHTML = `
        <div class="text-center py-20 bg-white rounded-[2.5rem] shadow-xl border border-slate-100 fade-in">
            <div class="text-6xl mb-6">🏆</div>
            <h2 class="text-3xl font-black text-slate-900 uppercase tracking-tighter">Analyse Beendet</h2>
            <p class="text-slate-500 mt-2">Du hast das Modul erfolgreich bearbeitet.</p>
            <button onclick="location.reload()" class="mt-8 bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg hover:shadow-indigo-200">Zurück zum Menü</button>
        </div>`;
}

function exitQuiz() {
    if(confirm("Möchtest du das Quiz wirklich verlassen?")) {
        location.reload();
    }
}

// --- PRODIGY AI INTEGRATION ---
async function askProdigy() {
    const responseDiv = document.getElementById('prodigy-response');
    const btn = document.getElementById('prodigy-btn');
    const q = currentQuestions[currentIndex];
    const userText = document.getElementById('user-open-answer')?.value || "";

    if (!q) return;

    responseDiv.innerHTML = `<div class="text-indigo-400 animate-pulse text-xs font-bold uppercase tracking-widest py-4">Prodigy analysiert...</div>`;
    btn.disabled = true;

    const API_KEY = "DEIN_KEY_HIER"; // API Key hier einsetzen
    
    let promptText = `Frage: ${q.q || q.question}\nKorrekte Antwort: ${q.correct_answer || q.options[q.answer]}`;
    if (userText) promptText += `\nUser hat geantwortet: ${userText}\nIst das medizinisch korrekt?`;
    
    const PROMPT = `Erkläre kurz und präzise als medizinischer Tutor (Prodigy):\n${promptText}\nMaximal 3 Sätze auf Deutsch.`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: PROMPT }] }] })
        });

        const data = await response.json();
        const aiText = data.candidates[0].content.parts[0].text;
        responseDiv.innerHTML = `<div class="bg-white/5 p-5 rounded-2xl border border-white/10 text-slate-200 text-sm leading-relaxed">${aiText}</div>`;
    } catch (err) {
        responseDiv.innerHTML = `<div class="text-red-400 text-xs">Verbindung fehlgeschlagen.</div>`;
    } finally {
        btn.disabled = false;
    }
}

// Sidebar Toggle
function toggleProdigy() {
    const sidebar = document.getElementById('prodigy-sidebar');
    const overlay = document.getElementById('prodigy-overlay');
    const isOpen = !sidebar.classList.contains('translate-x-full');

    sidebar.classList.toggle('translate-x-full', isOpen);
    overlay.classList.toggle('hidden', isOpen);
    if (!isOpen) setTimeout(() => overlay.classList.add('opacity-100'), 10);
}

// Tab Switching
function switchTab(tab) {
    const isQuiz = tab === 'quiz';
    document.getElementById('section-inhalt').classList.toggle('hidden', isQuiz);
    document.getElementById('section-quiz').classList.toggle('hidden', !isQuiz);
    
    document.getElementById('tab-inhalt').className = isQuiz ? "flex-1 py-3 rounded-xl font-bold transition-all text-slate-500" : "flex-1 py-3 rounded-xl font-bold bg-white text-indigo-600 shadow-sm";
    document.getElementById('tab-quiz').className = isQuiz ? "flex-1 py-3 rounded-xl font-bold bg-white text-indigo-600 shadow-sm" : "flex-1 py-3 rounded-xl font-bold text-slate-500";
}
