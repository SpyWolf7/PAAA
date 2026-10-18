/* ===== 1. HELPERS =====
   Small functions we reuse everywhere. */

// Shortcut: $('timeDisplay') finds the HTML element with id="timeDisplay"
const $ = (id) => document.getElementById(id);

// localStorage is the browser's built-in saving space. It keeps data after you close the page.
// It only stores text, so we convert with JSON.stringify (to text) and JSON.parse (back to data).
function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;   // if nothing saved yet, use the fallback
  } catch (e) {
    return fallback;
  }
}
function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

/* ===== 2. SAVED DATA =====
   These variables hold everything the site remembers. */
let settings = load('settings', { theme: 'light', accent: '#9a6f1c' });
let tasks = load('tasks', []);       // each task: { text: "...", done: false }
let sessions = load('sessions', []); // each session: { subject: "...", seconds: 1500, date: "2026-10-17" }
let habits = load('habits', []);     // each habit: { name: "Read", done: { "2026-10-17": true } }

let pieChart = null;  // will hold the pie chart object
let barChart = null;  // will hold the bar chart object

/* ===== 3. THEME AND ACCENT COLOUR ===== */
// Colours taken from icon painting: gold, oxblood red, lapis blue, malachite green, porphyry purple
const ACCENTS = ['#9a6f1c', '#8c1d2f', '#2f4b8a', '#2f6b4f', '#5b3a73'];

function applySettings() {
  // If a saved accent isn't in our list (e.g. from an older version), use the first one
  if (!ACCENTS.includes(settings.accent)) settings.accent = ACCENTS[0];
  // Set data-theme="light" or "dark" on <html>; the CSS reacts to it
  document.documentElement.setAttribute('data-theme', settings.theme);
  // Change the --accent CSS variable
  document.documentElement.style.setProperty('--accent', settings.accent);
  $('themeToggle').textContent = settings.theme === 'dark' ? 'Light mode' : 'Dark mode';

  // Mark the chosen swatch as active
  document.querySelectorAll('.swatch').forEach((el) => {
    el.classList.toggle('active', el.dataset.color === settings.accent);
  });

  save('settings', settings);
  drawCharts();  // charts need to be redrawn to pick up the new colours
}

// Create one round button per accent colour (a loop saves us typing 5 times)
ACCENTS.forEach((color) => {
  const btn = document.createElement('button');
  btn.className = 'swatch';
  btn.style.background = color;
  btn.dataset.color = color;
  btn.setAttribute('aria-label', 'Accent ' + color);
  btn.addEventListener('click', () => {
    settings.accent = color;
    applySettings();
  });
  $('swatches').appendChild(btn);
});

$('themeToggle').addEventListener('click', () => {
  settings.theme = settings.theme === 'dark' ? 'light' : 'dark';
  applySettings();
});

/* ===== 4. STOIC QUOTES ===== */
const QUOTES = [
  { text: 'You have power over your mind, not outside events. Realise this, and you will find strength.', by: 'Marcus Aurelius' },
  { text: 'We suffer more often in imagination than in reality.', by: 'Seneca' },
  { text: 'It is not what happens to you, but how you react to it that matters.', by: 'Epictetus' },
  { text: 'The impediment to action advances action. What stands in the way becomes the way.', by: 'Marcus Aurelius' },
  { text: 'Waste no more time arguing about what a good man should be. Be one.', by: 'Marcus Aurelius' },
  { text: 'While we are postponing, life speeds by.', by: 'Seneca' },
  { text: 'No man is free who is not master of himself.', by: 'Epictetus' },
  { text: 'If it is not right, do not do it. If it is not true, do not say it.', by: 'Marcus Aurelius' },
  { text: 'Luck is what happens when preparation meets opportunity.', by: 'Seneca' },
  { text: 'First say to yourself what you would be, and then do what you have to do.', by: 'Epictetus' },
  { text: 'He who fears death will never do anything worthy of a living man.', by: 'Seneca' },
  { text: 'The best revenge is not to be like your enemy.', by: 'Marcus Aurelius' },
  // Orthodox saints and desert fathers
  { text: 'Acquire the spirit of peace, and thousands around you will be saved.', by: 'St Seraphim of Sarov' },
  { text: 'Go, sit in your cell, and your cell will teach you everything.', by: 'Abba Moses the Black' },
  { text: 'Love silence above all things, for it brings a fruit that the tongue cannot describe.', by: 'St Isaac the Syrian' },
  { text: 'Teach your mouth to say what is in your heart.', by: 'Abba Poemen' },
  { text: 'Let us not grow weary of doing good, for in due season we shall reap if we do not give up.', by: 'Galatians 6:9' },
];

function showQuote() {
  // Date.now() is milliseconds since 1970. Dividing by 3,600,000 gives hours since 1970.
  // The number changes once per hour, so the quote changes once per hour.
  const hoursSince1970 = Math.floor(Date.now() / 3600000);
  // % (remainder) keeps the index inside the list, looping back to the start
  const quote = QUOTES[hoursSince1970 % QUOTES.length];
  $('quoteText').textContent = '\u201C' + quote.text + '\u201D';
  $('quoteAuthor').textContent = quote.by;
}
showQuote();
setInterval(showQuote, 60000);  // re-check every minute so it updates if the page stays open

/* ===== 5. TO-DO LIST ===== */
function renderTasks() {
  const list = $('todoList');
  list.innerHTML = '';  // clear the list, then rebuild it from the tasks array

  tasks.forEach((task, index) => {
    const li = document.createElement('li');
    if (task.done) li.classList.add('done');

    // Checkbox: ticking it marks the task done
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = task.done;
    box.addEventListener('change', () => {
      task.done = box.checked;
      save('tasks', tasks);
      renderTasks();
    });

    // The task text (textContent is safe: it never runs HTML typed by the user)
    const label = document.createElement('span');
    label.textContent = task.text;

    // Delete button: splice removes 1 item at this position
    const del = document.createElement('button');
    del.textContent = 'Delete';
    del.addEventListener('click', () => {
      tasks.splice(index, 1);
      save('tasks', tasks);
      renderTasks();
    });

    li.append(box, label, del);
    list.appendChild(li);
  });
}

$('todoForm').addEventListener('submit', (event) => {
  event.preventDefault();  // stops the browser from reloading the page
  const text = $('todoInput').value.trim();
  if (!text) return;       // ignore empty tasks
  tasks.push({ text: text, done: false });
  save('tasks', tasks);
  $('todoInput').value = '';
  renderTasks();
});

/* ===== 5b. HABITS =====
   Each habit remembers which dates it was ticked, so we can count habits per day for the graph. */

// Today's date as text like "2026-10-18" (same format as the study sessions)
function todayKey() {
  return new Date().toLocaleDateString('en-CA');
}

function renderHabits() {
  const list = $('habitList');
  list.innerHTML = '';
  const today = todayKey();

  habits.forEach((habit, index) => {
    const li = document.createElement('li');
    if (habit.done[today]) li.classList.add('done');

    // Checkbox: ticked means "done today"
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = !!habit.done[today];   // !! turns the value into true/false
    box.addEventListener('change', () => {
      if (box.checked) habit.done[today] = true;
      else delete habit.done[today];     // unticking removes today's mark
      save('habits', habits);
      renderHabits();
      drawCharts();                      // the line on the graph changes
    });

    const label = document.createElement('span');
    label.textContent = habit.name;

    const del = document.createElement('button');
    del.textContent = 'Delete';
    del.addEventListener('click', () => {
      habits.splice(index, 1);
      save('habits', habits);
      renderHabits();
      drawCharts();
    });

    li.append(box, label, del);
    list.appendChild(li);
  });
}

$('habitForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const name = $('habitInput').value.trim();
  if (!name) return;
  habits.push({ name: name, done: {} });  // done starts empty: no days ticked yet
  save('habits', habits);
  $('habitInput').value = '';
  renderHabits();
  drawCharts();
});

/* ===== 5c. COUNTDOWNS (D-DAY COUNTERS) =====
   Each countdown stores a name, a target moment (in milliseconds) and the unit to show it in. */

// How many milliseconds are in one of each unit
const UNITS = { seconds: 1000, minutes: 60000, hours: 3600000, days: 86400000, weeks: 604800000 };

let countdowns = load('countdowns', []);  // each: { name: "Exam", target: 1790000000000, unit: "days" }
let countdownNumbers = [];                // the number displays we refresh every second

// Builds a dropdown (<select>) listing every unit, with one pre-selected
function unitSelect(selected) {
  const sel = document.createElement('select');
  Object.keys(UNITS).forEach((name) => {   // Object.keys gives ["seconds", "minutes", ...]
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    sel.appendChild(opt);
  });
  sel.value = selected;
  return sel;
}

function renderCountdowns() {
  const list = $('countdownList');
  list.innerHTML = '';
  countdownNumbers = [];

  countdowns.forEach((cd, index) => {
    const li = document.createElement('li');

    // Left side: big number, "until ...", and the target date
    const info = document.createElement('div');
    const number = document.createElement('div');
    number.className = 'cdNumber';
    const text = document.createElement('div');
    text.className = 'cdText';
    text.textContent = 'until ' + cd.name;
    const date = document.createElement('div');
    date.className = 'cdDate';
    date.textContent = new Date(cd.target).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
    info.append(number, text, date);

    // Right side: change the unit, or delete
    const sel = unitSelect(cd.unit);
    sel.addEventListener('change', () => {
      cd.unit = sel.value;
      save('countdowns', countdowns);
      updateCountdowns();
    });
    const del = document.createElement('button');
    del.textContent = 'Delete';
    del.addEventListener('click', () => {
      countdowns.splice(index, 1);
      save('countdowns', countdowns);
      renderCountdowns();
    });
    const controls = document.createElement('div');
    controls.className = 'cdControls';
    controls.append(sel, del);

    li.append(info, controls);
    list.appendChild(li);
    countdownNumbers.push({ el: number, cd: cd });  // remember it so the clock can update it
  });
  updateCountdowns();
}

// Recalculates every number. Runs once per second.
function updateCountdowns() {
  const now = Date.now();  // the current moment in milliseconds
  countdownNumbers.forEach((item) => {
    const diff = item.cd.target - now;  // milliseconds remaining
    if (diff <= 0) {
      item.el.textContent = 'Day reached';
    } else {
      // Divide by the unit size, round down, and add thousands separators (toLocaleString)
      item.el.textContent = Math.floor(diff / UNITS[item.cd.unit]).toLocaleString() + ' ' + item.cd.unit;
    }
  });
}
setInterval(updateCountdowns, 1000);

$('countdownForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const target = new Date($('cdDate').value).getTime();  // turn the picked date into milliseconds
  if (isNaN(target)) return;                             // ignore if no valid date
  countdowns.push({ name: $('cdName').value.trim(), target: target, unit: $('cdUnit').value });
  countdowns.sort((a, b) => a.target - b.target);        // soonest first
  save('countdowns', countdowns);
  $('cdName').value = '';
  renderCountdowns();
});

/* ===== 6. STUDY TIMER ===== */
let planned = 25 * 60;   // chosen length in seconds
let remaining = planned; // seconds left
let started = false;     // has a session begun?
let timerId = null;      // holds the repeating clock so we can stop it

function showTime() {
  // padStart(2, '0') turns 5 into "05"
  const m = String(Math.floor(remaining / 60)).padStart(2, '0');
  const s = String(remaining % 60).padStart(2, '0');
  $('timeDisplay').textContent = m + ':' + s;
}

function tick() {
  remaining--;
  showTime();
  if (remaining <= 0) finishSession();  // timer reached zero
}

$('startBtn').addEventListener('click', () => {
  if (timerId) return;  // already running
  if (!started) {
    // First start: read the minutes box
    const minutes = Number($('minutesInput').value) || 25;
    planned = minutes * 60;
    remaining = planned;
    started = true;
  }
  timerId = setInterval(tick, 1000);  // run tick() every 1000 ms
});

$('pauseBtn').addEventListener('click', () => {
  clearInterval(timerId);
  timerId = null;
});

function resetTimer() {
  clearInterval(timerId);
  timerId = null;
  started = false;
  planned = (Number($('minutesInput').value) || 25) * 60;
  remaining = planned;
  showTime();
}

function finishSession() {
  const studied = planned - remaining;  // seconds actually studied
  if (started && studied > 0) {
    sessions.push({
      subject: $('subjectInput').value.trim() || 'Unnamed',
      seconds: studied,
      // en-CA gives a date like 2026-10-17 in your local time zone
      date: new Date().toLocaleDateString('en-CA'),
    });
    save('sessions', sessions);
  }
  resetTimer();
  drawCharts();  // update both charts with the new data
}

$('finishBtn').addEventListener('click', finishSession);  // save progress so far
$('resetBtn').addEventListener('click', resetTimer);      // throw it away

// Keep the display in sync when you change the minutes before starting
$('minutesInput').addEventListener('input', () => { if (!started) resetTimer(); });

/* ===== 7. CHARTS ===== */
const PIE_COLORS = ['#9a6f1c', '#8c1d2f', '#2f4b8a', '#2f6b4f', '#5b3a73', '#b0552b', '#3f7f8c', '#7a7a3a'];

function drawCharts() {
  // Read the current theme colours from CSS so charts match light/dark mode
  const css = getComputedStyle(document.documentElement);
  const textColor = css.getPropertyValue('--text').trim();
  const lineColor = css.getPropertyValue('--line').trim();
  const accent = css.getPropertyValue('--accent').trim();

  // --- Pie chart: add up seconds for each subject ---
  const totals = {};  // e.g. { Thermodynamics: 3000, Maths: 1500 }
  sessions.forEach((s) => {
    totals[s.subject] = (totals[s.subject] || 0) + s.seconds;
  });
  const subjects = Object.keys(totals);
  $('pieEmpty').hidden = subjects.length > 0;  // show the hint only when there's no data

  if (pieChart) pieChart.destroy();  // remove the old chart before drawing a new one
  pieChart = new Chart($('pieChart'), {
    type: 'pie',
    data: {
      labels: subjects,
      datasets: [{
        // Keep the data in seconds. Rounding to whole minutes made short sessions equal 0,
        // and a pie made of zeros draws nothing.
        data: subjects.map((name) => totals[name]),
        backgroundColor: PIE_COLORS,
        borderColor: css.getPropertyValue('--panel').trim(),
      }],
    },
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: textColor } },
        // Tooltip = the small box that appears when you hover a slice.
        // ctx.parsed is the slice's value in seconds, so we turn it into minutes + seconds.
        tooltip: {
          callbacks: {
            label: (ctx) => ' ' + Math.floor(ctx.parsed / 60) + ' min ' + (ctx.parsed % 60) + ' sec',
          },
        },
      },
    },
  });

  // --- Bar chart: minutes studied on each of the last 7 days ---
  const labels = [];
  const minutes = [];
  const habitCounts = [];  // habits completed on each day
  for (let i = 6; i >= 0; i--) {
    const day = new Date();
    day.setDate(day.getDate() - i);                    // go back i days
    const key = day.toLocaleDateString('en-CA');       // matches the date saved in sessions
    labels.push(day.toLocaleDateString('en-US', { weekday: 'short' }));
    const secs = sessions
      .filter((s) => s.date === key)                   // keep only sessions from that day
      .reduce((sum, s) => sum + s.seconds, 0);         // add them up
    // secs / 60 = minutes. Math.round(x * 10) / 10 keeps one decimal place (e.g. 0.5),
    // so short sessions still appear on the graph.
    minutes.push(Math.round((secs / 60) * 10) / 10);
    // Count the habits that have this day's date ticked
    habitCounts.push(habits.filter((h) => h.done[key]).length);
  }

  if (barChart) barChart.destroy();
  barChart = new Chart($('barChart'), {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        // Dataset 1: bars for study minutes (uses the left axis, "y")
        { type: 'bar', label: 'Study minutes', data: minutes, backgroundColor: accent, yAxisID: 'y' },
        // Dataset 2: a line for habits completed, drawn on top of the bars.
        // It uses its own right-hand axis ("y1") because habits (0 to 5) and minutes (0 to 120) are very different sizes.
        { type: 'line', label: 'Habits done', data: habitCounts, yAxisID: 'y1', order: 0,
          borderColor: '#d9483b', backgroundColor: '#d9483b', borderWidth: 3, pointRadius: 5, tension: 0.3 },
      ],
    },
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: textColor } } },  // legend now needed: two things are shown
      scales: {
        x: { ticks: { color: textColor }, grid: { color: lineColor } },
        y: { beginAtZero: true, ticks: { color: textColor }, grid: { color: lineColor },
             title: { display: true, text: 'Minutes', color: textColor } },
        y1: { position: 'right', beginAtZero: true, ticks: { color: textColor, precision: 0 },  // precision 0 = whole numbers only
              grid: { drawOnChartArea: false },  // no second set of grid lines
              title: { display: true, text: 'Habits done', color: textColor } },
      },
    },
  });
}

/* ===== 7b. CUSTOM BACKGROUND =====
   You pick a picture, we shrink it, show it, and save it in the browser. */

// Sets the --bg-image CSS variable that style.css uses for the page background
function setBackground(dataUrl) {
  document.documentElement.style.setProperty('--bg-image', 'url("' + dataUrl + '")');
}

const savedBackground = load('background', null);
if (savedBackground) setBackground(savedBackground);  // bring back your picture on page load

$('bgInput').addEventListener('change', (event) => {
  const file = event.target.files[0];  // the picture you chose
  if (!file) return;

  const reader = new FileReader();     // FileReader reads a file from your computer
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      // Photos can be huge, and browser storage is small (about 5 MB).
      // So we redraw the picture on a hidden canvas, at most 1920 px wide, as a compressed JPEG.
      const scale = Math.min(1, 1920 / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);  // 0.8 = 80% quality

      setBackground(dataUrl);
      try {
        save('background', dataUrl);
      } catch (e) {
        alert('The picture is showing, but it is too big to be remembered after you close the page. Try a smaller one.');
      }
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
  event.target.value = '';  // lets you choose the same file again later
});

// Go back to the original background
$('bgReset').addEventListener('click', () => {
  document.documentElement.style.removeProperty('--bg-image');
  localStorage.removeItem('background');
});

/* ===== 8. DELETE PROGRESS =====
   Wipes every saved study session, so both charts start empty again. */
$('resetDataBtn').addEventListener('click', () => {
  // confirm() shows an OK / Cancel popup and returns true only if you press OK
  if (!confirm('Delete all saved study sessions and habit ticks? This cannot be undone.')) return;
  sessions = [];              // empty the list in memory
  save('sessions', sessions); // empty the saved copy in the browser too
  habits.forEach((h) => { h.done = {}; });  // keep your habits but clear every tick
  save('habits', habits);
  renderHabits();
  drawCharts();               // redraw the charts with no data
  // Your to-do list is not touched. To wipe it too, add: tasks = []; save('tasks', tasks); renderTasks();
});

/* ===== 9. START UP =====
   Draw everything once when the page loads. */
renderTasks();
renderHabits();
renderCountdowns();
showTime();
applySettings();  // also draws the charts
