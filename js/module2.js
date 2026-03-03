// --- CONFIGURATION ---
const MOD_ID = 2;
const TOTAL_UNITS = 6;
const dataFolder = 'data/';

// --- STATE MANAGEMENT ---
let currentTab = 'inhalt';
let quizData = [];

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    loadAllSummaries();
    generatePdfList();
});

// --- TAB SYSTEM ---
function switchTab(tab) {
    currentTab = tab;
    document.getElementById('section-inhalt').classList.toggle('hidden', tab !== 'inhalt');
    document.getElementById('section-quiz').classList.toggle('hidden', tab !== 'quiz');
    
    // UI Update Buttons
    document.getElementById('tab-inhalt').className = tab === 'inhalt' 
        ? 'flex-1 py-3 rounded-xl font-bold bg-white text-indigo-600 shadow-sm border border-slate-200/50' 
        : 'flex-1 py-3 rounded-xl font-bold text-slate-500';
    document.getElementById('tab-quiz').className = tab === 'quiz' 
        ? 'flex-1 py-3 rounded-xl font-bold bg-white text-indigo-600 shadow-sm border border-slate-200/50' 
        : 'flex-1 py-3 rounded-xl font-bold text-slate-500';
}

// --- SUMMARY LOADER ---
async function loadAllSummaries() {
    const container = document.getElementById('summary-container');
    container.innerHTML = ''; // Spinner entfernen

    for (let i = 1; i <= TOTAL_UNITS; i++) {
        try {
            const response = await fetch(`${dataFolder}module2summariesunit${i}.json`);
            if (!response.ok) throw new Error(`Unit ${i} nicht gefunden`);
            const data = await response.json();
            renderUnitDropdown(data[0], i, container);
        } catch (err) {
            console.error(err);
            // Optional: Placeholder für fehlende Units
        }
    }
}

function renderUnitDropdown(unit, index, target) {
    const details = document.createElement('details');
    details.className = "group bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300 open:ring-2 open:ring-indigo-500/20";
    
    details.innerHTML = `
        <summary class="flex items-center justify-between p-6 cursor-pointer list-none">
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black group-open:bg-indigo-600 group-open:text-white transition-all">
                    ${index}
                </div>
                <div>
                    <h3 class="font-bold text-slate-900 uppercase tracking-tight">${unit.title}</h3>
                    <div class="flex gap-2 mt-1">
                        ${unit.tags.map(t => `<span class="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold uppercase tracking-widest">${t}</span>`).join('')}
                    </div>
                </div>
            </div>
            <i class="fas fa-chevron-down text-slate-300 group-open:rotate-180 transition-transform"></i>
        </summary>
        <div class="p-8 pt-0 border-t border-slate-50 fade-in">
            ${unit.content}
        </div>
    `;
    target.appendChild(details);
}

// --- PDF LIST GENERATOR ---
function generatePdfList() {
    const pdfContainer = document.getElementById('pdf-list');
    const unitTitles = [
        "Nervensystem & Neurochirurgie",
        "Herz-Kreislauf-System",
        "Atmungssystem & Pulmologie",
        "Verdauung & Stoffwechsel",
        "Bewegungsapparat & Orthopädie",
        "Endokrines System & Urogenital"
    ];

    unitTitles.forEach((title, i) => {
        const div = document.createElement('div');
        div.className = "bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between hover:border-indigo-300 transition-all cursor-pointer group";
        div.innerHTML = `
            <div class="flex items-center gap-4">
                <div class="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center group-hover:bg-red-500 group-hover:text-white transition-all">
                    <i class="fas fa-file-pdf"></i>
                </div>
                <span class="text-sm font-semibold text-slate-700 uppercase tracking-tight">Skript Unit ${i+1}: ${title}</span>
            </div>
            <i class="fas fa-download text-slate-300"></i>
        `;
        pdfContainer.appendChild(div);
    });
}

// --- PRODIGY AI SIDEBAR LOGIC ---
function toggleProdigy() {
    const sidebar = document.getElementById('prodigy-sidebar');
    const overlay = document.getElementById('prodigy-overlay');
    const isHidden = sidebar.classList.contains('translate-x-full');
    
    if (isHidden) {
        sidebar.classList.remove('translate-x-full');
        overlay.classList.remove('hidden');
        setTimeout(() => overlay.style.opacity = '1', 10);
    } else {
        sidebar.classList.add('translate-x-full');
        overlay.style.opacity = '0';
        setTimeout(() => overlay.classList.add('hidden'), 500);
    }
}

async function askProdigy() {
    const input = document.getElementById('prodigy-input');
    const chatBox = document.getElementById('prodigy-chat-box');
    if (!input.value.trim()) return;

    // User Message
    chatBox.innerHTML += `<div class="flex justify-end"><div class="bg-indigo-600 text-white p-4 rounded-2xl rounded-tr-none max-w-[80%] shadow-lg text-sm">${input.value}</div></div>`;
    
    const query = input.value;
    input.value = '';
    
    // AI Loading
    const loadingId = 'ai-' + Date.now();
    chatBox.innerHTML += `<div id="${loadingId}" class="flex gap-3"><div class="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-[10px] text-white"><i class="fas fa-robot animate-pulse"></i></div><div class="bg-slate-100 p-4 rounded-2xl rounded-tl-none text-slate-700 text-sm italic">Analysiere Modul 2 Daten...</div></div>`;
    chatBox.scrollTop = chatBox.scrollHeight;

    // Simulation Antwort
    setTimeout(() => {
        const response = document.getElementById(loadingId);
        response.innerHTML = `
            <div class="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-[10px] text-white"><i class="fas fa-robot"></i></div>
            <div class="bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-none shadow-sm text-slate-800 text-sm leading-relaxed">
                <p class="font-bold text-indigo-600 mb-1 uppercase text-[10px] tracking-widest">Medical Insight:</p>
                In Modul 2 ist es wichtig, die anatomischen Grundlagen (wie den Circulus arteriosus Willisii in Unit 1) direkt mit der klinischen Pathologie zu verknüpfen. Möchtest du eine spezifische Vertiefung zu diesem Bereich?
            </div>
        `;
    }, 1500);
}

// --- QUIZ LOGIC (PLUGBABLE) ---
function startQuizMode(mode) {
    document.getElementById('quiz-selection').classList.add('hidden');
    document.getElementById('quiz-container').classList.remove('hidden');
    // Hier würde dein Quiz-Fatch & Logic Code stehen
    console.log("Starte Quiz: " + mode);
}
