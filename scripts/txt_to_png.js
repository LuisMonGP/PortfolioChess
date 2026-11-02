import fs from 'fs';
import path from 'path';

const files = fs.readdirSync('captures').filter(f => f.endsWith('.txt'));
for (const f of files) {
  const content = fs.readFileSync(path.join('captures', f), 'utf8').trim();
  const clean = content.replace(/^"?data:image\/png;base64,/, '').replace(/"$/, '');
  const out = path.join('captures', f.replace('.txt', '.png'));
  fs.writeFileSync(out, Buffer.from(clean, 'base64'));
  console.log('Saved', out, fs.statSync(out).size);
}
