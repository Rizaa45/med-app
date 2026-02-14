// ==========================================
// GLOBALE VARIABLEN & STATE
// ==========================================
let currentModuleId = 1;
let currentMode = 'classic'; 
let quizQueue = [];
let currentQuestionIndex = 0;
let score = 0;
let currentScenario = null;
let quizData = []; 
let allSummaries = []; // Speicher für die 6 JSON-Dateien

// Beim Laden der Seite
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    currentModuleId = params.get('id') || 9; // Default auf 9 für deine Tests
    
    // UI Update für Titel
    const titleEl = document.getElementById('mod-title');
    if(titleEl) {
        titleEl.innerText = currentModuleId == 9 ? "Klausur-Simulator 2026" : `Modul ${currentModuleId}`;
    }

    loadContent();
});

// ==========================================
// DATEN-LOADER (ADAPTIERT FÜR MODUL 9)
// ==========================================
async function loadContent() {
    try {
        // 1. ZUSAMMENFASSUNGEN LADEN (Die 6 spezifischen Dateien)
        if (currentModuleId == 9) {
            const summaryFiles = [
                'summaries_mod9.json',
                'summaries2_mod9.json',
                'summaries3_mod9.json',
                'summaries4_mod9.json',
                'summaries5_mod9.json',
                'summaries6_mod9.json'
            ];

            for (const file of summaryFiles) {
                try {
                    const res = await fetch(`data/${file}`);
                    if (res.ok) {
                        const data = await res.json();
                        allSummaries.push(data);
                    }
                } catch (e) { console.warn(`Konnte ${file} nicht laden.`); }
            }
            renderSummaryDropdown(allSummaries);
            
            // Quiz-Daten für Modul 9 laden
            const qRes = await fetch('data/klausur27_questions.json');
            const cRes = await fetch('data/klausur27_cases.json');
            
            let questions = qRes.ok ? await qRes.json() : [];
            let cases = cRes.ok ? await cRes.json() : [];
            
            // Kombiniere für die Engine (Simulator nutzt Cases, Drill nutzt Questions)
            quizData = [...questions, ...cases];

        } else {
            // Standard-Modul Fallback
            const res = await fetch(`data/module_${currentModuleId}_summary.json`);
            if(res.ok) {
                const data = await res.json();
                allSummaries = Array.isArray(data) ? data : [data];
                renderSummaryDropdown(allSummaries);
            }
            const quizRes = await fetch(`data/module_${currentModuleId}_quiz.json`);
            if(quizRes.ok) {
                const data = await quizRes.json();
                quizData = data.questions || [];
            }
        }

        // 2. PDFs LADEN (Aus docs/m9/)
        renderPDFList();

    } catch (e) {
        console.error("Kritischer Fehler beim Laden der Daten:", e);
    }
}

// ==========================================
// RENDER FUNKTIONEN (INHALT)
// ==========================================

function renderSummaryDropdown(summaries) {
    const container = document.getElementById('summary-dropdown-container');
    const displayArea = document.getElementById('summary-display-area');
    if(!container || !summaries.length) return;

    let html = `
        <select onchange="showSummary(this.value)" class="w-full p-4 rounded-xl border-2 border-slate-200 bg-white font-bold text-slate-600 focus:border-indigo-600 outline-none transition-all cursor-pointer shadow-sm">
            <option value="" disabled selected>📂 Wähle eine Lerneinheit (1-6)...</option>
    `;
    
    summaries.forEach((s, index) => {
        // Nutze Titel aus JSON oder generiere Fallback
        const title = s.title || `Themenblock ${index + 1}`;
        html += `<option value="${index}">${title}</option>`;
    });
    html += `</select>`;
    container.innerHTML = html;

    window.showSummary = (index) => {
        const item = summaries[index];
        displayArea.innerHTML = `
            <div class="summary-container fade-in relative bg-white p-8 rounded-[2rem] border border-slate-200 shadow-xl mb-8">
                <button onclick="closeSummary()" class="absolute top-6 right-6 text-slate-300 hover:text-red-500 transition-colors">
                    <i class="fas fa-times-circle text-2xl"></i>
                </button>
                <div class="prose max-w-none text-slate-600">
                    <h2 class="text-2xl font-black text-indigo-900 uppercase tracking-tight mb-4">
                        <i class="fas fa-book-reader mr-2"></i> ${item.title || 'Zusammenfassung'}
                    </h2>
                    <div class="text-sm leading-relaxed">${item.content}</div>
                </div>
            </div>
        `;
        displayArea.classList.remove('hidden');
        displayArea.scrollIntoView({ behavior: 'smooth' });
    };

    window.closeSummary = () => {
        displayArea.classList.add('hidden');
    };
}

function renderPDFList() {
    const list = document.getElementById('pdf-list');
    if(!list) return;

    // Manuelle Definition der PDFs für Modul 9 (da kein JSON vorhanden laut Screenshot)
    const pdfs = [
        { title: "Prüfungsskript Modul 9", url: "docs/m9/skript_haupt.pdf" },
        { title: "Fallbeispiel-Sammlung", url: "docs/m9/fallbeispiele.pdf" },
        { title: "Zusatzmaterial Recht", url: "docs/m9/recht_extra.pdf" }
    ];
    
    list.innerHTML = pdfs.map(pdf => `
        <div onclick="window.open('${pdf.url}', '_blank')" class="group flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl hover:border-red-500 hover:shadow-md cursor-pointer transition-all">
            <div class="flex items-center gap-4">
                <div class="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center group-hover:bg-red-500 group-hover:text-white transition-all">
                    <i class="fas fa-file-pdf"></i>
                </div>
                <div>
                    <h4 class="font-bold text-slate-700 text-sm group-hover:text-indigo-600 transition-colors">${pdf.title}</h4>
                    <span class="text-[10px] text-slate-400 font-black uppercase tracking-widest">Öffnen</span>
                </div>
            </div>
            <i class="fas fa-external-link-alt text-slate-200 group-hover:text-red-500 transition-colors"></i>
        </div>
    `).join('');
}

// ==========================================
// QUIZ ENGINE (PRO V3)
// ==========================================

window.initQuiz = (mode) => {
    currentMode = mode;
    document.getElementById('quiz-selection').classList.add('hidden');
    document.getElementById('quiz-start-screen').classList.remove('hidden');

    const icon = document.getElementById('rules-icon');
    const title = document.getElementById('rules-title');
    const content = document.getElementById('rules-content');

    if (mode === 'drill') {
        icon.innerHTML = '<i class="fas fa-dumbbell text-indigo-600"></i>';
        title.innerText = "30er Drill";
        content.innerHTML = `
            <p>• <b>30 Fragen</b> im Zufallsmodus.</p>
            <p>• <b>Sofort-Check:</b> Richtige Lösung erscheint bei Fehlern.</p>
            <p>• <b>Repeat:</b> Falsche Fragen kommen am Ende wieder.</p>
        `;
    } else {
        icon.innerHTML = '<i class="fas fa-graduation-cap text-orange-500"></i>';
        title.innerText = "Klausur-Simulator";
        content.innerHTML = `
            <p>• <b>1 Komplexer Fall</b> + 2 Transferfragen.</p>
            <p>• <b>Bewertung:</b> KI-gestützte Notenvergabe (1-6).</p>
            <p>• Simulation der echten Prüfungssituation.</p>
        `;
    }
};

window.startRealQuiz = () => {
    document.getElementById('quiz-start-screen').classList.add('hidden');
    document.getElementById('quiz-container').classList.remove('hidden');

    quizQueue = [];
    score = 0;
    currentQuestionIndex = 0;

    if (currentMode === 'drill') {
        const questions = quizData.filter(q => !q.scenario);
        quizQueue = questions.sort(() => 0.5 - Math.random()).slice(0, 30);
    } else {
        const scenarios = quizData.filter(q => q.scenario);
        const questions = quizData.filter(q => !q.scenario);
        if(scenarios.length) quizQueue.push(scenarios[Math.floor(Math.random() * scenarios.length)]);
        quizQueue.push(...questions.sort(() => 0.5 - Math.random()).slice(0, 2));
    }

    if(!quizQueue.length) { alert("Keine Daten gefunden!"); exitQuiz(); return; }
    loadQuestion();
};

function loadQuestion() {
    const q = quizQueue[currentQuestionIndex];
    if (!q) { endQuiz(); return; }

    document.getElementById('feedback').classList.add('hidden');
    document.getElementById('options-grid').innerHTML = '';
    document.getElementById('q-current').innerText = currentQuestionIndex + 1;
    document.getElementById('q-total').innerText = quizQueue.length;

    // Szenario Display
    const scenarioBox = document.getElementById('scenario-display');
    if (q.scenario) {
        scenarioBox.classList.remove('hidden');
        document.getElementById('scenario-text').innerText = q.scenario;
        currentScenario = q.scenario;
    } else {
        scenarioBox.classList.add('hidden');
    }

    document.getElementById('question-text').innerText = q.question;
    const grid = document.getElementById('options-grid');

    q.options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.className = 'btn-option group bg-white border-2 border-slate-100 p-4 rounded-xl flex items-center gap-4 hover:border-indigo-500 transition-all text-left';
        btn.dataset.correct = (idx === q.correct);
        btn.innerHTML = `
            <div class="w-8 h-8 rounded-full border-2 border-slate-200 flex items-center justify-center font-bold text-slate-400 group-hover:text-indigo-600 shrink-0">
                ${String.fromCharCode(65 + idx)}
            </div>
            <span class="text-sm font-semibold text-slate-700">${opt}</span>
        `;
        btn.onclick = () => {
            const all = grid.querySelectorAll('button');
            all.forEach(b => b.disabled = true);
            const isCorrect = (btn.dataset.correct === "true");

            if (isCorrect) {
                btn.classList.add('correct-answer'); // CSS Klasse für Grün
                score++;
                showFeedback(true, q);
            } else {
                btn.classList.add('wrong-answer'); // CSS Klasse für Rot
                all.forEach(b => { if(b.dataset.correct === "true") b.classList.add('correct-answer'); });
                if (currentMode === 'drill') quizQueue.push(q);
                showFeedback(false, q, (currentMode === 'drill'));
            }
        };
        grid.appendChild(btn);
    });
}

function showFeedback(isSuccess, data, isRepeat = false) {
    const fb = document.getElementById('feedback');
    const title = document.getElementById('feedback-text');
    const hint = document.getElementById('hint-text');

    fb.classList.remove('hidden', 'bg-green-50', 'bg-red-50', 'border-green-500', 'border-red-500');
    fb.classList.add('block', isSuccess ? 'bg-green-50' : 'bg-red-50', isSuccess ? 'border-green-500' : 'border-red-500');

    title.innerText = isSuccess ? "Richtig!" : (isRepeat ? "Falsch - Wiederholung folgt" : "Leider Falsch");
    title.className = `font-black text-lg uppercase mb-1 ${isSuccess ? 'text-green-700' : 'text-red-700'}`;
    hint.innerText = data.explanation || "Analysiere die korrekte Antwort oben.";
}

window.nextQuestion = () => {
    currentQuestionIndex++;
    loadQuestion();
};

function endQuiz() {
    const container = document.getElementById('quiz-container');
    let grade = 6;
    if (score === quizQueue.length) grade = 1;
    else if (score >= quizQueue.length * 0.7) grade = 3;
    else if (score >= quizQueue.length * 0.5) grade = 4;

    container.innerHTML = `
        <div class="text-center py-16 bg-white rounded-[3rem] shadow-2xl border border-slate-100 fade-in">
            <div class="w-24 h-24 bg-slate-900 text-white rounded-full flex flex-col items-center justify-center mx-auto mb-6">
                <span class="text-[10px] font-black uppercase opacity-50">Note</span>
                <span class="text-4xl font-black">${currentMode === 'simulator' ? grade : '✔'}</span>
            </div>
            <h2 class="text-2xl font-black mb-2">Training beendet</h2>
            <p class="text-slate-500 mb-8">Du hast ${score} von ${quizQueue.length} Punkten erreicht.</p>
            <button onclick="location.reload()" class="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg">Dashboard</button>
        </div>
    `;
}

// ==========================================
// TABS & PRODIGY AI
// ==========================================

window.switchTab = (tab) => {
    document.getElementById('section-inhalt').classList.toggle('hidden', tab !== 'inhalt');
    document.getElementById('section-quiz').classList.toggle('hidden', tab !== 'quiz');
    
    document.getElementById('tab-inhalt').className = tab === 'inhalt' ? "flex-1 py-3 rounded-xl font-bold bg-white text-indigo-600 shadow-sm border" : "flex-1 py-3 text-slate-500 font-bold";
    document.getElementById('tab-quiz').className = tab === 'quiz' ? "flex-1 py-3 rounded-xl font-bold bg-white text-indigo-600 shadow-sm border" : "flex-1 py-3 text-slate-500 font-bold";
};

window.toggleProdigy = () => {
    const sb = document.getElementById('prodigy-sidebar');
    const ov = document.getElementById('prodigy-overlay');
    sb.classList.toggle('translate-x-full');
    ov.classList.toggle('hidden');
    setTimeout(() => ov.classList.toggle('opacity-0'), 10);
};

window.askProdigy = async () => {
    const input = document.getElementById('prodigy-input');
    const chatBox = document.getElementById('prodigy-chat-box');
    const text = input.value.trim();
    if(!text) return;

    chatBox.innerHTML += `<div class="p-3 bg-indigo-50 rounded-2xl mb-2 text-sm text-indigo-900 font-bold self-end ml-10">Du: ${text}</div>`;
    input.value = '';

    setTimeout(() => {
        let response = "Ich analysiere den Stoff... Basierend auf Modul 9 empfehle ich, den Fokus auf die Differenzialdiagnostik im Fallbeispiel zu legen.";
        chatBox.innerHTML += `<div class="p-3 bg-white border border-slate-200 rounded-2xl mb-2 text-sm text-slate-600 shadow-sm mr-10"><b>Prodigy:</b> ${response}</div>`;
        chatBox.scrollTop = chatBox.scrollHeight;
    }, 1000);
};

window.exitQuiz = () => location.reload();
