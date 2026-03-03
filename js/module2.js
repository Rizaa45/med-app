/**
 * SLM System Modul 2 Engine 
 * Mirroring Module 9 Dropdown Logic
 */

let currentModuleId = 2;

window.onload = () => {
    renderSummaryDropdown();
    // PDFs laden (Optional)
    const pdfList = document.getElementById('pdf-list');
    pdfList.innerHTML = `<div class="p-5 bg-white rounded-2xl border border-slate-100 text-xs font-bold text-slate-400 text-center uppercase">Keine PDFs hinterlegt</div>`;
};

function renderSummaryDropdown() {
    const container = document.getElementById('summary-dropdown-container');
    if(!container) return;

    const summaries = [
        { id: "", name: "Wähle eine Lerneinheit..." },
        { id: "1", name: "1. Notfallmanagement & Erste Hilfe" },
        { id: "2", name: "2. Anatomie & Physiologie" },
        { id: "3", name: "3. Krankheitslehre" },
        { id: "4", name: "4. Pharmakologie Basis" },
        { id: "5", name: "5. Hygiene & Infektion" },
        { id: "6", name: "6. Dokumentation" }
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

    try {
        // Sucht nach data/module2summariesunit1.json etc.
        const response = await fetch(`data/module2summariesunit${num}.json`);
        const data = await response.json();
        const unit = data[0];

        displayArea.innerHTML = `
            <div class="fade-in bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden mb-10">
                <div class="bg-indigo-600 p-8 text-white flex justify-between items-center">
                    <div>
                        <span class="text-indigo-200 text-xs font-black uppercase tracking-widest">Einheit ${num}</span>
                        <h2 class="text-2xl font-black">${unit.title}</h2>
                    </div>
                    <button onclick="closeSummary()" class="bg-white/20 hover:bg-white/40 p-3 rounded-full transition-all">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="p-8 md:p-12 prose max-w-none">
                    ${unit.content}
                </div>
            </div>
        `;
    } catch (err) {
        displayArea.innerHTML = `<div class="p-10 text-red-500 bg-red-50 rounded-3xl border border-red-100 text-center font-bold">Datei "data/module2summariesunit${num}.json" nicht gefunden.</div>`;
    }
}

function closeSummary() {
    document.getElementById('summary-display-area').classList.add('hidden');
}

function switchTab(tab) {
    document.getElementById('section-inhalt').classList.toggle('hidden', tab !== 'inhalt');
    document.getElementById('section-quiz').classList.toggle('hidden', tab !== 'quiz');
    
    const btnInhalt = document.getElementById('tab-inhalt');
    const btnQuiz = document.getElementById('tab-quiz');

    if(tab === 'inhalt') {
        btnInhalt.className = "flex-1 py-3 rounded-xl font-bold transition-all bg-white text-indigo-600 shadow-sm border border-slate-200/50";
        btnQuiz.className = "flex-1 py-3 rounded-xl font-bold transition-all text-slate-500";
    } else {
        btnQuiz.className = "flex-1 py-3 rounded-xl font-bold transition-all bg-white text-indigo-600 shadow-sm border border-slate-200/50";
        btnInhalt.className = "flex-1 py-3 rounded-xl font-bold transition-all text-slate-500";
    }
}
