/**
 * SLM System Core Engine 2026
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
    const activeModules = [1, 9]; // Definiere, welche Module in die Wertung einfließen

    activeModules.forEach(id => {
        const p = parseInt(localStorage.getItem(`mod${id}_percent`)) || 0;
        totalSum += p;
        
        const bar = document.getElementById(`mod${id}-bar`);
        const text = document.getElementById(`mod${id}-percent`);
        
        if (bar) bar.style.width = p + '%';
        if (text) text.innerText = p + '%';
    });

    // Berechnung des Gesamtschnitts nur basierend auf aktiven Modulen
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
        if (!response.ok) throw new Error(`Modul-Daten (ID: ${id}) nicht erreichbar.`);

        const data = await response.json();
        
        // UI Titel Update
        document.getElementById('mod-title').innerText = data.moduleName || `Modul ${id}`;
        
        // PDFs rendern mit neuem Design
        if (pdfList && data.pdfs) {
            pdfList.innerHTML = "";
            data.pdfs.forEach(fileName => {
                pdfList.innerHTML += `
                    <div class="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                        <div class="flex items-center">
                            <div class="bg-indigo-50 text-indigo-600 p-3 rounded-xl mr-4">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <div>
                                <span class="text-slate-900 font-bold text-sm block">${fileName}</span>
                                <span class="text-slate-400 text-xs uppercase tracking-tighter font-semibold">Dokumentation</span>
                            </div>
                        </div>
                        <a href="docs/m${id}/${fileName}" target="_blank" class="bg-slate-900 text-white px-5 py-2 rounded-xl text-xs font-black hover:bg-indigo-600 transition-colors uppercase tracking-widest">Öffnen</a>
                    </div>`;
            });
        }

        currentQuestions = data.questions || [];
        currentIndex = parseInt(localStorage.getItem(`mod${id}_index`)) || 0;
        document.getElementById('q-total').innerText = currentQuestions.length;
        showQuestion();

    } catch (err) {
        pdfList.innerHTML = `<div class="p-6 bg-red-50 text-red-700 rounded-2xl border border-red-100 font-medium">⚠️ System-Fehler: ${err.message}</div>`;
    }
}

// --- QUIZ LOGIK ---
function showQuestion() {
    const quizSection = document.getElementById('section-quiz');
    if (!quizSection || currentQuestions.length === 0) return;

    if (currentIndex >= currentQuestions.length) {
        quizSection.innerHTML = `
            <div class="text-center py-20 bg-white rounded-[2.5rem] shadow-xl border border-slate-100">
                <div class="text-6xl mb-6">🎯</div>
                <h2 class="text-3xl font-black text-slate-900 mb-2 uppercase">Modul Abgeschlossen</h2>
                <p class="text-slate-500 mb-8 font-medium italic text-sm italic">Alle Daten für Modul ${currentModuleId} erfolgreich verarbeitet.</p>
                <button onclick="resetModuleProgress(${currentModuleId})" class="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black hover:bg-slate-900 transition-all shadow-lg uppercase tracking-widest text-xs">Analyse Neustarten</button>
            </div>`;
        return;
    }

    const q = currentQuestions[currentIndex];
    document.getElementById('q-current').innerText = currentIndex + 1;
    document.getElementById('question-text').innerText = q.question;
    
    const feedback = document.getElementById('feedback');
    feedback.classList.add('hidden');
    feedback.classList.remove('feedback-success', 'feedback-error');
    
    const grid = document.getElementById('options-grid');
    grid.innerHTML = "";
    
    q.options.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.className = "btn-option"; // Nutzt die Klasse aus der style.css
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
        btn.classList.add('correct-answer');
        feedback.classList.add('feedback-success');
        document.getElementById('feedback-text').innerText = "SYSTEM-CHECK: KORREKT";
    } else {
        btn.classList.add('wrong-answer');
        all[q.answer].classList.add('correct-answer');
        feedback.classList.add('feedback-error');
        document.getElementById('feedback-text').innerText = "SYSTEM-CHECK: ABWEICHUNG";
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

// --- TAB WECHSEL LOGIK (Expert Style) ---
function switchTab(tab) {
    const isQuiz = tab === 'quiz';
    document.getElementById('section-inhalt').classList.toggle('hidden', isQuiz);
    document.getElementById('section-quiz').classList.toggle('hidden', !isQuiz);
    
    const btnInhalt = document.getElementById('tab-inhalt');
    const btnQuiz = document.getElementById('tab-quiz');

    if (isQuiz) {
        btnQuiz.className = "flex-1 py-3 rounded-xl font-bold transition-all duration-300 bg-white text-indigo-600 shadow-sm border border-slate-200/50";
        btnInhalt.className = "flex-1 py-3 rounded-xl font-bold transition-all duration-300 text-slate-500 hover:text-slate-700";
    } else {
        btnInhalt.className = "flex-1 py-3 rounded-xl font-bold transition-all duration-300 bg-white text-indigo-600 shadow-sm border border-slate-200/50";
        btnQuiz.className = "flex-1 py-3 rounded-xl font-bold transition-all duration-300 text-slate-500 hover:text-slate-700";
    }
}
