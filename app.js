/**
 * SLM System Core Engine 2026
 * Version: 5.0 - Vault & Pinning Update
 * Project by Prasanth SLM System
 */

// --- GLOBALE VARIABLEN ---
let currentQuestions = [];
let currentIndex = 0;
let currentModuleId = 9; 
let currentMode = 'classic'; 
let activeCase = null;
let userAnswersLog = []; 
let currentSummaryContext = ""; // Speichert Text für Prodigy AI
let pinnedQuestions = JSON.parse(localStorage.getItem('slm_pinned_v1')) || [];

window.onload = () => {
    const isDashboard = document.getElementById('total-percent') !== null;
    const isModulePage = document.getElementById('mod-title') !== null;
    const isVaultPage = document.getElementById('vault-container') !== null;

    if (isDashboard) {
        initDashboard();
    } else if (isModulePage) {
        const params = new URLSearchParams(window.location.search);
        currentModuleId = params.get('id') || 9;
        loadModuleData(currentModuleId);
        renderSummaryDropdown(); 
    } else if (isVaultPage) {
        initVault();
    }
};

// --- VAULT LOGIC (Gemerkt-Liste) ---
function togglePin() {
    const q = currentQuestions[currentIndex];
    const qId = q.id || q.question || q.q; // Eindeutiger Identifier
    
    const index = pinnedQuestions.findIndex(item => (item.id || item.question || item.q) === qId);
    
    if (index > -1) {
        pinnedQuestions.splice(index, 1);
    } else {
        pinnedQuestions.push(q);
    }
    
    localStorage.setItem('slm_pinned_v1', JSON.stringify(pinnedQuestions));
    updatePinUI();
}

function updatePinUI() {
    const pinBtn = document.getElementById('pin-btn');
    if (!pinBtn) return;
    
    const q = currentQuestions[currentIndex];
    const qId = q.id || q.question || q.q;
    const isPinned = pinnedQuestions.some(item => (item.id || item.question || item.q) === qId);
    
    pinBtn.innerHTML = isPinned ? '<i class="fas fa-thumbtack"></i>' : '<i class="outline fas fa-thumbtack opacity-20"></i>';
    pinBtn.className = isPinned 
        ? "bg-indigo-600 text-white p-3 rounded-xl transition-all shadow-lg" 
        : "bg-slate-100 text-slate-400 p-3 rounded-xl hover:bg-slate-200 transition-all";
}

function initVault() {
    const container = document.getElementById('vault-container');
    if (pinnedQuestions.length === 0) {
        container.innerHTML = `
            <div class="text-center py-20">
                <div class="text-6xl mb-4">Empty</div>
                <p class="text-slate-500">Du hast noch keine Fragen angepinnt.</p>
            </div>`;
        return;
    }

    container.innerHTML = pinnedQuestions.map((q, i) => `
        <div class="bg-white p-6 rounded-3xl border border-slate-100 mb-4 shadow-sm hover:shadow-md transition-all">
            <div class="flex justify-between items-start mb-4">
                <span class="bg-indigo-50 text-indigo-600 text-[10px] font-black px-3 py-1 rounded-full uppercase">Gemerkt</span>
                <button onclick="removePinFromVault(${i})" class="text-red-300 hover:text-red-500"><i class="fas fa-trash"></i></button>
            </div>
            <h3 class="font-bold text-slate-800 mb-3">${q.question || q.q}</h3>
            <div class="p-4 bg-slate-50 rounded-2xl text-xs text-slate-600 leading-relaxed border-l-4 border-indigo-500">
                <strong>Lösung:</strong> ${q.correct_answer !== undefined && q.options ? q.options[q.correct_answer] : q.correct_answer}
            </div>
        </div>
    `).join('');
}

function removePinFromVault(index) {
    pinnedQuestions.splice(index, 1);
    localStorage.setItem('slm_pinned_v1', JSON.stringify(pinnedQuestions));
    initVault();
}

// --- DASHBOARD ---
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

// --- DATEN LADEN & SUMMARY ---
async function loadModuleData(id) {
    const jsonPath = `data/mod_${id}.json`;
    try {
        const response = await fetch(jsonPath);
        const data = await response.json();
        document.getElementById('mod-title').innerText = data.moduleName || `Modul ${id}`;
        
        const pdfList = document.getElementById('pdf-list');
        if (pdfList && data.pdfs) {
            pdfList.innerHTML = data.pdfs.map(pdf => `
                <div class="bg-white p-5 rounded-2xl border border-slate-200 flex justify-between items-center hover:shadow-md transition-all">
                    <div class="flex items-center gap-4">
                        <div class="bg-red-50 text-red-500 p-3 rounded-xl font-bold text-xs tracking-tighter">PDF</div>
                        <span class="font-bold text-slate-700 text-sm">${pdf.name}</span>
                    </div>
                    <a href="${pdf.url}" target="_blank" class="bg-slate-100 hover:bg-indigo-600 hover:text-white px-4 py-2 rounded-lg text-xs font-black uppercase transition-all">Öffnen</a>
                </div>
            `).join('');
        }
    } catch (err) {
        console.error("Fehler beim Laden der Moduldaten:", err);
    }
}

function renderSummaryDropdown() {
    const container = document.getElementById('summary-dropdown-container');
    if(!container) return;

    const summaries = [
        { id: "", name: "Wähle eine Lerneinheit..." },
        { id: "1", name: "1. Nervensystem Grundlagen" },
        { id: "2", name: "2. Schlaganfall (Insult) Basis" },
        { id: "3", name: "3. Akuttherapie & Pflege" },
        { id: "4", name: "4. Anatomie des Großhirns" },
        { id: "5", name: "5. Reha & Konzepte" },
        { id: "6", name: "6. Psychosoziale Aspekte" }
    ];

    container.innerHTML = `
        <div class="relative w-full mb-6">
            <select onchange="loadSummaryContent(this.value)" class="w-full p-4 bg-white border-2 border-indigo-100 rounded-2xl shadow-sm text-slate-700 font-bold focus:border-indigo-500 outline-none appearance-none cursor-pointer">
                ${summaries.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
            </select>
            <div class="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-500">
                <i class="fas fa-chevron-down"></i>
            </div>
        </div>
    `;
}

async function loadSummaryContent(num) {
    if(!num) return;
    const displayArea = document.getElementById('summary-display-area');
    displayArea.innerHTML = `<div class="p-20 text-center animate-pulse text-indigo-500 font-bold">Lade Experten-Inhalt...</div>`;
    displayArea.classList.remove('hidden');
    displayArea.scrollIntoView({ behavior: 'smooth' });

    try {
        const fileName = num === "1" ? `summaries_mod${currentModuleId}.json` : `summaries${num}_mod${currentModuleId}.json`;
        const response = await fetch(`data/${fileName}`);
        const data = await response.json();
        const content = data[0].content;

        currentSummaryContext = content.replace(/<[^>]*>?/gm, ''); // Für KI-Kontext

        displayArea.innerHTML = `
            <div class="fade-in bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden mb-10">
                <div class="bg-indigo-600 p-8 text-white flex justify-between items-center">
                    <div>
                        <span class="text-indigo-200 text-xs font-black uppercase tracking-widest">Einheit ${num}</span>
                        <h2 class="text-2xl font-black">${data[0].topic || data[0].title}</h2>
                    </div>
                    <button onclick="closeSummary()" class="bg-white/20 hover:bg-white/40 p-3 rounded-full transition-all">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="p-8 md:p-12 prose max-w-none">
                    ${content}
                </div>
            </div>
        `;
        setTimeout(showProactiveAiBubble, 3000);
    } catch (err) {
        displayArea.innerHTML = `<div class="p-10 text-red-500">Inhalt konnte nicht geladen werden.</div>`;
    }
}

function closeSummary() {
    document.getElementById('summary-display-area').classList.add('hidden');
    currentSummaryContext = "";
}

// --- QUIZ ENGINE ---
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
        } 
        else if (mode === 'simulator') {
            const casesResp = await fetch('data/klausur27_cases.json');
            const drillResp = await fetch('data/klausur27_questions.json');
            const cases = await casesResp.json();
            const drills = await drillResp.json();
            activeCase = cases[Math.floor(Math.random() * cases.length)];
            const randomDrills = drills.sort(() => 0.5 - Math.random()).slice(0, 2);
            currentQuestions = [...activeCase.questions, ...randomDrills];
            document.getElementById('scenario-display').classList.remove('hidden');
            document.getElementById('scenario-text').innerText = activeCase.scenario;
            document.getElementById('setting-badge').innerText = "Prüfungssimulation";
        } 
        else {
            const response = await fetch(`data/mod_${currentModuleId}.json`);
            const data = await response.json();
            currentQuestions = data.questions;
            document.getElementById('scenario-display').classList.add('hidden');
        }

        currentIndex = 0;
        document.getElementById('q-total').innerText = currentQuestions.length;
        showQuestion();
    } catch (err) { 
        alert("Fehler beim Laden der Fragen."); 
        exitQuiz();
    }
}

function showQuestion() {
    if (currentIndex >= currentQuestions.length) { finishQuiz(); return; }
    const q = currentQuestions[currentIndex];
    
    document.getElementById('q-current').innerText = currentIndex + 1;
    document.getElementById('question-text').innerText = q.question || q.q;
    document.getElementById('type-badge').innerText = q.type ? q.type.toUpperCase() : "ANALYSE";
    document.getElementById('feedback').classList.add('hidden');
    
    // Pin-Button UI Update
    updatePinUI();
    
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
        btn.className = "w-full text-left p-5 rounded-2xl border-2 border-slate-100 hover:border-indigo-400 transition-all font-medium mb-2 bg-white text-slate-700 flex justify-between items-center group";
        btn.innerHTML = `<span>${opt}</span><i class="fas fa-check opacity-0 group-hover:opacity-20"></i>`;
        btn.onclick = () => handleAnswer(i, btn, q);
        grid.appendChild(btn);
    });
}

function renderOpenQuestion(q, grid) {
    const container = document.createElement('div');
    container.className = "space-y-4 w-full";
    container.innerHTML = `
        <textarea id="user-open-answer" class="w-full p-5 rounded-2xl border-2 border-slate-200 focus:border-indigo-500 outline-none text-sm h-32" placeholder="Deine Antwort hier..."></textarea>
        <button id="sol-btn" onclick="revealOpenSol()" class="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold uppercase text-xs tracking-widest shadow-lg">Lösung prüfen</button>
        <div id="sol-area" class="hidden space-y-4 fade-in">
            <div class="p-6 bg-indigo-50 rounded-2xl border border-indigo-100 text-sm">
                <span class="font-black text-indigo-600 block mb-2 uppercase tracking-tighter">Musterlösung:</span>
                <p class="text-slate-700 leading-relaxed">${q.correct_answer}</p>
            </div>
            <div class="flex gap-3">
                <button onclick="handleSelfCheck(true)" class="flex-1 bg-green-500 text-white py-4 rounded-xl font-bold text-xs uppercase">Richtig</button>
                <button onclick="handleSelfCheck(false)" class="flex-1 bg-red-400 text-white py-4 rounded-xl font-bold text-xs uppercase">Falsch / Unvollständig</button>
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
    const all = document.querySelectorAll('#options-grid button');
    
    all.forEach(b => {
        b.disabled = true;
        const idx = Array.from(all).indexOf(b);
        if(idx === q.correct_answer) b.classList.add('border-green-500', 'bg-green-50');
    });

    if(!isCorrect) btn.classList.add('border-red-500', 'bg-red-50');

    userAnswersLog.push({ question: q.question || q.q, userAnswer: q.options[selectedIndex], correct: isCorrect, type: 'mc' });
    processResult(isCorrect, q);
}

function handleSelfCheck(isCorrect) {
    const q = currentQuestions[currentIndex];
    const userText = document.getElementById('user-open-answer').value;
    userAnswersLog.push({ question: q.question || q.q, userAnswer: userText, correct: isCorrect, type: 'open' });
    processResult(isCorrect, q);
}

function processResult(isCorrect, q) {
    const feedback = document.getElementById('feedback');
    const txt = document.getElementById('feedback-text');
    
    if (!isCorrect && currentMode === 'drill') {
        txt.innerText = "WIEDERHOLUNG!";
        txt.className = "text-orange-600 font-black text-xl uppercase tracking-tighter";
        currentQuestions.push(q); 
        document.getElementById('q-total').innerText = currentQuestions.length;
    } else {
        txt.innerText = isCorrect ? "EXZELLENT!" : "LEIDER FALSCH";
        txt.className = isCorrect ? "text-green-600 font-black text-xl uppercase" : "text-red-600 font-black text-xl uppercase";
    }
    
    document.getElementById('hint-text').innerText = q.hint || q.explanation || "";
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
        container.innerHTML = `
            <div class="text-center py-20 bg-white rounded-[2.5rem] shadow-xl border border-slate-100">
                <div class="animate-bounce text-6xl mb-6">🤖</div>
                <h2 class="text-2xl font-black text-slate-900 uppercase">Analyse läuft...</h2>
                <div id="ai-grading-result" class="max-w-xl mx-auto text-left space-y-4 px-6 mt-8"></div>
            </div>`;
        await calculateExamGrade();
    } else {
        container.innerHTML = `
            <div class="text-center py-20 bg-white rounded-[2.5rem] shadow-xl border border-slate-100">
                <div class="text-6xl mb-6">🏁</div>
                <h2 class="text-3xl font-black text-slate-900 uppercase">Training Beendet</h2>
                <p class="text-slate-500 mt-2 mb-8">Modul erfolgreich bearbeitet.</p>
                <button onclick="location.reload()" class="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-bold uppercase shadow-lg shadow-indigo-200">Zum Dashboard</button>
            </div>`;
    }
}

// ==========================================
// --- PRODIGY AI SYSTEM CORE v5.2 ---
// ==========================================

// 1. CSS FÜR ANIMATIONEN (Wird automatisch injiziert)
const aiStyles = document.createElement("style");
aiStyles.innerText = `
    @keyframes slideUpFade {
        0% { opacity: 0; transform: translateY(10px); }
        100% { opacity: 1; transform: translateY(0); }
    }
    .msg-animate { animation: slideUpFade 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
    
    .typing-dot {
        width: 5px; height: 5px; background: #94a3b8; border-radius: 50%;
        animation: typing 1.4s infinite ease-in-out both;
    }
    .typing-dot:nth-child(1) { animation-delay: -0.32s; }
    .typing-dot:nth-child(2) { animation-delay: -0.16s; }
    @keyframes typing { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }

    /* Fix für Overlay-Transition */
    #prodigy-overlay { transition: opacity 0.4s ease, visibility 0.4s; }
    #prodigy-overlay.hidden { display: none; visibility: hidden; }
`;
document.head.appendChild(aiStyles);

// 2. SIDEBAR STEUERUNG (GLOBAL)
window.toggleProdigy = function() {
    const sidebar = document.getElementById('prodigy-sidebar');
    const overlay = document.getElementById('prodigy-overlay');
    const input = document.getElementById('prodigy-input');
    
    if (!sidebar || !overlay) return;

    const isOpening = sidebar.classList.contains('translate-x-full');

    if (isOpening) {
        // Öffnen
        sidebar.classList.remove('translate-x-full');
        overlay.classList.remove('hidden');
        setTimeout(() => {
            overlay.classList.remove('opacity-0');
            if(input) input.focus();
        }, 10);
    } else {
        // Schließen
        sidebar.classList.add('translate-x-full');
        overlay.classList.add('opacity-0');
        setTimeout(() => overlay.classList.add('hidden'), 400);
    }
};

// 3. KLASUR-AUSWERTUNG (AI GRADING)
async function calculateExamGrade() {
    const resultDiv = document.getElementById('ai-grading-result');
    if(!resultDiv) return;

    resultDiv.innerHTML = `
        <div class="flex flex-col items-center justify-center py-12 msg-animate">
            <div class="relative w-16 h-16 mb-4">
                <div class="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                <div class="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                <i class="fas fa-graduation-cap absolute inset-0 m-auto text-indigo-600 flex items-center justify-center"></i>
            </div>
            <p class="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] animate-pulse">Erstelle Gutachten...</p>
        </div>`;
    
    const summary = (typeof userAnswersLog !== 'undefined') ? userAnswersLog.map((log, i) => 
        `F${i+1}: ${log.question} | Antwort: ${log.userAnswer} | ${log.correct ? "KORREKT" : "FALSCH"}`
    ).join('\n') : "Keine Daten verfügbar.";

    const PROMPT = `Rolle: Strenger Fachprüfer Pflege. Aufgabe: Bewerte diese Klausurleistung kurz und knapp.
    Daten: ${summary}
    Output Format: HTML (Tailwind). Keine Einleitung, direkt das HTML mit Note (1-6), Stärken, Schwächen und 1 Tipp.`;

    try {
        const response = await fetch('/api/grade', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ prompt: PROMPT }) 
        });
        
        const data = await response.json();
        resultDiv.innerHTML = `
            <div class="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-xl overflow-y-auto max-h-[600px] msg-animate">
                <div class="prose prose-sm prose-indigo max-w-none">${data.text}</div>
            </div>
            <button onclick="location.reload()" class="w-full mt-6 bg-slate-900 text-white py-4 rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-indigo-600 transition-all shadow-lg msg-animate">
                <i class="fas fa-redo mr-2"></i> Neue Simulation
            </button>`;
    } catch (e) { 
        resultDiv.innerHTML = `<div class="p-4 bg-red-50 text-red-500 rounded-xl text-center text-xs font-bold uppercase">Fehler bei der AI-Analyse</div>`; 
    }
}

// 4. CHAT LOGIK (ASK PRODIGY)
async function askProdigy() {
    const input = document.getElementById('prodigy-input');
    const chatBox = document.getElementById('prodigy-chat-box');
    const query = input.value.trim();
    if(!query || !chatBox) return;

    // User Message
    chatBox.innerHTML += `
        <div class="flex flex-col gap-1 items-end ml-auto max-w-[85%] mb-6 msg-animate">
            <div class="bg-indigo-600 text-white p-4 rounded-2xl rounded-tr-sm text-sm shadow-md font-medium">
                ${query}
            </div>
        </div>`;
    
    input.value = "";
    input.style.height = 'auto';
    chatBox.scrollTop = chatBox.scrollHeight;

    const loadingId = "ai-load-" + Date.now();
    
    // Loader
    chatBox.innerHTML += `
        <div id="${loadingId}" class="flex flex-col gap-2 max-w-[85%] mb-6 msg-animate">
            <div class="bg-white border border-slate-100 p-4 rounded-2xl rounded-tl-sm shadow-sm w-fit">
                <div class="flex gap-1.5 items-center px-1">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        </div>`;
    chatBox.scrollTop = chatBox.scrollHeight;

    const PROMPT = `Du bist Prodigy, ein Lern-Assistent. 
    REGELN: 1. Antworte DIREKT. 2. Keine Begrüßung. 3. Sage NIE deinen Namen/Version, außer man fragt wer du bist. 4. Nutze HTML (<b>, <ul>).
    Kontext: ${typeof currentSummaryContext !== 'undefined' ? currentSummaryContext : 'Pflegewissen'}
    User Frage: ${query}`;

    try {
        const response = await fetch('/api/grade', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: PROMPT })
        });
        
        const data = await response.json();
        const loadingElement = document.getElementById(loadingId);
        if(loadingElement) loadingElement.remove();

        chatBox.innerHTML += `
            <div class="flex flex-col gap-2 max-w-[95%] mb-6 msg-animate">
                <div class="flex items-center gap-2 mb-1 pl-1">
                    <div class="w-5 h-5 rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-[9px] text-white shadow-sm">
                        <i class="fas fa-brain"></i>
                    </div>
                    <span class="text-[10px] font-black text-slate-700 uppercase tracking-widest">Prodigy</span>
                </div>
                <div class="bg-white border border-slate-200/80 p-5 rounded-2xl rounded-tl-sm text-sm text-slate-700 shadow-sm prose prose-indigo prose-sm max-w-none">
                    ${data.text}
                </div>
            </div>`;
        chatBox.scrollTop = chatBox.scrollHeight;
    } catch (e) {
        const loadingElement = document.getElementById(loadingId);
        if(loadingElement) loadingElement.innerHTML = `<div class="text-red-500 text-[10px] font-bold p-2">Netzwerkfehler</div>`;
    }
}

// 5. EVENT LISTENERS & UI HELPERS
document.addEventListener('DOMContentLoaded', () => {
    const pInput = document.getElementById('prodigy-input');
    if(pInput) {
        pInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                askProdigy();
            }
        });
    }
});

function switchTab(tab) {
    const secInhalt = document.getElementById('section-inhalt');
    const secQuiz = document.getElementById('section-quiz');
    if(!secInhalt || !secQuiz) return;

    secInhalt.classList.toggle('hidden', tab !== 'inhalt');
    secQuiz.classList.toggle('hidden', tab !== 'quiz');
    
    const btnInhalt = document.getElementById('tab-inhalt');
    const btnQuiz = document.getElementById('tab-quiz');
    
    const activeStyle = "flex-1 py-3 rounded-xl font-bold transition-all duration-300 bg-white text-indigo-600 shadow-sm border border-slate-200/50";
    const inactiveStyle = "flex-1 py-3 rounded-xl font-bold transition-all duration-300 text-slate-500 hover:text-slate-700";
    
    if(btnInhalt) btnInhalt.className = tab === 'inhalt' ? activeStyle : inactiveStyle;
    if(btnQuiz) btnQuiz.className = tab === 'quiz' ? activeStyle : inactiveStyle;
}

function showProactiveAiBubble() {
    if(document.getElementById('proactive-ai-bubble')) return;
    const bubble = document.createElement('div');
    bubble.id = 'proactive-ai-bubble';
    bubble.className = 'fixed bottom-10 right-10 z-[100] bg-white shadow-2xl border border-indigo-100 p-4 rounded-2xl flex items-center gap-4 cursor-pointer hover:scale-105 transition-all msg-animate';
    bubble.innerHTML = `
        <div class="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white text-xl"><i class="fas fa-robot"></i></div>
        <div><p class="text-[10px] font-black text-indigo-600 uppercase">Prodigy</p><p class="text-xs font-bold">Fragen zum Text?</p></div>`;
    bubble.onclick = () => { bubble.remove(); toggleProdigy(); };
    document.body.appendChild(bubble);
    setTimeout(() => { if(bubble) bubble.remove(); }, 8000);
}
