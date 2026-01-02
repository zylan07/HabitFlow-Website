// Simple HabitFlow - Clean and Working
const STORAGE_KEY = 'habitflow-simple';

// Simple state
let state = {
  habits: [],
  xp: 0,
  level: 1,
  streak: 0,
  date: null,
  achievements: {},
  stats: { completions: 0, focusSessions: 0 },
  theme: 'light',
  currentFilter: 'all',
  timerSeconds: 1500,
  timerRunning: false,
  timerInterval: null
};

// Default habits
const DEFAULT_HABITS = [
  { id: 'h1', emoji: '💧', name: 'Drink Water', type: 'count', goal: 8, days: [0,1,2,3,4,5,6], category: 'health', count: 0, done: false },
  { id: 'h2', emoji: '🧠', name: 'Deep Work', type: 'count', goal: 4, days: [1,2,3,4,5], category: 'work', count: 0, done: false },
  { id: 'h3', emoji: '🧘', name: 'Meditate', type: 'binary', goal: 1, days: [0,1,2,3,4,5,6], category: 'mindfulness', count: 0, done: false },
  { id: 'h4', emoji: '🚶', name: 'Walk 30 Minutes', type: 'binary', goal: 1, days: [0,1,2,3,4,5,6], category: 'health', count: 0, done: false },
  { id: 'h5', emoji: '🏋️', name: 'Workout', type: 'binary', goal: 1, days: [1,3,5], category: 'health', count: 0, done: false },
  { id: 'h6', emoji: '📚', name: 'Read 20 Pages', type: 'count', goal: 20, days: [0,1,2,3,4,5,6], category: 'learning', count: 0, done: false },
  { id: 'h7', emoji: '💻', name: 'Learn / Practice Coding', type: 'count', goal: 2, days: [1,2,3,4,5], category: 'learning', count: 0, done: false },
  { id: 'h8', emoji: '📝', name: 'Journal', type: 'binary', goal: 1, days: [0,1,2,3,4,5,6], category: 'mindfulness', count: 0, done: false },
  { id: 'h9', emoji: '🛌', name: 'Sleep 7+ Hours', type: 'binary', goal: 1, days: [0,1,2,3,4,5,6], category: 'health', count: 0, done: false },
  { id: 'h10', emoji: '👣', name: 'Steps', type: 'count', goal: 8000, days: [0,1,2,3,4,5,6], category: 'health', count: 0, done: false },
  { id: 'h11', emoji: '🧎', name: 'Stretch', type: 'binary', goal: 1, days: [0,1,2,3,4,5,6], category: 'health', count: 0, done: false }
];

// Simple helper
function $(id) {
  return document.getElementById(id);
}

// Initialize
function init() {
  loadState();
  normalizeState();
  checkDayTransition();
  setupEventListeners();
  renderAll();
  applyTheme();
  updateTimerDisplay();
  $('goalGroup').style.display = $('habitType').value === 'count' ? 'block' : 'none';

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(regs => {
      regs.forEach(r => r.unregister());
    });
  }
}

function getTodayDateString() {
  return new Date().toLocaleDateString('en-CA');
}

function checkDayTransition() {
  const today = getTodayDateString();
  if (!state.date) {
    state.date = today;
    saveState();
    return;
  }

  if (state.date === today) return;

  const wasProductive = state.habits.some(h =>
    h.type === 'count' ? h.count >= h.goal : h.done
  );
  state.streak = wasProductive ? state.streak + 1 : 0;

  state.habits.forEach(h => {
    h.count = 0;
    h.done = false;
  });

  state.date = today;
  saveState();
  unlockAchievements();
}

// Load state from localStorage
function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    state = { ...state, ...JSON.parse(saved) };
    state.level = Math.floor(state.xp / 100) + 1;
  } else {
    state.habits = [...DEFAULT_HABITS];
    state.date = getTodayDateString();
    saveState();
  }
}

function normalizeState() {
  if (!state.achievements || typeof state.achievements !== 'object') state.achievements = {};
  if (!state.stats || typeof state.stats !== 'object') state.stats = { completions: 0, focusSessions: 0 };
  if (typeof state.stats.completions !== 'number') state.stats.completions = 0;
  if (typeof state.stats.focusSessions !== 'number') state.stats.focusSessions = 0;
}

function getAchievementDefs() {
  return [
    { id: 'first_win', icon: '🥇', title: 'First Win', desc: 'Complete your first habit', check: s => s.stats.completions >= 1 },
    { id: 'five_wins', icon: '🏅', title: 'On a Roll', desc: 'Complete 5 habits', check: s => s.stats.completions >= 5 },
    { id: 'streak_3', icon: '🔥', title: 'Warm Streak', desc: 'Reach a 3-day streak', check: s => s.streak >= 3 },
    { id: 'streak_7', icon: '🚀', title: 'Weekly Warrior', desc: 'Reach a 7-day streak', check: s => s.streak >= 7 },
    { id: 'xp_100', icon: '✨', title: 'XP Starter', desc: 'Earn 100 XP', check: s => s.xp >= 100 },
    { id: 'xp_500', icon: '💎', title: 'XP Grinder', desc: 'Earn 500 XP', check: s => s.xp >= 500 },
    { id: 'focus_1', icon: '🎯', title: 'Focused', desc: 'Finish 1 focus session', check: s => s.stats.focusSessions >= 1 },
    { id: 'focus_5', icon: '🧠', title: 'Deep Focus', desc: 'Finish 5 focus sessions', check: s => s.stats.focusSessions >= 5 }
  ];
}

function isAchievementUnlocked(id) {
  return !!(state.achievements && state.achievements[id] && state.achievements[id].unlocked);
}

function unlockAchievements() {
  const defs = getAchievementDefs();
  let unlockedAny = false;

  defs.forEach(def => {
    if (isAchievementUnlocked(def.id)) return;
    if (!def.check(state)) return;
    state.achievements[def.id] = { unlocked: true, at: Date.now() };
    unlockedAny = true;
    showCelebration({
      emoji: '🏆',
      title: 'Trophy unlocked!',
      message: `${def.icon} ${def.title}`
    });
  });

  if (unlockedAny) {
    saveState();
    renderAchievements();
  }
}

function renderAchievements() {
  const grid = $('achievementsGrid');
  if (!grid) return;
  const defs = getAchievementDefs();

  grid.innerHTML = defs
    .map(def => {
      const unlocked = isAchievementUnlocked(def.id);
      return `
        <div class="achievement-card ${unlocked ? '' : 'locked'}">
          <div class="achievement-icon">${unlocked ? def.icon : '🔒'}</div>
          <div>
            <div class="achievement-title">${def.title}</div>
            <div class="achievement-desc">${def.desc}</div>
          </div>
        </div>
      `;
    })
    .join('');
}

function recordCompletion() {
  normalizeState();
  state.stats.completions += 1;
  unlockAchievements();
}

function recordFocusSession() {
  normalizeState();
  state.stats.focusSessions += 1;
  unlockAchievements();
}

// Save state to localStorage
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// Apply theme
function applyTheme() {
  document.body.className = state.theme;
  updateThemeToggleIcon();
}

function updateThemeToggleIcon() {
  const btn = $('themeToggle');
  if (!btn) return;
  if (state.theme === 'dark') {
    btn.textContent = '☀️';
    btn.title = 'Switch to light mode';
    btn.setAttribute('aria-label', 'Switch to light mode');
  } else {
    btn.textContent = '🌙';
    btn.title = 'Switch to dark mode';
    btn.setAttribute('aria-label', 'Switch to dark mode');
  }
}

// Toggle theme
function toggleTheme() {
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  applyTheme();
  saveState();
}

// Get today's day index
function getTodayDay() {
  return new Date().getDay();
}

// Filter habits for today and current filter
function getTodayHabits() {
  const today = getTodayDay();
  return state.habits.filter(habit => {
    const scheduledForToday = habit.days.includes(today);
    const matchesFilter = state.currentFilter === 'all' || habit.category === state.currentFilter;
    return scheduledForToday && matchesFilter;
  });
}

// Render everything
function renderAll() {
  renderHabits();
  renderStats();
  renderProgress();
  renderAchievements();
}

// Render habits
function renderHabits() {
  const container = $('habitsContainer');
  const emptyState = $('emptyState');
  const habits = getTodayHabits();

  if (habits.length === 0) {
    container.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';
  
  container.innerHTML = habits.map(habit => {
    const progress = habit.type === 'count' 
      ? Math.min(100, (habit.count / habit.goal) * 100)
      : habit.done ? 100 : 0;
    
    const isCompleted = progress === 100;
    
    return `
      <div class="habit-card ${habit.category}" data-id="${habit.id}">
        <div class="habit-header">
          <span class="habit-emoji">${habit.emoji}</span>
          <div class="habit-info">
            <h3>${habit.name}</h3>
            <span class="habit-category">${habit.category}</span>
            <div class="habit-progress">
              ${habit.type === 'count' ? `${habit.count}/${habit.goal}` : (habit.done ? '✅ Done' : '⏳ Pending')}
            </div>
          </div>
        </div>
        <div class="habit-actions">
          ${habit.type === 'count' ? `
            <button class="btn small" data-action="count" data-delta="-1" ${habit.count === 0 ? 'disabled' : ''}>-</button>
            <button class="btn small" data-action="count" data-delta="1">+</button>
          ` : ''}
          <button class="btn ${isCompleted ? 'secondary' : 'primary'}" data-action="toggle">
            ${isCompleted ? 'Undo' : 'Complete'}
          </button>
          <button class="btn danger" data-action="delete">×</button>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${progress}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

// Render stats
function renderStats() {
  $('streakStat').textContent = state.streak;
  $('xpStat').textContent = state.xp;
  $('levelStat').textContent = state.level;
  
  const habits = getTodayHabits();
  const completed = habits.filter(h => 
    h.type === 'count' ? h.count >= h.goal : h.done
  ).length;
  const percentage = habits.length > 0 ? Math.round((completed / habits.length) * 100) : 0;
  $('completionStat').textContent = percentage + '%';
}

// Render progress
function renderProgress() {
  const habits = getTodayHabits();
  const completed = habits.filter(h => 
    h.type === 'count' ? h.count >= h.goal : h.done
  ).length;
  const percentage = habits.length > 0 ? Math.round((completed / habits.length) * 100) : 0;
  
  $('progressFill').style.width = percentage + '%';
  $('progressText').textContent = percentage + '% Complete';
}

// Update habit count
function updateHabit(id, delta) {
  const habit = state.habits.find(h => h.id === id && h.type === 'count');
  if (!habit) return;
  
  habit.count = Math.max(0, Math.min(habit.goal, habit.count + delta));
  
  if (habit.count >= habit.goal && habit.count - delta < habit.goal) {
    gainXP(10);
    recordCompletion();
    showCelebration({
      emoji: habit.emoji,
      title: 'Completed!',
      message: `${habit.name} is done for today.`
    });
  }
  
  saveState();
  renderAll();
}

// Toggle habit completion
function toggleHabit(id) {
  const habit = state.habits.find(h => h.id === id);
  if (!habit) return;
  
  if (habit.type === 'binary') {
    const wasDone = habit.done;
    habit.done = !habit.done;
    if (habit.done) {
      gainXP(15);
      if (!wasDone) {
        recordCompletion();
        showCelebration({
          emoji: habit.emoji,
          title: 'Great job!',
          message: `${habit.name} completed.`
        });
      }
    }
  } else if (habit.type === 'count') {
    const wasComplete = habit.count >= habit.goal;
    if (wasComplete) {
      habit.count = 0;
    } else {
      habit.count = habit.goal;
      gainXP(10);
      recordCompletion();
      showCelebration({
        emoji: habit.emoji,
        title: 'Completed!',
        message: `${habit.name} is done for today.`
      });
    }
  }
  
  saveState();
  renderAll();
}

// Delete habit
function deleteHabit(id) {
  if (!confirm('Delete this habit?')) return;
  
  state.habits = state.habits.filter(h => h.id !== id);
  saveState();
  renderAll();
}

// Gain XP
function gainXP(amount) {
  state.xp += amount;
  const newLevel = Math.floor(state.xp / 100) + 1;
  if (newLevel > state.level) {
    state.level = newLevel;
  }
  saveState();
  renderStats();
  unlockAchievements();
}

// Timer functions
function startTimer() {
  if (state.timerRunning) return;
  
  state.timerRunning = true;
  $('startTimer').textContent = 'Pause';
  
  state.timerInterval = setInterval(() => {
    if (state.timerSeconds > 0) {
      state.timerSeconds--;
      updateTimerDisplay();
    } else {
      stopTimer();
      gainXP(25);
      recordFocusSession();
      showCelebration({
        emoji: '🎯',
        title: 'Focus complete!',
        message: '25 XP earned. Keep going!'
      });
      resetTimer();
    }
  }, 1000);
}

function stopTimer() {
  state.timerRunning = false;
  $('startTimer').textContent = 'Start';
  
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
}

function resetTimer() {
  stopTimer();
  state.timerSeconds = 1500; // 25 minutes
  updateTimerDisplay();
}

function resetToday() {
  const ok = confirm("Reset today's progress? This will set all habits back to 0 / not done and reset the focus timer.");
  if (!ok) return;

  stopTimer();
  state.timerSeconds = 1500;

  state.habits.forEach(h => {
    h.count = 0;
    h.done = false;
  });

  saveState();
  renderAll();
  updateTimerDisplay();
}

function updateTimerDisplay() {
  const minutes = Math.floor(state.timerSeconds / 60);
  const seconds = state.timerSeconds % 60;
  $('timerDisplay').textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function getMotivationalQuote() {
  const quotes = [
    "Great job! You're one step closer.",
    "Consistency is the key to success.",
    "You did it! Keep the momentum.",
    "Small wins lead to big changes.",
    "Progress, not perfection.",
    "You're building a better habit.",
    "Every step counts. Well done!",
    "Today’s effort is tomorrow’s result.",
    "You showed up. That’s what matters.",
    "Keep going—you’re doing amazing!"
  ];
  return quotes[Math.floor(Math.random() * quotes.length)];
}

function showCelebration({ emoji, title, message }) {
  const modal = $('celebrateModal');
  const layer = $('confettiLayer');
  if (!modal || !layer) return;

  $('celebrateEmoji').textContent = emoji || '🎉';
  $('celebrateTitle').textContent = title || 'Nice!';
  $('celebrateMessage').textContent = message || 'Completed.';

  const quoteEl = $('celebrateQuote');
  if (quoteEl) {
    quoteEl.textContent = getMotivationalQuote();
  }

  layer.innerHTML = '';

  const colors = [
    '#6d28d9',
    '#22d3ee',
    '#a78bfa',
    '#f59e0b',
    '#34d399',
    '#fb7185'
  ];

  const pieces = 36;
  for (let i = 0; i < pieces; i++) {
    const p = document.createElement('div');
    p.className = 'confetti';
    p.style.left = Math.random() * 100 + '%';
    p.style.top = (-20 - Math.random() * 80) + 'px';
    p.style.background = colors[i % colors.length];
    p.style.transform = `rotate(${Math.random() * 360}deg)`;
    p.style.animationDuration = (700 + Math.random() * 700) + 'ms';
    p.style.opacity = String(0.7 + Math.random() * 0.3);
    layer.appendChild(p);
  }

  modal.style.display = 'flex';

  window.setTimeout(() => {
    layer.innerHTML = '';
  }, 1600);
}

function hideCelebration() {
  const modal = $('celebrateModal');
  const layer = $('confettiLayer');
  if (layer) layer.innerHTML = '';
  if (modal) modal.style.display = 'none';
}

function exportData() {
  const safeState = {
    ...state,
    timerRunning: false,
    timerInterval: null
  };

  const blob = new Blob([JSON.stringify(safeState, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `habitflow-${state.date || getTodayDateString()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(String(ev.target.result || ''));
      if (!data || typeof data !== 'object') return;
      if (!Array.isArray(data.habits)) return;

      stopTimer();

      state = {
        ...state,
        ...data,
        timerRunning: false,
        timerInterval: null
      };
      state.level = Math.floor((state.xp || 0) / 100) + 1;
      if (!state.date) state.date = getTodayDateString();

      saveState();
      applyTheme();
      renderAll();
      updateTimerDisplay();
    } catch {
    }
  };
  reader.readAsText(file);
}

function getTodayCompletion() {
  const habits = getTodayHabits();
  const completed = habits.filter(h => (h.type === 'count' ? h.count >= h.goal : h.done)).length;
  const percentage = habits.length > 0 ? Math.round((completed / habits.length) * 100) : 0;
  return { habits, completed, total: habits.length, percentage };
}

function downloadDailyReportPdf() {
  const dateStr = state.date || getTodayDateString();
  const { habits, completed, total, percentage } = getTodayCompletion();

  const rows = habits
    .map(h => {
      const status = h.type === 'count'
        ? `${h.count}/${h.goal}${h.count >= h.goal ? ' (Done)' : ''}`
        : h.done ? 'Done' : 'Pending';
      const pill = (h.type === 'count' ? h.count >= h.goal : h.done)
        ? '<span class="pill good">DONE</span>'
        : '<span class="pill">PENDING</span>';
      return `<tr><td class="habit">${h.emoji} <strong>${h.name}</strong><div class="sub">${h.category} • ${h.type}</div></td><td class="right">${status}<div>${pill}</div></td></tr>`;
    })
    .join('');

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>HabitFlow Report - ${dateStr}</title>
  <style>
    :root{--bg:#faf7ff;--card:#ffffff;--text:#1f1b2e;--muted:#5b5b78;--p:#6d28d9;--c:#22d3ee;--y:#f59e0b;--good:#22c55e;--border:#e7e0f3}
    *{box-sizing:border-box}
    @page{size:A4;margin:10mm}
    body{font-family:ui-rounded,system-ui,-apple-system,'Segoe UI',Arial,sans-serif;margin:0;background:var(--bg);color:var(--text)}
    .wrap{max-width:900px;margin:16px auto;padding:0 14px}
    .top{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}
    .brand{display:flex;gap:10px;align-items:center}
    .logo{width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,var(--p),var(--c));display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px;font-weight:900}
    h1{margin:0;font-size:24px;line-height:1.1}
    .meta{margin-top:2px;color:var(--muted);font-size:12px}
    .badge{padding:6px 10px;border-radius:999px;border:1px solid var(--border);background:linear-gradient(180deg,rgba(109,40,217,.10),rgba(34,211,238,.10));font-weight:900;color:var(--p);white-space:nowrap}

    .cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:10px 0}
    .card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:10px;position:relative;overflow:hidden}
    .card:before{content:"";position:absolute;inset:0 0 auto 0;height:4px;background:linear-gradient(90deg,var(--p),var(--c),var(--y))}
    .k{color:var(--muted);font-size:10px;text-transform:uppercase;letter-spacing:.08em}
    .v{font-size:18px;font-weight:900;margin-top:4px}
    .big{display:flex;align-items:center;justify-content:space-between;gap:10px}
    .ring{width:62px;height:62px;border-radius:999px;background:conic-gradient(var(--good) ${percentage}%, #ece8f6 ${percentage}%);display:flex;align-items:center;justify-content:center;border:1px solid var(--border)}
    .ring span{width:48px;height:48px;border-radius:999px;background:var(--card);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:12px}

    .section{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:10px;break-inside:avoid;page-break-inside:avoid}
    table{width:100%;border-collapse:separate;border-spacing:0 6px;margin-top:6px}
    tr{break-inside:avoid;page-break-inside:avoid}
    td{padding:8px 10px;background:#fff;border:1px solid var(--border);vertical-align:top}
    td:first-child{border-radius:12px 0 0 12px}
    td:last-child{border-radius:0 12px 12px 0}
    .habit{font-size:12px}
    .sub{color:var(--muted);font-size:11px;margin-top:2px}
    .right{text-align:right;white-space:nowrap;font-size:12px}
    .pill{display:inline-block;margin-top:5px;padding:3px 9px;border-radius:999px;font-size:10px;font-weight:900;letter-spacing:.08em;border:1px solid var(--border);color:var(--muted)}
    .pill.good{background:rgba(34,197,94,.12);border-color:rgba(34,197,94,.35);color:#15803d}
    .hint{margin-top:6px;color:var(--muted);font-size:11px}

    @media (max-width:760px){.cards{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media print{
      body{background:#fff}
      .hint{display:none}
      .wrap{margin:0 auto}
      .sub{display:none}
      table{border-spacing:0 4px}
      td{padding:7px 9px}
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="top">
      <div class="brand">
        <div class="logo">HF</div>
        <div>
          <h1>Daily Report</h1>
          <div class="meta">${dateStr}</div>
        </div>
      </div>
      <div class="badge">${percentage}% complete</div>
    </div>

    <div class="cards">
      <div class="card"><div class="k">Streak</div><div class="v">${state.streak || 0}</div></div>
      <div class="card"><div class="k">XP</div><div class="v">${state.xp || 0}</div></div>
      <div class="card"><div class="k">Level</div><div class="v">${state.level || 1}</div></div>
      <div class="card big">
        <div>
          <div class="k">Completed</div>
          <div class="v">${completed}/${total}</div>
        </div>
        <div class="ring"><span>${percentage}%</span></div>
      </div>
    </div>

    <div class="section">
      <h2 style="margin:0 0 8px 0">Today’s Habits</h2>
      <table>
        <tbody>
          ${rows || '<tr><td class="habit">No habits for today.</td><td class="right"><span class="pill">EMPTY</span></td></tr>'}
        </tbody>
      </table>
      <div class="hint">Tip: In the print dialog, choose “Save as PDF”.</div>
    </div>
  </div>
  <script>
    window.onload = () => { window.print(); };
  </script>
</body>
</html>`;

  const w = window.open('', '_blank');
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}

// Setup event listeners
function setupEventListeners() {
  // Header buttons
  $('addHabitBtn').addEventListener('click', () => {
    $('habitModal').style.display = 'flex';
  });
  
  $('themeToggle').addEventListener('click', toggleTheme);
  
  // Modal
  $('closeModal').addEventListener('click', () => {
    $('habitModal').style.display = 'none';
  });
  
  $('habitModal').addEventListener('click', (e) => {
    if (e.target === $('habitModal')) {
      $('habitModal').style.display = 'none';
    }
  });

  $('celebrateContinue').addEventListener('click', hideCelebration);
  $('celebrateModal').addEventListener('click', (e) => {
    if (e.target === $('celebrateModal')) {
      hideCelebration();
    }
  });
  
  // Form
  $('habitForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const days = [];
    document.querySelectorAll('input[name="days"]:checked').forEach(cb => {
      days.push(parseInt(cb.value));
    });
    
    const habit = {
      id: 'h' + Date.now(),
      emoji: $('habitEmoji').value || '📝',
      name: $('habitName').value.trim(),
      type: $('habitType').value,
      category: $('habitCategory').value,
      goal: parseInt($('habitGoal').value) || 1,
      days: days.length > 0 ? days : [0,1,2,3,4,5,6],
      count: 0,
      done: false
    };
    
    state.habits.push(habit);
    saveState();
    renderAll();
    
    $('habitForm').reset();
    $('habitModal').style.display = 'none';
  });
  
  // Habit type change
  $('habitType').addEventListener('change', (e) => {
    $('goalGroup').style.display = e.target.value === 'count' ? 'block' : 'none';
  });
  
  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentFilter = btn.dataset.filter;
      renderHabits();
    });
  });

  // Habit buttons (event delegation)
  $('habitsContainer').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const card = btn.closest('.habit-card');
    if (!card) return;

    const id = card.dataset.id;
    const action = btn.dataset.action;

    if (action === 'count') {
      const delta = parseInt(btn.dataset.delta || '0', 10);
      updateHabit(id, delta);
      return;
    }

    if (action === 'toggle') {
      toggleHabit(id);
      return;
    }

    if (action === 'delete') {
      deleteHabit(id);
    }
  });
  
  // Timer buttons
  $('startTimer').addEventListener('click', () => {
    if (state.timerRunning) {
      stopTimer();
    } else {
      startTimer();
    }
  });
  
  $('resetTimer').addEventListener('click', resetTimer);

  $('exportBtn').addEventListener('click', exportData);
  $('importBtn').addEventListener('click', () => $('importFile').click());
  $('importFile').addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) importData(file);
    e.target.value = '';
  });

  $('downloadReportBtn').addEventListener('click', downloadDailyReportPdf);

  $('resetTodayBtn').addEventListener('click', resetToday);

  // Back to top button
  const backToTopBtn = $('backToTop');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
      backToTopBtn.classList.add('visible');
    } else {
      backToTopBtn.classList.remove('visible');
    }
  });

  backToTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Bottom nav
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const section = item.dataset.section;
      let target = null;

      if (section === 'home') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (section === 'trophies') {
        target = document.querySelector('.achievements-section');
      } else if (section === 'settings') {
        target = document.querySelector('.utilities');
      }

      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
    });
  });

  // Footer links
  document.querySelectorAll('.footer-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const href = link.getAttribute('href');
      let target = null;
      let navItem = null;

      if (href === '#home') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        navItem = document.querySelector('.nav-item[data-section="home"]');
      } else if (href === '#trophies') {
        target = document.querySelector('.achievements-section');
        navItem = document.querySelector('.nav-item[data-section="trophies"]');
      } else if (href === '#settings') {
        target = document.querySelector('.utilities');
        navItem = document.querySelector('.nav-item[data-section="settings"]');
      }

      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      if (navItem) {
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        navItem.classList.add('active');
      }
    });
  });
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
