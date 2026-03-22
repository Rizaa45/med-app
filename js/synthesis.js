// js/synthesis.js
let speakers = [];

document.getElementById('add-speaker').onclick = () => {
    const name = document.getElementById('speaker-input').value;
    if(name) {
        speakers.push(name);
        document.getElementById('speaker-input').value = '';
        renderSpeakerChips();
    }
};

function renderSpeakerChips() {
    const container = document.getElementById('speaker-chips');
    container.innerHTML = speakers.map(s => `<span class="bg-indigo-900/50 text-indigo-300 px-2 py-1 rounded text-[10px] font-bold border border-indigo-500/30">${s}</span>`).join('');
}

document.getElementById('generate-btn').onclick = async () => {
    const topic = document.getElementById('topic').value;
    const count = document.getElementById('slide-count').value;
    const mode = document.getElementById('script-mode').value;

    const btn = document.getElementById('generate-btn');
    btn.innerText = "SYNTHETISIERE...";
    btn.disabled = true;

    // Prompt Engineering für Bulletpoints und Design
    const prompt = `
    Thema: ${topic}. 
    Fallbeispiel: ${document.getElementById('case-study').value}.
    Teilnehmer: ${speakers.join(', ')}.
    Anzahl Folien: ${count == 0 ? 'KI entscheidet' : count}.

    REGELN:
    1. Folie 1 ist IMMER eine Titelfolie (layout: "title").
    2. Fakten NUR in kurzen Bulletpoints (maximal 5 pro Folie).
    3. Nutze Layouts: "standard", "timeline", "table", "split-image".
    4. Weise jedem Slide einen Sprecher zu.
    5. Wenn ein Fallbeispiel da ist, erstelle eine "Analyse-Folie".

    ANTWORTE NUR ALS JSON:
    {
      "slides": [
        { "type": "title", "headline": "...", "sub": "...", "speaker": "Alle" },
        { "type": "standard", "headline": "...", "bullets": ["Point 1", "Point 2"], "speaker": "Name" },
        { "type": "timeline", "headline": "...", "steps": [{"time": "...", "text": "..."}], "speaker": "Name" }
      ]
    }
    `;

    // Hier würde dein API Call stehen (fetch)
    // Ich simuliere hier das Resultat für die Demonstration:
    const mockResult = {
        slides: [
            { type: "title", headline: topic, sub: "Präsentiert von " + speakers.join(", "), speaker: "Team" },
            { type: "standard", headline: "Diagnose & Befund", bullets: ["Hoher Blutdruck (160/95)", "Anhaltender Schwindel", "Verdacht auf TIA"], speaker: speakers[0] || "Referent" },
            { type: "timeline", headline: "Krankheitsverlauf", steps: [{time: "08:00", text: "Symptombeginn"}, {time: "09:30", text: "Einlieferung"}], speaker: speakers[1] || "Referent" }
        ]
    };

    setTimeout(() => {
        renderAllSlides(mockResult);
        btn.innerText = "Synthese Starten";
        btn.disabled = false;
    }, 1500);
};

function renderAllSlides(data) {
    const canvas = document.getElementById('canvas');
    canvas.innerHTML = '';

    data.slides.forEach((s, idx) => {
        const slideDiv = document.createElement('div');
        slideDiv.className = `slide slide-type-${s.type}`;
        
        let contentHtml = '';

        if (s.type === 'title') {
            contentHtml = `
                <div class="block" style="top:250px; width:100%; text-align:center;">
                    <h1 contenteditable="true" class="text-6xl font-black mb-4">${s.headline}</h1>
                    <p contenteditable="true" class="text-xl opacity-80">${s.sub}</p>
                </div>
            `;
        } else if (s.type === 'standard') {
            contentHtml = `
                <div class="block" style="top:40px; left:60px;">
                    <h2 contenteditable="true" class="text-4xl font-extrabold border-b-4 border-indigo-500 pb-2">${s.headline}</h2>
                </div>
                <div class="block" style="top:180px; left:60px; width:800px;">
                    <ul class="bullet-list" contenteditable="true">
                        ${s.bullets.map(b => `<li>${b}</li>`).join('')}
                    </ul>
                </div>
            `;
        } else if (s.type === 'timeline') {
            contentHtml = `
                <div class="block" style="top:40px; left:60px;">
                    <h2 contenteditable="true" class="text-4xl font-extrabold">${s.headline}</h2>
                </div>
                <div class="block timeline-grid" style="top:250px; left:60px; width:90%;">
                    ${s.steps.map(step => `
                        <div class="timeline-node">
                            <div class="time">${step.time}</div>
                            <div contenteditable="true" class="text-sm font-bold">${step.text}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        slideDiv.innerHTML = contentHtml + `<div class="speaker-tag">Sprecher: ${s.speaker}</div><div class="resize-handle"></div>`;
        canvas.appendChild(slideDiv);

        // Skript-Bereich unter der Folie
        const scriptDiv = document.createElement('div');
        scriptDiv.className = "w-[1120px] bg-slate-900 border border-slate-800 p-4 rounded-b-xl -mt-2 mb-10 text-slate-400 text-sm italic no-print";
        scriptDiv.innerHTML = `<strong>Sprecher-Skript:</strong> <span contenteditable="true">Stelle die ${s.headline} vor und gehe besonders auf die Punkte ein...</span>`;
        canvas.appendChild(scriptDiv);
    });
}
