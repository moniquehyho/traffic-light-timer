// Timer logic shared by the big screen (index.html) and the phone (remote.html).
// The big screen runs the timer and phones send it commands; a phone opened on its own runs
// the timer itself with the same code.

const IDLE_COLOUR = '#1e1e24';  // dark grey before the first colour, and when not running
const MAX_COLOURS = 10;         // most colours a custom scheme can have
const DISCO_STEP_MS = 1000;     // disco changes colour every second

// Screen colour schemes. Bright and Dark go green, amber, red at the minutes you set; Custom
// does the same with your own colours (as many as you like); Disco just keeps changing.
const SCHEMES = {
  bright: { name: 'Bright', colours: ['#00c853', '#ffab00', '#ff1744'], names: ['Green', 'Amber', 'Red'] },
  dark:   { name: 'Dark',   colours: ['#0f3d1d', '#4a3300', '#4a0f0f'], names: ['Green', 'Amber', 'Red'] },
  disco:  { name: 'Disco',  disco: true,
            colours: ['#ff1744', '#ff9100', '#ffea00', '#00e676', '#00b0ff', '#651fff', '#d500f9', '#ff4081'] },
  custom: { name: 'Custom' },
};
const DEFAULT_SETTINGS = { scheme: 'bright', custom: [...SCHEMES.bright.colours] };

function pad(n) { return String(n).padStart(2, '0'); }
function fmtDuration(ms) {
  const secs = Math.floor(ms / 1000);
  const hh = Math.floor(secs / 3600), mm = Math.floor(secs % 3600 / 60), ss = secs % 60;
  return hh ? `${hh}:${pad(mm)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`;
}
function fmtClock(d) { return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; }

// The colours a scheme steps through, what to call each, and how many minute marks it needs
// (none for disco).
function schemeColours(settings) {
  return settings.scheme === 'custom' ? settings.custom : SCHEMES[settings.scheme].colours;
}
function colourNames(settings) {
  return SCHEMES[settings.scheme].names || schemeColours(settings).map((_, i) => `Colour ${i + 1}`);
}
function markCount(settings) {
  return SCHEMES[settings.scheme].disco ? 0 : schemeColours(settings).length;
}

// The screen colour at `ms` into a timer. Each colour stays on from its minute mark until the
// next one comes in, and the last stays on. A timer with no minute marks is a disco timer.
function screenColour(ms, running, triggers, settings) {
  if (!running || !triggers) return IDLE_COLOUR;
  if (!triggers.length) {
    const c = SCHEMES.disco.colours;
    return c[Math.floor(ms / DISCO_STEP_MS) % c.length];
  }
  let step = -1;
  triggers.forEach((t, i) => { if (ms >= t) step = i; });
  const colours = schemeColours(settings);
  return step < 0 ? IDLE_COLOUR : colours[Math.min(step, colours.length - 1)];
}

// Checks a list of minute marks: each a number of 0 or more, each before the next.
// Returns an error message and the positions to highlight, or null when they're fine.
function checkMinutes(list, names) {
  const bad = list.map((_, i) => i).filter(i => !(typeof list[i] === 'number' && list[i] >= 0));
  if (bad.length) return { message: 'Enter minutes (0 or more) for each colour.', bad };
  for (let i = 0; i + 1 < list.length; i++) {
    if (list[i] >= list[i + 1]) {
      return {
        message: `${names[i]} must come before ${names[i + 1].toLowerCase()} – use a smaller number for ${names[i].toLowerCase()}.`,
        bad: [i, i + 1],
      };
    }
  }
  return null;
}

function validColour(c) { return typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c); }
function validSettings(s) {
  return !!s && Object.hasOwn(SCHEMES, s.scheme) && Array.isArray(s.custom) &&
    s.custom.length >= 1 && s.custom.length <= MAX_COLOURS && s.custom.every(validColour);
}

function loadJson(key, fallback) {
  try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch { return fallback; }
}
function saveJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function createTimer() {
  const HISTORY_KEY = 'trafficLightTimerHistory';
  const SETTINGS_KEY = 'trafficLightTimerColours';

  // A timer is idle (no triggers), running, paused, or stopped (finished, time saved).
  let triggers = null;     // minute marks in ms from start; [] for a disco timer
  let accumulated = 0;     // ms counted before the current run
  let startedAt = null;    // timestamp of current run, null when not running
  let stopped = false;     // finished with Stop; its time is in the history
  let history = loadJson(HISTORY_KEY, []);
  let settings = loadJson(SETTINGS_KEY, null);
  if (!validSettings(settings)) settings = { ...DEFAULT_SETTINGS, custom: [...DEFAULT_SETTINGS.custom] };

  const active = () => !!triggers && !stopped;  // running or paused

  function elapsed() {
    return accumulated + (startedAt ? Date.now() - startedAt : 0);
  }

  function record() {
    history.push({ ms: elapsed(), stoppedAt: fmtClock(new Date()) });
    saveJson(HISTORY_KEY, history);
  }

  // Start a new timer (from idle, or after the last one was stopped). Disco needs no minutes.
  function start(minutes) {
    if (active()) return;
    const n = markCount(settings);
    if (n === 0) triggers = [];
    else {
      if (!Array.isArray(minutes) || minutes.length !== n || checkMinutes(minutes, colourNames(settings))) return;
      triggers = minutes.map(m => m * 60000);
    }
    accumulated = 0;
    stopped = false;
    startedAt = Date.now();
  }

  function pause() {
    if (!startedAt) return;
    accumulated = elapsed();
    startedAt = null;
  }

  function resume() {
    if (!active() || startedAt) return;
    startedAt = Date.now();
  }

  // Finish the timer and save its time.
  function stop() {
    if (!active()) return;
    accumulated = elapsed();
    startedAt = null;
    stopped = true;
    record();
  }

  // Clear the timer. A timer that ran but wasn't stopped still gets its time saved.
  function reset() {
    if (active() && elapsed() > 0) record();
    triggers = null;
    accumulated = 0;
    startedAt = null;
    stopped = false;
  }

  // Change the colours. While a timer is on, only to a scheme with the same number of minute
  // marks (e.g. Bright to Dark), so the running timer still makes sense.
  function setSettings(s) {
    if (!validSettings(s)) return;
    const next = { scheme: s.scheme, custom: [...s.custom] };
    if (active() && markCount(next) !== triggers.length) return;
    settings = next;
    saveJson(SETTINGS_KEY, settings);
  }

  return {
    command(msg) {
      if (!msg || typeof msg !== 'object') return;
      if (msg.cmd === 'start') start(msg.minutes);
      else if (msg.cmd === 'pause') pause();
      else if (msg.cmd === 'resume') resume();
      else if (msg.cmd === 'stop') stop();
      else if (msg.cmd === 'reset') reset();
      else if (msg.cmd === 'clearHistory') { history = []; saveJson(HISTORY_KEY, history); }
      else if (msg.cmd === 'colours') setSettings(msg.settings);
    },
    state() {
      const running = !!startedAt;
      return {
        running,
        paused: active() && !running,
        stopped,
        elapsedMs: elapsed(),
        triggers,
        history,
        settings,
      };
    },
    // Current screen colour: idle grey until the first colour comes in, and while paused or stopped.
    colour() {
      return screenColour(elapsed(), !!startedAt, triggers, settings);
    },
  };
}
