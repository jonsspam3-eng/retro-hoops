import { CANVAS } from "../core/constants.js";
import {
  createInputState,
  createControlLayout,
  setupCanvasInput,
  updateShootCharge,
  consumeShootRelease,
} from "./controls.js";
import { createGameRuntime } from "./sim.js";

function playSoundFromEvent(audio, event) {
  if (!audio.ctx) return;
  const now = audio.ctx.currentTime;
  const o = audio.ctx.createOscillator();
  const g = audio.ctx.createGain();
  o.connect(g);
  g.connect(audio.ctx.destination);
  g.gain.setValueAtTime(0.0001, now);

  if (event === "swish") {
    o.type = "triangle";
    o.frequency.setValueAtTime(690, now);
    o.frequency.exponentialRampToValueAtTime(520, now + 0.12);
    g.gain.exponentialRampToValueAtTime(0.07, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.17);
    o.start(now);
    o.stop(now + 0.18);
    return;
  }

  if (event === "rim") {
    o.type = "square";
    o.frequency.setValueAtTime(400, now);
    o.frequency.exponentialRampToValueAtTime(220, now + 0.08);
    g.gain.exponentialRampToValueAtTime(0.06, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
    o.start(now);
    o.stop(now + 0.14);
    return;
  }

  if (event === "board") {
    o.type = "sawtooth";
    o.frequency.setValueAtTime(180, now);
    o.frequency.exponentialRampToValueAtTime(120, now + 0.07);
    g.gain.exponentialRampToValueAtTime(0.05, now + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
    o.start(now);
    o.stop(now + 0.12);
    return;
  }

  if (event === "steal" || event === "block") {
    o.type = "square";
    o.frequency.setValueAtTime(240, now);
    o.frequency.exponentialRampToValueAtTime(330, now + 0.06);
    g.gain.exponentialRampToValueAtTime(0.05, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
    o.start(now);
    o.stop(now + 0.11);
    return;
  }

  if (event === "buzzer") {
    o.type = "sine";
    o.frequency.setValueAtTime(880, now);
    o.frequency.setValueAtTime(740, now + 0.2);
    g.gain.exponentialRampToValueAtTime(0.055, now + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
    o.start(now);
    o.stop(now + 0.44);
    return;
  }

  // crowd_cheer / crowd_groan placeholder noise burst
  o.type = "triangle";
  o.frequency.setValueAtTime(event === "crowd_cheer" ? 520 : 200, now);
  o.frequency.exponentialRampToValueAtTime(event === "crowd_cheer" ? 420 : 140, now + 0.18);
  g.gain.exponentialRampToValueAtTime(0.04, now + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
  o.start(now);
  o.stop(now + 0.22);
}

function setHud(hud) {
  const left = document.getElementById("hud-score-left");
  const center = document.getElementById("hud-time");
  const shotClock = document.getElementById("hud-shotclock");
  const right = document.getElementById("hud-score-right");
  const crowd = document.getElementById("hud-crowd");
  const run = document.getElementById("hud-run");
  const log = document.getElementById("game-log");
  const meter = document.getElementById("shot-meter");
  if (!left || !center || !shotClock || !right || !crowd || !run || !log || !meter) return;

  left.textContent = hud.left;
  center.textContent = hud.center;
  shotClock.textContent = hud.shotClock;
  right.textContent = hud.right;
  crowd.textContent = hud.crowd;
  run.textContent = hud.run;
  log.textContent = hud.log;

  meter.style.width = `${Math.round(hud.meter * 100)}%`;
  meter.className = "meter-bar";
  if (hud.meter >= 0.45 && hud.meter <= 0.57) {
    meter.classList.add("green");
  } else if (hud.meter > 0.34 && hud.meter < 0.72) {
    meter.classList.add("hot");
  } else {
    meter.classList.add("bad");
  }
}

export function createGameSession({ userTeam, cpuTeam, onGameFinished }) {
  const canvas = document.getElementById("court");
  if (!canvas) throw new Error("Missing #court");
  canvas.width = CANVAS.width;
  canvas.height = CANVAS.height;

  const input = createInputState();
  const layout = createControlLayout();
  setupCanvasInput(canvas, input, layout);

  const runtime = createGameRuntime({
    userTeam,
    cpuTeam,
    input,
    controlLayout: layout,
    onComplete: onGameFinished,
  });

  let rafId = 0;
  let last = performance.now();
  const audio = {
    ctx: null,
  };

  const initAudio = () => {
    if (audio.ctx) return;
    try {
      audio.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      audio.ctx = null;
    }
  };
  window.addEventListener("pointerdown", initAudio, { once: true });
  window.addEventListener("touchstart", initAudio, { once: true, passive: true });

  function tick(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    updateShootCharge(input, dt);
    const shotRelease = consumeShootRelease(input);
    runtime.step(dt, shotRelease);
    runtime.draw(canvas);
    setHud(runtime.getHud());
    const events = runtime.getAndClearSoundEvents();
    for (const event of events) {
      playSoundFromEvent(audio, event);
    }
    rafId = requestAnimationFrame(tick);
  }

  rafId = requestAnimationFrame(tick);
  return {
    destroy() {
      cancelAnimationFrame(rafId);
      window.removeEventListener("pointerdown", initAudio);
      window.removeEventListener("touchstart", initAudio);
    },
  };
}
