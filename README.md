# SLM System v8 — Pflegeausbildung

KI-gestützte Lernplattform zur Vorbereitung auf Zwischen- & Abschlussprüfung der generalistischen Pflegeausbildung (PflBG / PflAPrV).

**Diese Version ist die v8-App als reine statische Website** — gleiche Optik, gleiche Struktur, gleicher Klausur-Simulator wie die Next.js-v8-App, aber komplett ohne Server lauffähig (GitHub Pages).

> **✅ 100 % offline-fähig:** Keine CDNs, keine externen Fonts, keine Internetverbindung nötig. Datei direkt im Browser öffnen (`file://`) oder überall hosten — funktioniert immer. Alle Ressourcen liegen lokal im Ordner.

---

## 📦 Was drin ist

| Bereich | Datei | Funktion |
|---|---|---|
| **Start / App** | `index.html` | Login → Bibliothek · Training · Notizbuch · Profil (v8-Design, Dark Glass) |
| **Prüfungs-Simulator** | `exam-simulator.html` | 1:1 Papier-Klausur: Modulklausur (90 Min) & Zwischenprüfung (120+10 Min, PflAPrV, 150 P.) |
| Design-System | `css/v8.css` | Kompletter v8-Stil (Glass, Gradients, Klausur-Zettel `ep-*`) |
| **Utility-CSS (lokal kompiliert)** | `css/tw.css` | Vorkompiliertes Tailwind — kein CDN mehr nötig |
| **Schriftarten (lokal)** | `fonts/` | Plus Jakarta Sans, Crimson Pro, Inter + Font Awesome — offline |
| App-Logik | `js/v8-*.js` | Router, SRS-Training, Bewertung, Renderer |
| **Eingebettete Daten** | `js/data-local.js` | Module, Lerneinheiten & alle Fragenbanken als JS — läuft auch unter `file://` |
| Icons | `js/icons.js` | Inline-SVG-Iconset (Lucide, ISC-Lizenz) — offline |
| Inhalte (Quelle) | `data/` | 9 Module · 65 Lerneinheiten · ~1.600 Fragen (JSON — zum Bearbeiten) |
| Alt-System | `arena.html` u.a. | Mündliche Prüfung, Arena, Creator (KI-Funktionen brauchen Server) |

## ✨ Funktionen (v8)

- **Bibliothek** — alle 9 Module mit Akzentfarben, Kompetenzbereichen und Lerneinheiten (dunkles Design)
- **Training** — Prüfungsbereitschafts-Ring, SRS-Wiederholung (fällige Karten), gezieltes Modul-Training mit lokaler Bewertung, Prüfungsverlauf
- **Prüfungs-Simulator** — echter Klausurzettel mit Fallbeispiel + Arztbrief, alle 10 Klausur-Aufgabentypen + 5 ZWP-Typen, Aufgaben-Navigator mit Live-Status (grün + ✓), Timer mit Farbwarnung, Autosave alle 5 s, Session-Wiederherstellung nach Reload, R/F-Toggle-Off, Bewertung mit Notenbildung, Themen- & KB-Analyse, Musterlösungen
- **Notizbuch** — lokale Notizen pro Modul
- **Profil** — Statistiken, XP/Level, Prüfungsverlauf, Alt-System-Tools
- Alles **lokal** im Browser: Profil, Fortschritt, Notizen, Klausurergebnisse (localStorage) — keine Anmeldung bei Google nötig

> **Hinweis:** Die KI-Funktionen der Server-Version (KI-generierte Zwischenprüfung, KI-Bewertung von Freitexten, Mündliche Prüfung, Arena) laufen hier in lokalen Varianten: Die Zwischenprüfung wird aus dem geprüften PflAPrV-Bogen zusammengestellt, Freitexte werden über eine Heuristik (Antworttiefe + Fachsprache) bewertet.

## 🚀 Auf GitHub Pages veröffentlichen (2 Minuten)

1. **Repo erstellen**: github.com → *New repository* → z.B. `slm-system`
2. **Dateien hochladen**: alle Dateien aus diesem Ordner (nicht den Ordner selbst) — per `git push` oder *uploading an existing file* (Drag & Drop)
3. **Pages aktivieren**: Repo → *Settings* → *Pages* → Source: **Deploy from a branch** → Branch: **main** / **root** → Save
4. Fertig: `https://<username>.github.io/slm-system/` 🎉

Die App funktioniert **mit und ohne Sub-Pfad** (`/repo-name/` und Domain-Root) — Datenpfade werden automatisch aufgelöst.

### Optional: Vercel für KI-Funktionen

Das selbe Repo kann auf [Vercel](https://vercel.com) deployt werden — dann laufen die KI-Routen (`api/grade.js`, `api/db.js`) und die Alt-System-KI-Tools (Mündliche Prüfung, Arena, KI-Zwischenprüfung):

1. Vercel → *Import Repository* (Framework: Other, kein Build nötig)
2. Environment-Variable setzen: `ZAI_API_KEY` (oder den in `api/grade.js` erwarteten Key)
3. Deploy

## 🗂️ Daten anpassen

- `data/modules.json` — Modulnamen, Farben, Kompetenzbereiche
- `data/summaries.json` — Lerneinheiten (HTML, wird automatisch ins dunkle Design gemappt)
- `data/question-banks/moduleX_questions.json` — Fragenbanken (Typen: `richtig_falsch`, `nennen_liste`, `freitext_box`, `tabelle_*`, `zuordnung`, `ergaenzen_liste`, `definition_plus_beispiele`, `ankreuzen_begruenden` …)

**Nach dem Bearbeiten** einmal `js/data-local.js` neu generieren (die App liest diese eingebettete Datei zuerst):

```bash
python3 tools/build-data-local.py   # oder: data-local.js per Hand anpassen
```

## 🔧 Technik

- Reines HTML/CSS/JS — **kein Build-Schritt, kein Server, kein Internet nötig**
- **Tailwind lokal kompiliert** (`css/tw.css`, aus dem Quelltext generiert) statt CDN — die Seite kann durch gesperrte/schuleigene Netzwerke nicht mehr leer bleiben
- **Fonts & Icons lokal**: Plus Jakarta Sans / Crimson Pro / Inter (woff2) + Font Awesome + Lucide-SVGs im Ordner
- **Daten doppelt verfügbar**: `js/data-local.js` (eingebettet, funktioniert unter `file://`) mit `data/*.json` als Fallback (Server-Deploy)
- **Sicherheitsnetz**: JS-Fehler beim Start werden als sichtbare Fehlerkarte angezeigt — nie wieder eine leere Seite
- Persistenz: `localStorage` (`slm_user_v8`, `slm_srs_v8`, `slm_exams_v8`, `slm_notes_v8`, `slm_active_exam_v1`, …)
- `.nojekyll` liegt bei — GitHub Pages serviert die Dateien unverändert

---

*SLM System v8.0 · Generalistische Pflegeausbildung (PflBG / PflAPrV)*
