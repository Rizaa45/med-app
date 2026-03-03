// Konfiguration
const TOTAL_UNITS = 6;
const dataFolder = 'data/';

document.addEventListener('DOMContentLoaded', () => {
    loadModuleData();
});

async function loadModuleData() {
    const container = document.getElementById('summary-dropdown-container');
    const spinner = document.getElementById('loading-spinner');
    
    let anySuccess = false;

    // Wir versuchen alle 6 Units nacheinander zu laden
    for (let i = 1; i <= TOTAL_UNITS; i++) {
        try {
            const response = await fetch(`${dataFolder}module2summariesunit${i}.json`);
            
            if (response.ok) {
                const data = await response.json();
                
                // Beim ersten Erfolg: Spinner weg!
                if (!anySuccess) {
                    container.innerHTML = ''; 
                    anySuccess = true;
                }
                
                renderDropdown(data[0], i, container);
            }
        } catch (error) {
            console.error(`Fehler bei Unit ${i}:`, error);
        }
    }

    // Falls am Ende gar nichts geladen wurde
    if (!anySuccess) {
        spinner.innerHTML = `
            <div class="text-center p-8 bg-red-50 rounded-2xl border border-red-100">
                <i class="fas fa-file-circle-exclamation text-red-400 text-3xl mb-3"></i>
                <p class="text-red-800 font-bold">JSON Dateien nicht gefunden!</p>
                <p class="text-red-600 text-[10px] uppercase mt-1">Prüfe den Ordner "data" und die Dateinamen.</p>
            </div>
        `;
    }
    
    generatePdfs();
}

function renderDropdown(unit, index, target) {
    const details = document.createElement('details');
    details.className = "group bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-4 transition-all";
    
    details.innerHTML = `
        <summary class="flex items-center justify-between p-6 cursor-pointer list-none hover:bg-slate-50 transition-colors">
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-bold shadow-lg shadow-indigo-100">
                    ${index}
                </div>
                <div>
                    <h3 class="font-black text-slate-800 uppercase tracking-tight text-sm">${unit.title}</h3>
                    <div class="flex gap-2 mt-1">
                        ${unit.tags.map(t => `<span class="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold uppercase">${t}</span>`).join('')}
                    </div>
                </div>
            </div>
            <i class="fas fa-chevron-down text-slate-300 group-open:rotate-180 transition-transform"></i>
        </summary>
        <div class="p-8 pt-2 border-t border-slate-50 fade-in">
            ${unit.content}
        </div>
    `;
    target.appendChild(details);
}

function switchTab(tab) {
    const sectionInhalt = document.getElementById('section-inhalt');
    const sectionQuiz = document.getElementById('section-quiz');
    const tabInhalt = document.getElementById('tab-inhalt');
    const tabQuiz = document.getElementById('tab-quiz');

    if (tab === 'inhalt') {
        sectionInhalt.classList.remove('hidden');
        sectionQuiz.classList.add('hidden');
        tabInhalt.className = 'flex-1 py-3 rounded-xl font-bold transition-all bg-white text-indigo-600 shadow-sm border border-slate-200/50';
        tabQuiz.className = 'flex-1 py-3 rounded-xl font-bold transition-all text-slate-500';
    } else {
        sectionInhalt.classList.add('hidden');
        sectionQuiz.classList.remove('hidden');
        tabQuiz.className = 'flex-1 py-3 rounded-xl font-bold transition-all bg-white text-indigo-600 shadow-sm border border-slate-200/50';
        tabInhalt.className = 'flex-1 py-3 rounded-xl font-bold transition-all text-slate-500';
    }
}

function generatePdfs() {
    const list = document.getElementById('pdf-list');
    const titles = ["Anatomie & Physio", "Kardiologie", "Pneumologie", "Gastroenterologie", "Orthopädie", "Endokrinologie"];
    list.innerHTML = '';
    titles.forEach((t, i) => {
        list.innerHTML += `
            <div class="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between group cursor-pointer hover:border-indigo-400">
                <div class="flex items-center gap-4">
                    <div class="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center group-hover:bg-red-500 group-hover:text-white transition-all"><i class="fas fa-file-pdf"></i></div>
                    <span class="text-xs font-bold text-slate-700 uppercase">Unit ${i+1}: ${t}</span>
                </div>
                <i class="fas fa-arrow-right text-slate-200 group-hover:text-indigo-500"></i>
            </div>
        `;
    });
}
