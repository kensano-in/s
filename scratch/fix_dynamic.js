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
      if (!content.includes('force-dynamic')) {
        if (content.startsWith("'use client'") || content.startsWith('"use client"')) {
          content = content.replace(/^['"]use client['"];?\r?\n?/, "'use client';\n\nexport const dynamic = 'force-dynamic';\n");
        } else {
          content = "export const dynamic = 'force-dynamic';\n\n" + content;
        }
        fs.writeFileSync(p, content, 'utf8');
        console.log('Added force-dynamic to ' + p);
      }
    }
  }
}

fix('./apps/web/src/app/(main)');
