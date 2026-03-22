// js/synthesis.js

let speakers = [];

// Sprecher-Verwaltung
document.getElementById('add-speaker-btn').addEventListener('click', () => {
    const name = prompt("Name des Sprechers:");
    if (name) {
        speakers.push(name);
        renderSpeakerList();
    }
});

function renderSpeakerList() {
    const list = document.getElementById('speaker-list');
    list.innerHTML = speakers.map((s, i) => `
        <div class="flex items-center justify-between bg-slate-800 p-2 rounded-lg border border-slate-700">
            <span class="text-xs font-bold">${s}</span>
            <button onclick="speakers.splice(${i}, 1); renderSpeakerList();" class="text-red-400 hover:text-red-300 text-xs">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
}

// Haupt-Generierung
document.getElementById('generate-btn').addEventListener('click', async () => {
    const topic = document.getElementById('topic').value;
    const caseStudy = document.getElementById('case-study').value;
    const slideCount = document.getElementById('slide-count').value;
    const scriptType = document.getElementById('script-type').value;

    if (!topic) return alert("Thema angeben!");

    const btn = document.getElementById('generate-btn');
    btn.innerHTML = `<i class="fas fa-circle-notch animate-spin"></i> Synthese läuft...`;
    btn.disabled = true;

    // Prompt für die KI (Extrem präzise für Layouts)
    const prompt = `
        Erstelle ein professionelles medizinisches Dokument über "${topic}".
        Kontext/Fallbeispiel: "${caseStudy}".
        Sprecher-Team: ${speakers.join(', ')}.
        Erzeuge ${slideCount} inhaltliche Sektionen.
        
        WICHTIG: Nutze für mindestens eine Sektion ein Timeline-Format (JSON: layout: "timeline") 
        und für eine andere ein Tabellen-Format (JSON: layout: "table").
        Weise jeder Folie einen Sprecher aus der Liste zu.
        
        Antworte NUR als JSON:
        {
          "title": "Haupttitel",
          "slides": [
            {
              "speaker": "Name",
              "title": "Folientitel",
              "layout": "standard" | "timeline" | "table",
              "content": "HTML Content oder Array für Timeline/Table",
              "script": "Text für den Sprecher"
            }
          ]
        }
    `;

    try {
        const response = await fetch('/api/grade', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt })
        });

        const data = await response.json();
        const jsonText = data.text.replace(/```json|```/g, '').trim();
        const result = JSON.parse(jsonText);
        
        renderSlides(result);

    } catch (error) {
        console.error("AI Error:", error);
        alert("Fehler bei der Synthese.");
    } finally {
        btn.innerHTML = `<i class="fas fa-wand-magic-sparkles"></i> Synthese Starten`;
        btn.disabled = false;
    }
});

function renderSlides(data) {
    const container = document.getElementById('document-container');
    container.innerHTML = ''; // Clear

    data.slides.forEach((slide, index) => {
        const slideEl = document.createElement('div');
        slideEl.className = 'page-presentation';
        
        // Sprecher Badge
        let speakerHtml = slide.speaker ? `<div class="speaker-badge no-print">Sprecher: ${slide.speaker}</div>` : '';
        
        // Content Layout Logik
        let contentHtml = '';
        if (slide.layout === 'timeline') {
            contentHtml = `<div class="timeline-container">` + 
                slide.content.map(item => `
                    <div class="timeline-item">
                        <h4 class="font-bold text-indigo-600">${item.time || ''}</h4>
                        <p>${item.text}</p>
                    </div>
                `).join('') + `</div>`;
        } else if (slide.layout === 'table') {
            contentHtml = `<table class="pro-table">
                <thead><tr>${slide.content.headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
                <tbody>${slide.content.rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody>
            </table>`;
        } else {
            contentHtml = slide.content; // Standard HTML
        }

        slideEl.innerHTML = `
            ${speakerHtml}
            <div class="p-12 h-full flex flex-col">
                <div class="editable-block" style="top: 40px; left: 60px; width: 80%;">
                    <div class="drag-handle"><i class="fas fa-grip-horizontal"></i></div>
                    <h2 contenteditable="true" class="text-4xl font-black text-slate-900 border-b-4 border-indigo-500 pb-2 inline-block">${slide.title}</h2>
                    <div class="resize-handle"></div>
                </div>
                
                <div class="editable-block" style="top: 150px; left: 60px; width: 85%; height: 60%;">
                    <div class="drag-handle"><i class="fas fa-grip-horizontal"></i></div>
                    <div contenteditable="true" class="text-xl text-slate-700 leading-relaxed">${contentHtml}</div>
                    <div class="resize-handle"></div>
                </div>
            </div>
        `;

        // Skript Sektion (Nur falls gewünscht)
        if (slide.script) {
            const scriptEl = document.createElement('div');
            scriptEl.className = 'w-full max-w-[1200px] bg-slate-900/50 p-4 rounded-xl border border-dashed border-slate-700 mt-2 no-print';
            scriptEl.innerHTML = `
                <p class="text-[10px] font-black uppercase text-indigo-400 mb-2">Manuskript für ${slide.speaker || 'Alle'}</p>
                <div contenteditable="true" class="text-sm text-slate-300 italic">"${slide.script}"</div>
            `;
            container.appendChild(slideEl);
            container.appendChild(scriptEl);
        } else {
            container.appendChild(slideEl);
        }
    });
}
