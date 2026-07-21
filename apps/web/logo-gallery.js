const http = require('http');

const PORT = 3001;

// Curated suite of 10 flat, minimalist, global-standard brand glyphs
const logos = [
  {
    id: 1,
    name: "The Restored OG Bold V (Official)",
    desc: "Your original mathematically balanced bold V path. Symmetrical, solid, and timelessly recognizable.",
    svg: `<svg viewBox="0 0 100 100" width="100%" height="100%">
  <path d="M 12,15 H 38 L 50,60 L 62,15 H 88 L 58,85 H 42 Z" fill="#FFFFFF" />
</svg>`
  },
  {
    id: 2,
    name: "The Diamond Shield",
    desc: "A secure outer diamond containing a nested V chevron. Represents Privacy, Trust, and Security.",
    svg: `<svg viewBox="0 0 100 100" width="100%" height="100%">
  <polygon points="50,15 85,50 50,85 15,50" fill="none" stroke="#FFFFFF" stroke-width="8" stroke-linejoin="round" />
  <path d="M 32,45 L 50,63 L 68,45" fill="none" stroke="#FFFFFF" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" />
</svg>`
  },
  {
    id: 3,
    name: "The Hex Gate",
    desc: "A solid hexagon split down the middle by a clean negative space V, representing an open gateway.",
    svg: `<svg viewBox="0 0 100 100" width="100%" height="100%">
  <polygon points="50,15 85,35 85,65 50,85 15,65 15,35" fill="none" stroke="#FFFFFF" stroke-width="8" stroke-linejoin="round" />
  <path d="M 30,35 L 50,55 L 70,35" fill="none" stroke="#FFFFFF" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" />
</svg>`
  },
  {
    id: 4,
    name: "The Split Slat V (Corporate)",
    desc: "Two separate parallel diagonal slats separated by a uniform negative-space gap.",
    svg: `<svg viewBox="0 0 100 100" width="100%" height="100%">
  <path d="M 25,25 H 41 L 47,65 H 31 Z" fill="#FFFFFF" />
  <path d="M 75,25 H 59 L 53,65 H 69 Z" fill="#FFFFFF" />
</svg>`
  },
  {
    id: 5,
    name: "The Conversation Comet",
    desc: "A solid, clean speech bubble silhouette whose pointer tail wraps diagonally into a V.",
    svg: `<svg viewBox="0 0 100 100" width="100%" height="100%">
  <path d="M 20,25 C 20,25 15,48 24,68 L 44,78 C 44,78 40,62 38,52 L 44,25 Z" fill="#FFFFFF" />
</svg>`
  },
  {
    id: 6,
    name: "The Network Graph V",
    desc: "Three solid node circles connected by two simple flat bars. Represents a unified community graph.",
    svg: `<svg viewBox="0 0 100 100" width="100%" height="100%">
  <line x1="28" y1="28" x2="50" y2="72" stroke="#FFFFFF" stroke-width="8" stroke-linecap="round" />
  <line x1="72" y1="28" x2="50" y2="72" stroke="#FFFFFF" stroke-width="8" stroke-linecap="round" />
  <circle cx="28" cy="28" r="9" fill="#FFFFFF" />
  <circle cx="72" cy="28" r="9" fill="#FFFFFF" />
  <circle cx="50" cy="72" r="11" fill="#FFFFFF" />
</svg>`
  },
  {
    id: 7,
    name: "The Equalizer Caret",
    desc: "Five vertical soundwave capsules forming a V caret. Simple, iconic representation of voice channels.",
    svg: `<svg viewBox="0 0 100 100" width="100%" height="100%">
  <rect x="22" y="28" width="8" height="44" rx="4" fill="#FFFFFF" />
  <rect x="36" y="42" width="8" height="30" rx="4" fill="#FFFFFF" />
  <rect x="50" y="56" width="8" height="16" rx="4" fill="#FFFFFF" />
  <rect x="64" y="42" width="8" height="30" rx="4" fill="#FFFFFF" />
  <rect x="78" y="28" width="8" height="44" rx="4" fill="#FFFFFF" />
</svg>`
  },
  {
    id: 8,
    name: "The Origami Ribbon",
    desc: "A clean flat ribbon that folds simply to form a V, using a light opacity layer to create depth.",
    svg: `<svg viewBox="0 0 100 100" width="100%" height="100%">
  <polygon points="20,20 45,20 50,75 25,45" fill="#FFFFFF" />
  <polygon points="80,20 55,20 50,75 75,45" fill="#FFFFFF" opacity="0.6" />
</svg>`
  },
  {
    id: 9,
    name: "The Portal Ring",
    desc: "A simple flat circle framing a floating V-core in negative space. Perfect for a clean favicon.",
    svg: `<svg viewBox="0 0 100 100" width="100%" height="100%">
  <circle cx="50" cy="50" r="36" fill="none" stroke="#FFFFFF" stroke-width="5" />
  <path d="M 36,32 L 50,68 L 64,32" fill="none" stroke="#FFFFFF" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round" />
</svg>`
  },
  {
    id: 10,
    name: "The Horizon Circle",
    desc: "A solid circular frame cut by a smooth V horizon line running through the center.",
    svg: `<svg viewBox="0 0 100 100" width="100%" height="100%">
  <circle cx="50" cy="50" r="36" fill="none" stroke="#FFFFFF" stroke-width="5" />
  <path d="M 20,38 L 50,72 L 80,38" fill="none" stroke="#FFFFFF" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round" />
</svg>`
  }
];

// Generate HTML Response
const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verlyn Official Logo Laboratory — Restored OG</title>
  <style>
    :root {
      --bg-dark: #07060E;
      --card-bg: #121021;
      --border-color: rgba(123, 79, 233, 0.2);
      --text-main: #FFFFFF;
      --text-muted: #A5A1B8;
      --brand-primary: #7B4FE9;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: var(--bg-dark);
      color: var(--text-main);
      margin: 0;
      padding: 40px 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    header {
      text-align: center;
      max-width: 800px;
      margin-bottom: 48px;
    }
    h1 {
      font-size: 32px;
      font-weight: 900;
      margin: 0 0 12px 0;
      background: linear-gradient(135deg, #FFFFFF 0%, #A584FF 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    p.subtitle {
      font-size: 16px;
      color: var(--text-muted);
      margin: 0;
      line-height: 1.5;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 28px;
      width: 100%;
      max-width: 1200px;
    }
    .card {
      background-color: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      box-shadow: 0 4px 30px rgba(0, 0, 0, 0.4);
      transition: transform 0.2s ease, border-color 0.2s ease;
    }
    .card:hover {
      transform: translateY(-4px);
      border-color: rgba(123, 79, 233, 0.5);
    }
    .preview-container {
      width: 160px;
      height: 160px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
      padding: 20px;
      transition: background-color 0.2s ease;
      background-color: #121021;
      border: 1px solid rgba(255, 255, 255, 0.05);
    }
    .preview-container svg {
      max-width: 100%;
      max-height: 100%;
    }
    .controls {
      display: flex;
      gap: 12px;
      width: 100%;
      margin-bottom: 16px;
      justify-content: center;
    }
    button.btn {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: var(--text-main);
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 12px;
      cursor: pointer;
      font-weight: 600;
      transition: background 0.2s ease, border-color 0.2s ease;
    }
    button.btn:hover {
      background: rgba(255, 255, 255, 0.12);
      border-color: rgba(255, 255, 255, 0.2);
    }
    button.btn.copy-btn {
      background: var(--brand-primary);
      border: none;
      width: 100%;
      padding: 10px;
    }
    button.btn.copy-btn:hover {
      background: #8A60FF;
    }
    .info {
      text-align: left;
      width: 100%;
    }
    .title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .logo-name {
      font-size: 18px;
      font-weight: 700;
      color: #FFFFFF;
      margin: 0;
    }
    .logo-id {
      background: rgba(123, 79, 233, 0.2);
      color: #A584FF;
      font-family: monospace;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
    }
    .logo-desc {
      font-size: 13px;
      color: var(--text-muted);
      line-height: 1.5;
      margin: 0 0 16px 0;
      min-height: 40px;
    }
  </style>
  <script>
    function toggleBg(btn, id) {
      const container = document.getElementById('preview-' + id);
      if (container.style.backgroundColor === 'rgb(255, 255, 255)') {
        container.style.backgroundColor = '#121021';
        btn.textContent = 'Light BG';
      } else {
        container.style.backgroundColor = '#ffffff';
        btn.textContent = 'Dark BG';
      }
    }
    
    function copySvg(btn, svgText) {
      navigator.clipboard.writeText(svgText).then(() => {
        const originalText = btn.textContent;
        btn.textContent = 'Copied SVG!';
        btn.style.background = '#10B981';
        setTimeout(() => {
          btn.textContent = originalText;
          btn.style.background = '';
        }, 2000);
      });
    }
  </script>
</head>
<body>
  <header>
    <h1>Verlyn Brand Icon Laboratory</h1>
    <p class="subtitle">A curated suite of 10 flat brand glyphs with your original bold V vector path restored as the flagship official option.</p>
  </header>
  
  <div class="grid">
    ${logos.map(logo => `
      <div class="card">
        <div class="preview-container" id="preview-${logo.id}">
          ${logo.svg}
        </div>
        <div class="controls">
          <button class="btn" onclick="toggleBg(this, ${logo.id})">Light BG</button>
        </div>
        <div class="info">
          <div class="title-row">
            <h3 class="logo-name">${logo.name}</h3>
            <span class="logo-id">#${logo.id.toString().padStart(2, '0')}</span>
          </div>
          <p class="logo-desc">${logo.desc}</p>
        </div>
          <button class="btn copy-btn" onclick="copySvg(this, \`${logo.svg.replace(/"/g, '&quot;')}\`)">Copy SVG Code</button>
      </div>
    `).join('')}
  </div>
</body>
</html>
`;

// Start Server
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
});

server.listen(PORT, () => {
  console.log(`[Logo Lab] Server successfully running at http://localhost:${PORT}`);
});
