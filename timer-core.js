// Timer logic shared by the big screen (index.html) and the phone (remote.html).
// The big screen runs the timer and phones send it commands; a phone opened on its own runs
// the timer itself with the same code.

const IDLE_COLOUR = '#1e1e24';  // dark grey between colours

const PALETTES = {
  bright:  { name: 'Bright',  green: '#00c853', amber: '#ffab00', red: '#ff1744' },
  neon:    { name: 'Neon',    green: '#39ff14', amber: '#ffea00', red: '#ff073a' },
  classic: { name: 'Classic', green: '#2ecc40', amber: '#ff851b', red: '#ff4136' },
  deep:    { name: 'Deep',    green: '#0f3d1d', amber: '#4a3300', red: '#4a0f0f' },
};

function pad(n) { return String(n).padStart(2, '0'); }
function fmtDuration(ms) {
  const secs = Math.floor(ms / 1000);
  const hh = Math.floor(secs / 3600), mm = Math.floor(secs % 3600 / 60), ss = secs % 60;
  return hh ? `${hh}:${pad(mm)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`;
}
function fmtClock(d) { return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; }

// Each colour stays on from its minute mark until the next colour comes in; red stays on.
function phaseAt(ms, t) {
  if (!t) return null;
  if (ms >= t.red) return 'red';
  if (ms >= t.amber) return 'amber';
  if (ms >= t.green) return 'green';
  return null;
}

function phaseColour(phase, palette) {
  return phase ? palette[phase] : IDLE_COLOUR;
}

function validPalette(p) {
  return !!p && ['green', 'amber', 'red'].every(k => /^#[0-9a-f]{6}$/i.test(p[k]));
}

function loadJson(key, fallback) {
  try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch { return fallback; }
}
function saveJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function createTimer() {
  const HISTORY_KEY = 'trafficLightTimerHistory';
  const PALETTE_KEY = 'trafficLightTimerPalette';

  let triggers = null;     // { green, amber, red } in ms from start
  let accumulated = 0;     // ms counted before the current run
  let startedAt = null;    // timestamp of current run, null when paused
  let currentEntry = null; // index of this timer's history entry (updated on resume + stop)
  let history = loadJson(HISTORY_KEY, []);
  let palette = loadJson(PALETTE_KEY, null);
  if (!validPalette(palette)) palette = { ...PALETTES.bright };

  function elapsed() {
    return accumulated + (startedAt ? Date.now() - startedAt : 0);
  }

  function start(minutes) {
    if (startedAt) return;
    if (!triggers) {
      const { green, amber, red } = minutes || {};
      if (![green, amber, red].every(v => typeof v === 'number' && v >= 0)) return;
      triggers = { green: green * 60000, amber: amber * 60000, red: red * 60000 };
      accumulated = 0;
      currentEntry = null;
    }
    startedAt = Date.now();
  }

  function stop() {
    if (!startedAt) return;
    accumulated = elapsed();
    startedAt = null;
    const entry = { ms: accumulated, stoppedAt: fmtClock(new Date()) };
    if (currentEntry === null) {
      history.push(entry);
      currentEntry = history.length - 1;
    } else {
      history[currentEntry] = entry;
    }
    saveJson(HISTORY_KEY, history);
  }

  function reset() {
    triggers = null;
    accumulated = 0;
    startedAt = null;
    currentEntry = null;
  }

  return {
    command(msg) {
      if (!msg || typeof msg !== 'object') return;
      if (msg.cmd === 'start') start(msg.minutes);
      else if (msg.cmd === 'stop') stop();
      else if (msg.cmd === 'reset') reset();
      else if (msg.cmd === 'clearHistory') { history = []; saveJson(HISTORY_KEY, history); }
      else if (msg.cmd === 'palette' && validPalette(msg.palette)) {
        palette = { green: msg.palette.green, amber: msg.palette.amber, red: msg.palette.red };
        saveJson(PALETTE_KEY, palette);
      }
    },
    state() {
      return { running: !!startedAt, elapsedMs: elapsed(), triggers, history, palette };
    },
    // Current screen colour: idle grey until green comes in, or while paused.
    colour() {
      return phaseColour(startedAt ? phaseAt(elapsed(), triggers) : null, palette);
    },
  };
}
