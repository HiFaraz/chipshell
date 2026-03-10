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
  // Level 4: Keys & Doors (9x9)
  {
    w: 9, h: 9, chips: 2,
    grid: [
      [1,1,1,1,1,1,1,1,1],
      [1,0,0,4,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,1],
      [1,0,1,1,1,1,1,0,1],
      [1,0,1,0,8,0,1,0,1],
      [1,0,1,0,0,0,1,0,1],
      [1,0,1,2,0,2,1,0,1],
      [1,0,0,0,3,0,0,0,1],
      [1,1,1,1,1,1,1,1,1]
    ],
    start: [1, 1],
    tut: [
      "New item: keys! Pick up a key to open matching doors.",
      "Walk into a door with the right key to open it."
    ]
  },
  // Level 5: Color Coded (11x11)
  {
    w: 11, h: 11, chips: 3,
    grid: [
      [1,1,1,1,1,1,1,1,1,1,1],
      [1,0,0,0,0,0,0,0,0,0,1],
      [1,0,1,1,1,0,1,1,1,0,1],
      [1,0,4,0,0,0,0,0,5,0,1],
      [1,0,1,1,1,0,1,1,1,0,1],
      [1,0,8,0,0,0,0,0,9,0,1],
      [1,0,0,0,0,1,0,0,0,0,1],
      [1,2,0,0,0,1,0,0,0,2,1],
      [1,0,0,0,0,1,0,0,0,0,1],
      [1,2,0,0,0,1,0,0,0,3,1],
      [1,1,1,1,1,1,1,1,1,1,1]
    ],
    start: [1, 1],
    tut: ["Multiple keys, multiple doors. Plan your route."]
  },
  // Level 6: Hot Feet (9x9)
  {
    w: 9, h: 9, chips: 2,
    grid: [
      [1,1,1,1,1,1,1,1,1],
      [1,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,1],
      [1,0,15,0,0,0,0,0,1],
      [1,1,1,12,1,1,1,1,1],
      [1,0,0,0,0,0,2,0,1],
      [1,0,0,0,0,0,0,0,1],
      [1,2,0,0,0,0,0,3,1],
      [1,1,1,1,1,1,1,1,1]
    ],
    start: [1, 1],
    tut: [
      "Fire blocks your path. Find boots to walk through safely.",
      "Without boots, fire is deadly!"
    ]
  },
  // Level 7: Water Hazard (11x11)
  {
    w: 11, h: 11, chips: 3,
    grid: [
      [1,1,1,1,1,1,1,1,1,1,1],
      [1,0,0,0,0,0,0,0,0,0,1],
      [1,0,1,1,1,0,1,1,1,0,1],
      [1,0,4,0,0,0,0,0,16,0,1],
      [1,0,1,1,1,0,1,1,1,0,1],
      [1,0,8,0,0,0,0,0,13,0,1],
      [1,0,0,0,0,1,0,0,0,0,1],
      [1,2,0,0,0,1,0,0,0,2,1],
      [1,0,0,0,0,1,0,0,0,0,1],
      [1,2,0,0,0,1,0,0,0,3,1],
      [1,1,1,1,1,1,1,1,1,1,1]
    ],
    start: [1, 1],
    tut: ["Water works like fire — find the right boots."]
  },
  // Level 8: Ice & Everything (13x13)
  {
    w: 13, h: 13, chips: 4,
    grid: [
      [1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,1,1,1,1,0,1,1,1,1,0,1],
      [1,0,5,0,0,0,0,0,0,0,15,0,1],
      [1,0,1,1,1,1,0,1,1,1,1,0,1],
      [1,0,9,0,0,0,0,0,0,0,12,0,1],
      [1,0,0,0,0,0,1,0,0,0,0,0,1],
      [1,2,0,14,14,14,1,0,0,0,0,2,1],
      [1,0,0,0,0,0,1,0,0,0,0,0,1],
      [1,0,0,0,0,0,1,0,0,0,0,0,1],
      [1,0,1,1,1,1,0,1,1,1,1,0,1],
      [1,2,0,0,0,0,0,0,0,0,2,3,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1]
    ],
    start: [1, 1],
    tut: ["Ice is slippery but safe. Use everything you've learned."]
  },
  // Level 9: Ice Sliding Tutorial (13x13)
  {
    w: 13, h: 13, chips: 4,
    grid: [
      [1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,0,0,0,0,0,1,0,0,0,0,0,1],
      [1,0,14,14,14,0,1,0,0,2,0,0,1],
      [1,0,0,0,0,1,1,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,1,1,1,0,1],
      [1,1,1,1,0,0,14,14,14,4,1,0,1],
      [1,0,0,0,0,0,0,0,0,0,1,0,1],
      [1,0,2,0,1,0,14,14,14,14,1,0,1],
      [1,0,0,0,1,0,0,0,0,0,0,0,1],
      [1,0,0,0,1,1,1,1,0,0,0,2,1],
      [1,0,14,14,14,14,0,8,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,2,3,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1]
    ],
    start: [1, 1],
    tut: [
      "Ice! You'll slide until you hit something.",
      "Plan your entry angle carefully.",
      "Slide right on row 5 to reach the key!"
    ]
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
