import { APP_SCREENS, CONTROL_HINTS } from "../core/constants.js";

function teamOverall(team) {
  const players = team.roster.slice(0, 5);
  if (!players.length) return 0;
  const total = players.reduce((sum, player) => {
    const ratings = player.ratings;
    return (
      sum +
      (ratings.shooting +
        ratings.threePoint +
        ratings.finishing +
        ratings.ballHandling +
        ratings.passing +
        ratings.perimeterDefense +
        ratings.rebounding +
        ratings.speed) /
        8
    );
  }, 0);
  return Math.round(total / players.length);
}

export function renderMainMenuScreen(root, { state }) {
  root.innerHTML = `
    <section class="screen active" data-screen="${APP_SCREENS.MAIN_MENU}">
      <h1 class="title">Retro Hoops</h1>
      <p class="subtitle">College dynasty + mobile arcade basketball prototype.</p>
      <div class="panel stack">
        <button class="btn" data-action="start-team-select">Start New Program</button>
        <button class="btn secondary" data-action="continue-season">Continue Dynasty Hub</button>
      </div>
      <div class="panel">
        <div class="small"><strong>Touch controls</strong></div>
        <div class="small">${CONTROL_HINTS.joystick}</div>
        <div class="small">${CONTROL_HINTS.pass}</div>
        <div class="small">${CONTROL_HINTS.shoot}</div>
        <div class="small">${CONTROL_HINTS.sprint}</div>
        <div class="small">${CONTROL_HINTS.defense}</div>
      </div>
      <div class="panel">
        <div class="small">Current program: ${state.teamProfile ? state.teamProfile.schoolName : "Not selected"}</div>
        <div class="small">Season record: ${state.season.wins}-${state.season.losses} (Week ${state.season.week})</div>
      </div>
    </section>
  `;
}

export function renderTeamSelectScreen(root, { teams, selectedTeamId }) {
  const cards = teams
    .map((team) => {
      const selected = selectedTeamId === team.id ? "selected" : "";
      return `
        <button class="team-card ${selected}" data-team-id="${team.id}">
          <div class="row" style="justify-content:space-between">
            <strong>${team.schoolName}</strong>
            <span>${teamOverall(team)} OVR</span>
          </div>
          <div class="small">${team.mascot} • ${team.conference}</div>
          <div class="small">Prestige ${team.prestige} • Chemistry ${team.chemistry}</div>
        </button>
      `;
    })
    .join("");

  root.innerHTML = `
    <section class="screen active" data-screen="${APP_SCREENS.TEAM_SELECT}">
      <h2 class="title">Pick Your Program</h2>
      <p class="subtitle">Choose a preset team or create your own school.</p>
      <div class="panel stack">${cards}</div>
      <form id="custom-team-form" class="panel stack">
        <strong>Create Team</strong>
        <input name="schoolName" placeholder="School Name" maxlength="30" />
        <input name="mascot" placeholder="Mascot" maxlength="20" />
        <div class="row">
          <input name="primary" value="#1e48a9" placeholder="#1e48a9" />
          <input name="secondary" value="#f2c94c" placeholder="#f2c94c" />
        </div>
        <button type="submit" class="btn secondary">Use Custom Team</button>
      </form>
      <div class="row">
        <button class="btn ghost" data-action="back-menu">Back</button>
        <button class="btn" data-action="confirm-team">Continue</button>
      </div>
    </section>
  `;
}

export function renderDynastyHubScreen(root, { state, schedule, latestNote }) {
  const team = state.teamProfile;
  const season = state.season;
  const nextGame = schedule.find((game) => !game.isPlayed) ?? schedule[schedule.length - 1];
  const history = season.history
    .slice(0, 5)
    .map((entry) => `<div class="small">Wk ${entry.week}: ${entry.opponent} ${entry.score} ${entry.didWin ? "W" : "L"}</div>`)
    .join("") || `<div class="small">No games played yet.</div>`;
  const board = season.recruitingBoard
    .slice(0, 4)
    .map((recruit) => `<div class="small">${recruit.stars}★ ${recruit.name} (${recruit.position}) • ${recruit.progress}% • ${recruit.trait}</div>`)
    .join("");
  const notifications = state.notifications
    .slice(0, 3)
    .map((item) => `<div class="small">• ${item}</div>`)
    .join("");

  root.innerHTML = `
    <section class="screen active" data-screen="${APP_SCREENS.DYNASTY_HUB}">
      <h2 class="title">${team.schoolName} ${team.mascot}</h2>
      <p class="subtitle">${team.conference} • Year ${season.year} Week ${season.week}</p>
      <div class="panel season-grid">
        <div><strong>Record</strong><div class="small">${season.wins}-${season.losses}</div></div>
        <div><strong>Poll</strong><div class="small">#${season.pollRank}</div></div>
        <div><strong>Prestige</strong><div class="small">${season.prestige}</div></div>
        <div><strong>Chemistry</strong><div class="small">${season.chemistry}</div></div>
      </div>
      <div class="panel">
        <strong>Next Matchup</strong>
        <div class="small">Week ${nextGame.week} vs ${nextGame.opponentName} (${nextGame.venue})</div>
        <div class="small">${nextGame.narrative}</div>
      </div>
      <div class="panel">
        <strong>Recruiting Board</strong>
        ${board || `<div class="small">Board is empty.</div>`}
        <div class="small">Recruiting points: ${season.recruitingPoints}</div>
      </div>
      <div class="panel">
        <strong>Recent Results</strong>
        ${history}
      </div>
      <div class="panel">
        <strong>Program Notes</strong>
        ${notifications || `<div class="small">No updates yet.</div>`}
      </div>
      <div class="row wrap">
        <button class="btn" data-action="play-game">Play Game</button>
        <button class="btn secondary" data-action="spend-recruiting">Spend Recruiting Points</button>
        <button class="btn ghost" data-action="back-menu">Main Menu</button>
      </div>
      <div class="log">${latestNote || "Build your dynasty one possession at a time."}</div>
    </section>
  `;
}

export function renderGameScreen(root) {
  root.innerHTML = `
    <section class="screen active game-shell" data-screen="${APP_SCREENS.GAME}">
      <div class="hud scorebug">
        <div class="team-chip" id="hud-score-left">HOME 0</div>
        <div class="center">
          <div id="hud-time">Q1 2:00</div>
          <div id="hud-shotclock" class="shot-pill">SHOT :24</div>
        </div>
        <div class="team-chip right" id="hud-score-right">0 AWAY</div>
      </div>
      <div class="hud-secondary">
        <div id="hud-crowd">Crowd: Quiet</div>
        <div id="hud-run">Run: Even</div>
      </div>
      <div class="meter-wrap"><div id="shot-meter" class="meter-bar"></div></div>
      <div class="court-wrap">
        <canvas id="court"></canvas>
      </div>
      <div id="game-log" class="log">Opening tip controlled. Set the tone.</div>
    </section>
  `;
}

export function renderPostgameScreen(root, { state }) {
  const game = state.latestGame;
  if (!game) {
    root.innerHTML = `<section class="screen active"><div class="panel">No game results available.</div></section>`;
    return;
  }
  const qualityScore =
    game.teamStats.greenReleases * 12 +
    game.teamStats.steals * 9 +
    game.teamStats.fastBreaks * 8 +
    game.teamStats.fgp * 0.5 -
    game.teamStats.turnovers * 6;
  const grade =
    qualityScore > 58 ? "A" : qualityScore > 46 ? "B" : qualityScore > 34 ? "C" : qualityScore > 24 ? "D" : "F";
  const momentum = game.didWin ? "Program momentum rises." : "Use this tape in practice.";
  root.innerHTML = `
    <section class="screen active" data-screen="${APP_SCREENS.POSTGAME}">
      <h2 class="title">${game.didWin ? "Victory" : "Final"}</h2>
      <p class="subtitle">${state.teamProfile.schoolName} ${game.userScore} - ${game.cpuScore} ${game.opponentName}</p>
      <div class="panel postgame-hero">
        <div>
          <div class="small">Performance grade</div>
          <div class="grade-pill">${grade}</div>
        </div>
        <div>
          <div class="small">FG%</div>
          <div class="grade-stat">${game.teamStats.fgp}</div>
        </div>
        <div>
          <div class="small">Opp FG%</div>
          <div class="grade-stat">${game.teamStats.oppFgp}</div>
        </div>
        <div>
          <div class="small">Crowd Peak</div>
          <div class="grade-stat">${game.teamStats.crowdPeak}%</div>
        </div>
      </div>
      <div class="panel season-grid">
        <div><strong>Steals</strong><div class="small">${game.teamStats.steals}</div></div>
        <div><strong>Blocks</strong><div class="small">${game.teamStats.blocks}</div></div>
        <div><strong>Fast Breaks</strong><div class="small">${game.teamStats.fastBreaks}</div></div>
        <div><strong>Green Releases</strong><div class="small">${game.teamStats.greenReleases}</div></div>
        <div><strong>Turnovers</strong><div class="small">${game.teamStats.turnovers}</div></div>
        <div><strong>Off Reb</strong><div class="small">${game.teamStats.offensiveBoards}</div></div>
      </div>
      <div class="panel">
        <div class="small">Record: ${state.season.wins}-${state.season.losses}</div>
        <div class="small">Poll #${state.season.pollRank} • Prestige ${state.season.prestige}</div>
        <div class="small">${momentum}</div>
      </div>
      <div class="row">
        <button class="btn" data-action="to-dynasty">Continue Dynasty</button>
        <button class="btn ghost" data-action="back-menu">Main Menu</button>
      </div>
    </section>
  `;
}
