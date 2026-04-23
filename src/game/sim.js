import { CANVAS, COURT, GAME_CONFIG, GAME_PHASE, SHOT_TYPES, TEAM_SIDES } from "../core/constants.js";
import { clamp, distance, lerp, normalize } from "../core/math.js";
import { getAttribute, speedWithFatigue } from "./ratings.js";

function mapToCanvas(x, y) {
  return {
    x: (x / COURT.width) * CANVAS.width,
    y: (y / COURT.height) * CANVAS.height,
  };
}

function getRimForOffense(offenseSide) {
  return offenseSide === TEAM_SIDES.USER
    ? { x: COURT.width - COURT.rimOffset, y: COURT.centerY }
    : { x: COURT.rimOffset, y: COURT.centerY };
}

function clonePlayers(roster, side, attackRight) {
  const baseX = attackRight ? 16 : COURT.width - 16;
  const ys = [8, 17, 25, 33, 42];
  return roster.slice(0, 5).map((player, index) => ({
    id: `${side}-${player.id}`,
    side,
    name: player.name,
    position: player.position,
    ratings: { ...player.ratings },
    stamina: 100,
    hotStreak: 0,
    x: baseX + (index % 2 === 0 ? 0 : (attackRight ? 2.5 : -2.5)),
    y: ys[index],
    vx: 0,
    vy: 0,
  }));
}

function drawControlButton(ctx, rect, label, active, variant = "normal") {
  const gradient = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  if (variant === "primary") {
    gradient.addColorStop(0, "rgba(92, 184, 255, 0.92)");
    gradient.addColorStop(1, "rgba(55, 111, 255, 0.9)");
  } else if (variant === "warn") {
    gradient.addColorStop(0, "rgba(255, 188, 90, 0.92)");
    gradient.addColorStop(1, "rgba(255, 121, 73, 0.9)");
  } else {
    gradient.addColorStop(0, "rgba(255, 255, 255, 0.2)");
    gradient.addColorStop(1, "rgba(255, 255, 255, 0.12)");
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = active ? "#ffffff" : "rgba(255,255,255,0.45)";
  ctx.lineWidth = active ? 2.6 : 1.2;
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = "#eaf2ff";
  ctx.font = "bold 14px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2);
}

function drawCourt(ctx) {
  ctx.fillStyle = "#9f6b41";
  ctx.fillRect(0, 0, CANVAS.width, CANVAS.height);
  ctx.strokeStyle = "rgba(255,255,255,0.76)";
  ctx.lineWidth = 3;
  ctx.strokeRect(6, 6, CANVAS.width - 12, CANVAS.height - 12);
  ctx.beginPath();
  ctx.moveTo(CANVAS.width / 2, 6);
  ctx.lineTo(CANVAS.width / 2, CANVAS.height - 6);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(CANVAS.width / 2, CANVAS.height / 2, 56, 0, Math.PI * 2);
  ctx.stroke();

  const paintW = (COURT.paintWidth / COURT.width) * CANVAS.width;
  const paintH = (COURT.paintHeight / COURT.height) * CANVAS.height;
  ctx.strokeRect(0, CANVAS.height / 2 - paintH / 2, paintW, paintH);
  ctx.strokeRect(CANVAS.width - paintW, CANVAS.height / 2 - paintH / 2, paintW, paintH);
}

function drawPlayer(ctx, player, teamColor, ringColor, selected, hasBall) {
  const p = mapToCanvas(player.x, player.y);
  ctx.beginPath();
  ctx.arc(p.x, p.y, 11, 0, Math.PI * 2);
  ctx.fillStyle = teamColor;
  ctx.fill();
  ctx.strokeStyle = selected ? "#ffffff" : ringColor;
  ctx.lineWidth = selected ? 3 : 2;
  ctx.stroke();
  if (hasBall) {
    ctx.beginPath();
    ctx.arc(p.x + 10, p.y + 7, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#f18e37";
    ctx.fill();
  }
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(p.x - 12, p.y - 16, 24, 4);
  const pct = player.stamina / 100;
  ctx.fillStyle = pct > 0.5 ? "#56e894" : pct > 0.32 ? "#ffd45f" : "#ff6f7d";
  ctx.fillRect(p.x - 12, p.y - 16, pct * 24, 4);
}

function nearestPlayer(players, target) {
  let best = players[0];
  let bestDist = Number.POSITIVE_INFINITY;
  for (const player of players) {
    const d = distance(player, target);
    if (d < bestDist) {
      bestDist = d;
      best = player;
    }
  }
  return { player: best, dist: bestDist };
}

function classifyShotType(shooter, offenseSide) {
  const rim = getRimForOffense(offenseSide);
  const d = distance(shooter, rim);
  if (d < 2.2 && shooter.vx * shooter.vx + shooter.vy * shooter.vy > 70) return SHOT_TYPES.DUNK;
  if (d < 5.6) return SHOT_TYPES.LAYUP;
  if (d > COURT.threeRadius - 1.2) return SHOT_TYPES.THREE;
  return SHOT_TYPES.MID;
}

function shotSuccess({
  shooter,
  defender,
  shotType,
  timingCharge,
  isOffDribble,
  staminaPenalty,
}) {
  const timingTarget = 0.56;
  const timingDiff = Math.abs(timingCharge - timingTarget);
  const green = timingDiff <= 0.06;
  const timingBonus = green ? 0.2 : timingDiff <= 0.12 ? 0.08 : timingDiff <= 0.18 ? -0.04 : -0.14;

  let base = 0.48;
  if (shotType === SHOT_TYPES.DUNK) base = 0.9 + getAttribute(shooter, "finishing") / 1200;
  if (shotType === SHOT_TYPES.LAYUP) base = 0.64 + getAttribute(shooter, "finishing") / 340;
  if (shotType === SHOT_TYPES.MID) base = 0.28 + getAttribute(shooter, "shooting") / 210;
  if (shotType === SHOT_TYPES.THREE) base = 0.18 + getAttribute(shooter, "threePoint") / 200;

  const contestDistance = defender ? distance(shooter, defender) : 10;
  const contestValue = defender
    ? clamp(((GAME_CONFIG.contestRange - contestDistance) / GAME_CONFIG.contestRange) * (getAttribute(defender, "perimeterDefense") / 100), 0, 0.58)
    : 0;
  const dribblePenalty = isOffDribble ? 0.07 : 0;
  const hotBonus = (shooter.hotStreak || 0) * 0.012;
  const staminaEffect = -staminaPenalty;

  const makeChance = clamp(base + timingBonus + hotBonus - contestValue - dribblePenalty + staminaEffect, 0.05, 0.97);
  return {
    made: Math.random() < makeChance,
    makeChance,
    green,
    contestValue,
  };
}

function createStats() {
  return {
    fgm: 0,
    fga: 0,
    tpm: 0,
    tpa: 0,
    steals: 0,
    blocks: 0,
    turnovers: 0,
    offensiveRebounds: 0,
    fastBreaks: 0,
    greens: 0,
  };
}

export function createGameRuntime({ userTeam, cpuTeam, input, controlLayout, onComplete }) {
  const userPlayers = clonePlayers(userTeam.roster, TEAM_SIDES.USER, true);
  const cpuPlayers = clonePlayers(cpuTeam.roster, TEAM_SIDES.CPU, false);

  const state = {
    userTeam,
    cpuTeam,
    userPlayers,
    cpuPlayers,
    selectedUserIndex: 0,
    possession: TEAM_SIDES.USER,
    score: { user: 0, cpu: 0 },
    quarter: 1,
    gameClock: GAME_CONFIG.quarterLength,
    shotClock: GAME_CONFIG.shotClock,
    phase: GAME_PHASE.LIVE,
    freeze: 0,
    log: "Tip won. Attack the rim.",
    ball: {
      mode: "held",
      ownerSide: TEAM_SIDES.USER,
      ownerIndex: 0,
      x: userPlayers[0].x,
      y: userPlayers[0].y,
      vx: 0,
      vy: 0,
      targetSide: null,
      targetIndex: -1,
    },
    meterCharge: 0,
    stats: { user: createStats(), cpu: createStats() },
    onComplete,
    finalResultSent: false,
  };

  function attackingPlayers() {
    return state.possession === TEAM_SIDES.USER ? state.userPlayers : state.cpuPlayers;
  }

  function defendingPlayers() {
    return state.possession === TEAM_SIDES.USER ? state.cpuPlayers : state.userPlayers;
  }

  function currentBallHandler() {
    if (state.ball.mode !== "held") return null;
    const roster = state.ball.ownerSide === TEAM_SIDES.USER ? state.userPlayers : state.cpuPlayers;
    return roster[state.ball.ownerIndex] ?? null;
  }

  function setLog(message) {
    state.log = message;
  }

  function switchPossession(reason, turnover = false) {
    state.possession = state.possession === TEAM_SIDES.USER ? TEAM_SIDES.CPU : TEAM_SIDES.USER;
    state.freeze = GAME_CONFIG.possessionFreezeSeconds;
    state.shotClock = GAME_CONFIG.shotClock;
    state.meterCharge = 0;
    input.shootCharge = 0;
    input.shootReleased = false;

    const offense = attackingPlayers();
    state.ball.mode = "held";
    state.ball.ownerSide = state.possession;
    state.ball.ownerIndex = 0;
    state.ball.targetSide = null;
    state.ball.targetIndex = -1;
    state.ball.x = offense[0].x;
    state.ball.y = offense[0].y;

    if (turnover) {
      if (state.possession === TEAM_SIDES.USER) {
        state.stats.cpu.turnovers += 1;
      } else {
        state.stats.user.turnovers += 1;
      }
    }

    setLog(reason);
  }

  function handlePass(side) {
    const roster = side === TEAM_SIDES.USER ? state.userPlayers : state.cpuPlayers;
    if (state.ball.mode !== "held" || state.ball.ownerSide !== side) return;
    const from = roster[state.ball.ownerIndex];
    const defenders = side === TEAM_SIDES.USER ? state.cpuPlayers : state.userPlayers;
    const candidates = roster.filter((_, idx) => idx !== state.ball.ownerIndex);
    let best = candidates[0];
    let bestScore = Number.NEGATIVE_INFINITY;

    for (const player of candidates) {
      const spacing = Math.min(...defenders.map((defender) => distance(defender, player)));
      const lane = -distance(player, from);
      const score = spacing * 1.3 + lane * 0.08 + getAttribute(player, "passing") * 0.01;
      if (score > bestScore) {
        bestScore = score;
        best = player;
      }
    }
    const targetIndex = roster.indexOf(best);
    const dx = best.x - from.x;
    const dy = best.y - from.y;
    const dir = normalize(dx, dy);
    state.ball.mode = "pass";
    state.ball.targetSide = side;
    state.ball.targetIndex = targetIndex;
    state.ball.ownerIndex = -1;
    state.ball.x = from.x;
    state.ball.y = from.y;
    state.ball.vx = dir.x * GAME_CONFIG.passVelocity;
    state.ball.vy = dir.y * GAME_CONFIG.passVelocity;
    setLog(`${from.name.split(" ")[0]} passes to ${best.name.split(" ")[0]}.`);
  }

  function handleShot(side, charge) {
    if (state.ball.mode !== "held" || state.ball.ownerSide !== side) return;
    const roster = side === TEAM_SIDES.USER ? state.userPlayers : state.cpuPlayers;
    const defense = side === TEAM_SIDES.USER ? state.cpuPlayers : state.userPlayers;
    const shooter = roster[state.ball.ownerIndex];
    const defenderInfo = nearestPlayer(defense, shooter);
    const shotType = classifyShotType(shooter, side);
    const offDribble = Math.hypot(shooter.vx, shooter.vy) > 3.5;
    const staminaPenalty = clamp((100 - shooter.stamina) / 260, 0, 0.25);
    const result = shotSuccess({
      shooter,
      defender: defenderInfo.player,
      shotType,
      timingCharge: charge,
      isOffDribble: offDribble,
      staminaPenalty,
    });
    const points = shotType === SHOT_TYPES.THREE ? 3 : 2;

    if (side === TEAM_SIDES.USER) {
      state.stats.user.fga += 1;
      if (shotType === SHOT_TYPES.THREE) state.stats.user.tpa += 1;
    } else {
      state.stats.cpu.fga += 1;
      if (shotType === SHOT_TYPES.THREE) state.stats.cpu.tpa += 1;
    }

    if (result.green && side === TEAM_SIDES.USER) {
      state.stats.user.greens += 1;
    }

    if (result.made) {
      if (side === TEAM_SIDES.USER) {
        state.score.user += points;
        state.stats.user.fgm += 1;
        if (shotType === SHOT_TYPES.THREE) state.stats.user.tpm += 1;
        if (shotType === SHOT_TYPES.LAYUP || shotType === SHOT_TYPES.DUNK) {
          const nearMid = shooter.x > COURT.width * 0.56;
          if (nearMid) state.stats.user.fastBreaks += 1;
        }
      } else {
        state.score.cpu += points;
        state.stats.cpu.fgm += 1;
        if (shotType === SHOT_TYPES.THREE) state.stats.cpu.tpm += 1;
      }
      shooter.hotStreak = Math.min(4, shooter.hotStreak + 1);
      switchPossession(`${shooter.name.split(" ")[0]} scores ${points}.`);
      return;
    }

    shooter.hotStreak = Math.max(-3, shooter.hotStreak - 1);
    setLog(`${shooter.name.split(" ")[0]} misses ${shotType}.`);

    const reboundCandidates = [...state.userPlayers, ...state.cpuPlayers];
    const rim = getRimForOffense(side);
    const bestRebound = nearestPlayer(reboundCandidates, rim).player;
    if (bestRebound.side === side) {
      if (side === TEAM_SIDES.USER) state.stats.user.offensiveRebounds += 1;
      else state.stats.cpu.offensiveRebounds += 1;
    }
    state.possession = bestRebound.side;
    state.ball.mode = "held";
    state.ball.ownerSide = bestRebound.side;
    const ownerRoster = bestRebound.side === TEAM_SIDES.USER ? state.userPlayers : state.cpuPlayers;
    state.ball.ownerIndex = ownerRoster.indexOf(bestRebound);
    state.ball.x = bestRebound.x;
    state.ball.y = bestRebound.y;
    state.shotClock = GAME_CONFIG.shotClock;
    setLog(`${bestRebound.name.split(" ")[0]} grabs the board.`);
  }

  function updateBall(dt) {
    if (state.ball.mode !== "pass") {
      const handler = currentBallHandler();
      if (handler) {
        state.ball.x = handler.x + (handler.side === TEAM_SIDES.USER ? 0.9 : -0.9);
        state.ball.y = handler.y;
      }
      return;
    }
    state.ball.x += state.ball.vx * dt;
    state.ball.y += state.ball.vy * dt;

    const all = [...state.userPlayers, ...state.cpuPlayers];
    const targetRoster = state.ball.targetSide === TEAM_SIDES.USER ? state.userPlayers : state.cpuPlayers;
    const target = targetRoster[state.ball.targetIndex];
    if (target && distance(target, state.ball) <= 1.2) {
      state.ball.mode = "held";
      state.ball.ownerSide = state.ball.targetSide;
      state.ball.ownerIndex = state.ball.targetIndex;
      state.ball.targetSide = null;
      state.ball.targetIndex = -1;
      return;
    }

    const interceptor = all.find((player) => distance(player, state.ball) <= 1.1);
    if (interceptor) {
      state.ball.mode = "held";
      state.ball.ownerSide = interceptor.side;
      const roster = interceptor.side === TEAM_SIDES.USER ? state.userPlayers : state.cpuPlayers;
      state.ball.ownerIndex = roster.indexOf(interceptor);
      state.possession = interceptor.side;
      state.shotClock = GAME_CONFIG.shotClock;
      if (interceptor.side === TEAM_SIDES.USER) {
        state.stats.user.steals += 1;
      } else {
        state.stats.cpu.steals += 1;
      }
      setLog(`${interceptor.name.split(" ")[0]} intercepts.`);
    }
  }

  function updatePlayerMovement(dt) {
    const offense = attackingPlayers();
    const defense = defendingPlayers();
    const handler = currentBallHandler();

    if (state.possession === TEAM_SIDES.USER && handler) {
      const speed = speedWithFatigue(
        GAME_CONFIG.userSpeed * (input.buttons.sprint ? GAME_CONFIG.sprintBoost : 1),
        handler.stamina,
        getAttribute(handler, "speed")
      );
      handler.vx = input.joystick.dx * speed;
      handler.vy = input.joystick.dy * speed;
      handler.x = clamp(handler.x + handler.vx * dt, 1.5, COURT.width - 1.5);
      handler.y = clamp(handler.y + handler.vy * dt, 1.5, COURT.height - 1.5);
      handler.stamina = clamp(
        handler.stamina +
          (input.buttons.sprint ? -GAME_CONFIG.staminaDrainSprint : GAME_CONFIG.staminaRecovery) * dt,
        24,
        100
      );
    }

    if (state.possession === TEAM_SIDES.CPU && handler) {
      const rim = getRimForOffense(TEAM_SIDES.CPU);
      const dir = normalize(rim.x - handler.x, rim.y - handler.y);
      const speed = speedWithFatigue(GAME_CONFIG.aiSpeed, handler.stamina, getAttribute(handler, "speed"));
      handler.vx = dir.x * speed;
      handler.vy = dir.y * speed * 0.8;
      handler.x = clamp(handler.x + handler.vx * dt, 1.5, COURT.width - 1.5);
      handler.y = clamp(handler.y + handler.vy * dt, 1.5, COURT.height - 1.5);
      handler.stamina = clamp(handler.stamina - GAME_CONFIG.staminaDrainSprint * 0.35 * dt, 24, 100);
    }

    const spacingY = [8, 16, 25, 34, 42];
    offense.forEach((player, idx) => {
      if (handler && player.id === handler.id) return;
      const attackRight = state.possession === TEAM_SIDES.USER;
      const anchorX = attackRight ? 60 : 34;
      const targetX = anchorX + Math.sin((state.gameClock + idx * 2) * 0.5) * 7;
      const targetY = spacingY[idx] + Math.cos((state.gameClock + idx) * 0.4) * 2.2;
      player.x = lerp(player.x, clamp(targetX, 3, COURT.width - 3), dt * 2.6);
      player.y = lerp(player.y, clamp(targetY, 3, COURT.height - 3), dt * 2.6);
      player.stamina = clamp(player.stamina + GAME_CONFIG.staminaRecovery * 0.55 * dt, 24, 100);
    });

    defense.forEach((player, idx) => {
      const assignment = offense[idx] ?? offense[0];
      const targetX = assignment.x + (state.possession === TEAM_SIDES.USER ? -1.4 : 1.4);
      const targetY = assignment.y;
      player.x = lerp(player.x, clamp(targetX, 1.5, COURT.width - 1.5), dt * 3.2);
      player.y = lerp(player.y, clamp(targetY, 1.5, COURT.height - 1.5), dt * 3.2);
      player.stamina = clamp(player.stamina + GAME_CONFIG.staminaRecovery * 0.6 * dt, 24, 100);
    });
  }

  function maybeCpuActions() {
    if (state.possession !== TEAM_SIDES.CPU || state.ball.mode !== "held") return;
    const handler = currentBallHandler();
    if (!handler) return;
    if (Math.random() < 0.008) {
      handlePass(TEAM_SIDES.CPU);
      return;
    }
    const rim = getRimForOffense(TEAM_SIDES.CPU);
    const d = distance(handler, rim);
    if ((d < 12 && Math.random() < 0.045) || state.shotClock < 3.5) {
      const charge = clamp(0.45 + Math.random() * 0.3, 0.2, 1.1);
      handleShot(TEAM_SIDES.CPU, charge);
    }
  }

  function maybeDefenseActions() {
    if (!input.buttons.defense) return;
    const handler = currentBallHandler();
    if (!handler || handler.side !== TEAM_SIDES.CPU) return;
    const userDefender = state.userPlayers[state.selectedUserIndex] ?? state.userPlayers[0];
    const dist = distance(userDefender, handler);

    if (dist <= GAME_CONFIG.stealRange) {
      const stealSkill = getAttribute(userDefender, "perimeterDefense") * 0.6 + getAttribute(userDefender, "ballHandling") * 0.4;
      const protectSkill = getAttribute(handler, "ballHandling") * 0.8 + getAttribute(handler, "strength") * 0.2;
      const stealChance = clamp((stealSkill - protectSkill + 45) / 550, 0.01, 0.22);
      if (Math.random() < stealChance) {
        state.ball.ownerSide = TEAM_SIDES.USER;
        state.ball.ownerIndex = state.selectedUserIndex;
        state.possession = TEAM_SIDES.USER;
        state.shotClock = GAME_CONFIG.shotClock;
        state.stats.user.steals += 1;
        state.stats.cpu.turnovers += 1;
        setLog(`${userDefender.name.split(" ")[0]} strips the ball.`);
      }
    }
  }

  function handleUserButtons(chargeReleased, chargeValue) {
    if (state.phase === GAME_PHASE.FINAL) return;
    if (input.buttons.pass && state.possession === TEAM_SIDES.USER) {
      input.buttons.pass = false;
      handlePass(TEAM_SIDES.USER);
    }
    if (input.buttons.switchDefense) {
      input.buttons.switchDefense = false;
      state.selectedUserIndex = (state.selectedUserIndex + 1) % state.userPlayers.length;
      setLog(`Control switched to ${state.userPlayers[state.selectedUserIndex].name.split(" ")[0]}.`);
    }
    if (input.buttons.pick) {
      input.buttons.pick = false;
      setLog("Pick action triggered (advanced screen logic stub).");
    }
    if (chargeReleased && state.possession === TEAM_SIDES.USER) {
      handleShot(TEAM_SIDES.USER, chargeValue);
    }
  }

  function updateClock(dt) {
    if (state.phase === GAME_PHASE.FINAL) return;
    state.gameClock = Math.max(0, state.gameClock - dt);
    state.shotClock = Math.max(0, state.shotClock - dt);
    if (state.shotClock <= 0) {
      switchPossession("Shot clock violation.", true);
    }
    if (state.gameClock <= 0) {
      if (state.quarter >= GAME_CONFIG.totalQuarters) {
        state.phase = GAME_PHASE.FINAL;
        setLog("Final buzzer.");
        return;
      }
      state.quarter += 1;
      state.gameClock = GAME_CONFIG.quarterLength;
      state.shotClock = GAME_CONFIG.shotClock;
      state.freeze = 1;
      setLog(`Quarter ${state.quarter} begins.`);
    }
  }

  function maybeComplete() {
    if (state.phase !== GAME_PHASE.FINAL || state.finalResultSent) return;
    state.finalResultSent = true;
    const result = {
      didWin: state.score.user >= state.score.cpu,
      userScore: state.score.user,
      cpuScore: state.score.cpu,
      opponentName: state.cpuTeam.schoolName,
      teamStats: {
        fastBreaks: state.stats.user.fastBreaks,
        steals: state.stats.user.steals,
        blocks: state.stats.user.blocks,
        offensiveBoards: state.stats.user.offensiveRebounds,
        turnovers: state.stats.user.turnovers,
        greenReleases: state.stats.user.greens,
      },
    };
    if (typeof state.onComplete === "function") {
      state.onComplete(result);
    }
  }

  function draw(canvas) {
    const ctx = canvas.getContext("2d");
    drawCourt(ctx);

    state.userPlayers.forEach((player, idx) => {
      drawPlayer(
        ctx,
        player,
        state.userTeam.colors.primary,
        state.userTeam.colors.secondary,
        idx === state.selectedUserIndex,
        state.ball.mode === "held" &&
          state.ball.ownerSide === TEAM_SIDES.USER &&
          state.ball.ownerIndex === idx
      );
    });

    state.cpuPlayers.forEach((player, idx) => {
      drawPlayer(
        ctx,
        player,
        state.cpuTeam.colors.primary,
        state.cpuTeam.colors.secondary,
        false,
        state.ball.mode === "held" &&
          state.ball.ownerSide === TEAM_SIDES.CPU &&
          state.ball.ownerIndex === idx
      );
    });

    const b = mapToCanvas(state.ball.x, state.ball.y);
    ctx.beginPath();
    ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#e77f30";
    ctx.fill();

    ctx.fillStyle = "rgba(9,15,29,0.24)";
    ctx.fillRect(0, CANVAS.height - 150, CANVAS.width * 0.5, 150);
    ctx.fillRect(CANVAS.width * 0.5, CANVAS.height - 210, CANVAS.width * 0.5, 210);

    ctx.beginPath();
    ctx.arc(input.joystick.baseX, input.joystick.baseY, 46, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(input.joystick.knobX, input.joystick.knobY, 19, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fill();

    drawControlButton(ctx, controlLayout.pass, "PASS", input.buttons.pass);
    drawControlButton(ctx, controlLayout.shoot, "SHOOT", input.buttons.shoot, "primary");
    drawControlButton(ctx, controlLayout.sprint, "SPRINT", input.buttons.sprint, "warn");
    drawControlButton(ctx, controlLayout.defense, "DEF", input.buttons.defense);
    drawControlButton(ctx, controlLayout.pick, "P&R", input.buttons.pick);
    drawControlButton(ctx, controlLayout.switchDefense, "SW", input.buttons.switchDefense);
  }

  function getHud() {
    return {
      left: `${state.userTeam.schoolName} ${state.score.user}`,
      center: `Q${state.quarter} ${Math.floor(state.gameClock / 60)}:${String(Math.floor(state.gameClock % 60)).padStart(2, "0")} | :${String(Math.ceil(state.shotClock)).padStart(2, "0")}`,
      right: `${state.score.cpu} ${state.cpuTeam.schoolName}`,
      meter: clamp(state.meterCharge / 1.2, 0, 1),
      log: state.log,
    };
  }

  return {
    state,
    step(dt, shootRelease) {
      if (state.phase === GAME_PHASE.FINAL) {
        maybeComplete();
        return;
      }
      if (state.freeze > 0) {
        state.freeze = Math.max(0, state.freeze - dt);
      } else {
        if (state.possession === TEAM_SIDES.USER) {
          state.meterCharge = input.shootCharge;
        } else {
          state.meterCharge = 0;
        }
        handleUserButtons(shootRelease.released, shootRelease.charge);
        updatePlayerMovement(dt);
        maybeCpuActions();
        maybeDefenseActions();
        updateBall(dt);
      }
      updateClock(dt);
      maybeComplete();
    },
    draw,
    getHud,
  };
}
