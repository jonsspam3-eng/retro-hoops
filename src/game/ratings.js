import { clamp } from "../core/math.js";

export function rating(player, key, fallback = 55) {
  return player?.ratings?.[key] ?? fallback;
}

export function getAttribute(player, key, fallback = 55) {
  return rating(player, key, fallback);
}

export function staminaMultiplier(player) {
  return 0.72 + clamp((player.stamina ?? 100) / 100, 0, 1) * 0.28;
}

export function fatigueSpeedFactor(player) {
  return 0.65 + staminaMultiplier(player) * 0.35;
}

export function speedWithFatigue(baseSpeed, stamina, speedRating = 70) {
  const staminaFactor = 0.68 + clamp(stamina / 100, 0, 1) * 0.32;
  const ratingFactor = 0.75 + clamp(speedRating, 30, 99) / 100 * 0.35;
  return baseSpeed * staminaFactor * ratingFactor;
}

export function calcOverall(player) {
  const weights = {
    shooting: 1,
    threePoint: 1,
    finishing: 1,
    ballHandling: 1,
    passing: 0.85,
    perimeterDefense: 1,
    interiorDefense: 0.9,
    rebounding: 0.8,
    speed: 1,
    strength: 0.75,
    stamina: 0.75,
    iq: 0.8,
  };
  const keys = Object.keys(weights);
  const total = keys.reduce((sum, key) => sum + rating(player, key) * weights[key], 0);
  const w = keys.reduce((sum, key) => sum + weights[key], 0);
  return Math.round(total / w);
}
