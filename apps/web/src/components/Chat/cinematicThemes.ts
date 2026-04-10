// ─── Cinematic Dark Themes ────────────────────────────────────────────────────
// Inspired by: brutalist buildings, detective boards, newsprint, dark academia, polaroid walls

const svgBg2 = (svg: string) =>
  `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;

export const CINEMATIC_THEMES = [
  // Lone Window — brutalist dark building, ONE lit window
  {
    id: "lone-window",
    name: "Lone Window",
    style: {
      background: "#060606",
      backgroundImage:
        svgBg2(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'>
        ${Array.from({ length: 10 })
          .map((_, row) =>
            Array.from({ length: 6 })
              .map((_, col) => {
                const x = col * 32 + 8,
                  y = row * 28 + 4;
                const isLit = row === 6 && col === 2;
                const isDim =
                  (row === 3 && col === 4) || (row === 8 && col === 1);
                const fill = isLit
                  ? "rgba(255,235,160,0.75)"
                  : isDim
                    ? "rgba(100,90,50,0.12)"
                    : "rgba(255,255,255,0.025)";
                const stroke = isLit
                  ? "rgba(255,220,100,0.4)"
                  : "rgba(255,255,255,0.04)";
                return `<rect x='${x}' y='${y}' width='20' height='18' rx='1' fill='${fill}' stroke='${stroke}' stroke-width='0.5'/>`;
              })
              .join(""),
          )
          .join("")}
        ${Array.from({ length: 5 })
          .map(
            (_, i) =>
              `<line x1='${i * 40 + 2}' y1='0' x2='${i * 40 + 2}' y2='300' stroke='rgba(255,255,255,0.035)' stroke-width='3'/>`,
          )
          .join("")}
        <ellipse cx='76' cy='188' rx='22' ry='8' fill='rgba(255,220,100,0.05)'/>
        <ellipse cx='76' cy='192' rx='12' ry='5' fill='rgba(255,220,100,0.04)'/>
      </svg>`),
    },
  },

  // Detective Board — red string conspiracy map
  {
    id: "detective",
    name: "Detective",
    style: {
      background: `radial-gradient(ellipse at 40% 20%, #1a0800 0%, transparent 55%), #0c0602`,
      backgroundImage:
        svgBg2(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'>
        ${Array.from({ length: 12 })
          .map(
            (_, i) =>
              `<line x1='0' y1='${i * 25}' x2='200' y2='${i * 25}' stroke='rgba(180,140,80,0.06)' stroke-width='0.5'/>`,
          )
          .join("")}
        ${Array.from({ length: 9 })
          .map(
            (_, i) =>
              `<line x1='${i * 25}' y1='0' x2='${i * 25}' y2='300' stroke='rgba(180,140,80,0.05)' stroke-width='0.5'/>`,
          )
          .join("")}
        <rect x='15'  y='30'  width='40' height='30' rx='2' fill='rgba(200,180,150,0.12)' stroke='rgba(220,200,160,0.2)' stroke-width='0.8' transform='rotate(-5,35,45)'/>
        <rect x='80'  y='20'  width='45' height='32' rx='2' fill='rgba(190,170,140,0.1)'  stroke='rgba(210,190,150,0.18)' stroke-width='0.8' transform='rotate(3,102,36)'/>
        <rect x='142' y='40'  width='38' height='28' rx='2' fill='rgba(200,180,150,0.11)' stroke='rgba(220,200,160,0.18)' stroke-width='0.8' transform='rotate(-4,161,54)'/>
        <rect x='8'   y='130' width='42' height='30' rx='2' fill='rgba(190,170,140,0.1)'  stroke='rgba(210,190,150,0.17)' stroke-width='0.8' transform='rotate(5,29,145)'/>
        <rect x='72'  y='150' width='40' height='30' rx='2' fill='rgba(200,180,150,0.12)' stroke='rgba(220,200,160,0.2)'  stroke-width='0.8' transform='rotate(-7,92,165)'/>
        <rect x='143' y='118' width='38' height='28' rx='2' fill='rgba(190,170,140,0.1)'  stroke='rgba(210,190,150,0.18)' stroke-width='0.8' transform='rotate(6,162,132)'/>
        <rect x='28'  y='222' width='42' height='30' rx='2' fill='rgba(200,180,150,0.1)'  stroke='rgba(220,200,160,0.17)' stroke-width='0.8' transform='rotate(-4,49,237)'/>
        <rect x='130' y='232' width='38' height='28' rx='2' fill='rgba(190,170,140,0.11)' stroke='rgba(210,190,150,0.18)' stroke-width='0.8' transform='rotate(3,149,246)'/>
        <line x1='35' y1='45' x2='102' y2='36' stroke='rgba(200,30,30,0.45)' stroke-width='1'/>
        <line x1='102' y1='36' x2='161' y2='54' stroke='rgba(200,30,30,0.4)'  stroke-width='1'/>
        <line x1='35'  y1='45' x2='29'  y2='145' stroke='rgba(200,30,30,0.35)' stroke-width='1'/>
        <line x1='102' y1='36' x2='92'  y2='165' stroke='rgba(200,30,30,0.4)'  stroke-width='1'/>
        <line x1='161' y1='54' x2='162' y2='132' stroke='rgba(200,30,30,0.35)' stroke-width='1'/>
        <line x1='29'  y1='145' x2='92' y2='165' stroke='rgba(200,30,30,0.4)'  stroke-width='1'/>
        <line x1='92'  y1='165' x2='162' y2='132' stroke='rgba(200,30,30,0.35)' stroke-width='1'/>
        <line x1='29'  y1='145' x2='49'  y2='237' stroke='rgba(200,30,30,0.3)'  stroke-width='1'/>
        <line x1='162' y1='132' x2='149' y2='246' stroke='rgba(200,30,30,0.3)'  stroke-width='1'/>
        ${[
          [35, 45],
          [102, 36],
          [161, 54],
          [29, 145],
          [92, 165],
          [162, 132],
          [49, 237],
          [149, 246],
        ]
          .map(
            ([x, y]) =>
              `<circle cx='${x}' cy='${y}' r='2.5' fill='rgba(220,40,40,0.7)'/>`,
          )
          .join("")}
        <ellipse cx='100' cy='315' rx='65' ry='45' fill='rgba(0,0,0,0.65)'/>
      </svg>`),
    },
  },

  // Newsprint — torn newspaper collage on scratched black
  {
    id: "newsprint",
    name: "Newsprint",
    style: {
      background: "#070707",
      backgroundImage:
        svgBg2(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'>
        <line x1='20' y1='60'  x2='185' y2='175' stroke='rgba(255,255,255,0.035)' stroke-width='1.8'/>
        <line x1='0'  y1='145' x2='165' y2='255' stroke='rgba(255,255,255,0.028)' stroke-width='2.5'/>
        <line x1='75' y1='45'  x2='200' y2='225' stroke='rgba(255,255,255,0.022)' stroke-width='1.2'/>
        <line x1='40' y1='105' x2='155' y2='25'  stroke='rgba(255,255,255,0.025)' stroke-width='1.5'/>
        <line x1='95' y1='205' x2='200' y2='185' stroke='rgba(255,255,255,0.02)'  stroke-width='1'/>
        <path d='M0,0 L0,55 Q10,45 20,53 Q30,61 42,48 Q54,35 65,51 Q76,67 88,50 Q100,33 112,51 Q124,69 136,50 Q148,31 160,49 Q172,67 185,50 Q197,33 200,45 L200,0 Z' fill='rgba(215,208,192,0.18)'/>
        ${Array.from({ length: 4 })
          .map(
            (_, i) =>
              `<line x1='10' y1='${13 + i * 9}' x2='190' y2='${13 + i * 9}' stroke='rgba(0,0,0,0.28)' stroke-width='0.7'/>`,
          )
          .join("")}
        <path d='M0,300 L0,255 Q14,266 26,258 Q38,250 50,261 Q62,272 75,258 Q88,244 100,260 Q112,276 126,257 Q140,238 152,256 Q164,274 180,255 Q196,236 200,250 L200,300 Z' fill='rgba(215,208,192,0.15)'/>
        ${Array.from({ length: 3 })
          .map(
            (_, i) =>
              `<line x1='10' y1='${268 + i * 9}' x2='190' y2='${268 + i * 9}' stroke='rgba(0,0,0,0.22)' stroke-width='0.7'/>`,
          )
          .join("")}
      </svg>`),
    },
  },

  // Dark Academia — crumpled paper, envelope, wax seal, paperclip
  {
    id: "dark-academia",
    name: "Dark Academia",
    style: {
      background: `radial-gradient(ellipse at 40% 40%, #1a1510 0%, transparent 60%), #0d0b08`,
      backgroundImage:
        svgBg2(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'>
        ${Array.from({ length: 14 })
          .map(
            (_, i) =>
              `<line x1='0' y1='${i * 22}' x2='200' y2='${i * 22}' stroke='rgba(180,160,120,0.06)' stroke-width='0.5'/>`,
          )
          .join("")}
        <path d='M25,50 Q30,45 42,52 L162,48 Q172,44 177,52 L180,232 Q176,240 167,234 L36,230 Q26,236 23,228 Z' fill='rgba(210,200,175,0.11)' stroke='rgba(200,185,155,0.18)' stroke-width='0.8'/>
        <line x1='42' y1='50' x2='56'  y2='232' stroke='rgba(180,165,130,0.09)' stroke-width='0.7'/>
        <line x1='92' y1='48' x2='102' y2='234' stroke='rgba(180,165,130,0.07)' stroke-width='0.5'/>
        <line x1='23' y1='122' x2='180' y2='117' stroke='rgba(180,165,130,0.06)' stroke-width='0.6'/>
        <path d='M45,55 L157,55 L157,102 L101,137 L45,102 Z' fill='rgba(190,175,145,0.05)' stroke='rgba(175,160,130,0.1)' stroke-width='0.7'/>
        <line x1='45'  y1='55' x2='101' y2='90' stroke='rgba(175,160,130,0.08)' stroke-width='0.5'/>
        <line x1='157' y1='55' x2='101' y2='90' stroke='rgba(175,160,130,0.08)' stroke-width='0.5'/>
        <circle cx='132' cy='212' r='18' fill='rgba(60,55,50,0.55)' stroke='rgba(80,70,60,0.4)' stroke-width='1'/>
        <circle cx='132' cy='212' r='14' fill='rgba(50,45,40,0.5)'/>
        <circle cx='132' cy='212' r='6'  fill='none' stroke='rgba(120,110,90,0.4)' stroke-width='0.8'/>
        <line x1='132' y1='198' x2='132' y2='226' stroke='rgba(120,110,90,0.3)' stroke-width='0.7'/>
        <line x1='118' y1='212' x2='146' y2='212' stroke='rgba(120,110,90,0.3)' stroke-width='0.7'/>
        <path d='M50,60 Q48,54 54,52 Q60,50 62,56 L62,82 Q62,88 56,88 Q50,88 50,82 L50,64 Q50,60 53,59' fill='none' stroke='rgba(160,150,130,0.28)' stroke-width='1.2' stroke-linecap='round'/>
        ${Array.from({ length: 6 })
          .map(
            (_, i) =>
              `<line x1='50' y1='${142 + i * 13}' x2='${132 + (i % 3) * 8}' y2='${142 + i * 13}' stroke='rgba(160,145,115,0.1)' stroke-width='0.8'/>`,
          )
          .join("")}
      </svg>`),
    },
  },

  // Polaroid Wall — scattered dark photos with connecting strings
  {
    id: "polaroid-wall",
    name: "Polaroid Wall",
    style: {
      background: "#060505",
      backgroundImage:
        svgBg2(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'>
        <rect x='5'   y='10'  width='55' height='48' rx='2' fill='rgba(30,25,20,0.82)' stroke='rgba(80,70,60,0.28)' stroke-width='0.8' transform='rotate(-12,32,34)'/>
        <rect x='10'  y='14'  width='45' height='30' rx='1' fill='rgba(20,18,15,0.9)'  transform='rotate(-12,32,34)'/>
        <rect x='80'  y='5'   width='55' height='48' rx='2' fill='rgba(28,22,18,0.8)'  stroke='rgba(75,65,55,0.28)' stroke-width='0.8' transform='rotate(8,107,29)'/>
        <rect x='85'  y='9'   width='45' height='30' rx='1' fill='rgba(18,16,12,0.9)'  transform='rotate(8,107,29)'/>
        <rect x='140' y='15'  width='55' height='48' rx='2' fill='rgba(30,25,20,0.82)' stroke='rgba(80,70,60,0.28)' stroke-width='0.8' transform='rotate(-5,167,39)'/>
        <rect x='145' y='19'  width='45' height='30' rx='1' fill='rgba(20,18,15,0.9)'  transform='rotate(-5,167,39)'/>
        <rect x='0'   y='100' width='55' height='48' rx='2' fill='rgba(28,22,18,0.8)'  stroke='rgba(75,65,55,0.28)' stroke-width='0.8' transform='rotate(10,27,124)'/>
        <rect x='5'   y='104' width='45' height='30' rx='1' fill='rgba(18,16,12,0.9)'  transform='rotate(10,27,124)'/>
        <rect x='70'  y='110' width='60' height='52' rx='2' fill='rgba(30,25,20,0.85)' stroke='rgba(80,70,60,0.3)'  stroke-width='0.8' transform='rotate(-8,100,136)'/>
        <rect x='75'  y='114' width='50' height='35' rx='1' fill='rgba(15,13,10,0.9)'  transform='rotate(-8,100,136)'/>
        <rect x='145' y='95'  width='55' height='48' rx='2' fill='rgba(28,22,18,0.8)'  stroke='rgba(75,65,55,0.28)' stroke-width='0.8' transform='rotate(6,172,119)'/>
        <rect x='150' y='99'  width='45' height='30' rx='1' fill='rgba(18,16,12,0.9)'  transform='rotate(6,172,119)'/>
        <rect x='10'  y='213' width='55' height='48' rx='2' fill='rgba(30,25,20,0.82)' stroke='rgba(80,70,60,0.28)' stroke-width='0.8' transform='rotate(-9,37,237)'/>
        <rect x='15'  y='217' width='45' height='30' rx='1' fill='rgba(20,18,15,0.9)'  transform='rotate(-9,37,237)'/>
        <rect x='80'  y='222' width='55' height='48' rx='2' fill='rgba(28,22,18,0.8)'  stroke='rgba(75,65,55,0.28)' stroke-width='0.8' transform='rotate(7,107,246)'/>
        <rect x='85'  y='226' width='45' height='30' rx='1' fill='rgba(18,16,12,0.9)'  transform='rotate(7,107,246)'/>
        <rect x='148' y='218' width='50' height='44' rx='2' fill='rgba(30,25,20,0.82)' stroke='rgba(80,70,60,0.28)' stroke-width='0.8' transform='rotate(-4,173,240)'/>
        <rect x='152' y='222' width='42' height='28' rx='1' fill='rgba(20,18,15,0.9)'  transform='rotate(-4,173,240)'/>
        <circle cx='35'  cy='30'  r='3' fill='rgba(255,255,255,0.05)'/>
        <circle cx='100' cy='125' r='4' fill='rgba(255,255,255,0.04)'/>
        <line x1='32'  y1='34'  x2='107' y2='29'  stroke='rgba(180,150,120,0.18)' stroke-width='0.7'/>
        <line x1='107' y1='29'  x2='167' y2='39'  stroke='rgba(180,150,120,0.16)' stroke-width='0.7'/>
        <line x1='27'  y1='124' x2='100' y2='136' stroke='rgba(180,150,120,0.18)' stroke-width='0.7'/>
        <line x1='100' y1='136' x2='172' y2='119' stroke='rgba(180,150,120,0.16)' stroke-width='0.7'/>
        <line x1='32'  y1='34'  x2='27'  y2='124' stroke='rgba(180,150,120,0.14)' stroke-width='0.7'/>
        <line x1='167' y1='39'  x2='172' y2='119' stroke='rgba(180,150,120,0.14)' stroke-width='0.7'/>
        ${[
          [32, 34],
          [107, 29],
          [167, 39],
          [27, 124],
          [100, 136],
          [172, 119],
          [37, 237],
          [173, 240],
        ]
          .map(
            ([x, y]) =>
              `<circle cx='${x}' cy='${y}' r='2' fill='rgba(160,140,110,0.45)'/>`,
          )
          .join("")}
      </svg>`),
    },
  },

  // Noir Rain — black city glass with rain and reflected lights
  {
    id: "noir-rain",
    name: "Noir Rain",
    style: {
      background: `radial-gradient(ellipse at 50% 30%, #0d0d12 0%, transparent 55%), #060608`,
      backgroundImage:
        svgBg2(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'>
        ${Array.from({ length: 18 })
          .map((_, i) => {
            const x = (i * 13 + 5) % 195,
              len = 25 + (i % 32),
              op = 0.06 + (i % 5) * 0.022;
            return `<line x1='${x}' y1='${i % 42}' x2='${x - 4}' y2='${(i % 42) + len}' stroke='rgba(200,210,235,${op})' stroke-width='${0.7 + (i % 3) * 0.4}'/>`;
          })
          .join("")}
        ${Array.from({ length: 9 })
          .map((_, i) => {
            const x = ((i * 47 + 20) % 175) + 12,
              y = ((i * 37 + 10) % 250) + 25,
              r = 2 + (i % 4);
            return `<circle cx='${x}' cy='${y}' r='${r}' fill='rgba(180,195,225,${0.05 + (i % 3) * 0.02})'/><circle cx='${x - r * 0.3}' cy='${y - r * 0.4}' r='${r * 0.35}' fill='rgba(255,255,255,0.06)'/>`;
          })
          .join("")}
        <ellipse cx='100' cy='292' rx='85' ry='22' fill='rgba(200,180,100,0.04)'/>
        <ellipse cx='28'  cy='288' rx='28' ry='10' fill='rgba(160,180,225,0.04)'/>
        <ellipse cx='178' cy='282' rx='22' ry='9'  fill='rgba(200,160,120,0.04)'/>
      </svg>`),
    },
  },

  // Film Grain — cinema film strip with grain
  {
    id: "film-grain",
    name: "Film Grain",
    style: {
      background: `radial-gradient(ellipse at 30% 60%, #050d18 0%, transparent 60%), #050508`,
      backgroundImage:
        svgBg2(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'>
        ${Array.from({ length: 10 })
          .map(
            (_, i) =>
              `<rect x='3' y='${20 + i * 27}' width='10' height='16' rx='3' fill='none' stroke='rgba(255,255,255,0.07)' stroke-width='1'/>`,
          )
          .join("")}
        ${Array.from({ length: 10 })
          .map(
            (_, i) =>
              `<rect x='187' y='${20 + i * 27}' width='10' height='16' rx='3' fill='none' stroke='rgba(255,255,255,0.07)' stroke-width='1'/>`,
          )
          .join("")}
        ${Array.from({ length: 130 })
          .map((_, i) => {
            const x = ((i * 37 + 11) % 196) + 2,
              y = ((i * 53 + 7) % 296) + 2;
            const r = i % 22 === 0 ? 1.2 : 0.45;
            const op = 0.02 + (i % 9) * 0.008;
            return `<circle cx='${x}' cy='${y}' r='${r}' fill='rgba(255,255,255,${op})'/>`;
          })
          .join("")}
        ${Array.from({ length: 10 })
          .map(
            (_, i) =>
              `<line x1='18' y1='${28 + i * 27}' x2='182' y2='${28 + i * 27}' stroke='rgba(255,255,255,0.02)' stroke-width='0.5'/>`,
          )
          .join("")}
      </svg>`),
    },
  },

  // Cipher — green decoded text terminal
  {
    id: "cipher",
    name: "Cipher",
    style: {
      background: "#030305",
      backgroundImage:
        svgBg2(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300' font-family='monospace'>
        ${Array.from({ length: 18 })
          .map((_, row) =>
            Array.from({ length: 7 })
              .map((_, col) => {
                const x = col * 28 + 5,
                  y = row * 17 + 13;
                const chars = [
                  "0A3F",
                  "FF00",
                  "∆",
                  "Ω",
                  "Σ",
                  "01",
                  "10",
                  "--",
                  "//",
                  "::",
                  "NUL",
                  "EOF",
                ];
                const ch = chars[(row * 3 + col) % chars.length];
                const bright = (row * 7 + col) % 5 === 0;
                const op = bright ? 0.4 : 0.055;
                return `<text x='${x}' y='${y}' font-size='${bright ? 7.5 : 6}' fill='rgba(0,255,140,${op})'>${ch}</text>`;
              })
              .join(""),
          )
          .join("")}
        <rect x='0' y='103' width='200' height='13' fill='rgba(0,255,140,0.04)'/>
        <text x='8' y='114' font-size='8' fill='rgba(0,255,140,0.55)' font-weight='bold'>DECRYPTING... 63%</text>
        <rect x='142' y='105' width='5' height='10' fill='rgba(0,255,140,0.45)' rx='1'/>
      </svg>`),
    },
  },

  // Burned Paper — charred edges with orange ember glow
  {
    id: "burned-paper",
    name: "Burned Paper",
    style: {
      background: `radial-gradient(ellipse at 50% 50%, #180800 0%, #0a0400 60%, #040200 100%)`,
      backgroundImage:
        svgBg2(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'>
        ${Array.from({ length: 16 })
          .map(
            (_, i) =>
              `<line x1='15' y1='${i * 19 + 8}' x2='185' y2='${i * 19 + 8}' stroke='rgba(180,130,60,0.045)' stroke-width='0.5'/>`,
          )
          .join("")}
        <path d='M0,0 Q9,14 4,28 Q-1,42 11,54 Q23,66 7,78 Q-9,90 6,102 L0,300 L0,0 Z' fill='rgba(4,2,0,0.92)'/>
        <path d='M200,0 Q191,16 196,32 Q201,48 187,58 Q173,68 192,82 Q211,96 194,112 L200,300 L200,0 Z' fill='rgba(4,2,0,0.92)'/>
        <path d='M0,0 Q17,5 32,0 Q47,-5 62,6 Q77,17 92,4 Q107,-9 122,7 Q137,23 152,6 Q167,-11 182,5 Q197,21 200,7 L200,0 L0,0 Z' fill='rgba(4,2,0,0.92)'/>
        <path d='M0,300 Q20,289 38,298 Q56,307 72,291 Q88,275 104,294 Q120,313 136,294 Q152,275 168,292 Q184,309 200,294 L200,300 L0,300 Z' fill='rgba(4,2,0,0.92)'/>
        <path d='M2,132 Q6,122 3,112 Q0,102 5,92' fill='none' stroke='rgba(255,80,0,0.14)' stroke-width='3' stroke-linecap='round'/>
        <path d='M198,172 Q193,162 196,152 Q199,142 194,132' fill='none' stroke='rgba(255,60,0,0.11)' stroke-width='3' stroke-linecap='round'/>
        <circle cx='4'   cy='128' r='2'   fill='rgba(255,100,0,0.3)'/>
        <circle cx='196' cy='165' r='1.5' fill='rgba(255,80,0,0.25)'/>
        <circle cx='2'   cy='90'  r='1'   fill='rgba(255,60,0,0.2)'/>
        <circle cx='199' cy='130' r='1.2' fill='rgba(255,70,0,0.22)'/>
      </svg>`),
    },
  },

  // Ink Bleed — sumi-e ink splash on dark paper
  {
    id: "ink-bleed",
    name: "Ink Bleed",
    style: {
      background: `radial-gradient(ellipse at 50% 50%, #0a0a0a 0%, #050505 100%)`,
      backgroundImage:
        svgBg2(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'>
        ${Array.from({ length: 20 })
          .map(
            (_, i) =>
              `<line x1='0' y1='${i * 15}' x2='200' y2='${i * 15 + 2}' stroke='rgba(255,255,255,0.01)' stroke-width='0.8'/>`,
          )
          .join("")}
        <ellipse cx='85' cy='115' rx='58' ry='42' fill='rgba(8,8,8,0.9)'  transform='rotate(-18,85,115)'/>
        <ellipse cx='85' cy='115' rx='44' ry='30' fill='rgba(0,0,0,1)'    transform='rotate(-18,85,115)'/>
        <path d='M58,140 Q55,165 57,188 Q59,198 54,215' fill='none' stroke='rgba(0,0,0,0.85)' stroke-width='5' stroke-linecap='round'/>
        <path d='M105,158 Q102,180 107,200' fill='none' stroke='rgba(0,0,0,0.75)' stroke-width='3.5' stroke-linecap='round'/>
        <ellipse cx='55' cy='222' rx='7' ry='5' fill='rgba(0,0,0,0.75)'/>
        <ellipse cx='106' cy='207' rx='5' ry='3.5' fill='rgba(0,0,0,0.7)'/>
        <circle cx='138' cy='62' r='2'   fill='rgba(0,0,0,0.6)'/>
        <circle cx='150' cy='88' r='3'   fill='rgba(0,0,0,0.55)'/>
        <circle cx='122' cy='98' r='2.5' fill='rgba(0,0,0,0.58)'/>
        <circle cx='158' cy='74' r='1.8' fill='rgba(0,0,0,0.5)'/>
      </svg>`),
    },
  },

  // Cyber Deck — low-contrast matrix grid on carbon fiber dark
  {
    id: "cyber-deck",
    name: "Cyber Deck",
    style: {
      background: "#040504",
      backgroundImage:
        svgBg2(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'>
        ${Array.from({ length: 20 })
          .map(
            (_, i) =>
              `<line x1='0' y1='${i * 15}' x2='200' y2='${i * 15}' stroke='rgba(0,255,100,0.015)' stroke-width='0.5'/>`,
          )
          .join("")}
        ${Array.from({ length: 14 })
          .map(
            (_, i) =>
              `<line x1='${i * 15}' y1='0' x2='${i * 15}' y2='300' stroke='rgba(0,255,100,0.015)' stroke-width='0.5'/>`,
          )
          .join("")}
        ${Array.from({ length: 8 })
          .map(
            (_, i) =>
              `<rect x='${i * 25 + 5}' y='${((i * 37) % 280) + 10}' width='8' height='4' fill='rgba(0,200,80,0.2)'/>`,
          )
          .join("")}
        <path d='M20,40 L30,30 L170,30 L180,40' fill='none' stroke='rgba(0,255,100,0.08)' stroke-width='1.5'/>
        <path d='M20,260 L30,270 L170,270 L180,260' fill='none' stroke='rgba(0,255,100,0.08)' stroke-width='1.5'/>
        <circle cx='100' cy='150' r='50' fill='none' stroke='rgba(0,255,100,0.02)' stroke-width='15'/>
        <circle cx='100' cy='150' r='35' fill='none' stroke='rgba(0,255,100,0.03)' stroke-width='1' stroke-dasharray='4 2'/>
      </svg>`),
    },
  },

  // Neon Void — deep synthwave purple and dark wireframe
  {
    id: "neon-void",
    name: "Neon Void",
    style: {
      background: `radial-gradient(ellipse at 50% 100%, #1a0a2a 0%, #05020a 70%, #020005 100%)`,
      backgroundImage:
        svgBg2(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'>
        ${Array.from({ length: 10 })
          .map((_, i) => {
            const y = 300 - Math.pow(i, 1.8) * 4;
            return `<line x1='0' y1='${y}' x2='200' y2='${y}' stroke='rgba(200,50,255,${0.02 + i * 0.01})' stroke-width='1'/>`;
          })
          .join("")}
        ${Array.from({ length: 13 })
          .map((_, i) => {
            const x = 100 + (i - 6) * 25;
            return `<line x1='100' y1='150' x2='${x}' y2='300' stroke='rgba(100,50,255,0.04)' stroke-width='1'/>`;
          })
          .join("")}
        <polygon points='100,100 130,160 70,160' fill='none' stroke='rgba(255,0,150,0.1)' stroke-width='1.5'/>
        <polygon points='100,110 120,155 80,155' fill='rgba(255,0,150,0.02)' stroke='rgba(200,0,255,0.15)' stroke-width='0.8'/>
        <ellipse cx='100' cy='280' rx='80' ry='15' fill='rgba(255,0,255,0.05)'/>
      </svg>`),
    },
  },

  // Hologram Grid — stark cyan/blue interface schematic
  {
    id: "hologram-grid",
    name: "Hologram Grid",
    style: {
      background: "#020609",
      backgroundImage:
        svgBg2(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'>
        <circle cx='100' cy='150' r='80' fill='none' stroke='rgba(0,180,255,0.05)' stroke-width='0.5'/>
        <circle cx='100' cy='150' r='75' fill='none' stroke='rgba(0,255,255,0.08)' stroke-width='0.5' stroke-dasharray='1 3'/>
        <line x1='20' y1='150' x2='180' y2='150' stroke='rgba(0,200,255,0.05)' stroke-width='1'/>
        <line x1='100' y1='70' x2='100' y2='230' stroke='rgba(0,200,255,0.05)' stroke-width='1'/>
        <rect x='85' y='135' width='30' height='30' fill='none' stroke='rgba(0,255,255,0.1)' stroke-width='1'/>
        ${Array.from({ length: 4 })
          .map((_, i) => {
            const x = i % 2 === 0 ? 80 : 115;
            const y = i < 2 ? 130 : 165;
            return `<rect x='${x}' y='${y}' width='5' height='5' fill='rgba(0,255,255,0.2)'/>`;
          })
          .join("")}
        <text x='110' y='145' font-family='monospace' font-size='6' fill='rgba(0,200,255,0.2)'>SYS.ON</text>
        ${Array.from({ length: 30 })
          .map(
            (_, i) =>
              `<line x1='0' y1='${i * 10}' x2='200' y2='${i * 10}' stroke='rgba(0,100,255,0.01)' stroke-width='4'/>`,
          )
          .join("")}
      </svg>`),
    },
  },

  // Blood Moon — deep crimson gradient, minimal, vampiric elegance
  {
    id: "blood-moon",
    name: "Blood Moon",
    style: {
      background: `radial-gradient(circle at 80% 20%, #2a0505 0%, #0d0202 50%, #030000 100%)`,
      backgroundImage:
        svgBg2(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'>
        <circle cx='160' cy='60' r='35' fill='rgba(255,20,20,0.03)'/>
        <circle cx='160' cy='60' r='30' fill='rgba(255,0,0,0.04)'/>
        <circle cx='160' cy='60' r='25' fill='rgba(255,50,50,0.05)'/>
        <path d='M0,300 L50,230 L80,260 L140,180 L200,250 L200,300 Z' fill='rgba(0,0,0,0.8)'/>
        <path d='M0,300 L30,260 L60,280 L110,210 L200,280 L200,300 Z' fill='rgba(15,2,2,0.6)'/>
        ${Array.from({ length: 15 })
          .map((_, i) => {
            const x = (i * 23) % 200,
              y = (i * 31) % 150;
            return `<circle cx='${x}' cy='${y}' r='${0.5 + (i % 2)}' fill='rgba(255,100,100,${0.1 + (i % 5) * 0.05})'/>`;
          })
          .join("")}
      </svg>`),
    },
  },

  // ── Absolute God-Tier Backgrounds ──
  // Hyper Light — Angelic geometric fractals, bright & clean with gold accents
  {
    id: "hyper-light",
    name: "Hyper Light",
    style: {
      background: `radial-gradient(circle at 50% -20%, #2a2a35 0%, #0f0f15 50%, #030305 100%)`,
      backgroundImage:
        svgBg2(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'>
        ${Array.from({ length: 12 })
          .map((_, i) => {
            const angle = (i - 6) * 12;
            return `<line x1='100' y1='-50' x2='100' y2='350' stroke='rgba(255,255,255,${0.02 + (i % 3) * 0.02})' stroke-width='${1 + (i % 3)}' transform='rotate(${angle}, 100, -50)'/>`;
          })
          .join("")}
        <circle cx='100' cy='-40' r='100' fill='none' stroke='rgba(255,220,150,0.1)' stroke-width='2'/>
        <circle cx='100' cy='-40' r='150' fill='none' stroke='rgba(255,255,255,0.06)' stroke-width='0.5'/>
        <polygon points='100,-20 180,300 20,300' fill='none' stroke='rgba(255,215,0,0.08)' stroke-width='1.5'/>
        <polygon points='100,-40 220,300 -20,300' fill='none' stroke='rgba(255,255,255,0.04)' stroke-width='1'/>
        ${Array.from({ length: 20 })
          .map(
            (_, i) =>
              `<circle cx='${(i * 53) % 200}' cy='${(i * 71) % 300}' r='0.8' fill='rgba(255,240,200,${0.2 + (i % 5) * 0.1})'/>`,
          )
          .join("")}
      </svg>`),
    },
  },

  // Neural Net — Glowing purple and blue crystalline nodes
  {
    id: "neural-net",
    name: "Neural Net",
    style: {
      background: `radial-gradient(ellipse at 50% 50%, #0f0820 0%, #04020a 100%)`,
      backgroundImage:
        svgBg2(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'>
        ${Array.from({ length: 25 })
          .map((_, i) => {
            const x1 = (i * 37) % 200,
              y1 = (i * 53) % 300;
            const x2 = ((i + 3) * 29) % 200,
              y2 = ((i + 2) * 41) % 300;
            return `<line x1='${x1}' y1='${y1}' x2='${x2}' y2='${y2}' stroke='rgba(100,150,255,${0.03 + (i % 3) * 0.03})' stroke-width='${0.5 + (i % 2) * 0.5}'/>`;
          })
          .join("")}
        ${Array.from({ length: 25 })
          .map((_, i) => {
            const x = (i * 37) % 200,
              y = (i * 53) % 300;
            return `<circle cx='${x}' cy='${y}' r='${1.5 + (i % 3)}' fill='rgba(180,100,255,${0.2 + (i % 4) * 0.1})'/>
                  <circle cx='${x}' cy='${y}' r='${4 + (i % 3)}' fill='rgba(100,150,255,0.08)'/>`;
          })
          .join("")}
      </svg>`),
    },
  },

  // Akira City — Heavy raining neon cyberpunk megalopolis
  {
    id: "akira-city",
    name: "Akira City",
    style: {
      background: `linear-gradient(180deg, #020205 0%, #0a0410 40%, #200010 100%)`,
      backgroundImage:
        svgBg2(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'>
        <rect x='10' y='180' width='30' height='120' fill='rgba(5,5,15,0.9)'/>
        <rect x='50' y='140' width='40' height='160' fill='rgba(10,5,20,0.85)'/>
        <rect x='100' y='200' width='45' height='100' fill='rgba(15,5,15,0.9)'/>
        <rect x='155' y='120' width='35' height='180' fill='rgba(10,2,10,0.8)'/>
        ${Array.from({ length: 10 })
          .map(
            (_, i) =>
              `<rect x='55' y='${145 + i * 15}' width='4' height='8' fill='rgba(255,0,100,0.4)'/>`,
          )
          .join("")}
        ${Array.from({ length: 8 })
          .map(
            (_, i) =>
              `<rect x='165' y='${130 + i * 20}' width='8' height='3' fill='rgba(0,255,200,0.4)'/>`,
          )
          .join("")}
        ${Array.from({ length: 40 })
          .map((_, i) => {
            const x = (i * 13) % 200,
              y = (i * 31) % 300;
            return `<line x1='${x}' y1='${y}' x2='${x - 2}' y2='${y + 15}' stroke='rgba(150,200,255,${0.1 + (i % 4) * 0.05})' stroke-width='0.6'/>`;
          })
          .join("")}
        <ellipse cx='100' cy='280' rx='100' ry='20' fill='rgba(255,0,50,0.1)'/>
        <ellipse cx='100' cy='290' rx='50' ry='10' fill='rgba(0,255,200,0.1)'/>
      </svg>`),
    },
  },

  // Quantum Realm — Atomic orbital rings, deep subspace dark matter
  {
    id: "quantum-realm",
    name: "Quantum Realm",
    style: {
      background: `radial-gradient(circle at 30% 60%, #001018 0%, #00030a 100%)`,
      backgroundImage:
        svgBg2(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'>
        <ellipse cx='100' cy='150' rx='80' ry='30' fill='none' stroke='rgba(0,255,255,0.15)' stroke-width='0.8' transform='rotate(30,100,150)'/>
        <ellipse cx='100' cy='150' rx='80' ry='30' fill='none' stroke='rgba(255,0,255,0.15)' stroke-width='0.8' transform='rotate(-30,100,150)'/>
        <ellipse cx='100' cy='150' rx='80' ry='30' fill='none' stroke='rgba(200,255,0,0.1)' stroke-width='0.5' transform='rotate(90,100,150)'/>
        <circle cx='100' cy='150' r='4' fill='rgba(0,255,255,0.6)'/>
        <circle cx='100' cy='150' r='10' fill='rgba(0,255,255,0.2)' filter='blur(2px)'/>
        <circle cx='40' cy='115' r='2' fill='rgba(255,0,255,0.8)'/>
        <circle cx='160' cy='185' r='2.5' fill='rgba(0,255,255,0.8)'/>
        <circle cx='100' cy='70' r='1.5' fill='rgba(200,255,0,0.8)'/>
        ${Array.from({ length: 30 })
          .map((_, i) => {
            const x = (i * 17) % 200,
              y = (i * 23) % 300;
            return `<circle cx='${x}' cy='${y}' r='${0.5 + (i % 2)}' fill='rgba(200,255,255,${0.1 + (i % 5) * 0.05})'/>`;
          })
          .join("")}
      </svg>`),
    },
  },

  // Hellgate — Flowing magma trails on cracked Obsidian
  {
    id: "hellgate",
    name: "Hellgate",
    style: {
      background: `linear-gradient(135deg, #050000 0%, #100200 40%, #030000 100%)`,
      backgroundImage:
        svgBg2(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'>
        <path d='M20,0 L25,40 L10,80 L30,150 L15,220 L40,300' fill='none' stroke='rgba(255,60,0,0.2)' stroke-width='2'/>
        <path d='M20,0 L25,40 L10,80 L30,150 L15,220 L40,300' fill='none' stroke='rgba(255,200,0,0.4)' stroke-width='0.5'/>
        
        <path d='M180,0 L160,60 L185,120 L150,180 L170,250 L140,300' fill='none' stroke='rgba(255,40,0,0.25)' stroke-width='3'/>
        <path d='M180,0 L160,60 L185,120 L150,180 L170,250 L140,300' fill='none' stroke='rgba(255,150,0,0.4)' stroke-width='1'/>
        
        <path d='M80,300 Q100,250 80,200 T120,100 T100,0' fill='none' stroke='rgba(200,20,0,0.15)' stroke-width='6'/>
        <path d='M80,300 Q100,250 80,200 T120,100 T100,0' fill='none' stroke='rgba(255,100,0,0.3)' stroke-width='1.5'/>

        ${Array.from({ length: 20 })
          .map((_, i) => {
            const x = (i * 29) % 200,
              y = (i * 43) % 300;
            return `<polygon points='${x},${y} ${x + 3},${y + 5} ${x - 2},${y + 7}' fill='rgba(255,80,0,0.15)'/>`;
          })
          .join("")}
      </svg>`),
    },
  },

  // ── God-Tier Professional Themes ──
  // Studio Obsidian — Matte deep charcoal with subtle light play
  {
    id: "studio-obsidian",
    name: "Studio Obsidian",
    style: {
      background: "#08080a",
      backgroundImage: svgBg2(`<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'>
        <defs>
          <radialGradient id='g' cx='50%' cy='50%' r='50%'>
            <stop offset='0%' stop-color='rgba(255,255,255,0.03)'/>
            <stop offset='100%' stop-color='transparent'/>
          </radialGradient>
        </defs>
        <rect width='100%' height='100%' fill='url(#g)'/>
        <path d='M0,100 L400,300' stroke='rgba(255,255,255,0.01)' stroke-width='1'/>
        <path d='M0,300 L400,100' stroke='rgba(255,255,255,0.01)' stroke-width='1'/>
      </svg>`),
    },
  },
  // Executive Slate — Professional graphite with slate blue undertones
  {
    id: "executive-slate",
    name: "Executive Slate",
    style: {
      background: "linear-gradient(135deg, #12141a 0%, #0a0b0f 100%)",
      backgroundImage: svgBg2(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'>
        <rect width='100%' height='100%' fill='none' stroke='rgba(129,140,248,0.02)' stroke-width='0.5'/>
        <circle cx='0' cy='0' r='100' fill='rgba(129,140,248,0.01)'/>
      </svg>`),
    },
  },
  // Prism Glass — Refractive glass aesthetics
  {
    id: "prism-glass",
    name: "Prism Glass",
    style: {
      background: "radial-gradient(circle at top left, #1a1a2e, #0f0f1a)",
      backgroundImage: svgBg2(`<svg xmlns='http://www.w3.org/2000/svg' width='100%' height='100%'>
        <filter id='f'><feGaussianBlur stdDeviation='40'/></filter>
        <circle cx='20%' cy='20%' r='15%' fill='rgba(99,102,241,0.05)' filter='url(#f)'/>
        <circle cx='80%' cy='80%' r='20%' fill='rgba(139,92,246,0.03)' filter='url(#f)'/>
      </svg>`),
    },
  },
];
