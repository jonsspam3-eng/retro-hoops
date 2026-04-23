import { cloneRoster, rosterAlpha, rosterBeta, rosterGamma } from "./players.js";

export const TEAM_PRESETS = [
  {
    id: "great-lakes-tech",
    schoolName: "Great Lakes Tech",
    mascot: "Guardians",
    conference: "North Metro",
    prestige: 62,
    chemistry: 64,
    morale: 67,
    colors: { primary: "#1a4fbf", secondary: "#f6c84f" },
    roster: cloneRoster(rosterAlpha),
  },
  {
    id: "sunset-state",
    schoolName: "Sunset State",
    mascot: "Waves",
    conference: "Pacific Union",
    prestige: 58,
    chemistry: 69,
    morale: 63,
    colors: { primary: "#a0287a", secondary: "#34d1bf" },
    roster: cloneRoster(rosterBeta),
  },
  {
    id: "ironwood-u",
    schoolName: "Ironwood University",
    mascot: "Owls",
    conference: "Heartland",
    prestige: 54,
    chemistry: 58,
    morale: 59,
    colors: { primary: "#2f8f4e", secondary: "#e3f07a" },
    roster: cloneRoster(rosterGamma),
  },
];

export const createCustomTeam = ({ schoolName, mascot, colors }) => {
  const normalizedName = schoolName.trim() || "Custom College";
  const normalizedMascot = mascot.trim() || "Legends";
  return {
    id: `custom-${Date.now()}`,
    schoolName: normalizedName,
    mascot: normalizedMascot,
    conference: "Independents",
    prestige: 55,
    chemistry: 60,
    morale: 60,
    colors,
    roster: cloneRoster(rosterAlpha).map((player, index) => ({
      ...player,
      id: `${player.id}-custom-${index}`,
      name: `${player.name.split(" ")[0]} ${normalizedMascot.slice(0, 3).toUpperCase()}${index + 1}`,
    })),
  };
};
