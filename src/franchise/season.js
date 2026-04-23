import { clamp } from "../core/math.js";

export function createSchedule(userTeamName, conference) {
  const opponents = [
    "Stonebridge College",
    "Pine Valley A&M",
    "North Harbor",
    "Midwest Tech",
    "Ridgeview State",
    "Canyon Pacific",
    "Capital Union",
    "Delta Central",
  ];
  return opponents.map((opponentName, index) => ({
    week: index + 1,
    opponentName,
    conferenceGame: index % 2 === 0,
    isPlayed: false,
    result: null,
    venue: index % 2 === 0 ? "Home" : "Away",
    narrative:
      index % 3 === 0
        ? `National spotlight game for ${userTeamName}.`
        : `Conference grind in ${conference}.`,
  }));
}

export function applyGameResult(season, schedule, gameResult) {
  const currentWeek = season.week;
  const game = schedule.find((item) => item.week === currentWeek);
  if (game) {
    game.isPlayed = true;
    game.result = gameResult;
  }
  season.week += 1;
  if (gameResult.didWin) {
    season.wins += 1;
    if (game?.conferenceGame) season.conferenceWins += 1;
    season.prestige = clamp(season.prestige + 2, 1, 99);
    season.chemistry = clamp(season.chemistry + 1, 1, 99);
    season.morale = clamp(season.morale + 2, 1, 99);
    season.pollRank = clamp(season.pollRank - 2, 1, 68);
  } else {
    season.losses += 1;
    if (game?.conferenceGame) season.conferenceLosses += 1;
    season.prestige = clamp(season.prestige - 1, 1, 99);
    season.chemistry = clamp(season.chemistry - 2, 1, 99);
    season.morale = clamp(season.morale - 2, 1, 99);
    season.pollRank = clamp(season.pollRank + 2, 1, 68);
  }
  season.recruitingPoints = clamp(season.recruitingPoints + 4, 0, 45);
  season.history.unshift({
    week: currentWeek,
    opponent: gameResult.opponentName,
    score: `${gameResult.userScore}-${gameResult.cpuScore}`,
    didWin: gameResult.didWin,
  });
  season.history = season.history.slice(0, 10);
}

export function isRegularSeasonComplete(season, schedule) {
  return schedule.every((item) => item.isPlayed) || season.week > schedule.length + 1;
}

export function buildStandingsSnapshot(teamName, season) {
  const entries = [
    { name: teamName, wins: season.wins, losses: season.losses },
    { name: "Pine Valley A&M", wins: clamp(season.wins - 1, 0, 40), losses: season.losses + 1 },
    { name: "Stonebridge", wins: season.wins, losses: season.losses + 2 },
    { name: "Capital Union", wins: season.wins - 2, losses: season.losses + 2 },
  ];
  return entries
    .map((entry) => ({ ...entry, pct: entry.wins / Math.max(entry.wins + entry.losses, 1) }))
    .sort((a, b) => b.pct - a.pct);
}
