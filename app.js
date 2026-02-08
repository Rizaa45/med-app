/**
 * APP LOGIC - Med-Lernportal 2026
 */

// Globale Variablen für den Quiz-Status
let currentQuestions = [];
let currentIndex = 0;
let currentModuleId = 1;

window.onload = () => {
    // 1. Prüfen, welche Seite gerade offen ist
    const dashboardElement = document.getElementById('total-percent');
    const moduleElement = document.getElementById('mod-title');

    if (dashboardElement) {
        // Wir sind auf der index.html
        initDashboard();
    } else if (moduleElement) {
        // Wir sind auf der module.html
        const params = new URLSearchParams(window.location.search);
        currentModuleId = params.get('id') || 1;
        loadModuleData(currentModuleId);
    }
};

/**
 * DASHBOARD LOGIK (index.html)
 * Berechnet den Fortschritt aller 9 Module
 */
function initDashboard() {
    let totalPercentSum = 0;
    const totalModules = 9;

    for (let i = 1; i <= totalModules; i++) {
        // Fortschritt aus LocalStorage holen (Standard 0)
        const p = parseInt(localStorage.getItem(`mod${i}_percent`)) || 0;
        totalPercentSum += p;

        // UI für das einzelne Modul aktualisieren (Balken und Text)
        const bar = document.getElementById(`mod${i}-bar`);
        const text = document.getElementById(`mod${i}-percent`);
        
        if (bar) bar.style.width = p + '%';
        if (text) text.innerText = p + '%';
    }

    // Gesamtfortschritt berechnen (Durchschnitt)
    const avgPercent = Math.round(totalPercentSum / totalModules);
    const totalBar = document.getElementById('total-progress-bar');
    const totalText = document.getElementById('total-percent');

    if (totalBar) totalBar.style.width = avgPercent + '%';
    if (totalText) totalText.innerText = avgPercent + '%';
}

/**
 * MODUL-DATEN LADEN (module.html)
 */
async function loadModuleData(id) {
    // Wir nutzen einen relativen Pfad ohne führenden Schrägstrich
    const jsonPath = `data/mod_${id}.json`;
    
    try {
        // 'cache: "no-store"' hilft, wenn du Änderungen hochlädst, damit der Browser nicht die alte Version zeigt
        const response = await fetch(jsonPath, { cache: "no-store" });
        
        if (!response.ok) {
            throw new Error(`Server antwortet mit Status ${response.status}`);
        }
        
        const data = await response.json();
        
        // Titel setzen
        document.getElementById('mod-title').innerText = data.moduleName;
        
        // --- PDF LISTE ---
        const pdfList = document.getElementById('pdf-list');
        if (pdfList && data.pdfs) {
            pdfList.innerHTML = "";
            data.pdfs.forEach(fileName => {
                // Pfad zu den PDFs: docs/m1/dateiname.pdf
                const pdfPath = `docs/m${id}/${fileName}`;
                pdfList.innerHTML += `
                    <div class="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between shadow-sm mb-3">
                        <div class="flex items-center">
                            <div class="bg-red-50 text-red-600 p-2 rounded mr-3">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <span class="text-slate-700 font-semibold text-sm">${fileName}</span>
                        </div>
                        <a href="${pdfPath}" target="_blank" class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold">Ansehen</a>
                    </div>`;
            });
        }

        currentQuestions = data.questions || [];
        currentIndex = parseInt(localStorage.getItem(`mod${id}_index`)) || 0;
        document.getElementById('q-total').innerText = currentQuestions.length;
        showQuestion();

    } catch (error) {
        console.error("Detaillierter Fehler:", error);
        document.getElementById('section-inhalt').innerHTML = `
            <div class="p-4 bg-red-50 text-red-700 rounded-xl">
                <strong>Ladefehler!</strong><br>
                Die Datei <code>${jsonPath}</code> konnte nicht geladen werden.<br>
                <small>Grund: ${error.message}</small>
            </div>`;
    }
}

        // --- QUIZ SETUP ---
        currentQuestions = data.questions || [];
        currentIndex = parseInt(localStorage.getItem(`mod${id}_index`)) || 0;
        
        // Gesamtzahl der Fragen im UI anzeigen
        const totalSpan = document.getElementById('q-total');
        if (totalSpan) totalSpan.innerText = currentQuestions.length;
        
        showQuestion();

    } catch (error) {
        console.error("Ladefehler:", error);
        const container = document.getElementById('section-inhalt');
        if(container) {
            container.innerHTML = `
                <div class="p-6 bg-red-50 border border-red-200 text-red-700 rounded-2xl">
                    <h3 class="font-bold mb-2">Fehler beim Laden</h3>
                    <p class="text-sm">Die Datei <strong>${jsonPath}</strong> konnte nicht geladen werden.</p>
                    <p class="text-xs mt-2 italic">Hinweis: Nutze einen lokalen Server (z.B. VS Code Live Server).</p>
                </div>`;
        }
    }
}

/**
 * ZEIGT AKTUELLE FRAGE AN
 */
function showQuestion() {
    const quizContainer = document.getElementById('section-quiz');
    if (!quizContainer || currentQuestions.length === 0) return;

    // Prüfen, ob Modul beendet
    if (currentIndex >= currentQuestions.length) {
        quizContainer.innerHTML = `
            <div class="text-center py-12 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <div class="text-5xl mb-4">🏆</div>
                <h2 class="text-2xl font-bold text-slate-800 mb-2">Modul abgeschlossen!</h2>
                <p class="text-slate-500 mb-6">Du hast alle Fragen erfolgreich bearbeitet.</p>
                <button onclick="resetModuleProgress(${currentModuleId})" class="bg-blue-600 text-white px-8 py-3 rounded-full font-bold hover:bg-blue-700 transition-all shadow-lg">
                    Fortschritt zurücksetzen
                </button>
            </div>`;
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
        btn.className = "btn-option w-full text-left p-4 rounded-xl border-2 border-slate-100 hover:border-blue-400 hover:bg-blue-50 transition-all font-medium text-slate-700 mb-3";
        btn.innerText = opt;
        btn.onclick = () => checkAnswer(i, btn);
        grid.appendChild(btn);
    });
}

/**
 * PRÜFT ANTWORT
 */
function checkAnswer(selectedIndex, clickedBtn) {
    const q = currentQuestions[currentIndex];
    const allBtns = document.querySelectorAll('.btn-option');
    
    allBtns.forEach(btn => btn.disabled = true);

    const feedbackDiv = document.getElementById('feedback');
    const feedbackText = document.getElementById('feedback-text');
    const hintText = document.getElementById('hint-text');

    if (selectedIndex === q.answer) {
        clickedBtn.classList.add('border-green-500', 'bg-green-50', 'text-green-700');
        feedbackText.innerText = "Richtig!";
    } else {
        clickedBtn.classList.add('border-red-500', 'bg-red-50', 'text-red-700');
        allBtns[q.answer].classList.add('border-green-500', 'bg-green-50', 'text-green-700');
        feedbackText.innerText = "Nicht korrekt.";
    }

    hintText.innerText = q.hint;
    feedbackDiv.classList.remove('hidden');
}

/**
 * NÄCHSTE FRAGE & SPEICHERN
 */
function nextQuestion() {
    currentIndex++;
    localStorage.setItem(`mod${currentModuleId}_index`, currentIndex);
    
    // Prozentsatz berechnen und speichern
    const progress = Math.round((currentIndex / currentQuestions.length) * 100);
    localStorage.setItem(`mod${currentModuleId}_percent`, progress);
    
    showQuestion();
}

/**
 * RESET FUNKTION
 */
function resetModuleProgress(id) {
    if(confirm("Fortschritt für dieses Modul wirklich löschen?")) {
        localStorage.setItem(`mod${id}_index`, 0);
        localStorage.setItem(`mod${id}_percent`, 0);
        location.reload();
    }
}

/**
 * TAB WECHSEL
 */
function switchTab(tab) {
    const isQuiz = (tab === 'quiz');
    document.getElementById('section-inhalt').classList.toggle('hidden', isQuiz);
    document.getElementById('section-quiz').classList.toggle('hidden', !isQuiz);
    
    const tabInhalt = document.getElementById('tab-inhalt');
    const tabQuiz = document.getElementById('tab-quiz');
    
    if (isQuiz) {
        tabQuiz.className = "flex-1 py-2 rounded-lg font-medium bg-blue-600 text-white shadow-sm";
        tabInhalt.className = "flex-1 py-2 rounded-lg font-medium text-slate-500 hover:bg-slate-100";
    } else {
        tabInhalt.className = "flex-1 py-2 rounded-lg font-medium bg-blue-600 text-white shadow-sm";
        tabQuiz.className = "flex-1 py-2 rounded-lg font-medium text-slate-500 hover:bg-slate-100";
    }

}
