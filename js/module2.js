/**
 * SLM System Modul 2 Engine
 * Fix: Infinite Loading & Dynamic Unit Injection
 */

const MOD_ID = 2;
const TOTAL_UNITS = 6;
const dataFolder = 'data/';

document.addEventListener('DOMContentLoaded', () => {
    initModule2();
});

async function initModule2() {
    const container = document.getElementById('summary-dropdown-container');
    const pdfList = document.getElementById('pdf-list');
    
    // 1. PDFs generieren (statisch)
    const titles = ["Nervensystem", "Herz-Kreislauf", "Atmung", "Verdauung", "Bewegungsapparat", "Endokrinologie"];
    pdfList.innerHTML = titles.map((t, i) => `
        <div class="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between hover:border-indigo-400 transition-all cursor-pointer group">
            <div class="flex items-center gap-4">
                <div class="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-all"><i class="fas fa-file-pdf"></i></div>
                <span class="text-xs font-bold text-slate-700 uppercase">Skript Unit ${i+1}: ${t}</span>
            </div>
            <i class="fas fa-download text-slate-200 group-hover:text-indigo-600"></i>
        </div>
    `).join('');

    // 2. Units laden
    let successCount = 0;
    
    for (let i = 1; i <= TOTAL_UNITS; i++) {
        try {
            const fileName = `${dataFolder}module2summariesunit${i}.json`;
            const response = await fetch(fileName);
            
            if (response.ok) {
                const data = await response.json();
                
                // Beim ersten Erfolg den Spinner entfernen
                if (successCount === 0) container.innerHTML = '';
                
                renderAccordion(data[0], i, container);
                successCount++;
            }
        } catch (err) {
            console.error(`Fehler bei Unit ${i}:`, err);
        }
    }

    // Falls gar nichts geladen wurde
    if (successCount === 0) {
        container.innerHTML = `
            <div class="p-8 bg-orange-50 border border-orange-200 rounded-2xl text-center">
                <p class="text-orange-800 font-bold text-sm">FEHLER: JSON-Dateien nicht gefunden.</p>
                <p class="text-orange-600 text-[10px] uppercase mt-2">Erwarteter Pfad: data/module2summariesunit1.json</p>
            </div>
        `;
    }
}

function renderAccordion(unit, index, target) {
    const details = document.createElement('details');
    details.className = "group bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-4 transition-all";
    
    details.innerHTML = `
        <summary class="flex items-center justify-between p-6 cursor-pointer list-none hover:bg-slate-50 transition-colors">
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-bold shadow-lg">
                    ${index}
                </div>
                <div>
                    <h3 class="font-black text-slate-800 uppercase tracking-tight text-sm">${unit.title || unit.topic}</h3>
                    <div class="flex gap-2 mt-1">
                        ${unit.tags ? unit.tags.map(t => `<span class="text-[9px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded font-bold uppercase">${t}</span>`).join('') : ''}
                    </div>
                </div>
            </div>
            <i class="fas fa-plus text-slate-300 group-open:rotate-45 transition-transform"></i>
        </summary>
        <div class="p-8 pt-2 border-t border-slate-50 fade-in prose max-w-none text-slate-600 text-sm leading-relaxed">
            ${unit.content}
        </div>
    `;
    target.appendChild(details);
}

function switchTab(tab) {
    document.getElementById('section-inhalt').classList.toggle('hidden', tab !== 'inhalt');
    document.getElementById('section-quiz').classList.toggle('hidden', tab !== 'quiz');
    
    document.getElementById('tab-inhalt').className = tab === 'inhalt' 
        ? 'flex-1 py-3 rounded-xl font-bold bg-white text-indigo-600 shadow-sm border border-slate-200/50' 
        : 'flex-1 py-3 rounded-xl font-bold text-slate-500';
    
    document.getElementById('tab-quiz').className = tab === 'quiz' 
        ? 'flex-1 py-3 rounded-xl font-bold bg-white text-indigo-600 shadow-sm border border-slate-200/50' 
        : 'flex-1 py-3 rounded-xl font-bold text-slate-500';
}

function toggleProdigy() {
    alert("Prodigy AI für Modul 2 wird initialisiert...");
}
