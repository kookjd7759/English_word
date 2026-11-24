const topics = window.wordTopics ?? [];
const nav = document.querySelector('#topics');
let currentTopic;
const sectionSelect = document.querySelector('#section');
const search = document.querySelector('#search');
const study = document.querySelector('#study');
const content = document.querySelector('#content');
const title = document.querySelector('#title');
const count = document.querySelector('#count');

function element(tag, text) {
  const node = document.createElement(tag);
  node.textContent = text;
  return node;
}

function loadTopic() {
  const topic = currentTopic;
  sectionSelect.replaceChildren(new Option('전체 소주제', ''));
  topic?.sections.forEach((section, index) => {
    sectionSelect.add(new Option(section.title || '단어', String(index)));
  });
  search.value = '';
  render();
}

function render() {
  const topic = currentTopic;
  const query = search.value.trim().toLocaleLowerCase();
  const hide = study.getAttribute('aria-pressed') === 'true';
  content.replaceChildren();
  title.textContent = topic?.title ?? '등록된 주제가 없어요';
  let total = 0;
  let visibleSections = 0;

  topic?.sections.forEach((section, index) => {
    if (sectionSelect.value !== '' && Number(sectionSelect.value) !== index) return;
    const rows = section.rows.filter(row => row.some(cell => cell.toLocaleLowerCase().includes(query)));
    const showNote = section.note && !hide && (!query || rows.length || section.note.toLocaleLowerCase().includes(query));
    if (!rows.length && !showNote) return;
    total += rows.filter(row => row.length > 1).length;
    visibleSections += 1;
    const group = element('section', '');
    const heading = element('h3', section.title || '단어');
    heading.id = `section-${index}`;
    group.append(heading);
    if (showNote) group.append(element('p', section.note));
    const table = element('table', '');
    table.setAttribute('aria-labelledby', heading.id);
    const columns = table.createTHead().insertRow();
    for (const label of ['한국어', '영어']) {
      const column = element('th', label);
      column.scope = 'col';
      columns.append(column);
    }
    columns.hidden = !rows.some(row => row.length > 1);
    const body = table.createTBody();
    for (const [prompt, ...answers] of rows) {
      const row = body.insertRow();
      const left = row.insertCell();
      left.textContent = prompt;
      if (!answers.length) {
        left.colSpan = 2;
        continue;
      }
      const right = row.insertCell();
      const answer = element('span', answers.join(' | '));
      answer.lang = 'en';
      if (hide) {
        const reveal = element('button', '정답 보기');
        reveal.type = 'button';
        reveal.className = 'reveal';
        reveal.setAttribute('aria-expanded', 'false');
        answer.hidden = true;
        reveal.addEventListener('click', () => {
          answer.hidden = !answer.hidden;
          reveal.textContent = answer.hidden ? '정답 보기' : '정답 숨기기';
          reveal.setAttribute('aria-expanded', String(!answer.hidden));
        });
        right.append(reveal);
      }
      right.append(answer);
    }
    if (rows.length) group.append(table);
    content.append(group);
  });
  count.textContent = topic ? `단어 ${total}개` : '';
  if (topic && !visibleSections) content.append(element('p', '표시할 단어가 없어요.'));
}

for (const topic of topics) {
  const link = element('a', '📖 ' + topic.file);
  link.hash = encodeURIComponent(topic.file);
  nav.append(link);
}

function openFile() {
  currentTopic = topics.find(topic => '#' + encodeURIComponent(topic.file) === location.hash) ?? topics[0];
  for (const link of nav.children) {
    if (link.hash === '#' + encodeURIComponent(currentTopic.file)) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  loadTopic();
}
window.addEventListener('hashchange', openFile);
sectionSelect.addEventListener('change', render);
search.addEventListener('input', render);
study.addEventListener('click', () => {
  const hide = study.getAttribute('aria-pressed') !== 'true';
  study.setAttribute('aria-pressed', String(hide));
  study.textContent = hide ? '영어 다시 표시' : '영어 가리기';
  render();
});
openFile();
