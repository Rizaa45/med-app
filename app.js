// Globale Variablen
let currentModuleId = 1;
let currentMode = 'classic'; 
let quizQueue = [];
let currentQuestionIndex = 0;
let score = 0;
let currentScenario = null;
let quizData = []; // Wird aus JSON geladen

// Beim Laden der Seite
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    currentModuleId = params.get('id') || 1;
    
    // UI Update für Modul 9 (Klausur) oder Standard
    const titleEl = document.getElementById('mod-title');
    if(titleEl) titleEl.innerText = currentModuleId == 9 ? "Klausur-Simulator 2026" : `Modul ${currentModuleId}`;

    loadContent();
});

// --- Daten Laden ---
async function loadContent() {
    try {
        // 1. Lerneinheiten (PDFs/Summaries) laden
        const summaryRes = await fetch(`data/module_${currentModuleId}_summary.json`);
        if(summaryRes.ok) {
            const summaries = await summaryRes.json();
            renderSummaries(summaries);
        }

        const pdfRes = await fetch(`data/module_${currentModuleId}_pdfs.json`);
        if(pdfRes.ok) {
            const pdfs = await pdfRes.json();
            renderPDFs(pdfs);
        }

        // 2. Quiz-Daten vorladen
        const quizRes = await fetch(`data/module_${currentModuleId}_quiz.json`);
        if(quizRes.ok) {
            const data = await quizRes.json();
            // Wir speichern alles, filtern aber erst beim Start des Quiz
            quizData = data.questions || []; 
        }

    } catch (e) {
        console.error("Fehler beim Laden:", e);
    }
}

// --- Render Funktionen (PDF & Summary) ---
function renderSummaries(summaries) {
    const container = document.getElementById('summary-dropdown-container');
    const displayArea = document.getElementById('summary-display-area');
    
    if(!container || !summaries.length) return;

    let html = `
        <select onchange="showSummary(this.value)" class="w-full p-4 rounded-xl border-2 border-slate-200 bg-white font-bold text-slate-600 focus:border-indigo-600 outline-none transition-all cursor-pointer">
            <option value="" disabled selected>Wähle eine Lerneinheit...</option>
    `;
    
    summaries.forEach((s, index) => {
        html += `<option value="${index}">${s.title}</option>`;
    });
    html += `</select>`;
    container.innerHTML = html;

    // Globale Funktion für Zugriff aus HTML
    window.showSummary = (index) => {
        const item = summaries[index];
        displayArea.innerHTML = `
            <div class="summary-container fade-in relative">
                <button onclick="closeSummary()" class="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors">
                    <i class="fas fa-times text-xl"></i>
                </button>
                <div class="summary-content prose max-w-none text-slate-600">
                    <h2><i class="fas fa-book-reader text-indigo-600"></i> ${item.title}</h2>
                    ${item.content}
                </div>
            </div>
        `;
        displayArea.classList.remove('hidden');
    };

    window.closeSummary = () => {
        displayArea.classList.add('hidden');
        displayArea.innerHTML = '';
    }
}

function renderPDFs(pdfs) {
    const list = document.getElementById('pdf-list');
    if(!list) return;
    
    list.innerHTML = pdfs.map(pdf => `
        <div onclick="window.open('${pdf.url}', '_blank')" class="group flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl hover:border-indigo-500 hover:shadow-md cursor-pointer transition-all">
            <div class="flex items-center gap-4">
                <div class="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 group-hover:bg-red-500 group-hover:text-white transition-colors">
                    <i class="fas fa-file-pdf"></i>
                </div>
                <div>
                    <h4 class="font-bold text-slate-700 text-sm group-hover:text-indigo-600 transition-colors">${pdf.title}</h4>
                    <span class="text-[10px] text-slate-400 uppercase tracking-widest font-bold">PDF Dokument</span>
                </div>
            </div>
            <i class="fas fa-external-link-alt text-slate-300 group-hover:text-indigo-500"></i>
        </div>
    `).join('');
}

// --- TAB SYSTEM ---
window.switchTab = (tab) => {
    document.getElementById('section-inhalt').classList.add('hidden');
    document.getElementById('section-quiz').classList.add('hidden');
    
    // Buttons reset
    document.getElementById('tab-inhalt').className = "flex-1 py-3 rounded-xl font-bold transition-all duration-300 text-slate-500 hover:text-slate-700";
    document.getElementById('tab-quiz').className = "flex-1 py-3 rounded-xl font-bold transition-all duration-300 text-slate-500 hover:text-slate-700";

    // Active Tab
    document.getElementById(`section-${tab}`).classList.remove('hidden');
    const activeBtn = document.getElementById(`tab-${tab}`);
    activeBtn.className = "flex-1 py-3 rounded-xl font-bold transition-all duration-300 bg-white text-indigo-600 shadow-sm border border-slate-200/50";
}


// ==========================================
// QUIZ ENGINE (PROFESSIONAL V3.0)
// ==========================================

// 1. Initialisierung mit Regel-Screen
window.initQuiz = (mode) => {
    currentMode = mode;
    
    const startScreen = document.getElementById('quiz-start-screen');
    const selection = document.getElementById('quiz-selection');
    const rulesTitle = document.getElementById('rules-title');
    const rulesContent = document.getElementById('rules-content');
    const rulesIcon = document.getElementById('rules-icon');

    // UI Wechsel
    selection.classList.add('hidden');
    startScreen.classList.remove('hidden');

    // Regeln definieren
    if (mode === 'drill') {
        rulesTitle.innerText = "Der 30er Drill";
        rulesIcon.innerHTML = '<i class="fas fa-dumbbell"></i>';
        rulesContent.innerHTML = `
            <p><i class="fas fa-check-circle text-green-500 mr-2"></i> <b>30 Fragen</b> im Schnellfeuer-Modus.</p>
            <p><i class="fas fa-sync text-orange-500 mr-2"></i> <b>Fehler-Loop:</b> Falsche Antworten werden sofort hinten angestellt und müssen wiederholt werden.</p>
            <p><i class="fas fa-eye text-indigo-500 mr-2"></i> Die richtige Lösung wird bei Fehler sofort angezeigt.</p>
        `;
    } else if (mode === 'simulator') {
        rulesTitle.innerText = "Klausur-Simulator";
        rulesIcon.innerHTML = '<i class="fas fa-graduation-cap"></i>';
        rulesContent.innerHTML = `
            <p><i class="fas fa-file-alt text-orange-500 mr-2"></i> <b>1 Fallstudie</b> + 2 Zusatzfragen.</p>
            <p><i class="fas fa-star text-yellow-500 mr-2"></i> <b>Benotung:</b> Am Ende erhältst du eine Note (1-6).</p>
            <p><i class="fas fa-clock text-slate-400 mr-2"></i> Kein Zeitlimit, aber volle Konzentration.</p>
        `;
    } else {
        // Classic / Cases
        rulesTitle.innerText = mode === 'cases' ? "Fall-Archiv" : "Basis-Wissen";
        rulesIcon.innerHTML = '<i class="fas fa-book"></i>';
        rulesContent.innerHTML = `<p>Standard-Modus zum Lernen ohne Druck.</p>`;
    }
}

// 2. Quiz Starten (nach Regeln)
window.startRealQuiz = () => {
    document.getElementById('quiz-start-screen').classList.add('hidden');
    document.getElementById('quiz-container').classList.remove('hidden');

    quizQueue = [];
    score = 0;
    currentQuestionIndex = 0;

    // Daten filtern je nach Modus
    if (currentMode === 'drill') {
        // 30 Zufällige Fragen, keine Szenarien
        const flatQuestions = quizData.filter(q => !q.scenario);
        // Shuffle und nimm 30 (oder alle wenn weniger)
        quizQueue = flatQuestions.sort(() => 0.5 - Math.random()).slice(0, 30);
    
    } else if (currentMode === 'simulator') {
        // 1 Szenario + 2 Fragen
        const scenarioQuestions = quizData.filter(q => q.scenario);
        const normalQuestions = quizData.filter(q => !q.scenario);
        
        if(scenarioQuestions.length > 0) {
            // Nimm 1 zufälliges Szenario
            const chosenScenario = scenarioQuestions[Math.floor(Math.random() * scenarioQuestions.length)];
            quizQueue.push(chosenScenario);
        }
        // + 2 normale Fragen
        quizQueue.push(...normalQuestions.sort(() => 0.5 - Math.random()).slice(0, 2));
    
    } else if (currentMode === 'cases') {
        quizQueue = quizData.filter(q => q.scenario);
    } else {
        // Classic
        quizQueue = quizData.filter(q => !q.scenario);
    }

    if(quizQueue.length === 0) {
        alert("Keine Fragen für diesen Modus gefunden.");
        exitQuiz();
        return;
    }

    document.getElementById('q-total').innerText = quizQueue.length;
    loadQuestion();
}

// 3. Frage laden
function loadQuestion() {
    // Reset UI
    document.getElementById('feedback').classList.add('hidden');
    document.getElementById('options-grid').innerHTML = '';
    
    if (currentQuestionIndex >= quizQueue.length) {
        endQuiz();
        return;
    }

    const q = quizQueue[currentQuestionIndex];
    
    // Counter Update (kann im Drill > 30 sein, wenn wiederholt wird)
    document.getElementById('q-current').innerText = currentQuestionIndex + 1;
    if(currentMode === 'drill') {
        document.getElementById('q-total').innerText = quizQueue.length; 
    }

    // Szenario Handling (Fix für Null Error)
    updateScenarioDisplay(q);

    // Frage Rendern
    document.getElementById('question-text').innerText = q.question;
    document.getElementById('type-badge').innerText = q.type || "Analyse";

    const grid = document.getElementById('options-grid');
    
    q.options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.className = 'btn-option group';
        // Wir nutzen data-Attribute für die Logik
        btn.dataset.correct = (idx === q.correct); 
        btn.innerHTML = `
            <div class="w-8 h-8 rounded-full border-2 border-slate-200 flex items-center justify-center font-bold text-slate-400 group-hover:border-indigo-500 group-hover:text-indigo-500 transition-colors shrink-0">
                ${String.fromCharCode(65 + idx)}
            </div>
            <span class="text-sm">${opt}</span>
        `;
        btn.onclick = () => checkAnswer(btn, q);
        grid.appendChild(btn);
    });
}

// Helper: Szenario sicher anzeigen/verstecken
function updateScenarioDisplay(q) {
    const display = document.getElementById('scenario-display');
    const textEl = document.getElementById('scenario-text');
    const badge = document.getElementById('setting-badge');

    // Sicherheits-Check: Existieren die Elemente?
    if(!display || !textEl) return;

    if (q.scenario) {
        display.classList.remove('hidden');
        display.classList.add('fade-in'); // Animation
        textEl.innerText = q.scenario;
        if(badge) badge.innerText = q.setting || "Setting";
        currentScenario = q.scenario; // Für KI Kontext
    } else {
        display.classList.add('hidden');
        currentScenario = null;
    }
}

// 4. Antwort prüfen (Intelligent Logic)
function checkAnswer(btn, questionData) {
    const isCorrect = (btn.dataset.correct === "true");
    const grid = document.getElementById('options-grid');
    const allButtons = grid.querySelectorAll('button');

    // Alle Buttons deaktivieren
    allButtons.forEach(b => b.disabled = true);

    // VISUALS:
    if (isCorrect) {
        // Richtig geklickt -> Grün
        btn.classList.add('correct-answer');
        score++;
        showFeedback(true, questionData);
    } else {
        // Falsch geklickt -> Rot
        btn.classList.add('wrong-answer');
        
        // AUTOMATISCH RICHTIGE ANTWORT ZEIGEN (User Request)
        allButtons.forEach(b => {
            if (b.dataset.correct === "true") {
                b.classList.add('correct-answer'); // Wird grün
            }
        });

        // DRILL LOGIC: Frage wiederholen
        if (currentMode === 'drill') {
            // Frage klonen und hinten anhängen
            quizQueue.push(questionData);
            document.getElementById('q-total').innerText = quizQueue.length; // Update Counter
            showFeedback(false, questionData, true); // True flag für "Wird wiederholt"
            return;
        }
        
        showFeedback(false, questionData);
    }
}

function showFeedback(isSuccess, data, isRepeat = false) {
    const fb = document.getElementById('feedback');
    const title = document.getElementById('feedback-text');
    const hint = document.getElementById('hint-text');

    fb.classList.remove('hidden', 'feedback-success', 'feedback-error');
    fb.classList.add('fade-in');

    if (isSuccess) {
        fb.classList.add('feedback-success');
        title.innerText = "Stark! Das ist korrekt.";
        title.className = "font-black text-lg uppercase mb-1 text-green-700";
        hint.innerText = data.explanation || "Sehr gut analysiert.";
    } else {
        fb.classList.add('feedback-error');
        title.className = "font-black text-lg uppercase mb-1 text-red-700";
        
        if(isRepeat) {
            title.innerText = "Falsch - Frage wird wiederholt!";
            hint.innerText = "Merke dir die Lösung (Grün). Du siehst diese Frage gleich nochmal.";
        } else {
            title.innerText = "Leider falsch.";
            hint.innerText = data.explanation || "Schau dir die grüne Lösung genau an.";
        }
    }
}

window.nextQuestion = () => {
    currentQuestionIndex++;
    loadQuestion();
}

window.exitQuiz = () => {
    document.getElementById('quiz-container').classList.add('hidden');
    document.getElementById('quiz-start-screen').classList.add('hidden');
    document.getElementById('quiz-selection').classList.remove('hidden');
}

function endQuiz() {
    const container = document.getElementById('question-text').parentElement;
    
    let resultHTML = '';
    
    if (currentMode === 'simulator') {
        // Notenschlüssel (Simuliert)
        // 3 Fragen: 3 Richtig = Note 1, 2 = Note 3, 1 = Note 5, 0 = Note 6
        let grade = 6;
        if (score === 3) grade = 1;
        if (score === 2) grade = 3;
        if (score === 1) grade = 5;

        resultHTML = `
            <div class="text-center py-10">
                <h2 class="text-4xl font-black text-slate-900 mb-4">Ergebnis</h2>
                <div class="inline-block p-8 rounded-full border-4 border-slate-900 mb-6">
                    <span class="text-6xl font-black text-indigo-600">Note ${grade}</span>
                </div>
                <p class="text-slate-500 mb-8">${score} von 3 Punkten erreicht.</p>
                <button onclick="exitQuiz()" class="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold">Zurück zum Dashboard</button>
            </div>
        `;
    } else {
        // Standard Ende für Drill etc.
        resultHTML = `
            <div class="text-center py-10">
                <div class="text-6xl mb-4">🎉</div>
                <h2 class="text-2xl font-black text-slate-900 mb-2">Modul Abgeschlossen!</h2>
                <p class="text-slate-500 mb-8">Du hast alle Fragen erfolgreich beantwortet.</p>
                <button onclick="exitQuiz()" class="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold">Menü</button>
            </div>
        `;
    }

    container.innerHTML = resultHTML;
}

// --- PRODIGY AI SIDEBAR ---
window.toggleProdigy = () => {
    const sidebar = document.getElementById('prodigy-sidebar');
    const overlay = document.getElementById('prodigy-overlay');
    
    if (sidebar.classList.contains('translate-x-full')) {
        // Öffnen
        sidebar.classList.remove('translate-x-full');
        overlay.classList.remove('hidden');
        setTimeout(() => overlay.classList.remove('opacity-0'), 10);
    } else {
        // Schließen
        sidebar.classList.add('translate-x-full');
        overlay.classList.add('opacity-0');
        setTimeout(() => overlay.classList.add('hidden'), 500);
    }
}

window.askProdigy = async () => {
    const input = document.getElementById('prodigy-input');
    const chatBox = document.getElementById('prodigy-chat-box');
    const text = input.value.trim();
    
    if(!text) return;

    // User Message
    chatBox.innerHTML += `<div class="chat-msg msg-user fade-in">${text}</div>`;
    input.value = '';
    chatBox.scrollTop = chatBox.scrollHeight;

    // Fake AI Loading
    const loadingId = 'loading-' + Date.now();
    chatBox.innerHTML += `<div id="${loadingId}" class="chat-msg msg-ai fade-in italic text-slate-400">Prodigy tippt...</div>`;
    chatBox.scrollTop = chatBox.scrollHeight;

    // Simulation Antwort
    setTimeout(() => {
        document.getElementById(loadingId).remove();
        let answer = "Ich bin bereit, dir beim Lernen zu helfen.";
        
        if (text.toLowerCase().includes('lösung') || text.toLowerCase().includes('antwort')) {
            answer = "Versuch es erst selbst! Achte auf Schlüsselwörter in der Fragestellung.";
            if(currentScenario) {
                answer += " Im aktuellen Fall geht es speziell um: " + currentScenario.substring(0, 50) + "...";
            }
        } else if (text.toLowerCase().includes('hallo')) {
            answer = "Hi! Bereit für die nächste Runde?";
        }

        chatBox.innerHTML += `<div class="chat-msg msg-ai fade-in"><b>Prodigy:</b> ${answer}</div>`;
        chatBox.scrollTop = chatBox.scrollHeight;
    }, 1500);
}
