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

// Checks the minute marks: each a number of 0 or more, with green before amber before red.
// Returns an error message and the colours to highlight, or null when they're fine.
function checkMinutes(m) {
  const keys = ['green', 'amber', 'red'];
  const missing = keys.filter(k => !(typeof m[k] === 'number' && m[k] >= 0));
  if (missing.length) return { message: 'Enter minutes (0 or more) for each colour.', bad: missing };
  if (m.green >= m.amber) return { message: 'Green must come before amber – use a smaller number for green.', bad: ['green', 'amber'] };
  if (m.amber >= m.red) return { message: 'Amber must come before red – use a smaller number for amber.', bad: ['amber', 'red'] };
  return null;
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

  // A timer is idle (no triggers), running, paused, or stopped (finished, time saved).
  let triggers = null;     // { green, amber, red } in ms from start
  let accumulated = 0;     // ms counted before the current run
  let startedAt = null;    // timestamp of current run, null when not running
  let stopped = false;     // finished with Stop; its time is in the history
  let history = loadJson(HISTORY_KEY, []);
  let palette = loadJson(PALETTE_KEY, null);
  if (!validPalette(palette)) palette = { ...PALETTES.bright };

  function elapsed() {
    return accumulated + (startedAt ? Date.now() - startedAt : 0);
  }

  function record() {
    history.push({ ms: elapsed(), stoppedAt: fmtClock(new Date()) });
    saveJson(HISTORY_KEY, history);
  }

  // Start a new timer (from idle, or after the last one was stopped).
  function start(minutes) {
    if (triggers && !stopped) return;  // already running or paused
    if (!minutes || checkMinutes(minutes)) return;
    const { green, amber, red } = minutes;
    triggers = { green: green * 60000, amber: amber * 60000, red: red * 60000 };
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
    if (!triggers || stopped || startedAt) return;
    startedAt = Date.now();
  }

  // Finish the timer and save its time.
  function stop() {
    if (!triggers || stopped) return;
    accumulated = elapsed();
    startedAt = null;
    stopped = true;
    record();
  }

  // Clear the timer. A timer that ran but wasn't stopped still gets its time saved.
  function reset() {
    if (triggers && !stopped && elapsed() > 0) record();
    triggers = null;
    accumulated = 0;
    startedAt = null;
    stopped = false;
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
      else if (msg.cmd === 'palette' && validPalette(msg.palette)) {
        palette = { green: msg.palette.green, amber: msg.palette.amber, red: msg.palette.red };
        saveJson(PALETTE_KEY, palette);
      }
    },
    state() {
      const running = !!startedAt;
      return {
        running,
        paused: !!triggers && !stopped && !running,
        stopped,
        elapsedMs: elapsed(),
        triggers,
        history,
        palette,
      };
    },
    // Current screen colour: idle grey until green comes in, and while paused or stopped.
    colour() {
      return phaseColour(startedAt ? phaseAt(elapsed(), triggers) : null, palette);
    },
  };
}
