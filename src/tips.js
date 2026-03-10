// Tips for level completion interstitials
// Each tip is associated with the level JUST COMPLETED (index)

export const LEVEL_TIPS = [
  // Level 1 (index 0) - Basic movement
  "Use 'alias' to create shortcuts. Try: alias go='mv 1 0 && mv 1 0'",

  // Level 2 (index 1) - Scripting intro
  "Scripts persist across resets. Write once, run many times.",

  // Level 3 (index 2) - Loops
  "'for i in 1..5; do r; done' moves 5 spaces right in one command.",

  // Level 4 (index 3) - Keys & doors
  "'ls' shows what's around you, including doors and keys.",

  // Level 5 (index 4) - Multiple keys
  "Use 'ls /backpack' to check which keys you're carrying.",

  // Level 6 (index 5) - Fire hazard
  "Check your backpack with 'ls /backpack' before walking into hazards.",

  // Level 7 (index 6) - Water hazard
  "Different boots protect against different hazards. Plan your route!",

  // Level 8 (index 7) - Ice & everything
  "'cat /tile' shows what's under your feet - useful on ice!",

  // Level 9 (index 8) - Ice sliding
  "Ice slides you until you hit something. Plan your entry angle!",
];

// General tips for procedural levels and rotation
export const GENERAL_TIPS = [
  // Scripting tips
  "Combine commands with '&&' to chain them: 'r && r && d && d'",
  "Scripts can call other scripts. Modularize your solutions!",
  "'repeat 4 r' moves right 4 times - faster than typing 'r' four times.",
  "Use 'bash solve.sh --instant' for maximum speed.",
  "Use 'bash solve.sh --step' to debug line by line.",

  // Alias tips
  "Define movement macros: alias spiral='r && d && l && u'",
  "List all aliases with 'alias' (no arguments).",
  "Remove an alias with 'unalias name'.",

  // Navigation tips
  "Use 'pwd' to check your coordinates when lost.",
  "'man' lists all commands. 'man mv' explains movement.",
  "The exit unlocks when you collect all chips.",

  // Strategy tips
  "Stuck? 'reset' restarts the level but keeps your scripts.",
  "Write scripts incrementally - test after each section.",
  "Ice boots aren't required but let you walk on ice without sliding.",

  // Fun facts
  "ChipShell is inspired by Chip's Challenge (1989).",
  "There are infinite procedural levels after the tutorial!",
  "Try 'theme terminal' for that classic hacker aesthetic.",
  "Each theme has unique emojis. Try 'theme candy' for a sweet look!",
];

/**
 * Get a tip for the completed level
 * @param {number} levelIndex - The level that was just completed (0-indexed)
 * @returns {string} A contextual tip
 */
export function getTipForLevel(levelIndex) {
  if (levelIndex < LEVEL_TIPS.length) {
    return LEVEL_TIPS[levelIndex];
  }
  // For procedural levels, rotate through general tips
  const generalIndex = (levelIndex - LEVEL_TIPS.length) % GENERAL_TIPS.length;
  return GENERAL_TIPS[generalIndex];
}

/**
 * Get a fun subtitle based on level mechanics
 * @param {number} levelIndex - The level that was just completed
 * @param {object} levelObj - The level object with grid data
 * @returns {string} A fun subtitle
 */
export function getLevelSubtitle(levelIndex, levelObj) {
  // Check what mechanics were in this level
  const grid = levelObj?.grid || [];
  const flatGrid = grid.flat();

  const hasKeys = flatGrid.some(t => t >= 4 && t <= 7);
  const hasDoors = flatGrid.some(t => t >= 8 && t <= 11);
  const hasFire = flatGrid.includes(12);
  const hasWater = flatGrid.includes(13);
  const hasIce = flatGrid.includes(14);
  const hasBoots = flatGrid.some(t => t >= 15 && t <= 17);

  if (hasIce && (hasFire || hasWater)) {
    return "Hot, cold, and slippery!";
  }
  if (hasIce) {
    return "Slid through like a pro!";
  }
  if (hasFire && hasWater) {
    return "Fire and water conquered!";
  }
  if (hasFire) {
    return "Played with fire and won!";
  }
  if (hasWater) {
    return "Water? No problem!";
  }
  if (hasKeys && hasDoors) {
    return "Keys found, doors opened!";
  }
  if (hasBoots) {
    return "Boot up and move out!";
  }

  // Generic subtitles for basic levels
  const genericSubtitles = [
    "Chips collected!",
    "Another level down!",
    "Excellent navigation!",
    "Shell mastery!",
    "Command line champion!",
  ];

  return genericSubtitles[levelIndex % genericSubtitles.length];
}

// Death messages based on hazard type
export const DEATH_MESSAGES = {
  fire: {
    header: "BURNED!",
    message: "You stepped in fire without fire_boots!",
    tip: "Find fire_boots before crossing fire tiles.",
  },
  water: {
    header: "DROWNED!",
    message: "You fell in water without water_boots!",
    tip: "Find water_boots before crossing water tiles.",
  },
  entity: {
    header: "CAUGHT!",
    message: "An enemy process caught you!",
    tip: "Use 'ps' to track enemies. They move when you move.",
  },
};
