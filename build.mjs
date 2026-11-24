import { createHash } from 'node:crypto';
import { cp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';

const root = new URL('./', import.meta.url);
const words = new URL('words/', root);
const output = new URL('_site/', root);
const collator = new Intl.Collator('ko', { numeric: true });

function clean(value) {
  return value.trim().replace(/<br\s*\/?>/gi, '\n').replace(/\\([!-\/:-@\[-`{-~])/g, '$1');
}

function parse(markdown) {
  const sections = [];
  let section = { title: '', note: '', rows: [] };
  for (const raw of markdown.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const line = raw.trim();
    const heading = line.match(/^\\?\[([^\]]+?)\\?\]\s*(.*)$/);
    if (heading) {
      if (section.rows.length || section.note) sections.push(section);
      section = { title: clean(heading[1]), note: clean(heading[2].replace(/^:\s*/, '')), rows: [] };
    } else if (line.startsWith('|')) {
      const cells = line.slice(1).split(/(?<!\\)\|/);
      if (cells.at(-1) === '') cells.pop();
      if (cells.length && !cells.every(cell => /^:?-+:?$/.test(cell.trim()))) {
        section.rows.push(cells.map(clean));
      }
    }
  }
  if (section.rows.length || section.note) sections.push(section);
  return sections;
}

const entries = await readdir(words, { withFileTypes: true }).catch(error => {
  if (error.code === 'ENOENT') return [];
  throw error;
});
const files = entries
  .filter(file => file.isFile() && /\.md$/i.test(file.name) && !/^(README|AGENTS)\.md$/i.test(file.name))
  .map(file => file.name)
  .sort(collator.compare);

const topics = (await Promise.all(files.map(async file => {
  const sections = parse(await readFile(new URL(encodeURIComponent(file), words), 'utf8'));
  const name = file.replace(/\.md$/i, '').trim();
  const title = name.replace(/^\d+[.)]\s*/, '') || [name, sections[0]?.title].filter(Boolean).join(' ');
  return { file, title, sections };
})));

for (const destination of [output, new URL('study/', output)]) {
  await mkdir(destination, { recursive: true });
  await cp(new URL('site/', root), destination, { recursive: true });
  await writeFile(new URL('words.js', destination), `window.wordTopics = ${JSON.stringify(topics)};\n`);
  const index = new URL('index.html', destination);
  let html = await readFile(index, 'utf8');
  for (const asset of ['style.css', 'app.js', 'words.js']) {
    const bytes = await readFile(new URL(asset, destination));
    const version = createHash('sha256').update(bytes).digest('hex').slice(0, 12);
    html = html.replace('./' + asset, './' + asset + '?v=' + version);
  }
  await writeFile(index, html);
}
console.log(`Built ${topics.length} topics in _site/`);
