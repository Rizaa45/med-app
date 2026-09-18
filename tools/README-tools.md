# Wartungs-Werkzeuge

Diese Skripte brauchst du nur, wenn du **Inhalte oder Klassen änderst**:

## `build-data-local.py` — Daten einbetten
Nach Änderungen an `data/*.json` ausführen:
```bash
python3 tools/build-data-local.py
```
Erzeugt `js/data-local.js` neu (die eingebaute Datenquelle, die auch ohne Server/file:// funktioniert).

## `scan-classes.js` — Tailwind neu kompilieren
Nach Änderungen an HTML/JS (neue CSS-Klassen):
```bash
node tools/scan-classes.js   # schreibt twbuild/carrier.html
npx @tailwindcss/cli -i twbuild/tw-input.css -o css/tw.css --minify
```
Scanned alle Klassen und kompiliert `css/tw.css` neu (lokal, ohne CDN).
