/**
 * MED-APP 2026 - ULTIMATE REPAIR VERSION
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
        // Kleiner Fix: Sicherstellen, dass die ID eine Zahl/Sauberer String ist
        loadModuleData(currentModuleId);
    }
};

// --- DASHBOARD ---
function initDashboard() {
    let totalSum = 0;
    for (let i = 1; i <= 9; i++) {
        const p = parseInt(localStorage.getItem(`mod${i}_percent`)) || 0;
        totalSum += p;
        const bar = document.getElementById(`mod${i}-bar`);
        const text = document.getElementById(`mod${i}-percent`);
        if (bar) bar.style.width = p + '%';
        if (text) text.innerText = p + '%';
    }
    const avg = Math.round(totalSum / 9);
    const totalBar = document.getElementById('total-progress-bar');
    const totalText = document.getElementById('total-percent');
    if (totalBar) totalBar.style.width = avg + '%';
    if (totalText) totalText.innerText = avg + '%';
}

// --- MODUL LADEN ---
async function loadModuleData(id) {
    // WICHTIG: Pfad ohne führenden Schrägstrich für GitHub Pages
    const jsonPath = `data/mod_${id}.json`;
    const errorContainer = document.getElementById('section-inhalt');

    try {
        const response = await fetch(jsonPath);
        
        if (!response.ok) {
            throw new Error(`Datei nicht gefunden (HTTP ${response.status}). Prüfe, ob 'data/mod_${id}.json' wirklich so auf GitHub existiert.`);
        }

        const data = await response.json();
        
        // UI befüllen
        document.getElementById('mod-title').innerText = data.moduleName || `Modul ${id}`;
        
        const pdfList = document.getElementById('pdf-list');
        if (pdfList && data.pdfs) {
            pdfList.innerHTML = "";
            data.pdfs.forEach(fileName => {
                pdfList.innerHTML += `
                    <div class="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between shadow-sm mb-3">
                        <div class="flex items-center">
                            <div class="bg-red-50 text-red-600 p-2 rounded mr-3">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                            </div>
                            <span class="text-slate-700 font-semibold text-sm">${fileName}</span>
                        </div>
                        <a href="docs/m${id}/${fileName}" target="_blank" class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold">Öffnen</a>
                    </div>`;
            });
        }

        currentQuestions = data.questions || [];
        currentIndex = parseInt(localStorage.getItem(`mod${id}_index`)) || 0;
        document.getElementById('q-total').innerText = currentQuestions.length;
        showQuestion();

    } catch (err) {
        console.error("Fehler-Details:", err);
        errorContainer.innerHTML = `
            <div class="p-6 bg-red-50 border-2 border-red-200 text-red-700 rounded-2xl">
                <h3 class="font-bold text-lg mb-2">❌ Ladefehler</h3>
                <p class="mb-4">Details: ${err.message}</p>
                <div class="text-xs bg-white p-3 rounded border border-red-100 font-mono">
                    1. Check: Heißt die Datei wirklich <b>mod_${id}.json</b> (kleingeschrieben)?<br>
                    2. Check: Kopiere den Inhalt der JSON in einen "JSON Validator" im Netz.<br>
                    3. Check: Hast du die Änderungen auf GitHub "committed"?
                </div>
            </div>`;
    }
}

// --- QUIZ FUNKTIONEN ---
function showQuestion() {
    const quizContainer = document.getElementById('section-quiz');
    if (!quizContainer || currentQuestions.length === 0) return;

    if (currentIndex >= currentQuestions.length) {
        quizContainer.innerHTML = `<div class="text-center py-10"><h2 class="text-2xl font-bold mb-4">🏆 Modul beendet!</h2><button onclick="resetModuleProgress(${currentModuleId})" class="bg-blue-600 text-white px-6 py-2 rounded-full">Wiederholen</button></div>`;
        return;
    }

    const q = currentQuestions[currentIndex];
    document.getElementById('q-current').innerText = currentIndex + 1;
    document.getElementById('question-text').innerText = q.question;
    document.getElementById('feedback').classList.add('hidden');
    
    const grid = document.getElementById('options-grid');
    grid.innerHTML = "";
    q.options.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.className = "btn-option w-full text-left p-4 rounded-xl border-2 border-slate-100 hover:border-blue-400 mb-3 transition-all";
        btn.innerText = opt;
        btn.onclick = () => checkAnswer(i, btn);
        grid.appendChild(btn);
    });
}

function checkAnswer(idx, btn) {
    const q = currentQuestions[currentIndex];
    const all = document.querySelectorAll('.btn-option');
    all.forEach(b => b.disabled = true);
    
    if (idx === q.answer) {
        btn.classList.add('border-green-500', 'bg-green-50');
        document.getElementById('feedback-text').innerText = "Richtig!";
    } else {
        btn.classList.add('border-red-500', 'bg-red-50');
        all[q.answer].classList.add('border-green-500', 'bg-green-50');
        document.getElementById('feedback-text').innerText = "Falsch!";
    }
    document.getElementById('hint-text').innerText = q.hint;
    document.getElementById('feedback').classList.remove('hidden');
}

function nextQuestion() {
    currentIndex++;
    localStorage.setItem(`mod${currentModuleId}_index`, currentIndex);
    localStorage.setItem(`mod${currentModuleId}_percent`, Math.round((currentIndex/currentQuestions.length)*100));
    showQuestion();
}

function resetModuleProgress(id) {
    localStorage.removeItem(`mod${id}_index`);
    localStorage.removeItem(`mod${id}_percent`);
    location.reload();
}

function switchTab(tab) {
    const isQuiz = tab === 'quiz';
    document.getElementById('section-inhalt').classList.toggle('hidden', isQuiz);
    document.getElementById('section-quiz').classList.toggle('hidden', !isQuiz);
    document.getElementById('tab-inhalt').className = isQuiz ? "flex-1 py-2 text-slate-500" : "flex-1 py-2 bg-blue-600 text-white rounded-lg";
    document.getElementById('tab-quiz').className = isQuiz ? "flex-1 py-2 bg-blue-600 text-white rounded-lg" : "flex-1 py-2 text-slate-500";
}
