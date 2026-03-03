document.addEventListener('DOMContentLoaded', async () => {
    const loader = document.getElementById('units-loader');
    const unitFiles = [
        'data/module2summariesunit1.json',
        'data/module2summariesunit2.json',
        'data/module2summariesunit3.json',
        'data/module2summariesunit4.json',
        'data/module2summariesunit5.json',
        'data/module2summariesunit6.json'
    ];

    try {
        // Lade alle 6 Dateien gleichzeitig
        const responses = await Promise.all(unitFiles.map(file => fetch(file)));
        const units = await Promise.all(responses.map(res => res.json()));

        // Leere den Loader und baue die Dropdowns
        loader.innerHTML = '';
        units.forEach((unit, index) => {
            const unitHtml = `
                <div class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-md">
                    <button onclick="toggleUnit(${index})" class="w-full p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div class="flex items-center gap-4 text-left">
                            <div class="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                                <i class="fas ${unit.icon || 'fa-book-open'} text-xl"></i>
                            </div>
                            <div>
                                <h3 class="text-sm font-black text-slate-900 uppercase tracking-tighter">${unit.title}</h3>
                                <p class="text-[10px] text-indigo-500 font-bold uppercase tracking-widest">Einheit ${unit.unit_id || (index + 1)}</p>
                            </div>
                        </div>
                        <i id="chevron-${index}" class="fas fa-chevron-down text-slate-300 transition-transform duration-300"></i>
                    </button>
                    <div id="content-${index}" class="unit-content px-6">
                        <div class="pt-2 border-t border-slate-100">
                             ${unit.html_snippet}
                        </div>
                    </div>
                </div>
            `;
            loader.innerHTML += unitHtml;
        });
    } catch (error) {
        console.error("Fehler beim Laden der JSON Einheiten:", error);
        loader.innerHTML = `<p class="text-red-500 text-center font-bold">Fehler beim Laden der Daten!</p>`;
    }
});

function toggleUnit(index) {
    const content = document.getElementById(`content-${index}`);
    const chevron = document.getElementById(`chevron-${index}`);
    
    content.classList.toggle('open');
    if (content.classList.contains('open')) {
        chevron.style.transform = 'rotate(180deg)';
    } else {
        chevron.style.transform = 'rotate(0deg)';
    }
}

function switchTab(tab) {
    const inhalt = document.getElementById('section-inhalt');
    const quiz = document.getElementById('section-quiz');
    const tabInhalt = document.getElementById('tab-inhalt');
    const tabQuiz = document.getElementById('tab-quiz');

    if (tab === 'inhalt') {
        inhalt.classList.remove('hidden');
        quiz.classList.add('hidden');
        tabInhalt.className = "flex-1 py-3 rounded-xl font-bold bg-white text-indigo-600 shadow-sm border border-slate-200/50";
        tabQuiz.className = "flex-1 py-3 rounded-xl font-bold text-slate-500";
    } else {
        inhalt.classList.add('hidden');
        quiz.classList.remove('hidden');
        tabQuiz.className = "flex-1 py-3 rounded-xl font-bold bg-white text-indigo-600 shadow-sm border border-slate-200/50";
        tabInhalt.className = "flex-1 py-3 rounded-xl font-bold text-slate-500";
    }
}