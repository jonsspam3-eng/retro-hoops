import { APP_SCREENS } from "../core/constants.js";
import { createAppState, pushNotification, resetSeason, setOpponentProfile, setTeamProfile } from "../core/state.js";
import { TEAM_PRESETS, createCustomTeam } from "../data/teams.js";
import { createRecruitingBoard } from "../data/recruits.js";
import { applyGameResult, buildStandingsSnapshot, createSchedule, isRegularSeasonComplete } from "../franchise/season.js";
import { createGameSession } from "../game/gameSession.js";
import {
  renderDynastyHubScreen,
  renderGameScreen,
  renderMainMenuScreen,
  renderPostgameScreen,
  renderTeamSelectScreen,
} from "./screens.js";

function opponentFromWeek(week, selectedTeamId) {
  const index = (week - 1) % TEAM_PRESETS.length;
  const candidate = TEAM_PRESETS[index];
  if (candidate.id === selectedTeamId) {
    return TEAM_PRESETS[(index + 1) % TEAM_PRESETS.length];
  }
  return candidate;
}

export function createApp(root) {
  const state = createAppState();
  let gameSession = null;
  let schedule = [];
  let selectedTeamId = TEAM_PRESETS[0].id;

  function goTo(screen) {
    state.activeScreen = screen;
    render();
  }

  function startNewProgram() {
    resetSeason(state);
    state.season.recruitingBoard = createRecruitingBoard(state.season.year);
    schedule = createSchedule(state.teamProfile.schoolName, state.teamProfile.conference);
    const opponent = opponentFromWeek(state.season.week, state.teamProfile.id);
    setOpponentProfile(state, opponent);
    goTo(APP_SCREENS.DYNASTY_HUB);
  }

  function ensureOpponent() {
    const opponent = opponentFromWeek(state.season.week, state.teamProfile.id);
    setOpponentProfile(state, opponent);
  }

  function mountGame() {
    if (gameSession) {
      gameSession.destroy();
      gameSession = null;
    }
    ensureOpponent();
    gameSession = createGameSession({
      userTeam: state.teamProfile,
      cpuTeam: state.opponentProfile,
      onGameFinished: (result) => {
        applyGameResult(state.season, schedule, result);
        state.season.standingsSnapshot = buildStandingsSnapshot(state.teamProfile.schoolName, state.season);
        if (isRegularSeasonComplete(state.season, schedule)) {
          pushNotification(state, "Regular season complete. Conference tournament unlocked (stub).");
        }
        state.latestGame = result;
        goTo(APP_SCREENS.POSTGAME);
      },
    });
  }

  function destroyGame() {
    if (gameSession) {
      gameSession.destroy();
      gameSession = null;
    }
  }

  function render() {
    destroyGame();
    if (state.activeScreen === APP_SCREENS.MAIN_MENU) {
      renderMainMenuScreen(root, {
        state,
      });
      root.querySelector('[data-action="start-team-select"]')?.addEventListener("click", () => {
        goTo(APP_SCREENS.TEAM_SELECT);
      });
      root.querySelector('[data-action="continue-season"]')?.addEventListener("click", () => {
        if (state.teamProfile) {
          if (!schedule.length) {
            schedule = createSchedule(state.teamProfile.schoolName, state.teamProfile.conference);
          }
          if (!state.season.recruitingBoard.length) {
            state.season.recruitingBoard = createRecruitingBoard(state.season.year);
          }
          goTo(APP_SCREENS.DYNASTY_HUB);
        } else {
          goTo(APP_SCREENS.TEAM_SELECT);
        }
      });
      return;
    }

    if (state.activeScreen === APP_SCREENS.TEAM_SELECT) {
      renderTeamSelectScreen(root, {
        teams: TEAM_PRESETS,
        selectedTeamId,
      });
      root.querySelectorAll("[data-team-id]").forEach((button) => {
        button.addEventListener("click", () => {
          selectedTeamId = button.getAttribute("data-team-id");
          render();
        });
      });
      root.querySelector('[data-action="back-menu"]')?.addEventListener("click", () => {
        goTo(APP_SCREENS.MAIN_MENU);
      });
      root.querySelector('[data-action="confirm-team"]')?.addEventListener("click", () => {
        const team = TEAM_PRESETS.find((entry) => entry.id === selectedTeamId) ?? TEAM_PRESETS[0];
        setTeamProfile(state, team);
        startNewProgram();
      });
      root.querySelector("#custom-team-form")?.addEventListener("submit", (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const custom = createCustomTeam({
          schoolName: String(formData.get("schoolName") ?? ""),
          mascot: String(formData.get("mascot") ?? ""),
          colors: {
            primary: String(formData.get("primary") ?? "#1e48a9"),
            secondary: String(formData.get("secondary") ?? "#f2c94c"),
          },
        });
        setTeamProfile(state, custom);
        startNewProgram();
      });
      return;
    }

    if (state.activeScreen === APP_SCREENS.DYNASTY_HUB) {
      ensureOpponent();
      renderDynastyHubScreen(root, {
        state,
        schedule,
        latestNote: state.notifications[0] ?? "",
      });
      root.querySelector('[data-action="play-game"]')?.addEventListener("click", () => {
        goTo(APP_SCREENS.GAME);
      });
      root.querySelector('[data-action="spend-recruiting"]')?.addEventListener("click", () => {
        if (state.season.recruitingPoints < 3) {
          pushNotification(state, "Need at least 3 recruiting points.");
          render();
          return;
        }
        state.season.recruitingPoints -= 3;
        const board = state.season.recruitingBoard;
        if (board.length) {
          board[0].progress += 14;
          board[0].interest += 9;
          pushNotification(state, `You pitched ${board[0].name}. Interest is now ${board[0].interest}.`);
        }
        render();
      });
      root.querySelector('[data-action="back-menu"]')?.addEventListener("click", () => {
        goTo(APP_SCREENS.MAIN_MENU);
      });
      return;
    }

    if (state.activeScreen === APP_SCREENS.GAME) {
      renderGameScreen(root);
      mountGame();
      return;
    }

    if (state.activeScreen === APP_SCREENS.POSTGAME) {
      renderPostgameScreen(root, {
        state,
      });
      root.querySelector('[data-action="to-dynasty"]')?.addEventListener("click", () => {
        goTo(APP_SCREENS.DYNASTY_HUB);
      });
      root.querySelector('[data-action="back-menu"]')?.addEventListener("click", () => {
        goTo(APP_SCREENS.MAIN_MENU);
      });
    }
  }

  return {
    start() {
      render();
    },
  };
}
