import { CANVAS } from "../core/constants.js";
import { clamp } from "../core/math.js";

const JOYSTICK_RADIUS = 48;

export function createInputState() {
  return {
    pointer: { active: false, x: 0, y: 0 },
    joystick: {
      active: false,
      baseX: 90,
      baseY: CANVAS.height - 82,
      knobX: 90,
      knobY: CANVAS.height - 82,
      dx: 0,
      dy: 0,
    },
    buttons: {
      pass: false,
      shoot: false,
      sprint: false,
      defense: false,
      pick: false,
      switchDefense: false,
    },
    shootCharge: 0,
    shootReleased: false,
    lastTapAt: 0,
  };
}

function resolveCanvasPoint(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  const clientX = event.touches ? event.touches[0].clientX : event.clientX;
  const clientY = event.touches ? event.touches[0].clientY : event.clientY;
  const scaleX = CANVAS.width / rect.width;
  const scaleY = CANVAS.height / rect.height;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  };
}

function updateJoystickFromPoint(input, x, y) {
  const rawDx = x - input.joystick.baseX;
  const rawDy = y - input.joystick.baseY;
  const distance = Math.hypot(rawDx, rawDy);
  const limited = Math.min(distance, JOYSTICK_RADIUS);
  const angle = Math.atan2(rawDy, rawDx);
  input.joystick.dx = distance > 0 ? (Math.cos(angle) * limited) / JOYSTICK_RADIUS : 0;
  input.joystick.dy = distance > 0 ? (Math.sin(angle) * limited) / JOYSTICK_RADIUS : 0;
  input.joystick.knobX = input.joystick.baseX + input.joystick.dx * JOYSTICK_RADIUS;
  input.joystick.knobY = input.joystick.baseY + input.joystick.dy * JOYSTICK_RADIUS;
}

function clearJoystick(input) {
  input.joystick.active = false;
  input.joystick.dx = 0;
  input.joystick.dy = 0;
  input.joystick.knobX = input.joystick.baseX;
  input.joystick.knobY = input.joystick.baseY;
}

function hitBox(point, rect) {
  return point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h;
}

export function createControlLayout() {
  return {
    pass: { x: CANVAS.width - 186, y: CANVAS.height - 116, w: 88, h: 48 },
    shoot: { x: CANVAS.width - 96, y: CANVAS.height - 186, w: 84, h: 94 },
    sprint: { x: CANVAS.width - 96, y: CANVAS.height - 86, w: 84, h: 52 },
    defense: { x: CANVAS.width - 286, y: CANVAS.height - 168, w: 96, h: 58 },
    pick: { x: CANVAS.width - 286, y: CANVAS.height - 101, w: 96, h: 44 },
    switchDefense: { x: CANVAS.width - 286, y: CANVAS.height - 52, w: 96, h: 38 },
  };
}

export function setupCanvasInput(canvas, input, layout) {
  let switchPressedThisGesture = false;

  function onDown(event) {
    event.preventDefault();
    switchPressedThisGesture = false;
    const point = resolveCanvasPoint(event, canvas);
    input.pointer.active = true;
    input.pointer.x = point.x;
    input.pointer.y = point.y;

    if (point.x < CANVAS.width * 0.48) {
      input.joystick.active = true;
      updateJoystickFromPoint(input, point.x, point.y);
      return;
    }

    if (hitBox(point, layout.pass)) input.buttons.pass = true;
    if (hitBox(point, layout.shoot)) input.buttons.shoot = true;
    if (hitBox(point, layout.sprint)) input.buttons.sprint = true;
    if (hitBox(point, layout.defense)) input.buttons.defense = true;
    if (hitBox(point, layout.pick)) input.buttons.pick = true;
    if (hitBox(point, layout.switchDefense)) {
      const now = performance.now();
      if (now - input.lastTapAt < 280 && !switchPressedThisGesture) {
        input.buttons.switchDefense = true;
        switchPressedThisGesture = true;
      }
      input.lastTapAt = now;
    }
  }

  function onMove(event) {
    if (!input.pointer.active) return;
    const point = resolveCanvasPoint(event, canvas);
    input.pointer.x = point.x;
    input.pointer.y = point.y;
    if (input.joystick.active) {
      updateJoystickFromPoint(input, point.x, point.y);
    }
  }

  function onUp(event) {
    event.preventDefault();
    switchPressedThisGesture = false;
    input.pointer.active = false;
    if (input.buttons.shoot) {
      input.shootReleased = true;
    }
    input.buttons.pass = false;
    input.buttons.shoot = false;
    input.buttons.sprint = false;
    input.buttons.defense = false;
    input.buttons.pick = false;
    clearJoystick(input);
  }

  canvas.addEventListener("touchstart", onDown, { passive: false });
  canvas.addEventListener("touchmove", onMove, { passive: false });
  canvas.addEventListener("touchend", onUp, { passive: false });
  canvas.addEventListener("touchcancel", onUp, { passive: false });
  canvas.addEventListener("mousedown", onDown);
  canvas.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onUp);
}

export function updateShootCharge(input, dt) {
  if (input.buttons.shoot) {
    input.shootCharge = clamp(input.shootCharge + dt * 1.6, 0, 1.2);
  }
}

export function consumeShootRelease(input) {
  const released = input.shootReleased;
  input.shootReleased = false;
  const charge = input.shootCharge;
  if (released) {
    input.shootCharge = 0;
  }
  return { released, charge };
}
