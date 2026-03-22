// js/engine.js

const state = {
    speakers: [],
    slides: []
};

// Sprecher Management
document.getElementById('add-speaker').onclick = () => {
    const name = prompt("Name des Teilnehmers:");
    if (name) {
        state.speakers.push(name);
        renderSpeakers();
    }
};

function renderSpeakers() {
    const list = document.getElementById('speaker-list');
    list.innerHTML = state.speakers.map((s, i) => `
        <div class="flex items-center justify-between bg-[#1a1f2e] p-3 rounded-xl border border-white/5 group">
            <span class="text-sm font-bold text-slate-200">${s}</span>
            <button onclick="state.speakers.splice(${i},1); renderSpeakers()" class="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                <i class="fas fa-times-circle"></i>
            </button>
        </div>
    `).join('');
}

// DIE GENERIERUNG (Simuliert die intelligente Strukturierung)
document.getElementById('generate-master').onclick = async () => {
    const topic = document.getElementById('main-topic').value;
    const context = document.getElementById('ai-context').value;
    
    if(!topic) return alert("Bitte Thema angeben!");

    const btn = document.getElementById('generate-master');
    btn.innerHTML = `<i class="fas fa-sync fa-spin"></i> Analysiere Daten...`;
    btn.disabled = true;

    // HINWEIS: Hier würde der API Call an GPT-4o / Gemini stattfinden.
    // Wir bauen hier die "Design-Intelligenz" direkt ein.
    
    setTimeout(() => {
        const slides = planStructure(topic, context);
        renderPresentation(slides);
        btn.innerHTML = `<i class="fas fa-sparkles"></i> Synthese Starten`;
        btn.disabled = false;
        document.getElementById('empty-state').classList.add('hidden');
    }, 1500);
};

function planStructure(topic, context) {
    // Diese Funktion simuliert die KI-Entscheidung über Layouts
    const slides = [
        {
            type: 'title',
            headline: topic,
            sub: "Klinische Fallpräsentation • " + (state.speakers.join(", ") || "Analysiert durch SLM Studio"),
            speaker: "Einleitung"
        },
        {
            type: 'clinical-grid',
            headline: "Patienten-Profil & Anamnese",
            data: [
                { label: "SOZIALANAMNESE", content: "56 Jahre, ehem. Pilot, Frührentner. Lebt mit Familie im Haus." },
                { label: "PFLEGEGRAD", content: "Grad 4. Eingeschränkte Mobilität, Hilfe bei Körperpflege & Alltag." }
            ],
            speaker: state.speakers[0] || "Referent 1"
        },
        {
            type: 'standard',
            headline: "Hauptdiagnosen",
            bullets: [
                "Rezidivierender Hirntumor (Endstadium)",
                "Diabetes Mellitus Typ 2",
                "Bronchialkarzinom (Pneumonierisiko)",
                "Wirbelsäulenschmerzen (Dekubitusrisiko)"
            ],
            speaker: state.speakers[1] || "Referent 2"
        }
    ];
    return slides;
}

function renderPresentation(slides) {
    const workspace = document.getElementById('workspace');
    workspace.innerHTML = '';

    slides.forEach((s, i) => {
        const slideEl = document.createElement('div');
        slideEl.className = `slide slide-${s.type}-layout mb-20`;
        slideEl.id = `slide-${i}`;
        
        let html = '';
        
        // Layout-spezifisches HTML (Bulletpoints sind hier Pflicht!)
        if (s.type === 'title') {
            html = `
                <div class="block" data-x="100" data-y="250" style="width:1080px; text-align:center">
                    <h1 contenteditable="true" class="text-7xl font-black tracking-tighter mb-6">${s.headline}</h1>
                    <div class="w-24 h-2 bg-indigo-500 mx-auto mb-8"></div>
                    <p contenteditable="true" class="text-2xl font-light opacity-80 uppercase tracking-widest">${s.sub}</p>
                </div>
            `;
        } else if (s.type === 'clinical-grid') {
            html = `
                <div class="block" data-x="80" data-y="60" style="width:1000px">
                    <h2 contenteditable="true" class="text-5xl font-extrabold text-indigo-900 mb-2">${s.headline}</h2>
                    <div class="h-1 w-20 bg-indigo-500"></div>
                </div>
                <div class="block clinical-grid" data-x="80" data-y="220" style="width:1120px">
                    ${s.data.map(d => `
                        <div class="data-card">
                            <h4 class="text-[11px] font-black text-indigo-500 mb-3 tracking-widest">${d.label}</h4>
                            <p contenteditable="true" class="text-lg leading-relaxed text-slate-700">${d.content}</p>
                        </div>
                    `).join('')}
                </div>
            `;
        } else if (s.type === 'standard') {
            html = `
                <div class="block" data-x="80" data-y="60">
                    <h2 contenteditable="true" class="text-5xl font-extrabold text-indigo-900">${s.headline}</h2>
                </div>
                <div class="block" data-x="80" data-y="220" style="width:1000px">
                    <ul class="space-y-6">
                        ${s.bullets.map(b => `
                            <li class="flex items-start gap-4">
                                <span class="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 mt-1"><i class="fas fa-check"></i></span>
                                <span contenteditable="true" class="text-2xl text-slate-700">${b}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;
        }

        slideEl.innerHTML = html + `<div class="speaker-badge">Speaker: ${s.speaker}</div>`;
        workspace.appendChild(slideEl);
        
        // Initialisiere Editor für diese Folie
        initEditorForSlide(slideEl);
    });
}
