// --- CONFIGURATION ---
const MOD_ID = 2;
const TOTAL_UNITS = 6;
const dataFolder = 'data/'; // Absolut wichtig: Der Ordner muss "data" heißen!

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("Modul 2 System initialisiert...");
    loadAllSummaries();
    generatePdfList();
});

// --- SUMMARY LOADER ---
async function loadAllSummaries() {
    const container = document.getElementById('summary-container');
    const loadingSpinner = document.getElementById('loading-spinner');

    let loadedAny = false;

    for (let i = 1; i <= TOTAL_UNITS; i++) {
        const fileName = `${dataFolder}module2summariesunit${i}.json`;
        try {
            const response = await fetch(fileName);
            
            if (!response.ok) {
                console.warn(`Datei nicht gefunden: ${fileName}`);
                continue; // Springe zur nächsten Unit, falls eine fehlt
            }

            const data = await response.json();
            
            // Wenn wir hier ankommen, haben wir Daten. Spinner weg beim ersten Erfolg!
            if (!loadedAny) {
                container.innerHTML = ''; 
                loadedAny = true;
            }

            renderUnitDropdown(data[0], i, container);
        } catch (err) {
            console.error(`Fehler beim Laden von Unit ${i}:`, err);
        }
    }

    // Falls gar nichts geladen werden konnte (z.B. alle Dateien fehlen)
    if (!loadedAny) {
        container.innerHTML = `
            <div class="bg-orange-50 border border-orange-200 p-6 rounded-2xl text-center">
                <i class="fas fa-exclamation-triangle text-orange-500 text-2xl mb-2"></i>
                <p class="text-orange-800 font-bold">Keine Daten gefunden!</p>
                <p class="text-orange-600 text-xs mt-1">Stelle sicher, dass die Dateien im Ordner <b>data/</b> liegen und korrekt benannt sind (z.B. module2summariesunit1.json).</p>
            </div>
        `;
    }
}

function renderUnitDropdown(unit, index, target) {
    const details = document.createElement('details');
    details.className = "group bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300 open:ring-4 open:ring-indigo-500/5 mb-4";
    
    // Prüfen ob Content vorhanden ist, sonst Fehlermeldung
    const unitContent = unit.content || "<p class='p-4 text-red-500'>Inhalt konnte nicht geladen werden.</p>";

    details.innerHTML = `
        <summary class="flex items-center justify-between p-6 cursor-pointer list-none">
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black group-open:bg-indigo-600 group-open:text-white transition-all shadow-sm">
                    ${index}
                </div>
                <div>
                    <h3 class="font-bold text-slate-900 uppercase tracking-tight">${unit.title || 'Einheit ' + index}</h3>
                    <div class="flex gap-2 mt-1">
                        ${unit.tags ? unit.tags.map(t => `<span class="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold uppercase tracking-widest">${t}</span>`).join('') : ''}
                    </div>
                </div>
            </div>
            <div class="flex items-center gap-4">
                <span class="text-[10px] font-bold text-slate-300 uppercase tracking-widest hidden sm:block group-open:hidden">Details öffnen</span>
                <i class="fas fa-chevron-down text-slate-300 group-open:rotate-180 transition-transform"></i>
            </div>
        </summary>
        <div class="p-8 pt-2 border-t border-slate-50 fade-in bg-white">
            ${unitContent}
        </div>
    `;
    target.appendChild(details);
}

// --- TAB SYSTEM ---
function switchTab(tab) {
    document.getElementById('section-inhalt').classList.toggle('hidden', tab !== 'inhalt');
    document.getElementById('section-quiz').classList.toggle('hidden', tab !== 'quiz');
    
    const btnInhalt = document.getElementById('tab-inhalt');
    const btnQuiz = document.getElementById('tab-quiz');

    if (tab === 'inhalt') {
        btnInhalt.className = 'flex-1 py-3 rounded-xl font-bold transition-all bg-white text-indigo-600 shadow-sm border border-slate-200/50';
        btnQuiz.className = 'flex-1 py-3 rounded-xl font-bold transition-all text-slate-500';
    } else {
        btnQuiz.className = 'flex-1 py-3 rounded-xl font-bold transition-all bg-white text-indigo-600 shadow-sm border border-slate-200/50';
        btnInhalt.className = 'flex-1 py-3 rounded-xl font-bold transition-all text-slate-500';
    }
}

// --- PDF LIST ---
function generatePdfList() {
    const pdfContainer = document.getElementById('pdf-list');
    if(!pdfContainer) return;
    pdfContainer.innerHTML = '';
    
    const units = [
        "Nervensystem & ZNS", "Herz-Kreislauf", "Atmungsorgane", 
        "Verdauungssystem", "Bewegungsapparat", "Hormonsystem"
    ];

    units.forEach((title, i) => {
        const div = document.createElement('div');
        div.className = "bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group";
        div.innerHTML = `
            <div class="flex items-center gap-4">
                <div class="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center group-hover:bg-red-500 group-hover:text-white transition-all">
                    <i class="fas fa-file-pdf"></i>
                </div>
                <span class="text-sm font-semibold text-slate-700 uppercase tracking-tight">Skript Unit ${i+1}: ${title}</span>
            </div>
            <i class="fas fa-external-link-alt text-slate-300 group-hover:text-indigo-500 transition-colors"></i>
        `;
        pdfContainer.appendChild(div);
    });
}

// --- PRODIGY SIDEBAR ---
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
