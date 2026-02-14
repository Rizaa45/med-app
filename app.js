/**
 * SLM System Core Engine 2026
 * Version: 3.0 - Multi-Summary & AI Context Integration
 */

let currentQuestions = [];
let currentIndex = 0;
let currentModuleId = 9; 
let currentMode = 'classic'; 
let activeCase = null;
let userAnswersLog = []; 
let currentSummaryContext = ""; // Speichert den Text der aktuell offenen Zusammenfassung für die KI

window.onload = () => {
    const isDashboard = document.getElementById('total-percent') !== null;
    const isModulePage = document.getElementById('mod-title') !== null;

    if (isDashboard) {
        initDashboard();
    } else if (isModulePage) {
        const params = new URLSearchParams(window.location.search);
        currentModuleId = params.get('id') || 9;
        loadModuleData(currentModuleId);
        renderSummaryDropdown(); // Initialisiert das neue Dropdown
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

// --- DATEN LADEN & SUMMARY DROPWDOWN ---
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
        console.error("Fehler beim Laden:", err);
    }
}

function renderSummaryDropdown() {
    const container = document.getElementById('summary-dropdown-container');
    if(!container) return;

    // Definiert die 6 Einheiten für Modul 9
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

// --- SUMMARY CONTENT LADEN ---
async function loadSummaryContent(num) {
    if(!num) return;
    const displayArea = document.getElementById('summary-display-area');
    const loadingHtml = `<div class="p-20 text-center animate-pulse text-indigo-500 font-bold">Lade Experten-Inhalt...</div>`;
    displayArea.innerHTML = loadingHtml;
    displayArea.classList.remove('hidden');

    // Scroll zum Inhalt
    displayArea.scrollIntoView({ behavior: 'smooth' });

    try {
        const fileName = num === "1" ? `summaries_mod${currentModuleId}.json` : `summaries${num}_mod${currentModuleId}.json`;
        const response = await fetch(`data/${fileName}`);
        const data = await response.json();
        const content = data[0].content;

        // Kontext für KI speichern (HTML-Tags entfernen für reinen Text-Kontext)
        currentSummaryContext = content.replace(/<[^>]*>?/gm, '');

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
                <div class="p-8 md:p-12">
                    ${content}
                </div>
            </div>
        `;

        // Proaktive KI-Bubble nach 3 Sekunden zeigen
        setTimeout(showProactiveAiBubble, 3000);

    } catch (err) {
        displayArea.innerHTML = `<div class="p-10 text-red-500">Inhalt konnte nicht geladen werden.</div>`;
    }
}

function closeSummary() {
    document.getElementById('summary-display-area').classList.add('hidden');
    currentSummaryContext = "";
}

// --- PROAKTIVE KI BUBBLE ---
function showProactiveAiBubble() {
    const existing = document.getElementById('proactive-ai-bubble');
    if(existing) return;

    const bubble = document.createElement('div');
    bubble.id = 'proactive-ai-bubble';
    bubble.className = 'fixed bottom-10 right-10 z-[100] bg-white shadow-2xl border border-indigo-100 p-4 rounded-2xl flex items-center gap-4 animate-bounce-subtle cursor-pointer hover:scale-105 transition-all';
    bubble.innerHTML = `
        <div class="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white text-xl shadow-lg shadow-indigo-200">
            <i class="fas fa-robot"></i>
        </div>
        <div>
            <p class="text-[10px] font-black text-indigo-600 uppercase tracking-tighter">Prodigy Assist</p>
            <p class="text-xs text-slate-700 font-bold">Hast du Fragen dazu?</p>
        </div>
    `;
    bubble.onclick = () => {
        bubble.remove();
        toggleProdigy();
    };
    document.body.appendChild(bubble);
    
    // Nach 8 Sekunden automatisch verschwinden
    setTimeout(() => { if(bubble) bubble.style.opacity = '0'; setTimeout(() => bubble.remove(), 500); }, 8000);
}

// --- PRODIGY CHAT LOGIK ---
async function askProdigy() {
    const input = document.getElementById('prodigy-input');
    const chatBox = document.getElementById('prodigy-chat-box');
    const query = input.value.trim();
    if(!query) return;

    // User Message
    chatBox.innerHTML += `<div class="flex justify-end mb-4"><div class="bg-indigo-600 text-white p-4 rounded-2xl rounded-tr-none text-sm max-w-[80%] shadow-md">${query}</div></div>`;
    input.value = "";
    chatBox.scrollTop = chatBox.scrollHeight;

    // Loading State
    const loadingId = "ai-load-" + Date.now();
    chatBox.innerHTML += `<div id="${loadingId}" class="flex justify-start mb-4"><div class="bg-slate-100 text-slate-400 p-4 rounded-2xl rounded-tl-none text-xs animate-pulse">Prodigy denkt nach...</div></div>`;

    const PROMPT = `
        Du bist Prodigy, ein intelligenter Tutor für Pflegeberufe.
        Nutze diesen Kontext aus der aktuellen Lerneinheit, um die Frage des Nutzers zu beantworten:
        --- KONTEXT BEGINN ---
        ${currentSummaryContext}
        --- KONTEXT ENDE ---
        
        Frage: ${query}
        
        Antworte präzise, professionell und motivierend. Wenn die Antwort nicht im Kontext steht, nutze dein medizinisches Fachwissen, erwähne aber, dass dies eine Ergänzung ist.
    `;

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
            </div>
        `;
        chatBox.scrollTop = chatBox.scrollHeight;
    } catch (e) {
        document.getElementById(loadingId).innerHTML = `<div class="text-red-500">Fehler bei der Verbindung.</div>`;
    }
}

// --- KLASSISCHE FUNKTIONEN (ERHALTEN) ---
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
    } catch (err) { alert("Fehler beim Laden: " + err.message); }
}

function showQuestion() {
    if (currentIndex >= currentQuestions.length) { finishQuiz(); return; }
    const q = currentQuestions[currentIndex];
    document.getElementById('q-current').innerText = currentIndex + 1;
    document.getElementById('question-text').innerText = q.question || q.q;
    document.getElementById('type-badge').innerText = q.type ? q.type.toUpperCase() : "FRAGE";
    document.getElementById('feedback').classList.add('hidden');
    const grid = document.getElementById('options-grid');
    grid.innerHTML = "";
    if (q.type === "nennen_offen" || q.type === "lueckentext") { renderOpenQuestion(q, grid); } 
    else { renderMCQuestion(q, grid); }
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

function nextQuestion() { currentIndex++; showQuestion(); }
function exitQuiz() { document.getElementById('quiz-selection').classList.remove('hidden'); document.getElementById('quiz-container').classList.add('hidden'); }

async function finishQuiz() {
    const container = document.getElementById('quiz-container');
    if (currentMode === 'simulator') {
        container.innerHTML = `<div class="text-center py-20 bg-white rounded-[2.5rem] shadow-xl border border-slate-100"><div class="animate-bounce text-6xl mb-6">🤖</div><h2 class="text-2xl font-black text-slate-900 uppercase">Klausur eingereicht</h2><div id="ai-grading-result" class="max-w-xl mx-auto text-left space-y-4"></div></div>`;
        await calculateExamGrade();
    } else {
        container.innerHTML = `<div class="text-center py-20 bg-white rounded-[2.5rem] shadow-xl border border-slate-100"><div class="text-6xl mb-6">🏁</div><h2 class="text-3xl font-black text-slate-900 uppercase">Training Beendet</h2><button onclick="location.reload()" class="mt-8 bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold">Zurück</button></div>`;
    }
}

async function calculateExamGrade() {
    const resultDiv = document.getElementById('ai-grading-result');
    resultDiv.innerHTML = `<p class="text-center text-slate-500 animate-pulse">KI analysiert deine Antworten...</p>`;
    const summary = userAnswersLog.map((log, i) => `Frage ${i+1}: ${log.question}\nAntwort: ${log.userAnswer}\nErgebnis: ${log.correct ? "Richtig" : "Falsch"}`).join('\n\n');
    const PROMPT = `Handle als Fachlehrer. Analysiere: ${summary}. Gib Note (1-6), Stärken & Tipps in HTML.`;
    try {
        const response = await fetch('/api/grade', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: PROMPT }) });
        const data = await response.json();
        resultDiv.innerHTML = `<div class="bg-slate-50 p-6 rounded-2xl border border-slate-200 prose prose-indigo max-h-[500px] overflow-y-auto shadow-inner">${data.text}</div><button onclick="location.reload()" class="w-full mt-4 bg-indigo-600 text-white py-4 rounded-xl font-bold uppercase tracking-widest shadow-lg">Neu starten</button>`;
    } catch (e) { resultDiv.innerHTML = `<div class="p-4 bg-red-50 text-red-600">Verbindungsproblem.</div>`; }
}

function toggleProdigy() {
    const sidebar = document.getElementById('prodigy-sidebar');
    const overlay = document.getElementById('prodigy-overlay');
    const isOpen = sidebar && sidebar.style.transform === 'translateX(0%)';
    if(isOpen) {
        sidebar.style.transform = 'translateX(100%)';
        overlay.classList.add('hidden');
        overlay.style.opacity = '0';
    } else if(sidebar) {
        sidebar.style.transform = 'translateX(0%)';
        overlay.classList.remove('hidden');
        setTimeout(() => overlay.style.opacity = '1', 10);
    }
}
