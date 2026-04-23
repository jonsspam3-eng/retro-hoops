import { CANVAS } from "../core/constants.js";
import {
  createInputState,
  createControlLayout,
  setupCanvasInput,
  updateShootCharge,
  consumeShootRelease,
} from "./controls.js";
import { createGameRuntime } from "./sim.js";

function setHud(hud) {
  const left = document.getElementById("hud-score-left");
  const center = document.getElementById("hud-time");
  const right = document.getElementById("hud-score-right");
  const log = document.getElementById("game-log");
  const meter = document.getElementById("shot-meter");
  if (!left || !center || !right || !log || !meter) return;

  left.textContent = hud.left;
  center.textContent = hud.center;
  right.textContent = hud.right;
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

  function tick(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    updateShootCharge(input, dt);
    const shotRelease = consumeShootRelease(input);
    runtime.step(dt, shotRelease);
    runtime.draw(canvas);
    setHud(runtime.getHud());
    rafId = requestAnimationFrame(tick);
  }

  rafId = requestAnimationFrame(tick);
  return {
    destroy() {
      cancelAnimationFrame(rafId);
    },
  };
}
