/**
 * SLM System Core Engine 2026
 * Integration: Prodigy AI Sidebar & Gemini 1.5-Flash
 */

let currentQuestions = [];
let currentIndex = 0;
let currentModuleId = 1;

window.onload = () => {
    const isDashboard = document.getElementById('total-percent') !== null;
    const isModulePage = document.getElementById('mod-title') !== null;

    if (isDashboard) {
        initDashboard();
    } else if (isModulePage) {
        const params = new URLSearchParams(window.location.search);
        currentModuleId = params.get('id') || 1;
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
    const totalBar = document.getElementById('total-progress-bar');
    const totalText = document.getElementById('total-percent');
    if (totalBar) totalBar.style.width = avg + '%';
    if (totalText) totalText.innerText = avg + '%';
}

// --- DATEN LADEN ---
async function loadModuleData(id) {
    const jsonPath = `data/mod_${id}.json`;
    const pdfList = document.getElementById('pdf-list');

    try {
        const response = await fetch(jsonPath);
        if (!response.ok) throw new Error(`Datenbank-Fehler (ID: ${id})`);

        const data = await response.json();
        document.getElementById('mod-title').innerText = data.moduleName || `Modul ${id}`;
        
        if (pdfList && data.pdfs) {
            pdfList.innerHTML = data.pdfs.map(fileName => `
                <div class="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                    <div class="flex items-center">
                        <div class="bg-indigo-50 text-indigo-600 p-3 rounded-xl mr-4 font-bold">PDF</div>
                        <span class="text-slate-900 font-bold text-sm">${fileName}</span>
                    </div>
                    <a href="docs/m${id}/${fileName}" target="_blank" class="bg-slate-900 text-white px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest">Öffnen</a>
                </div>`).join('');
        }

        currentQuestions = data.questions || [];
        currentIndex = parseInt(localStorage.getItem(`mod${id}_index`)) || 0;
        document.getElementById('q-total').innerText = currentQuestions.length;
        showQuestion();

    } catch (err) {
        if(pdfList) pdfList.innerHTML = `<div class="p-6 bg-red-50 text-red-700 rounded-2xl">⚠️ Fehler: ${err.message}</div>`;
    }
}

// --- QUIZ LOGIK ---
function showQuestion() {
    const quizSection = document.getElementById('section-quiz');
    if (!quizSection || currentQuestions.length === 0) return;

    if (currentIndex >= currentQuestions.length) {
        quizSection.innerHTML = `
            <div class="text-center py-20 bg-white rounded-[2.5rem] shadow-xl border border-slate-100 fade-in">
                <div class="text-6xl mb-6">🎯</div>
                <h2 class="text-3xl font-black text-slate-900 uppercase">Abschluss erreicht</h2>
                <button onclick="resetModuleProgress(${currentModuleId})" class="mt-8 bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs">Neustarten</button>
            </div>`;
        return;
    }

    const q = currentQuestions[currentIndex];
    document.getElementById('q-current').innerText = currentIndex + 1;
    document.getElementById('question-text').innerText = q.question;
    document.getElementById('feedback').classList.add('hidden');
    
    // Reset Prodigy Response when moving to next question
    const prodigyRes = document.getElementById('prodigy-response');
    if(prodigyRes) prodigyRes.innerHTML = "";

    const grid = document.getElementById('options-grid');
    grid.innerHTML = "";
    q.options.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.className = "btn-option w-full text-left p-5 rounded-2xl border-2 border-slate-100 hover:border-indigo-400 transition-all font-medium mb-2";
        btn.innerText = opt;
        btn.onclick = () => checkAnswer(i, btn);
        grid.appendChild(btn);
    });
}

function checkAnswer(idx, btn) {
    const q = currentQuestions[currentIndex];
    const all = document.querySelectorAll('.btn-option');
    const feedback = document.getElementById('feedback');
    all.forEach(b => b.disabled = true);
    
    if (idx === q.answer) {
        btn.classList.add('bg-green-50', 'border-green-500', 'text-green-700');
        document.getElementById('feedback-text').innerText = "KORREKT";
    } else {
        btn.classList.add('bg-red-50', 'border-red-500', 'text-red-700');
        all[q.answer].classList.add('bg-green-50', 'border-green-500', 'text-green-700');
        document.getElementById('feedback-text').innerText = "ABWEICHUNG";
    }
    
    document.getElementById('hint-text').innerText = q.hint;
    feedback.classList.remove('hidden');
    feedback.classList.add('fade-in');
}

function nextQuestion() {
    currentIndex++;
    localStorage.setItem(`mod${currentModuleId}_index`, currentIndex);
    localStorage.setItem(`mod${currentModuleId}_percent`, Math.round((currentIndex / currentQuestions.length) * 100));
    showQuestion();
}

function resetModuleProgress(id) {
    localStorage.removeItem(`mod${id}_index`);
    localStorage.removeItem(`mod${id}_percent`);
    location.reload();
}

// --- PRODIGY AI SIDEBAR LOGIK ---
function toggleProdigy() {
    const sidebar = document.getElementById('prodigy-sidebar');
    const overlay = document.getElementById('prodigy-overlay');
    
    const isOpen = !sidebar.classList.contains('translate-x-full');
    
    if (isOpen) {
        sidebar.classList.add('translate-x-full');
        overlay.classList.add('hidden');
        overlay.classList.remove('opacity-100');
    } else {
        sidebar.classList.remove('translate-x-full');
        overlay.classList.remove('hidden');
        setTimeout(() => overlay.classList.add('opacity-100'), 10);
    }
}

async function askProdigy() {
    const responseDiv = document.getElementById('prodigy-response');
    const btn = document.getElementById('prodigy-btn');
    const q = currentQuestions[currentIndex];

    if (!q) return;

    responseDiv.innerHTML = `
        <div class="flex items-center gap-3 text-indigo-400 animate-pulse py-4 font-bold text-xs uppercase tracking-widest">
            <span class="w-3 h-3 bg-indigo-500 rounded-full"></span> Neuronaler Check läuft...
        </div>`;
    
    btn.disabled = true;
    btn.classList.add('opacity-50', 'cursor-not-allowed');

    // DEIN API KEY HIER EINSETZEN
    const API_KEY = "AIzaSyCMgsx_nNdl0J5tK6Fc2wO9ZpDh4TBoaXg"; 
    const PROMPT = `Erkläre als Prodigy, ein medizinischer Tutor: 
    Frage: ${q.question}
    Richtige Antwort: ${q.options[q.answer]}
    Warum ist das korrekt? Antworte kurz, professionell, auf Deutsch, max. 4 Sätze.`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: PROMPT }] }] })
        });

        const data = await response.json();
        const aiText = data.candidates[0].content.parts[0].text;
        
        responseDiv.innerHTML = `
            <div class="fade-in bg-white/5 p-5 rounded-2xl border border-white/10 text-slate-200 shadow-inner">
                ${aiText}
            </div>`;
    } catch (err) {
        responseDiv.innerHTML = `<div class="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">⚠️ Fehler: API Verbindung fehlgeschlagen.</div>`;
    } finally {
        btn.disabled = false;
        btn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
}

// --- TAB SYSTEM ---
function switchTab(tab) {
    const isQuiz = tab === 'quiz';
    document.getElementById('section-inhalt').classList.toggle('hidden', isQuiz);
    document.getElementById('section-quiz').classList.toggle('hidden', !isQuiz);
    
    const btnInhalt = document.getElementById('tab-inhalt');
    const btnQuiz = document.getElementById('tab-quiz');

    const activeClass = "flex-1 py-3 rounded-xl font-bold transition-all duration-300 bg-white text-indigo-600 shadow-sm border border-slate-200/50";
    const inactiveClass = "flex-1 py-3 rounded-xl font-bold transition-all duration-300 text-slate-500 hover:text-slate-700";

    btnInhalt.className = isQuiz ? inactiveClass : activeClass;
    btnQuiz.className = isQuiz ? activeClass : inactiveClass;
}
