export const APP_SCREENS = {
  MAIN_MENU: "main_menu",
  TEAM_SELECT: "team_select",
  DYNASTY_HUB: "dynasty_hub",
  GAME: "game",
  POSTGAME: "postgame",
};

export const TEAM_SIDES = {
  USER: "user",
  CPU: "cpu",
};

export const GAME_PHASE = {
  TIP: "tip",
  LIVE: "live",
  DEAD: "dead",
  FINAL: "final",
};

export const SHOT_TYPES = {
  LAYUP: "layup",
  DUNK: "dunk",
  MID: "mid",
  THREE: "three",
  FREE_THROW: "free_throw",
};

export const COURT = {
  width: 94,
  height: 50,
  rimOffset: 4,
  centerY: 25,
  paintWidth: 16,
  paintHeight: 19,
  threeRadius: 23.75,
};

export const CANVAS = {
  width: 940,
  height: 500,
};

export const GAME_CONFIG = {
  quarterLength: 120,
  totalQuarters: 2,
  shotClock: 24,
  gameSpeed: 1,
  userSpeed: 11.5,
  aiSpeed: 10.3,
  sprintBoost: 1.35,
  playerRadius: 1.05,
  ballRadius: 0.45,
  passVelocity: 56,
  stealRange: 2,
  blockRange: 2.5,
  contestRange: 3.6,
  reboundRange: 3,
  staminaDrainSprint: 14,
  staminaDrainContact: 9,
  staminaRecovery: 10,
  possessionFreezeSeconds: 0.45,
  turnoverWindowSeconds: 0.16,
};

export const CONTROL_HINTS = {
  joystick: "Drag left pad to move",
  pass: "Tap PASS to dish to nearest target",
  shoot: "Hold + release SHOOT in green window",
  sprint: "Hold SPRINT to burst (uses stamina)",
  defense: "DEF context: steal / contest / block",
};
