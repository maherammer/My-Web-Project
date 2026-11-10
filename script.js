/* =========================================================
   script.js — الخطوة 2: التنقل + مدير المهام مع localStorage
   ========================================================= */

// لغة وتقويم التواريخ: عربي ميلادي بأرقام لاتينية (مثل: الأحد 8 نوفمبر)
const LOCALE = 'ar-u-ca-gregory-nu-latn';

// جمع عربي صحيح للأيام: يوم واحد، يومان، 3-10 أيام، 11+ يومًا
function daysText(n) {
  if (n === 1) return 'يوم واحد';
  if (n === 2) return 'يومان';
  return n <= 10 ? n + ' أيام' : n + ' يومًا';
}

// جمع عربي صحيح للساعات
function hoursText(n) {
  if (n === 1) return 'ساعة واحدة';
  if (n === 2) return 'ساعتان';
  return n <= 10 ? n + ' ساعات' : n + ' ساعة';
}

/* ---------- 1) التنقل بين الأقسام ---------- */
const sections = document.querySelectorAll('.section');
const navLinks = document.querySelectorAll('.nav-link');

// يُظهر القسم المطلوب ويخفي البقية
function showSection(id) {
  // لو الاسم غير موجود نعود للوحة التحكم
  if (!document.getElementById(id)) id = 'dashboard';

  sections.forEach(sec => sec.classList.toggle('active', sec.id === id));
  navLinks.forEach(link =>
    link.classList.toggle('active', link.getAttribute('href') === '#' + id)
  );
  window.scrollTo({ top: 0 });
}

// عند الضغط على رابط (أو الرجوع بالمتصفح) يتغيّر الـ hash فنعرض القسم
window.addEventListener('hashchange', () => showSection(location.hash.slice(1)));
showSection(location.hash.slice(1));   // أول تحميل للصفحة


/* ---------- 2) التخزين: localStorage ---------- */
const STORAGE_KEY = 'studyflow.tasks';

// قراءة المهام المحفوظة (try/catch لأن التخزين قد يفشل أو يحتوي بيانات تالفة)
function loadTasks() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch (e) {
    return [];
  }
}

// حفظ المهام كنص JSON
function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (e) {
    console.error('Could not save tasks', e);
  }
  renderOverview();   // تحديث Dashboard و Progress
}

// "الحالة" (state): مصفوفة المهام هي مصدر الحقيقة الوحيد
// كل مهمة: { id, title, priority, done }
let tasks = loadTasks();


/* ---------- 3) عناصر الصفحة ---------- */
const form      = document.getElementById('task-form');
const input     = document.getElementById('task-input');
const prioritySel = document.getElementById('task-priority');
const listEl    = document.getElementById('task-list');
const emptyEl   = document.getElementById('task-empty');

const PRIORITY_LABEL = { high: 'عالية', medium: 'متوسطة', low: 'منخفضة' };


/* ---------- 4) العمليات: إضافة / تبديل الإنجاز / حذف ---------- */
function addTask(title, priority) {
  tasks.unshift({            // unshift = الأحدث في الأعلى
    id: Date.now(),          // رقم فريد من الوقت الحالي
    title: title,
    priority: priority,
    done: false
  });
  saveTasks();
  renderTasks();
}

function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.done = !task.done;
    task.doneAt = task.done ? dateKey(new Date()) : null;   // تاريخ الإنجاز (للـ streak والتقدم)
  }
  saveTasks();
  renderTasks();
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  renderTasks();
}


/* ---------- 5) الرسم: تحويل المصفوفة إلى عناصر HTML ---------- */
function renderTasks() {
  listEl.innerHTML = '';                 // نفرغ القائمة ثم نعيد بناءها
  emptyEl.hidden = tasks.length > 0;     // رسالة "لا توجد مهام" عند الفراغ

  tasks.forEach(task => {
    listEl.appendChild(buildTaskItem(task, true));
  });
}


/* ---------- 6) إرسال النموذج ---------- */
form.addEventListener('submit', event => {
  event.preventDefault();                // نمنع إعادة تحميل الصفحة
  const title = input.value.trim();
  if (!title) { input.focus(); return; } // لا نقبل مهمة فارغة

  addTask(title, prioritySel.value);
  input.value = '';
  input.focus();
});


/* ---------- 7) التشغيل الأول ---------- */
renderTasks();


/* =========================================================
   الخطوة 3: المواعيد النهائية (Deadlines)
   ========================================================= */

const DEADLINE_KEY = 'studyflow.deadlines';

function loadDeadlines() {
  try {
    return JSON.parse(localStorage.getItem(DEADLINE_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function saveDeadlines() {
  try {
    localStorage.setItem(DEADLINE_KEY, JSON.stringify(deadlines));
  } catch (e) {
    console.error('Could not save deadlines', e);
  }
  renderOverview();   // تحديث Dashboard و Progress
}

// كل موعد: { id, title, date }  ← date بصيغة "2026-11-12"
let deadlines = loadDeadlines();

const dlForm   = document.getElementById('deadline-form');
const dlTitle  = document.getElementById('deadline-title');
const dlDate   = document.getElementById('deadline-date');
const dlList   = document.getElementById('deadline-list');
const dlEmpty  = document.getElementById('deadline-empty');

// ---------- حساب التاريخ ----------

// بداية اليوم الحالي (الساعة 00:00) حتى لا يتأثر الحساب بالوقت
function today() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

// تحويل النص "2026-11-12" إلى تاريخ بالتوقيت المحلي
function parseDate(text) {
  const [y, m, d] = text.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// عدد الأيام المتبقية: (تاريخ الموعد − اليوم) ÷ عدد ميلي ثانية في اليوم
function daysLeft(dateText) {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return Math.round((parseDate(dateText) - today()) / MS_PER_DAY);
}

// النص واللون حسب القرب من الموعد
function urgency(days) {
  if (days < 0)   return { label: 'متأخر ' + daysText(Math.abs(days)), level: 'high' };
  if (days === 0) return { label: 'اليوم', level: 'high' };
  if (days === 1) return { label: 'غدًا', level: 'high' };
  if (days <= 3)  return { label: daysText(days), level: 'high' };
  if (days <= 7)  return { label: daysText(days), level: 'medium' };
  return { label: daysText(days), level: 'low' };
}

// ---------- العمليات ----------
function addDeadline(title, date) {
  deadlines.push({ id: Date.now(), title: title, date: date });
  saveDeadlines();
  renderDeadlines();
}

function deleteDeadline(id) {
  deadlines = deadlines.filter(d => d.id !== id);
  saveDeadlines();
  renderDeadlines();
}

// ---------- الرسم ----------
function renderDeadlines() {
  dlList.innerHTML = '';
  dlEmpty.hidden = deadlines.length > 0;

  // نرتّب نسخة من المصفوفة: الأقرب تاريخًا أولًا (النص بصيغة YYYY-MM-DD يُرتَّب أبجديًا كتاريخ)
  const sorted = [...deadlines].sort((a, b) => a.date.localeCompare(b.date));

  sorted.forEach(item => {
    const days = daysLeft(item.date);
    const info = urgency(days);
    const due  = parseDate(item.date);

    const card = document.createElement('article');
    card.className = 'card deadline' + (days < 0 ? ' overdue' : '');

    // شارة التاريخ: اليوم + الشهر
    const chip = document.createElement('div');
    chip.className = 'date-chip';
    const dayNum = document.createElement('strong');
    dayNum.textContent = due.getDate();
    const month = document.createElement('span');
    month.textContent = due.toLocaleDateString(LOCALE, { month: 'long' });
    chip.append(dayNum, month);

    // العنوان + التاريخ الكامل
    const text = document.createElement('div');
    text.className = 'deadline-info';
    const h = document.createElement('h2');
    h.textContent = item.title;
    const sub = document.createElement('p');
    sub.className = 'muted';
    sub.textContent = due.toLocaleDateString(LOCALE, { weekday: 'long', month: 'long', day: 'numeric' });
    text.append(h, sub);

    // شارة الأيام المتبقية
    const badge = document.createElement('span');
    badge.className = 'badge badge-' + info.level;
    badge.textContent = info.label;

    // زر الحذف
    const del = document.createElement('button');
    del.className = 'delete-btn';
    del.type = 'button';
    del.textContent = '×';
    del.setAttribute('aria-label', 'حذف الموعد: ' + item.title);
    del.addEventListener('click', () => deleteDeadline(item.id));

    card.append(chip, text, badge, del);
    dlList.appendChild(card);
  });
}

// ---------- النموذج ----------
dlForm.addEventListener('submit', event => {
  event.preventDefault();
  const title = dlTitle.value.trim();
  if (!title || !dlDate.value) {       // لا بد من عنوان وتاريخ
    (title ? dlDate : dlTitle).focus();
    return;
  }
  addDeadline(title, dlDate.value);
  dlTitle.value = '';
  dlDate.value = '';
  dlTitle.focus();
});

renderDeadlines();


/* =========================================================
   الخطوة 4: الجدول الأسبوعي (Schedule)
   ========================================================= */

const SCHEDULE_KEY = 'studyflow.schedule';
const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];   // أعمدة الجدول
const FIRST_HOUR = 8;                               // يبدأ الجدول 08:00
const LAST_HOUR  = 19;                              // وينتهي 19:00

function loadSchedule() {
  try {
    return JSON.parse(localStorage.getItem(SCHEDULE_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function saveSchedule() {
  try {
    localStorage.setItem(SCHEDULE_KEY, JSON.stringify(schedule));
  } catch (e) {
    console.error('Could not save schedule', e);
  }
  renderOverview();   // تحديث Dashboard و Progress
}

// كل عنصر: { id, title, day (0-4), start (ساعة مثل 8), duration (ساعات), type }
let schedule = loadSchedule();

const schForm  = document.getElementById('schedule-form');
const schTitle = document.getElementById('sch-title');
const schDay   = document.getElementById('sch-day');
const schStart = document.getElementById('sch-start');
const schDur   = document.getElementById('sch-duration');
const schType  = document.getElementById('sch-type');
const schError = document.getElementById('sch-error');
const schEmpty = document.getElementById('sch-empty');
const tableEl  = document.getElementById('timetable');

// تنسيق الساعة: 8 ← "08:00"
function hourLabel(h) {
  return String(h).padStart(2, '0') + ':00';
}

// ملء القوائم المنسدلة بدل كتابتها يدويًا في HTML
function fillOptions(select, items) {
  items.forEach(([value, label]) => {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = label;
    select.appendChild(opt);
  });
}
fillOptions(schDay, DAYS.map((name, i) => [i, name]));
const startHours = [];
for (let h = FIRST_HOUR; h < LAST_HOUR; h++) startHours.push([h, hourLabel(h)]);
fillOptions(schStart, startHours);
fillOptions(schDur, [[1, 'ساعة واحدة'], [2, 'ساعتان'], [3, '3 ساعات']]);

// هل يتداخل وقتان في نفس اليوم؟
// شرط التداخل: بداية الأول قبل نهاية الثاني، وبداية الثاني قبل نهاية الأول
function hasConflict(day, start, duration) {
  return schedule.some(item =>
    item.day === day &&
    start < item.start + item.duration &&
    item.start < start + duration
  );
}

function addScheduleItem(title, day, start, duration, type) {
  schedule.push({ id: Date.now(), title, day, start, duration, type });
  saveSchedule();
  renderSchedule();
}

function deleteScheduleItem(id) {
  schedule = schedule.filter(item => item.id !== id);
  saveSchedule();
  renderSchedule();
}

// بناء الجدول: عناوين الأيام + الساعات + خلايا فارغة + كتل المحاضرات
function renderSchedule() {
  tableEl.innerHTML = '';
  schEmpty.hidden = schedule.length > 0;

  // أول صف: خلية فارغة ثم أسماء الأيام
  const corner = document.createElement('div');
  corner.className = 'tt-cell tt-head';
  tableEl.appendChild(corner);
  DAYS.forEach(name => {
    const head = document.createElement('div');
    head.className = 'tt-cell tt-head';
    head.textContent = name;
    tableEl.appendChild(head);
  });

  // صف لكل ساعة: التسمية + خلية فارغة لكل يوم
  for (let h = FIRST_HOUR; h < LAST_HOUR; h++) {
    const time = document.createElement('div');
    time.className = 'tt-cell tt-time';
    time.textContent = hourLabel(h);
    tableEl.appendChild(time);

    for (let d = 0; d < DAYS.length; d++) {
      const slot = document.createElement('div');
      slot.className = 'tt-cell tt-slot';
      tableEl.appendChild(slot);
    }
  }

  // الكتل: نضعها فوق الشبكة بتحديد العمود والصف يدويًا (CSS Grid)
  schedule.forEach(item => {
    const block = document.createElement('div');
    block.className = 'block block-' + item.type;
    block.style.gridColumn = item.day + 2;   // العمود 1 للساعات، فنبدأ من 2
    block.style.gridRow = (item.start - FIRST_HOUR + 2) + ' / span ' + item.duration;

    const name = document.createElement('span');
    name.textContent = item.title;
    const range = document.createElement('small');
    range.textContent = 'من ' + hourLabel(item.start) + ' إلى ' + hourLabel(item.start + item.duration);

    const del = document.createElement('button');
    del.className = 'delete-btn';
    del.type = 'button';
    del.textContent = '×';
    del.setAttribute('aria-label', 'إزالة من الجدول: ' + item.title);
    del.addEventListener('click', () => deleteScheduleItem(item.id));

    block.append(name, range, del);
    tableEl.appendChild(block);
  });
}

schForm.addEventListener('submit', event => {
  event.preventDefault();
  const title    = schTitle.value.trim();
  const day      = Number(schDay.value);
  const start    = Number(schStart.value);
  const duration = Number(schDur.value);

  if (!title) { schTitle.focus(); return; }

  // لا يجوز أن ينتهي بعد آخر ساعة في الجدول
  if (start + duration > LAST_HOUR) {
    schError.textContent = 'هذه الفترة تنتهي بعد الساعة ' + hourLabel(LAST_HOUR) + '. اختاري بداية أبكر أو مدة أقصر.';
    schError.hidden = false;
    return;
  }
  // منع التعارض مع عنصر موجود
  if (hasConflict(day, start, duration)) {
    schError.textContent = 'هذا الوقت يتداخل مع فترة أخرى يوم ' + DAYS[day] + '. اختاري وقتًا مختلفًا.';
    schError.hidden = false;
    return;
  }

  schError.hidden = true;
  addScheduleItem(title, day, start, duration, schType.value);
  schTitle.value = '';
  schTitle.focus();
});

renderSchedule();


/* =========================================================
   الخطوة 5: Dashboard + Progress + Streak
   ========================================================= */

// ---------- دوال مساعدة ----------

// تحويل التاريخ إلى نص "2026-11-06" (بالتوقيت المحلي) لنقارن الأيام بسهولة
function dateKey(date) {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return date.getFullYear() + '-' + m + '-' + d;
}

// يرجع التاريخ قبل n يومًا
function daysAgo(n) {
  const d = today();
  d.setDate(d.getDate() - n);
  return d;
}

// بناء عنصر مهمة واحد (يُستخدم في قسم Tasks وفي Dashboard فلا نكرر الكود)
function buildTaskItem(task, withDelete) {
  const li = document.createElement('li');
  li.className = 'task' + (task.done ? ' done' : '');

  const check = document.createElement('button');
  check.className = 'check';
  check.type = 'button';
  check.setAttribute('aria-label', 'تبديل حالة المهمة: ' + task.title);
  check.addEventListener('click', () => toggleTask(task.id));

  const title = document.createElement('span');
  title.className = 'task-title';
  title.textContent = task.title;

  const badge = document.createElement('span');
  badge.className = 'badge badge-' + task.priority;
  badge.textContent = PRIORITY_LABEL[task.priority];

  li.append(check, title, badge);

  if (withDelete) {
    const del = document.createElement('button');
    del.className = 'delete-btn';
    del.type = 'button';
    del.textContent = '×';
    del.setAttribute('aria-label', 'حذف المهمة: ' + task.title);
    del.addEventListener('click', () => deleteTask(task.id));
    li.appendChild(del);
  }
  return li;
}

// ---------- Study streak: أيام متتالية أنجزت فيها مهمة ----------
function calcStreak() {
  const doneDays = new Set(tasks.filter(t => t.done && t.doneAt).map(t => t.doneAt));

  let offset = 0;
  // لو لم تنجز شيئًا اليوم بعد، لا ينقطع العدّاد: نبدأ العدّ من أمس
  if (!doneDays.has(dateKey(daysAgo(0)))) offset = 1;

  let streak = 0;
  while (doneDays.has(dateKey(daysAgo(offset)))) {
    streak++;
    offset++;
  }
  return streak;
}

// ---------- تحديث كل الأرقام ----------
const el = id => document.getElementById(id);

function renderOverview() {
  const openTasks = tasks.filter(t => !t.done);
  const todayKey  = dateKey(new Date());

  // --- الترحيب حسب الساعة ---
  const hour = new Date().getHours();
  el('greeting').textContent =
    hour < 12 ? 'صباح الخير، لنخطط ليومك' :
    hour < 18 ? 'مساء الخير، واصلي التقدم' : 'مساء النور، اختمي يومك بإنجاز';

  // --- المواعيد القادمة: الأيام المتبقية من 0 إلى 7 ---
  const upcoming = [...deadlines]
    .filter(d => daysLeft(d.date) >= 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  const inWeek = upcoming.filter(d => daysLeft(d.date) <= 7);

  el('greeting-sub').textContent =
    'المهام المفتوحة: ' + openTasks.length + ' · المواعيد خلال الأسبوع: ' + inWeek.length;

  // --- بطاقات الأرقام ---
  el('stat-open').textContent   = openTasks.length;
  el('stat-streak').textContent = calcStreak();
  el('stat-week').textContent   = inWeek.length;

  // --- مهام اليوم: المفتوحة + ما أُنجز اليوم، الأعلى أولوية أولًا (أقصى 5) ---
  const order = { high: 0, medium: 1, low: 2 };
  const todays = tasks
    .filter(t => !t.done || t.doneAt === todayKey)
    .sort((a, b) => (a.done - b.done) || (order[a.priority] - order[b.priority]))
    .slice(0, 5);

  const dashList = el('dash-tasks');
  dashList.innerHTML = '';
  todays.forEach(t => dashList.appendChild(buildTaskItem(t, false)));
  el('dash-empty').hidden = todays.length > 0;

  // --- أقرب موعد تسليم ---
  if (upcoming.length) {
    const next = upcoming[0];
    const days = daysLeft(next.date);
    el('next-title').textContent = next.title;
    el('next-meta').textContent =
      'يوم ' + parseDate(next.date).toLocaleDateString(LOCALE, { weekday: 'long' }) +
      ' · ' + (days === 0 ? 'اليوم' : 'باقي ' + daysText(days));
  } else {
    el('next-title').textContent = 'لا توجد مواعيد قادمة';
    el('next-meta').textContent  = 'أضيفي موعدًا من تبويب المواعيد النهائية.';
  }

  // --- قسم Progress: نسبة الإنجاز ---
  const total = tasks.length;
  const done  = tasks.filter(t => t.done).length;
  const percent = total ? Math.round((done / total) * 100) : 0;

  el('progress-fill').style.width = percent + '%';
  el('progress-bar').setAttribute('aria-valuenow', percent);
  el('progress-text').textContent = total
    ? done + ' من ' + total + ' مهام منجزة (' + percent + '%)'
    : 'لا توجد مهام بعد. أضيفي مهمة لتبدأ المتابعة.';

  // ساعات المذاكرة المخططة من الجدول الأسبوعي
  const studyHours = schedule
    .filter(item => item.type === 'study')
    .reduce((sum, item) => sum + item.duration, 0);
  el('study-hours').textContent = studyHours
    ? 'مخطط لكِ ' + hoursText(studyHours) + ' من المذاكرة هذا الأسبوع.'
    : 'لم تخططي لفترات مذاكرة هذا الأسبوع بعد.';

  // --- رسم الأعمدة: عدد المهام المنجزة في كل يوم من آخر 7 أيام ---
  const days7 = [];
  for (let i = 6; i >= 0; i--) {
    const date = daysAgo(i);
    const key  = dateKey(date);
    days7.push({
      label: date.toLocaleDateString(LOCALE, { weekday: 'short' }),
      count: tasks.filter(t => t.done && t.doneAt === key).length
    });
  }
  const max = Math.max(1, ...days7.map(d => d.count));   // لتجنب القسمة على صفر

  const bars = el('bars');
  bars.innerHTML = '';
  days7.forEach(d => {
    const bar = document.createElement('div');
    bar.className = 'bar';

    const count = document.createElement('b');
    count.textContent = d.count;

    const fill = document.createElement('span');
    fill.style.height = (d.count / max * 80) + '%';   // 80% كحد أقصى ليبقى مكان للرقم

    const label = document.createElement('small');
    label.textContent = d.label;

    bar.append(count, fill, label);
    bars.appendChild(bar);
  });
}

renderOverview();
