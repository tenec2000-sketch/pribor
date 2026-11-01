// Приборка: виджет для приложения Scriptable. Адреса подставляет кнопка «Скопировать виджет для iPhone».
const RAW = '__RAW__', SITE = '__SITE__';
const COLORS = {code: '#1F6FEB', english: '#0A7A99', edit: '#4B55E0', task: '#4A6CA6', people: '#7A45E6', sport: '#127A78', class: '#33507E', duty: '#33507E'};
const COUNT = ['code', 'english', 'edit', 'task', 'people'];
const WD = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 12); };
const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return ymd(d); };
const weekday = s => (parse(s).getDay() + 6) % 7;
const monday = s => addDays(s, -weekday(s));
const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

function weekKey(S, s) {
  const n = Math.round((parse(monday(s)) - parse(S.settings.anchor)) / (7 * 864e5));
  return ((n % 2) + 2) % 2 ? 'b' : 'a';
}
function resolve(S, date) {
  const own = S.days[date]?.items;
  const list = Array.isArray(own) ? own : S.plan[weekKey(S, date)].items.filter(i => i.day === weekday(date));
  return [...list].sort((a, b) => toMin(a.start) - toMin(b.start));
}
function week(S, date) {
  let total = 0, done = 0;
  for (let i = 0; i < 7; i++) {
    const d = addDays(monday(date), i);
    if (d < (S.settings.since || '')) continue;
    for (const it of resolve(S, d)) {
      if (!COUNT.includes(it.kind)) continue;
      total++;
      if (S.days[d]?.done?.[it.id]) done++;
    }
  }
  return {total, done};
}
const upcoming = (S, date, now) => resolve(S, date).filter(i => toMin(i.end) > now);

async function load() {
  const fm = FileManager.local(), path = fm.joinPath(fm.cacheDirectory(), 'pribor.json');
  try {
    const S = await new Request(`${RAW}?t=${Date.now()}`).loadJSON();
    fm.writeString(path, JSON.stringify(S));
    return S;
  } catch {
    return fm.fileExists(path) ? JSON.parse(fm.readString(path)) : null;
  }
}

function text(stack, value, size, color, bold) {
  const t = stack.addText(value);
  t.font = bold ? Font.boldSystemFont(size) : Font.systemFont(size);
  t.textColor = new Color(color);
  t.lineLimit = 1;
  return t;
}

function build(S, date, now, family) {
  const w = new ListWidget();
  w.url = SITE;
  w.refreshAfterDate = new Date(Date.now() + 15 * 60000);
  if (!S) { text(w, 'Нет данных, открой при связи', 13, '#E8F0FC'); return w; }
  const items = upcoming(S, date, now), wk = week(S, date), next = items[0];
  const line = next ? `${next.start} ${next.title}` : 'На сегодня блоков нет';
  if (family === 'accessoryInline') { text(w, line, 13, '#E8F0FC'); return w; }
  if (family === 'accessoryCircular') { w.addText(`${wk.done}/${wk.total}`).font = Font.boldSystemFont(15); return w; }
  if (family === 'accessoryRectangular') {
    text(w, `Неделя ${wk.done} из ${wk.total}`, 12, '#E8F0FC', true);
    for (const i of items.slice(0, 2)) text(w, `${i.start} ${i.title}`, 12, '#E8F0FC');
    return w;
  }
  w.backgroundColor = new Color('#050A14');
  w.setPadding(12, 14, 12, 14);
  const head = w.addStack();
  text(head, `${WD[parse(date).getDay()]}, ${parse(date).getDate()}`, 13, '#93A9CB', true);
  head.addSpacer();
  text(head, `${wk.done} из ${wk.total}`, 13, '#4FA8FF', true);
  w.addSpacer(8);
  const rows = {systemSmall: 3, systemMedium: 4, systemLarge: 11, systemExtraLarge: 11}[family] || 4;
  if (!items.length) text(w, 'На сегодня блоков больше нет', 14, '#E8F0FC');
  for (const i of items.slice(0, rows)) {
    const row = w.addStack();
    row.centerAlignContent();
    row.spacing = 6;
    const dot = row.addStack();
    dot.size = new Size(6, 6);
    dot.cornerRadius = 3;
    dot.backgroundColor = new Color(COLORS[i.kind] || '#33507E');
    const done = !!S.days[date]?.done?.[i.id];
    if (family !== 'systemSmall') text(row, i.start, 13, '#93A9CB');
    text(row, i.title, 13, done ? '#93A9CB' : '#E8F0FC', !done);
    w.addSpacer(4);
  }
  w.addSpacer();
  return w;
}

const d = new Date();
const widget = build(await load(), ymd(d), d.getHours() * 60 + d.getMinutes(), config.widgetFamily);
if (config.runsInWidget) Script.setWidget(widget);
else await widget.presentMedium();
Script.complete();
