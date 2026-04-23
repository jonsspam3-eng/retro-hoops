import { CANVAS, COURT, GAME_CONFIG, GAME_PHASE, SHOT_TYPES, TEAM_SIDES } from "../core/constants.js";
import { clamp, distance, lerp, normalize } from "../core/math.js";
import { getAttribute, speedWithFatigue } from "./ratings.js";

const CROWD_LEVELS = {
  QUIET: "Quiet",
  BUZZING: "Buzzing",
  HYPE: "Hype",
};

const SOUND_EVENTS = {
  SWISH: "swish",
  RIM: "rim",
  BACKBOARD: "board",
  CROWD_CHEER: "crowd_cheer",
  CROWD_GROAN: "crowd_groan",
  STEAL: "steal",
  BLOCK: "block",
  BUZZER: "buzzer",
};

function shortName(name) {
  return name.split(" ")[0];
}

function schoolCode(name) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part.slice(0, 3).toUpperCase())
    .join(" ");
}

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
    x: baseX + (index % 2 === 0 ? 0 : attackRight ? 2.5 : -2.5),
    y: ys[index],
    vx: 0,
    vy: 0,
  }));
}

function drawControlButton(ctx, rect, label, active, variant = "normal") {
  const gradient = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  if (variant === "primary") {
    gradient.addColorStop(0, "rgba(107, 196, 255, 0.95)");
    gradient.addColorStop(1, "rgba(62, 111, 255, 0.93)");
  } else if (variant === "warn") {
    gradient.addColorStop(0, "rgba(255, 194, 108, 0.95)");
    gradient.addColorStop(1, "rgba(255, 124, 77, 0.93)");
  } else {
    gradient.addColorStop(0, "rgba(255, 255, 255, 0.23)");
    gradient.addColorStop(1, "rgba(255, 255, 255, 0.13)");
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = active ? "rgba(255,255,255,0.96)" : "rgba(255,255,255,0.48)";
  ctx.lineWidth = active ? 2.8 : 1.2;
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = "#eaf2ff";
  ctx.font = "bold 14px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2);
}

function drawCourt(ctx, crowdEnergy) {
  const crowdTop = 18 + crowdEnergy * 18;
  ctx.fillStyle = `rgb(${24 + crowdTop}, ${35 + crowdTop * 0.5}, ${65 + crowdTop * 0.25})`;
  ctx.fillRect(0, 0, CANVAS.width, 56);
  ctx.fillStyle = "#9f6b41";
  ctx.fillRect(0, 56, CANVAS.width, CANVAS.height - 56);
  ctx.strokeStyle = "rgba(255,255,255,0.76)";
  ctx.lineWidth = 3;
  ctx.strokeRect(6, 62, CANVAS.width - 12, CANVAS.height - 68);
  ctx.beginPath();
  ctx.moveTo(CANVAS.width / 2, 62);
  ctx.lineTo(CANVAS.width / 2, CANVAS.height - 6);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(CANVAS.width / 2, (CANVAS.height + 56) / 2, 56, 0, Math.PI * 2);
  ctx.stroke();

  const paintW = (COURT.paintWidth / COURT.width) * CANVAS.width;
  const paintH = (COURT.paintHeight / COURT.height) * (CANVAS.height - 56);
  ctx.strokeRect(0, 56 + (CANVAS.height - 56) / 2 - paintH / 2, paintW, paintH);
  ctx.strokeRect(CANVAS.width - paintW, 56 + (CANVAS.height - 56) / 2 - paintH / 2, paintW, paintH);
}

function drawPlayer(ctx, player, teamColor, ringColor, selected, hasBall) {
  const p = mapToCanvas(player.x, player.y);
  const py = p.y * 0.89 + 56;
  ctx.beginPath();
  ctx.arc(p.x, py, 11, 0, Math.PI * 2);
  ctx.fillStyle = teamColor;
  ctx.fill();
  ctx.strokeStyle = selected ? "#ffffff" : ringColor;
  ctx.lineWidth = selected ? 3 : 2;
  ctx.stroke();
  if (hasBall) {
    ctx.beginPath();
    ctx.arc(p.x + 10, py + 7, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#f18e37";
    ctx.fill();
  }
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(p.x - 12, py - 16, 24, 4);
  const pct = player.stamina / 100;
  ctx.fillStyle = pct > 0.5 ? "#56e894" : pct > 0.32 ? "#ffd45f" : "#ff6f7d";
  ctx.fillRect(p.x - 12, py - 16, pct * 24, 4);
}

function drawShotBall(ctx, shot, ball) {
  const progress = clamp(shot.elapsed / shot.duration, 0, 1);
  const arc = Math.sin(progress * Math.PI) * shot.arcHeight;
  const px = lerp(shot.startX, shot.endX, progress);
  const py = lerp(shot.startY, shot.endY, progress) - arc;
  ball.x = px;
  ball.y = py;
  const p = mapToCanvas(px, py);
  ctx.beginPath();
  ctx.arc(p.x, p.y * 0.89 + 56, 5, 0, Math.PI * 2);
  ctx.fillStyle = "#e77f30";
  ctx.fill();
}

function drawGroundBall(ctx, ball) {
  const p = mapToCanvas(ball.x, ball.y);
  ctx.beginPath();
  ctx.arc(p.x, p.y * 0.89 + 56, 5, 0, Math.PI * 2);
  ctx.fillStyle = "#e77f30";
  ctx.fill();
}

function drawShotMeterGuide(ctx, meterCharge) {
  const width = 220;
  const height = 12;
  const x = CANVAS.width * 0.5 - width * 0.5;
  const y = 8;
  const greenStart = 0.47;
  const greenEnd = 0.58;
  const fillPct = clamp(meterCharge / 1.2, 0, 1);

  ctx.fillStyle = "rgba(5,10,22,0.52)";
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = "rgba(75,243,132,0.42)";
  ctx.fillRect(x + width * greenStart, y, width * (greenEnd - greenStart), height);
  ctx.fillStyle = "rgba(255,112,132,0.85)";
  ctx.fillRect(x, y, width * fillPct, height);
  ctx.strokeStyle = "rgba(255,255,255,0.56)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, height);
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
  const speed = Math.hypot(shooter.vx, shooter.vy);
  if (d < 2.2 && speed > 9.3) return SHOT_TYPES.DUNK;
  if (d < 5.4) return SHOT_TYPES.LAYUP;
  if (d > COURT.threeRadius - 1.1) return SHOT_TYPES.THREE;
  return SHOT_TYPES.MID;
}

function shotTiming(charge) {
  const target = 0.56;
  const diff = Math.abs(charge - target);
  if (diff <= 0.045) return { label: "green", bonus: 0.28 };
  if (diff <= 0.095) return { label: "solid", bonus: 0.12 };
  if (diff <= 0.16) return { label: "late/early", bonus: -0.03 };
  return { label: "off", bonus: -0.18 };
}

function evaluateShot({
  shooter,
  defender,
  side,
  shotType,
  charge,
  isOffDribble,
  staminaPenalty,
  extraContest = 0,
}) {
  const timing = shotTiming(charge);
  let base = 0.48;
  if (shotType === SHOT_TYPES.DUNK) base = 0.92 + getAttribute(shooter, "finishing") / 1300;
  if (shotType === SHOT_TYPES.LAYUP) base = 0.54 + getAttribute(shooter, "finishing") / 330;
  if (shotType === SHOT_TYPES.MID) base = 0.24 + getAttribute(shooter, "shooting") / 250;
  if (shotType === SHOT_TYPES.THREE) base = 0.14 + getAttribute(shooter, "threePoint") / 260;

  const contestDistance = defender ? distance(shooter, defender) : 9;
  const contest = defender
    ? clamp(
        ((GAME_CONFIG.contestRange - contestDistance) / GAME_CONFIG.contestRange) *
          (getAttribute(defender, "perimeterDefense") / 100) +
          extraContest,
        0,
        0.62
      )
    : 0;

  const dribblePenalty = isOffDribble ? 0.08 : 0;
  const hotBonus = (shooter.hotStreak || 0) * 0.013;
  const sideModifier = side === TEAM_SIDES.USER ? 0 : 0.02;
  const makeChance = clamp(base + timing.bonus + hotBonus - contest - dribblePenalty - staminaPenalty + sideModifier, 0.04, 0.95);
  return { makeChance, made: Math.random() < makeChance, timing, contest };
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

function crowdLevelLabel(energy) {
  if (energy > 0.72) return CROWD_LEVELS.HYPE;
  if (energy > 0.36) return CROWD_LEVELS.BUZZING;
  return CROWD_LEVELS.QUIET;
}

function chooseRebounder(players, rim) {
  let best = players[0];
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const player of players) {
    const proximity = 1 - clamp(distance(player, rim) / 12, 0, 1);
    const board = getAttribute(player, "rebounding") / 100;
    const strength = getAttribute(player, "strength") / 100;
    const score = board * 0.58 + proximity * 0.3 + strength * 0.12 + Math.random() * 0.2;
    if (score > bestScore) {
      bestScore = score;
      best = player;
    }
  }
  return best;
}

function applyMomentum(player, desiredVx, desiredVy, accel, drag, dt) {
  const blend = clamp(accel * dt, 0, 1);
  player.vx = lerp(player.vx, desiredVx, blend);
  player.vy = lerp(player.vy, desiredVy, blend);
  const dragScale = Math.max(0, 1 - drag * dt * 0.08);
  player.vx *= dragScale;
  player.vy *= dragScale;
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
    crowdEnergy: 0.28,
    crowdPeak: 0.28,
    run: { side: null, points: 0 },
    soundQueue: [],
    shotInFlight: null,
    cpuDecisionTimer: 0,
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

  function queueSound(eventType) {
    state.soundQueue.push(eventType);
  }

  function addCrowd(delta) {
    state.crowdEnergy = clamp(state.crowdEnergy + delta, 0, 1);
    state.crowdPeak = Math.max(state.crowdPeak, state.crowdEnergy);
  }

  function setRun(scoringSide, points) {
    if (state.run.side === scoringSide) {
      state.run.points += points;
    } else {
      state.run.side = scoringSide;
      state.run.points = points;
    }
  }

  function setLog(message) {
    state.log = message;
  }

  function switchPossession(reason, turnover = false, offensiveRebound = false) {
    const previousPossession = state.possession;
    state.possession = previousPossession === TEAM_SIDES.USER ? TEAM_SIDES.CPU : TEAM_SIDES.USER;
    state.freeze = GAME_CONFIG.possessionFreezeSeconds;
    state.shotClock = offensiveRebound ? 14 : GAME_CONFIG.shotClock;
    state.meterCharge = 0;
    input.shootCharge = 0;
    input.shootReleased = false;
    state.cpuDecisionTimer = 0;

    const offense = attackingPlayers();
    state.ball.mode = "held";
    state.ball.ownerSide = state.possession;
    state.ball.ownerIndex = 0;
    state.ball.targetSide = null;
    state.ball.targetIndex = -1;
    state.ball.x = offense[0].x;
    state.ball.y = offense[0].y;
    state.shotInFlight = null;

    if (turnover) {
      if (previousPossession === TEAM_SIDES.USER) {
        state.stats.user.turnovers += 1;
      } else {
        state.stats.cpu.turnovers += 1;
      }
      state.run.side = null;
      state.run.points = 0;
    }

    setLog(reason);
  }

  function handlePass(side) {
    if (state.shotInFlight) return;
    const roster = side === TEAM_SIDES.USER ? state.userPlayers : state.cpuPlayers;
    if (state.ball.mode !== "held" || state.ball.ownerSide !== side) return false;
    const from = roster[state.ball.ownerIndex];
    const defenders = side === TEAM_SIDES.USER ? state.cpuPlayers : state.userPlayers;
    const candidates = roster.filter((_, idx) => idx !== state.ball.ownerIndex);
    if (!candidates.length) return false;

    let best = candidates[0];
    let bestScore = Number.NEGATIVE_INFINITY;
    for (const player of candidates) {
      const spacing = Math.min(...defenders.map((defender) => distance(defender, player)));
      const lane = -distance(player, from);
      const passVision = getAttribute(from, "passing");
      const targetIQ = getAttribute(player, "iq");
      const score = spacing * 1.4 + lane * 0.05 + passVision * 0.012 + targetIQ * 0.01;
      if (score > bestScore) {
        bestScore = score;
        best = player;
      }
    }

    const targetIndex = roster.indexOf(best);
    const dir = normalize(best.x - from.x, best.y - from.y);
    state.ball.mode = "pass";
    state.ball.targetSide = side;
    state.ball.targetIndex = targetIndex;
    state.ball.ownerIndex = -1;
    state.ball.x = from.x;
    state.ball.y = from.y;
    state.ball.vx = dir.x * GAME_CONFIG.passVelocity;
    state.ball.vy = dir.y * GAME_CONFIG.passVelocity;
    setLog(`${shortName(from.name)} zips a pass to ${shortName(best.name)}.`);
    return true;
  }

  function beginShot(side, charge, extraContest = 0) {
    if (state.shotInFlight) return;
    if (state.ball.mode !== "held" || state.ball.ownerSide !== side) return;

    const roster = side === TEAM_SIDES.USER ? state.userPlayers : state.cpuPlayers;
    const defense = side === TEAM_SIDES.USER ? state.cpuPlayers : state.userPlayers;
    const shooter = roster[state.ball.ownerIndex];
    const defenderInfo = nearestPlayer(defense, shooter);
    const shotType = classifyShotType(shooter, side);
    const offDribble = Math.hypot(shooter.vx, shooter.vy) > 3.2;
    const staminaPenalty = clamp((100 - shooter.stamina) / 250, 0, 0.26);
    const shotEval = evaluateShot({
      shooter,
      defender: defenderInfo.player,
      side,
      shotType,
      charge,
      isOffDribble: offDribble,
      staminaPenalty,
      extraContest,
    });

    const points = shotType === SHOT_TYPES.THREE ? 3 : 2;
    const rim = getRimForOffense(side);
    const missOffsetX = shotEval.timing.label === "off" ? (Math.random() < 0.5 ? -2.1 : 2.1) : Math.random() < 0.5 ? -1 : 1;
    const missOffsetY = shotEval.timing.label === "off" ? (Math.random() - 0.5) * 2.8 : (Math.random() - 0.5) * 1.6;
    const endX = shotEval.made ? rim.x : rim.x + missOffsetX;
    const endY = shotEval.made ? rim.y : rim.y + missOffsetY;
    const duration = GAME_CONFIG.shotFlightSeconds + (shotType === SHOT_TYPES.THREE ? 0.08 : 0);
    state.shotInFlight = {
      side,
      shooter,
      shotType,
      points,
      made: shotEval.made,
      green: shotEval.timing.label === "green",
      releaseLabel: shotEval.timing.label,
      duration,
      elapsed: 0,
      startX: shooter.x + (side === TEAM_SIDES.USER ? 0.9 : -0.9),
      startY: shooter.y,
      endX,
      endY,
      arcHeight: GAME_CONFIG.shotArcHeight + (shotType === SHOT_TYPES.THREE ? 1.1 : 0),
      rim,
    };

    state.ball.mode = "shot";
    state.ball.ownerIndex = -1;
    state.ball.targetIndex = -1;

    if (side === TEAM_SIDES.USER) {
      state.stats.user.fga += 1;
      if (shotType === SHOT_TYPES.THREE) state.stats.user.tpa += 1;
      if (shotEval.timing.label === "green") state.stats.user.greens += 1;
    } else {
      state.stats.cpu.fga += 1;
      if (shotType === SHOT_TYPES.THREE) state.stats.cpu.tpa += 1;
    }

    if (shotEval.timing.label === "green") {
      setLog(`${shortName(shooter.name)} times it perfectly!`);
    } else if (shotEval.timing.label === "off") {
      setLog(`${shortName(shooter.name)} rushes the release.`);
    } else {
      setLog(`${shortName(shooter.name)} pulls up.`);
    }
  }

  function resolveShot() {
    if (!state.shotInFlight) return;
    const shot = state.shotInFlight;
    const offenseStats = shot.side === TEAM_SIDES.USER ? state.stats.user : state.stats.cpu;
    const defenseStats = shot.side === TEAM_SIDES.USER ? state.stats.cpu : state.stats.user;

    if (shot.made) {
      if (shot.side === TEAM_SIDES.USER) {
        state.score.user += shot.points;
        addCrowd(0.15 + (shot.green ? 0.1 : 0.03));
      } else {
        state.score.cpu += shot.points;
        addCrowd(-0.08);
      }
      offenseStats.fgm += 1;
      if (shot.shotType === SHOT_TYPES.THREE) offenseStats.tpm += 1;
      if ((shot.shotType === SHOT_TYPES.LAYUP || shot.shotType === SHOT_TYPES.DUNK) && shot.side === TEAM_SIDES.USER && shot.shooter.x > COURT.width * 0.58) {
        offenseStats.fastBreaks += 1;
      }
      shot.shooter.hotStreak = Math.min(4, shot.shooter.hotStreak + 1);
      setRun(shot.side, shot.points);
      queueSound(SOUND_EVENTS.SWISH);
      queueSound(SOUND_EVENTS.CROWD_CHEER);
      if (shot.green && shot.side === TEAM_SIDES.USER) {
        setLog(`${shortName(shot.shooter.name)} GREEN! Pure ${shot.points}.`);
      } else {
        setLog(`${shortName(shot.shooter.name)} buries ${shot.points}!`);
      }
      switchPossession(state.log);
      return;
    }

    shot.shooter.hotStreak = Math.max(-3, shot.shooter.hotStreak - 1);
    const missType = shot.releaseLabel === "off" ? (Math.random() < 0.6 ? "backboard" : "airball") : "rim";
    if (missType === "backboard") queueSound(SOUND_EVENTS.BACKBOARD);
    else queueSound(SOUND_EVENTS.RIM);
    if (shot.side === TEAM_SIDES.USER) queueSound(SOUND_EVENTS.CROWD_GROAN);
    addCrowd(shot.side === TEAM_SIDES.USER ? -0.06 : 0.02);

    const rebounder = chooseRebounder([...state.userPlayers, ...state.cpuPlayers], shot.rim);
    const reboundSide = rebounder.side;
    if (reboundSide === shot.side) {
      offenseStats.offensiveRebounds += 1;
    }
    state.possession = reboundSide;
    state.ball.mode = "held";
    state.ball.ownerSide = reboundSide;
    const ownerRoster = reboundSide === TEAM_SIDES.USER ? state.userPlayers : state.cpuPlayers;
    state.ball.ownerIndex = ownerRoster.indexOf(rebounder);
    state.ball.x = rebounder.x;
    state.ball.y = rebounder.y;
    state.shotClock = reboundSide === shot.side ? 14 : GAME_CONFIG.shotClock;
    if (reboundSide !== shot.side) {
      state.run.side = null;
      state.run.points = 0;
    }
    setLog(`${shortName(rebounder.name)} secures the rebound.`);
    state.shotInFlight = null;
  }

  function updateShotInFlight(dt) {
    if (!state.shotInFlight) return;
    state.shotInFlight.elapsed += dt;
    if (state.shotInFlight.elapsed >= state.shotInFlight.duration) {
      resolveShot();
    }
  }

  function updateBall(dt) {
    if (state.shotInFlight) return;
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
    if (target && distance(target, state.ball) <= 1.25) {
      state.ball.mode = "held";
      state.ball.ownerSide = state.ball.targetSide;
      state.ball.ownerIndex = state.ball.targetIndex;
      state.ball.targetSide = null;
      state.ball.targetIndex = -1;
      return;
    }

    const interceptor = all.find((player) => distance(player, state.ball) <= 1.1);
    if (!interceptor) return;
    state.ball.mode = "held";
    state.ball.ownerSide = interceptor.side;
    const roster = interceptor.side === TEAM_SIDES.USER ? state.userPlayers : state.cpuPlayers;
    state.ball.ownerIndex = roster.indexOf(interceptor);
    state.possession = interceptor.side;
    state.shotClock = GAME_CONFIG.shotClock;
    state.cpuDecisionTimer = 0;
    if (interceptor.side === TEAM_SIDES.USER) {
      state.stats.user.steals += 1;
      state.stats.cpu.turnovers += 1;
      queueSound(SOUND_EVENTS.STEAL);
      addCrowd(0.07);
    } else {
      state.stats.cpu.steals += 1;
      state.stats.user.turnovers += 1;
      addCrowd(-0.05);
    }
    state.run.side = null;
    state.run.points = 0;
    setLog(`${shortName(interceptor.name)} jumps the lane.`);
  }

  function updateUserMovement(dt) {
    const handler = currentBallHandler();
    if (!handler || state.possession !== TEAM_SIDES.USER) return;
    const speed = speedWithFatigue(
      GAME_CONFIG.userSpeed * (input.buttons.sprint ? GAME_CONFIG.sprintBoost : 1),
      handler.stamina,
      getAttribute(handler, "speed")
    );
    const desiredVx = input.joystick.dx * speed;
    const desiredVy = input.joystick.dy * speed;
    applyMomentum(handler, desiredVx, desiredVy, GAME_CONFIG.userAcceleration, GAME_CONFIG.userDrag, dt);
    handler.x = clamp(handler.x + handler.vx * dt, 1.5, COURT.width - 1.5);
    handler.y = clamp(handler.y + handler.vy * dt, 1.5, COURT.height - 1.5);
    handler.stamina = clamp(
      handler.stamina +
        (input.buttons.sprint ? -GAME_CONFIG.staminaDrainSprint : GAME_CONFIG.staminaRecovery) * dt,
      24,
      100
    );
  }

  function cpuHandlerTarget(handler) {
    const rim = getRimForOffense(TEAM_SIDES.CPU);
    const nearestDef = nearestPlayer(state.userPlayers, handler);
    const pressure = clamp((GAME_CONFIG.contestRange - nearestDef.dist) / GAME_CONFIG.contestRange, 0, 1);
    if (pressure > 0.72) {
      return {
        x: handler.x + (Math.random() < 0.5 ? -1 : 1) * 4,
        y: clamp(handler.y + (Math.random() - 0.5) * 7, 4, COURT.height - 4),
      };
    }
    return {
      x: rim.x,
      y: lerp(handler.y, rim.y, 0.45),
    };
  }

  function updateCpuMovement(dt) {
    const handler = currentBallHandler();
    if (!handler || state.possession !== TEAM_SIDES.CPU) return;
    const target = cpuHandlerTarget(handler);
    const dir = normalize(target.x - handler.x, target.y - handler.y);
    const speed = speedWithFatigue(GAME_CONFIG.aiSpeed, handler.stamina, getAttribute(handler, "speed"));
    applyMomentum(
      handler,
      dir.x * speed,
      dir.y * speed * 0.88,
      GAME_CONFIG.cpuAcceleration,
      GAME_CONFIG.cpuDrag,
      dt
    );
    handler.x = clamp(handler.x + handler.vx * dt, 1.5, COURT.width - 1.5);
    handler.y = clamp(handler.y + handler.vy * dt, 1.5, COURT.height - 1.5);
    handler.stamina = clamp(handler.stamina - GAME_CONFIG.staminaDrainSprint * 0.33 * dt, 24, 100);
  }

  function updateOffBallMovement(dt) {
    const offense = attackingPlayers();
    const defense = defendingPlayers();
    const handler = currentBallHandler();
    const spacingY = [8, 16, 25, 34, 42];
    const attackRight = state.possession === TEAM_SIDES.USER;
    const offensiveAnchorX = attackRight ? 60 : 34;

    offense.forEach((player, idx) => {
      if (handler && player.id === handler.id) return;
      const targetX = offensiveAnchorX + Math.sin((state.gameClock + idx * 2) * 0.5) * 7;
      const targetY = spacingY[idx] + Math.cos((state.gameClock + idx) * 0.4) * 2.2;
      player.x = lerp(player.x, clamp(targetX, 3, COURT.width - 3), dt * 2.8);
      player.y = lerp(player.y, clamp(targetY, 3, COURT.height - 3), dt * 2.8);
      player.vx = lerp(player.vx, 0, dt * 5.4);
      player.vy = lerp(player.vy, 0, dt * 5.4);
      player.stamina = clamp(player.stamina + GAME_CONFIG.staminaRecovery * 0.58 * dt, 24, 100);
    });

    defense.forEach((player, idx) => {
      const assignment = offense[idx] ?? offense[0];
      const isBallDefender = handler && assignment.id === handler.id;
      const offset = state.possession === TEAM_SIDES.USER ? -1.2 : 1.2;
      const targetX = assignment.x + offset + (isBallDefender ? offset * 0.4 : 0);
      const targetY = assignment.y + (isBallDefender ? (Math.random() - 0.5) * 0.5 : 0);
      const speedT = isBallDefender ? dt * 4.1 : dt * 3.25;
      player.x = lerp(player.x, clamp(targetX, 1.5, COURT.width - 1.5), speedT);
      player.y = lerp(player.y, clamp(targetY, 1.5, COURT.height - 1.5), speedT);
      player.vx = lerp(player.vx, 0, dt * 4.8);
      player.vy = lerp(player.vy, 0, dt * 4.8);
      player.stamina = clamp(player.stamina + GAME_CONFIG.staminaRecovery * 0.62 * dt, 24, 100);
    });
  }

  function cpuShouldShoot(handler, shotType, defenderDist) {
    const rim = getRimForOffense(TEAM_SIDES.CPU);
    const d = distance(handler, rim);
    const contestPenalty = clamp((GAME_CONFIG.contestRange - defenderDist) / GAME_CONFIG.contestRange, 0, 1);
    const ratingBase =
      shotType === SHOT_TYPES.THREE
        ? getAttribute(handler, "threePoint") / 100
        : shotType === SHOT_TYPES.MID
          ? getAttribute(handler, "shooting") / 100
          : getAttribute(handler, "finishing") / 100;
    const shotNeed = clamp((24 - state.shotClock) / 24, 0, 1);
    const laneBonus = clamp((12 - d) / 12, 0, 1) * 0.25;
    const quality = ratingBase * 0.58 + shotNeed * 0.32 + laneBonus - contestPenalty * 0.3;
    if (state.shotClock < 4.2) return true;
    return quality > 0.52;
  }

  function maybeCpuActions(dt) {
    if (state.possession !== TEAM_SIDES.CPU || state.ball.mode !== "held" || state.shotInFlight) return;
    state.cpuDecisionTimer += dt;
    if (state.cpuDecisionTimer < GAME_CONFIG.cpuDecisionInterval) return;
    state.cpuDecisionTimer = 0;

    const handler = currentBallHandler();
    if (!handler) return;
    const defender = nearestPlayer(state.userPlayers, handler);
    const shotType = classifyShotType(handler, TEAM_SIDES.CPU);
    if (defender.dist < 2.3 && Math.random() < 0.55) {
      if (handlePass(TEAM_SIDES.CPU)) return;
    }
    if (cpuShouldShoot(handler, shotType, defender.dist)) {
      const release = clamp(0.5 + (Math.random() - 0.5) * 0.16, 0.3, 1);
      beginShot(TEAM_SIDES.CPU, release);
      return;
    }
    if (Math.random() < 0.2) {
      handlePass(TEAM_SIDES.CPU);
    } else if (Math.random() < 0.25) {
      setLog(`${shortName(handler.name)} resets the offense.`);
    }
  }

  function maybeDefenseActions() {
    if (!input.buttons.defense || state.shotInFlight) return;
    const handler = currentBallHandler();
    if (!handler || handler.side !== TEAM_SIDES.CPU) return;
    const userDefender = state.userPlayers[state.selectedUserIndex] ?? state.userPlayers[0];
    const dist = distance(userDefender, handler);

    if (dist <= GAME_CONFIG.stealRange) {
      const stealSkill = getAttribute(userDefender, "perimeterDefense") * 0.6 + getAttribute(userDefender, "ballHandling") * 0.4;
      const protectSkill = getAttribute(handler, "ballHandling") * 0.8 + getAttribute(handler, "strength") * 0.2;
      const stealChance = clamp((stealSkill - protectSkill + 42) / 580, 0.01, 0.18);
      if (Math.random() < stealChance) {
        state.ball.ownerSide = TEAM_SIDES.USER;
        state.ball.ownerIndex = state.selectedUserIndex;
        state.possession = TEAM_SIDES.USER;
        state.shotClock = GAME_CONFIG.shotClock;
        state.stats.user.steals += 1;
        state.stats.cpu.turnovers += 1;
        state.run.side = null;
        state.run.points = 0;
        queueSound(SOUND_EVENTS.STEAL);
        addCrowd(0.09);
        setLog(`${shortName(userDefender.name)} strips it clean.`);
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
      setLog(`Switched to ${shortName(state.userPlayers[state.selectedUserIndex].name)} on defense.`);
    }
    if (input.buttons.pick) {
      input.buttons.pick = false;
      setLog("P&R trigger armed (phase 3: full screener behavior).");
    }
    if (chargeReleased && state.possession === TEAM_SIDES.USER) {
      beginShot(TEAM_SIDES.USER, chargeValue);
    }
  }

  function updateClock(dt) {
    if (state.phase === GAME_PHASE.FINAL) return;
    state.gameClock = Math.max(0, state.gameClock - dt);
    state.shotClock = Math.max(0, state.shotClock - dt);
    state.crowdEnergy = Math.max(0, state.crowdEnergy - GAME_CONFIG.crowdDecay * dt);

    if (state.shotClock <= 0) {
      queueSound(SOUND_EVENTS.BUZZER);
      switchPossession("Shot clock violation.", true);
    }

    if (state.gameClock > 0) return;
    if (state.quarter >= GAME_CONFIG.totalQuarters) {
      state.phase = GAME_PHASE.FINAL;
      queueSound(SOUND_EVENTS.BUZZER);
      setLog("Final buzzer.");
      return;
    }
    state.quarter += 1;
    state.gameClock = GAME_CONFIG.quarterLength;
    state.shotClock = GAME_CONFIG.shotClock;
    state.freeze = 1;
    setLog(`Quarter ${state.quarter} starts.`);
  }

  function maybeComplete() {
    if (state.phase !== GAME_PHASE.FINAL || state.finalResultSent) return;
    state.finalResultSent = true;
    const userFgp = state.stats.user.fga ? Math.round((state.stats.user.fgm / state.stats.user.fga) * 100) : 0;
    const cpuFgp = state.stats.cpu.fga ? Math.round((state.stats.cpu.fgm / state.stats.cpu.fga) * 100) : 0;
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
        fgp: userFgp,
        oppFgp: cpuFgp,
        crowdPeak: Math.round(state.crowdPeak * 100),
      },
    };
    if (typeof state.onComplete === "function") {
      state.onComplete(result);
    }
  }

  function draw(canvas) {
    const ctx = canvas.getContext("2d");
    drawCourt(ctx, state.crowdEnergy);

    state.userPlayers.forEach((player, idx) => {
      drawPlayer(
        ctx,
        player,
        state.userTeam.colors.primary,
        state.userTeam.colors.secondary,
        idx === state.selectedUserIndex,
        state.ball.mode === "held" && state.ball.ownerSide === TEAM_SIDES.USER && state.ball.ownerIndex === idx
      );
    });

    state.cpuPlayers.forEach((player, idx) => {
      drawPlayer(
        ctx,
        player,
        state.cpuTeam.colors.primary,
        state.cpuTeam.colors.secondary,
        false,
        state.ball.mode === "held" && state.ball.ownerSide === TEAM_SIDES.CPU && state.ball.ownerIndex === idx
      );
    });

    if (state.shotInFlight) {
      drawShotBall(ctx, state.shotInFlight, state.ball);
    } else {
      drawGroundBall(ctx, state.ball);
    }

    drawShotMeterGuide(ctx, state.meterCharge);

    ctx.fillStyle = "rgba(9,15,29,0.24)";
    ctx.fillRect(0, CANVAS.height - 162, CANVAS.width * 0.52, 162);
    ctx.fillRect(CANVAS.width * 0.47, CANVAS.height - 226, CANVAS.width * 0.53, 226);

    ctx.beginPath();
    ctx.arc(input.joystick.baseX, input.joystick.baseY, 50, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(input.joystick.knobX, input.joystick.knobY, 21, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.74)";
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
      left: `${schoolCode(state.userTeam.schoolName)} ${state.score.user}`,
      center: `Q${state.quarter} ${Math.floor(state.gameClock / 60)}:${String(Math.floor(state.gameClock % 60)).padStart(2, "0")}`,
      shotClock: `SHOT :${String(Math.ceil(state.shotClock)).padStart(2, "0")}`,
      right: `${state.score.cpu} ${schoolCode(state.cpuTeam.schoolName)}`,
      meter: clamp(state.meterCharge / 1.2, 0, 1),
      crowd: `Crowd: ${crowdLevelLabel(state.crowdEnergy)}`,
      run:
        state.run.side === TEAM_SIDES.USER
          ? `Run: You ${state.run.points}-0`
          : state.run.side === TEAM_SIDES.CPU
            ? `Run: CPU ${state.run.points}-0`
            : "Run: Even",
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
        state.meterCharge = state.possession === TEAM_SIDES.USER ? input.shootCharge : 0;
        handleUserButtons(shootRelease.released, shootRelease.charge);
        updateUserMovement(dt);
        updateCpuMovement(dt);
        updateOffBallMovement(dt);
        maybeCpuActions(dt);
        maybeDefenseActions();
        updateBall(dt);
        updateShotInFlight(dt);
      }
      updateClock(dt);
      maybeComplete();
    },
    draw,
    getHud,
    getAndClearSoundEvents() {
      if (!state.soundQueue.length) return [];
      const events = [...state.soundQueue];
      state.soundQueue = [];
      return events;
    },
  };
}
