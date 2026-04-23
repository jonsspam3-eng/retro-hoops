import { APP_SCREENS } from "./constants.js";

function createInitialSeason() {
  return {
    year: 1,
    week: 1,
    wins: 0,
    losses: 0,
    conferenceWins: 0,
    conferenceLosses: 0,
    prestige: 50,
    chemistry: 55,
    morale: 60,
    recruitingPoints: 18,
    coachLevel: 1,
    pollRank: 38,
    standingsSnapshot: [],
    history: [],
    recruitingBoard: [],
  };
}

export function createAppState() {
  return {
    activeScreen: APP_SCREENS.MAIN_MENU,
    teamProfile: null,
    opponentProfile: null,
    season: createInitialSeason(),
    latestGame: null,
    notifications: [],
  };
}

export function resetSeason(state) {
  state.season = createInitialSeason();
  state.latestGame = null;
}

export function setTeamProfile(state, teamProfile) {
  state.teamProfile = {
    ...teamProfile,
    roster: teamProfile.roster.map((player) => ({
      ...player,
      ratings: { ...player.ratings },
      stamina: 100,
      hotStreak: 0,
    })),
  };
}

export function setOpponentProfile(state, opponentProfile) {
  state.opponentProfile = {
    ...opponentProfile,
    roster: opponentProfile.roster.map((player) => ({
      ...player,
      ratings: { ...player.ratings },
      stamina: 100,
      hotStreak: 0,
    })),
  };
}

export function pushNotification(state, message) {
  state.notifications.unshift(message);
  state.notifications = state.notifications.slice(0, 5);
}
