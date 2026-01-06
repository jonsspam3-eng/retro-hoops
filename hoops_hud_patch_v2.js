/* =========================================================
   File: hoops_hud_patch_v2.js
   Load BEFORE the game script(s).

   <script src="hoops_hud_patch_v2.js"></script>
   <script src="html5game/RetroBowl.js"></script>

   Purpose:
   - Hide football HUD "1st & 10" / "3rd & GOAL"
   - Draw basketball shot clock "SC 08" next to the time on the top bar

   Notes:
   - UI-layer reskin only. Does not change core gameplay rules.
   ========================================================= */
(() => {
  "use strict";

  if (window.__RETRO_HOOPS_HUD_V2__) return;
  window.__RETRO_HOOPS_HUD_V2__ = true;

  const SHOT_CLOCK_SECONDS = 14;
  const SHOT_CLOCK_LABEL = "SC";
  const SC_OFFSET_PX = 10;

  let frameId = 0;
  const raf = () => { frameId += 1; requestAnimationFrame(raf); };
  requestAnimationFrame(raf);

  const state = {
    shotClock: SHOT_CLOCK_SECONDS,
    lastTickMs: performance.now(),
    lastHudSeenMs: 0,
    lastHudKey: "",
    timeDraw: {
      text: "",
      x: 0,
      y: 0,
      font: "",
      textAlign: "left",
      textBaseline: "alphabetic",
      dir: "inherit",
      frame: 0,
      ts: 0
    }
  };

  const RE_TIME = /^\s*\d{1,2}:\d{2}\s*$/;
  const RE_DOWN_DISTANCE = /^\s*(\d)\s*(st|nd|rd|th)\s*&\s*(\d+)\s*$/i;
  const RE_DOWN_GOAL = /^\s*(\d)\s*(st|nd|rd|th)\s*&\s*GOAL\s*$/i;
  const RE_DOWN_ONLY = /^\s*(\d)\s*(st|nd|rd|th)\s*DOWN\s*$/i;

  function pad2(n) {
    const v = Math.max(0, Math.min(99, n | 0));
    return v < 10 ? `0${v}` : String(v);
  }

  function tickShotClock(nowMs) {
    const dt = Math.max(0, (nowMs - state.lastTickMs) / 1000);
    state.lastTickMs = nowMs;
    const active = nowMs - state.lastHudSeenMs < 650;
    if (!active) return;
    state.shotClock = Math.max(0, state.shotClock - dt);
  }

  function resetShotClock(nowMs) {
    state.shotClock = SHOT_CLOCK_SECONDS;
    state.lastTickMs = nowMs;
  }

  function captureTimeDraw(ctx, text, x, y) {
    state.timeDraw.text = String(text);
    state.timeDraw.x = x;
    state.timeDraw.y = y;
    state.timeDraw.font = ctx.font || "";
    state.timeDraw.textAlign = ctx.textAlign || "left";
    state.timeDraw.textBaseline = ctx.textBaseline || "alphabetic";
    state.timeDraw.dir = ctx.direction || "inherit";
    state.timeDraw.frame = frameId;
    state.timeDraw.ts = performance.now();
  }

  function sameTextStyle(ctx, t) {
    return (
      (t.font === (ctx.font || "")) &&
      (t.textAlign === (ctx.textAlign || "left")) &&
      (t.textBaseline === (ctx.textBaseline || "alphabetic")) &&
      (t.dir === (ctx.direction || "inherit"))
    );
  }

  function getShotClockText() {
    const sc = Math.ceil(state.shotClock);
    return `${SHOT_CLOCK_LABEL} ${pad2(sc)}`;
  }

  function drawShotClockNearTime(ctx, drawFnName) {
    const nowMs = performance.now();
    tickShotClock(nowMs);

    const scText = getShotClockText();
    const t = state.timeDraw;

    let targetX;
    let targetY;

    if (t.text && (frameId - t.frame) <= 2 && sameTextStyle(ctx, t) && RE_TIME.test(t.text)) {
      const timeWidth = ctx.measureText(t.text).width || 0;
      targetX = t.x + timeWidth + SC_OFFSET_PX;
      targetY = t.y;
    } else if (t.text && (nowMs - t.ts) < 2000 && sameTextStyle(ctx, t) && RE_TIME.test(t.text)) {
      const timeWidth = ctx.measureText(t.text).width || 0;
      targetX = t.x + timeWidth + SC_OFFSET_PX;
      targetY = t.y;
    } else {
      const canvasW = ctx.canvas?.width || 320;
      const scW = ctx.measureText(scText).width || 0;
      targetX = Math.max(0, canvasW - 10 - scW);
      targetY = 16;
    }

    if (drawFnName === "fillText") ctx.fillText(scText, targetX, targetY);
    else ctx.strokeText(scText, targetX, targetY);
  }

  function shouldSuppressDownDistance(text) {
    const t = String(text);
    return RE_DOWN_DISTANCE.test(t) || RE_DOWN_GOAL.test(t) || RE_DOWN_ONLY.test(t);
  }

  function updatePossessionKeyAndResetIfNeeded(text) {
    const nowMs = performance.now();
    state.lastHudSeenMs = nowMs;

    const t = String(text);
    const mDD = t.match(RE_DOWN_DISTANCE);
    const mDG = t.match(RE_DOWN_GOAL);
    const mDO = t.match(RE_DOWN_ONLY);

    if (mDD) {
      const downNum = parseInt(mDD[1], 10);
      const distNum = parseInt(mDD[3], 10);
      const key = `${downNum}&${distNum}`;

      const prev = state.lastHudKey;
      const prevDist = parseInt((prev.split("&")[1] || "0"), 10);
      const distJump = Number.isFinite(prevDist) ? Math.abs(distNum - prevDist) : 0;

      if (key !== prev) {
        if (downNum === 1 || distJump >= 6) resetShotClock(nowMs);
        state.lastHudKey = key;
      }
      return;
    }

    if (mDG) {
      const downNum = parseInt(mDG[1], 10);
      const key = `${downNum}&GOAL`;
      if (key !== state.lastHudKey) {
        if (downNum === 1) resetShotClock(nowMs);
        state.lastHudKey = key;
      }
      return;
    }

    if (mDO) {
      const downNum = parseInt(mDO[1], 10);
      const key = `${downNum}&ONLY`;
      if (key !== state.lastHudKey) {
        if (downNum === 1) resetShotClock(nowMs);
        state.lastHudKey = key;
      }
    }
  }

  const proto = CanvasRenderingContext2D.prototype;

  const _fillText = proto.fillText;
  proto.fillText = function (text, x, y, maxWidth) {
    const s = String(text ?? "");
    if (RE_TIME.test(s)) captureTimeDraw(this, s, x, y);

    if (shouldSuppressDownDistance(s)) {
      updatePossessionKeyAndResetIfNeeded(s);
      drawShotClockNearTime(this, "fillText");
      return;
    }

    if (maxWidth !== undefined) return _fillText.call(this, text, x, y, maxWidth);
    return _fillText.call(this, text, x, y);
  };

  const _strokeText = proto.strokeText;
  proto.strokeText = function (text, x, y, maxWidth) {
    const s = String(text ?? "");
    if (RE_TIME.test(s)) captureTimeDraw(this, s, x, y);

    if (shouldSuppressDownDistance(s)) {
      updatePossessionKeyAndResetIfNeeded(s);
      drawShotClockNearTime(this, "strokeText");
      return;
    }

    if (maxWidth !== undefined) return _strokeText.call(this, text, x, y, maxWidth);
    return _strokeText.call(this, text, x, y);
  };
})();
