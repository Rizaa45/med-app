/* Wartungs-Skript: Scannt alle HTML/JS-Dateien nach CSS-Klassen und schreibt
   twbuild/carrier.html + twbuild/tw-input.css fuer die Tailwind-Kompilierung.
   Danach: npx @tailwindcss/cli -i twbuild/tw-input.css -o css/tw.css --minify */
const fs = require("fs");
const path = require("path");

const APP = path.join(__dirname, "..");
const OUT_DIR = path.join(APP, "twbuild");

function scanClasses() {
  const found = new Set();
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) { if (entry.name !== "twbuild" && entry.name !== "node_modules") walk(p); continue; }
      if (/\.(html|js)$/.test(entry.name)) files.push(p);
    }
  };
  walk(APP);

  for (const f of files) {
    const src = fs.readFileSync(f, "utf8");
    const attrRes = [/class="([^"]*)"/g, /class='([^']*)'/g, /class=\\"([^"\\]*)\\"/g];
    for (const re of attrRes) {
      let m;
      while ((m = re.exec(src))) {
        m[1].split(/\s+/).forEach((c) => {
          c = c.trim();
          if (c && !c.includes("${")) found.add(c);
        });
      }
    }
    const strRe = /["'`]([^"'`\n]{2,160})["'`]/g;
    let m;
    while ((m = strRe.exec(src))) {
      const val = m[1];
      if (val.includes("${")) continue;
      const toks = val.split(/\s+/);
      if (toks.length < 1 || toks.length > 24) continue;
      const ok = toks.filter((t) => /^[-a-zA-Z0-9_[\]\/.():%#,]+$/.test(t) && t.length < 40 && /[a-z]/.test(t)).length;
      if (ok !== toks.length) continue;
      const dashy = toks.filter((t) => t.includes("-")).length;
      if (dashy >= Math.ceil(toks.length / 2) || (toks.length === 1 && /^ep-|^glass|^anim|^toast|^pin-|^prose|^gradient|^text-|^bg-|^border|^rounded|^shadow/.test(toks[0]))) {
        toks.forEach((t) => t && found.add(t));
      }
    }
  }

  const cleaned = [...found].filter((c) => {
    if (/^https?:|^\/|^data:|^#\d/.test(c)) return false;
    if (/\.(js|css|html|json|png|svg|md|py)$/.test(c)) return false;
    if (c.includes("=") || c.includes("@")) return false;
    if (/[A-Z]{3,}/.test(c) && !c.includes("-")) return false;
    return true;
  });
  return cleaned;
}

const classes = scanClasses();
console.log(`Found ${classes.length} class names`);
classes.sort();
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, "carrier.html"),
  `<!DOCTYPE html><html><body class="${classes.join(" ")}"></body></html>`);
fs.writeFileSync(path.join(OUT_DIR, "tw-input.css"), `@import "tailwindcss" source(none);

@theme {
  --font-sans: "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif;
  --font-serif: "Crimson Pro", Georgia, serif;
}

@source "./carrier.html";
`);
console.log(`Wrote ${OUT_DIR}/carrier.html + tw-input.css`);
console.log("Naechster Schritt: npx @tailwindcss/cli -i twbuild/tw-input.css -o css/tw.css --minify");
