const fs = require('fs');
const path = require('path');

function fix(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const f of files) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) {
      fix(p);
    } else if (f.name === 'page.tsx') {
      let content = fs.readFileSync(p, 'utf8');
      if (content.includes("'use client'") || content.includes('"use client"')) {
        if (content.includes("export const dynamic = 'force-dynamic';")) {
          content = content.replace("export const dynamic = 'force-dynamic';\n\n", "");
          content = content.replace("export const dynamic = 'force-dynamic';\n", "");
          content = content.replace("export const dynamic = 'force-dynamic';", "");
          fs.writeFileSync(p, content, 'utf8');
          console.log('Removed invalid force-dynamic from client page: ' + p);
        }
      }
    }
  }
}

fix('./apps/web/src/app/(main)');
