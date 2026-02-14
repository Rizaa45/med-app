/**
 * SLM System Core Engine 2026
 * Version: 4.0 - Full Integration (Drill, Simulator, Open Questions & AI)
 */

// --- GLOBALE VARIABLEN ---
let currentQuestions = [];
let currentIndex = 0;
let currentModuleId = 9; 
let currentMode = 'classic'; 
let activeCase = null;
let userAnswersLog = []; 
let currentSummaryContext = ""; // Speichert Text für Prodigy AI

window.onload = () => {
    const isDashboard = document.getElementById('total-percent') !== null;
    const isModulePage = document.getElementById('mod-title') !== null;

    if (isDashboard) {
        initDashboard();
    } else if (isModulePage) {
        const params = new URLSearchParams(window.location.search);
        currentModuleId = params.get('id') || 9;
        loadModuleData(currentModuleId);
        renderSummaryDropdown(); 
    }
};

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

    userAnswersLog.push({ question: q.question, userAnswer: q.options[selectedIndex], correct: isCorrect, type: 'mc' });
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

// --- AI FUNKTIONEN ---
async function calculateExamGrade() {
    const resultDiv = document.getElementById('ai-grading-result');
    resultDiv.innerHTML = `<p class="text-center text-slate-500 animate-pulse">Prodigy wertet deine Antworten fachlich aus...</p>`;
    
    const summary = userAnswersLog.map((log, i) => 
        `Frage ${i+1}: ${log.question}\nUser-Antwort: ${log.userAnswer}\nKorrekt: ${log.correct ? "Ja" : "Nein"}`
    ).join('\n\n');

    const PROMPT = `Du bist Fachprüfer für Pflegeberufe. Analysiere diese Ergebnisse: ${summary}. 
    Erstelle ein Feedback in HTML: Note (1-6), fachliche Analyse und konkrete Tipps.`;

    try {
        const response = await fetch('/api/grade', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ prompt: PROMPT }) 
        });
        const data = await response.json();
        resultDiv.innerHTML = `
            <div class="bg-slate-50 p-8 rounded-3xl border border-slate-200 prose prose-indigo shadow-inner overflow-y-auto max-h-[500px]">
                ${data.text}
            </div>
            <button onclick="location.reload()" class="w-full mt-6 bg-indigo-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl">Neu starten</button>`;
    } catch (e) { 
        resultDiv.innerHTML = `<div class="p-4 bg-red-50 text-red-600 rounded-xl">KI-Verbindung fehlgeschlagen. Bitte versuche es später erneut.</div>`; 
    }
}

async function askProdigy() {
    const input = document.getElementById('prodigy-input');
    const chatBox = document.getElementById('prodigy-chat-box');
    const query = input.value.trim();
    if(!query) return;

    chatBox.innerHTML += `<div class="flex justify-end mb-4"><div class="bg-indigo-600 text-white p-4 rounded-2xl rounded-tr-none text-sm max-w-[85%] shadow-md">${query}</div></div>`;
    input.value = "";
    chatBox.scrollTop = chatBox.scrollHeight;

    const loadingId = "ai-load-" + Date.now();
    chatBox.innerHTML += `<div id="${loadingId}" class="flex justify-start mb-4"><div class="bg-slate-100 text-slate-400 p-4 rounded-2xl rounded-tl-none text-xs animate-pulse">Prodigy schreibt...</div></div>`;

    const PROMPT = `Kontext: ${currentSummaryContext}\n\nFrage: ${query}\nAntworte als Tutor.`;

    try {
        const response = await fetch('/api/grade', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: PROMPT })
        });
        const data = await response.json();
        document.getElementById(loadingId).remove();
        chatBox.innerHTML += `
            <div class="flex justify-start mb-4">
                <div class="bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-none text-sm text-slate-700 shadow-sm prose prose-indigo">
                    ${data.text}
                </div>
            </div>`;
        chatBox.scrollTop = chatBox.scrollHeight;
    } catch (e) {
        document.getElementById(loadingId).innerHTML = `<div class="text-red-500">Offline.</div>`;
    }
}

// --- UI HELPER ---
function switchTab(tab) {
    document.getElementById('section-inhalt').classList.toggle('hidden', tab !== 'inhalt');
    document.getElementById('section-quiz').classList.toggle('hidden', tab !== 'quiz');
    
    const btnInhalt = document.getElementById('tab-inhalt');
    const btnQuiz = document.getElementById('tab-quiz');
    
    const activeStyle = "flex-1 py-3 rounded-xl font-bold transition-all duration-300 bg-white text-indigo-600 shadow-sm border border-slate-200/50";
    const inactiveStyle = "flex-1 py-3 rounded-xl font-bold transition-all duration-300 text-slate-500 hover:text-slate-700";
    
    btnInhalt.className = tab === 'inhalt' ? activeStyle : inactiveStyle;
    btnQuiz.className = tab === 'quiz' ? activeStyle : inactiveStyle;
}

function toggleProdigy() {
    const sidebar = document.getElementById('prodigy-sidebar');
    const overlay = document.getElementById('prodigy-overlay');
    const isOpen = sidebar.style.transform === 'translateX(0%)';
    
    sidebar.style.transform = isOpen ? 'translateX(100%)' : 'translateX(0%)';
    overlay.classList.toggle('hidden', isOpen);
    setTimeout(() => overlay.style.opacity = isOpen ? '0' : '1', 10);
}

function showProactiveAiBubble() {
    if(document.getElementById('proactive-ai-bubble')) return;
    const bubble = document.createElement('div');
    bubble.id = 'proactive-ai-bubble';
    bubble.className = 'fixed bottom-10 right-10 z-[100] bg-white shadow-2xl border border-indigo-100 p-4 rounded-2xl flex items-center gap-4 animate-bounce-subtle cursor-pointer hover:scale-105 transition-all';
    bubble.innerHTML = `
        <div class="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white text-xl"><i class="fas fa-robot"></i></div>
        <div><p class="text-[10px] font-black text-indigo-600 uppercase">Prodigy</p><p class="text-xs font-bold">Fragen zum Text?</p></div>`;
    bubble.onclick = () => { bubble.remove(); toggleProdigy(); };
    document.body.appendChild(bubble);
    setTimeout(() => { if(bubble) bubble.remove(); }, 8000);
}
