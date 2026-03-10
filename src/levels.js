export const T = {
  F: 0, W: 1, C: 2, E: 3,
  // Keys
  KR: 4, KB: 5, KG: 6, KY: 7,
  // Doors
  DR: 8, DB: 9, DG: 10, DY: 11,
  // Hazards
  FIRE: 12, WATER: 13, ICE: 14,
  // Boots
  BOOTS_FIRE: 15, BOOTS_WATER: 16, BOOTS_ICE: 17,
};

export const LEVELS = [
  {
    w: 7, h: 7, chips: 2,
    grid: [
      [1,1,1,1,1,1,1],
      [1,0,0,0,0,0,1],
      [1,0,2,0,0,0,1],
      [1,0,0,0,1,0,1],
      [1,0,0,0,1,2,1],
      [1,0,0,0,0,3,1],
      [1,1,1,1,1,1,1]
    ],
    start: [1, 1],
    tut: [
      "ChipShell v0.3 — type 'man' for commands",
      "Collect all chips to unlock the exit.",
      "Try: nano solve.sh to write a script",
      "Default aliases: r/l/u/d for movement"
    ]
  },
  {
    w: 9, h: 9, chips: 4,
    grid: [
      [1,1,1,1,1,1,1,1,1],
      [1,0,0,0,1,0,0,0,1],
      [1,0,2,0,1,0,2,0,1],
      [1,0,0,0,0,0,0,0,1],
      [1,1,1,0,0,0,1,1,1],
      [1,0,0,0,0,0,0,0,1],
      [1,0,2,0,1,0,2,0,1],
      [1,0,0,0,1,0,0,3,1],
      [1,1,1,1,1,1,1,1,1]
    ],
    start: [1, 1],
    tut: [
      "Level 2. Write scripts to navigate efficiently.",
      "Try: nano solve.sh, then bash solve.sh"
    ]
  },
  {
    w: 11, h: 11, chips: 6,
    grid: [
      [1,1,1,1,1,1,1,1,1,1,1],
      [1,0,0,0,1,0,0,0,1,0,1],
      [1,0,2,0,0,0,1,0,0,0,1],
      [1,0,0,1,0,0,1,0,2,0,1],
      [1,1,0,1,0,0,0,0,1,0,1],
      [1,0,0,0,0,2,0,0,1,0,1],
      [1,0,1,1,0,0,1,0,0,0,1],
      [1,0,0,0,0,1,1,0,2,0,1],
      [1,2,0,1,0,0,0,0,1,0,1],
      [1,0,0,0,0,2,0,0,0,3,1],
      [1,1,1,1,1,1,1,1,1,1,1]
    ],
    start: [1, 1],
    tut: ["Level 3. Script your way through."]
  },
];

export const DIR = {
  "1,0": "east",
  "-1,0": "west",
  "0,1": "south",
  "0,-1": "north"
};

export const TNAME = {
  [T.F]: "floor",
  [T.W]: "wall",
  [T.C]: "chip",
  [T.E]: "exit",
  [T.KR]: "red_key",
  [T.KB]: "blue_key",
  [T.KG]: "green_key",
  [T.KY]: "yellow_key",
  [T.DR]: "red_door",
  [T.DB]: "blue_door",
  [T.DG]: "green_door",
  [T.DY]: "yellow_door",
  [T.FIRE]: "fire",
  [T.WATER]: "water",
  [T.ICE]: "ice",
  [T.BOOTS_FIRE]: "fire_boots",
  [T.BOOTS_WATER]: "water_boots",
  [T.BOOTS_ICE]: "ice_boots",
};

// Maps door tile to required key item name
export const DOOR_KEY = {
  [T.DR]: "red_key",
  [T.DB]: "blue_key",
  [T.DG]: "green_key",
  [T.DY]: "yellow_key",
};

// Maps key tile to item name
export const KEY_ITEM = {
  [T.KR]: "red_key",
  [T.KB]: "blue_key",
  [T.KG]: "green_key",
  [T.KY]: "yellow_key",
};

// Maps hazard tile to required boot item name
export const HAZARD_BOOT = {
  [T.FIRE]: "fire_boots",
  [T.WATER]: "water_boots",
  [T.ICE]: null, // Ice is passable without boots
};

// Maps boot tile to item name
export const BOOT_ITEM = {
  [T.BOOTS_FIRE]: "fire_boots",
  [T.BOOTS_WATER]: "water_boots",
  [T.BOOTS_ICE]: "ice_boots",
};

export const MAN = {
  mv: "mv <dx> <dy> — Move. -1/1 per axis",
  ls: "ls [/backpack|/scripts] — List adjacent, inventory, or scripts",
  pwd: "pwd — Coordinates",
  whoami: "whoami — Stats",
  cat: "cat /tile|<script> — Inspect tile or view script",
  man: "man [cmd] — Help",
  clear: "clear — Clear output",
  alias: "alias name='cmd' — Create shortcut",
  unalias: "unalias name — Remove alias",
  repeat: "repeat N cmd — Run cmd N times",
  "for": "for i in 1..N; do cmd; done — Loop",
  theme: "theme [name] — Switch theme",
  nano: "nano <n>.sh — Open script editor",
  bash: "bash <n>.sh [--slow|--step|--instant] — Run script",
  reset: "reset — Restart current level (scripts preserved)",
  rm: "rm <n>.sh — Delete a script",
};
