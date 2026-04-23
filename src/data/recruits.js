const recruitNames = [
  "Jayden Knox",
  "Elijah Pratt",
  "Mason Burke",
  "Noah Vance",
  "Kyler Boone",
  "Dante Briggs",
  "Caleb Rowan",
  "Isaiah Mills",
  "Tyrese Vaughn",
  "Landon Pierce",
];

const archetypes = [
  "Floor General",
  "Shot Maker",
  "Rim Runner",
  "3&D Wing",
  "Paint Beast",
  "Point Forward",
];

const positions = ["PG", "SG", "SF", "PF", "C"];

export function createRecruitingBoard(seed = 0) {
  return recruitNames.map((name, index) => {
    const base = (index * 17 + seed * 7) % 100;
    return {
      id: `recruit-${seed}-${index}`,
      name,
      stars: 2 + (base % 4),
      position: positions[index % positions.length],
      archetype: archetypes[(index + seed) % archetypes.length],
      potential: 65 + (base % 30),
      interest: 20 + (base % 45),
      progress: 0,
      trait: base % 2 === 0 ? "High Motor" : "Late Bloomer",
    };
  });
}
