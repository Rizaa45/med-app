/**
 * SLM System – Modul 2 Dedicated Engine v5.4
 */

let currentQuestions = [];
let currentIndex = 0;
let currentModuleId = 2;
let currentMode = 'classic'; 
let activeCase = null;
let userAnswersLog = []; 
let currentSummaryContext = "";
let pinnedQuestions = JSON.parse(localStorage.getItem('slm_pinned_v1')) || [];

const TOTAL_UNITS = 6;
const dataFolder = 'data/';

document.addEventListener('DOMContentLoaded', () => {
    loadModuleTitle();
    loadAllSummaries();
});

async function loadModuleTitle() {
    try {
        const resp = await fetch(`${dataFolder}mod_2.json`);
        const data = await resp.json();
        document.getElementById('mod-title').innerText = data.moduleName || "Modul 2: Notfallmanagement & Erste Hilfe";
    } catch (e) {}
}

async function loadAllSummaries() {
    const container = document.getElementById('summary-dropdown-container');
    let loaded = 0;

    for (let i = 1; i <= TOTAL_UNITS; i++) {
        try {
            const response = await fetch(`${dataFolder}module2summariesunit${i}.json`);
            if (response.ok) {
                const data = await response.json();
                renderAccordionUnit(data[0], i, container);
                loaded++;
            }
        } catch (e) {}
    }

    if (loaded === 0) {
        container.innerHTML = `
            <div class="p-12 text-center bg-red-50 border border-red-200 rounded-3xl">
                <i class="fas fa-exclamation-triangle text-4xl text-red-500 mb-4"></i>
                <p class="font-bold text-red-700 text-lg">Keine Zusammenfassungen gefunden</p>
                <p class="text-red-600 mt-2">Bitte lade die 6 Dateien hoch:</p>
                <p class="text-xs text-red-500 mt-4 font-mono">module2summariesunit1.json bis unit6.json</p>
            </div>`;
    }
}

function renderAccordionUnit(unit, index, target) {
    const details = document.createElement('details');
    details.className = "group bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-4 transition-all hover:shadow-md";
    details.innerHTML = `
        <summary class="flex items-center justify-between p-6 cursor-pointer list-none hover:bg-slate-50 transition-colors">
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-black shadow-lg text-xl">${index}</div>
                <div>
                    <h3 class="font-black text-slate-800">${unit.title}</h3>
                    <div class="flex gap-2 mt-1 flex-wrap">
                        ${unit.tags.map(t => `<span class="text-[9px] bg-slate-100 text-slate-500 px-3 py-1 rounded-full font-bold">${t}</span>`).join('')}
                    </div>
                </div>
            </div>
            <i class="fas fa-chevron-down text-slate-300 group-open:rotate-180 transition-transform"></i>
        </summary>
        <div class="p-8 pt-2 border-t border-slate-50">${unit.content}</div>
    `;
    target.appendChild(details);
}

// Rest of your quiz + Prodigy code remains the same...
// (paste the rest of your working quiz functions here: startQuizMode, showQuestion, calculateExamGrade, askProdigy, etc.)

console.log('%c✅ Modul 2 v5.4 loaded', 'color:#4f46e5; font-weight:bold');
