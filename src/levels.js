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
  // Level 1: First Steps (5x5, 1 chip)
  // Straight path: P -> chip -> exit. Under 5 moves.
  {
    w: 5, h: 5, chips: 1,
    grid: [
      [1,1,1,1,1],
      [1,0,0,0,1],
      [1,0,0,2,1],
      [1,0,0,0,1],
      [1,1,3,1,1]
    ],
    start: [1, 1],
    tut: [
      "Welcome to ChipShell! Type 'man' for commands.",
      "Move with: mv 1 0 (right), mv -1 0 (left), mv 0 -1 (up), mv 0 1 (down)"
    ]
  },
  // Level 2: Look Around (5x5, 2 chips)
  // Wall forces exploration. ls shows chip behind corner.
  {
    w: 5, h: 5, chips: 2,
    grid: [
      [1,1,1,1,1],
      [1,0,0,0,1],
      [1,1,0,2,1],
      [1,2,0,0,1],
      [1,1,3,1,1]
    ],
    start: [1, 1],
    tut: [
      "Use 'ls' to see what's around you.",
      "Try 'alias r=\"mv 1 0\"' for shortcuts. r/l/u/d are pre-set."
    ]
  },
  // Level 3: Chain Reaction (7x7, 3 chips)
  // Long path encourages chaining: repeat 4 r && repeat 2 d && ...
  {
    w: 7, h: 7, chips: 3,
    grid: [
      [1,1,1,1,1,1,1],
      [1,0,0,0,0,0,1],
      [1,1,1,1,1,0,1],
      [1,0,0,2,0,0,1],
      [1,0,1,1,1,1,1],
      [1,2,0,0,0,2,1],
      [1,1,1,3,1,1,1]
    ],
    start: [1, 1],
    tut: [
      "Chain commands: mv 1 0 && mv 1 0 && mv 0 1",
      "Or try: repeat 3 mv 1 0"
    ]
  },
  // Level 4: Write It Down (7x7, 3 chips)
  // Winding path designed for scripting with nano/bash
  {
    w: 7, h: 7, chips: 3,
    grid: [
      [1,1,1,1,1,1,1],
      [1,0,0,0,0,0,1],
      [1,1,1,1,1,0,1],
      [1,0,0,2,0,0,1],
      [1,0,1,1,1,1,1],
      [1,0,2,0,2,3,1],
      [1,1,1,1,1,1,1]
    ],
    start: [1, 1],
    tut: [
      "Type 'nano solve.sh' to open the script editor.",
      "Write your moves, save, then run: bash solve.sh --slow"
    ]
  },
  // Level 5: Locked Door (7x7, 2 chips)
  // First key and door. Simple: get red key, open red door, collect chips, exit.
  {
    w: 7, h: 7, chips: 2,
    grid: [
      [1,1,1,1,1,1,1],
      [1,0,0,0,0,0,1],
      [1,0,0,4,0,0,1],
      [1,1,1,8,1,1,1],
      [1,0,0,2,0,0,1],
      [1,0,0,2,3,0,1],
      [1,1,1,1,1,1,1]
    ],
    start: [1, 1],
    tut: [
      "New: keys and doors! Pick up a key to unlock matching doors.",
      "Walk into a door with the right key."
    ]
  },
  // Level 6: Two Keys (9x9, 3 chips)
  // Red key + red door, blue key + blue door. Must plan route order.
  {
    w: 9, h: 9, chips: 3,
    grid: [
      [1,1,1,1,1,1,1,1,1],
      [1,0,0,0,0,0,0,0,1],
      [1,0,1,1,1,1,1,0,1],
      [1,4,0,0,1,0,5,0,1],
      [1,1,8,1,1,1,9,1,1],
      [1,0,2,0,1,0,2,0,1],
      [1,0,0,0,1,0,0,0,1],
      [1,0,2,0,1,0,3,0,1],
      [1,1,1,1,1,1,1,1,1]
    ],
    start: [1, 1],
    tut: ["Multiple keys, multiple doors. Plan your route."]
  },
  // Level 7: Don't Touch (9x9, 2 chips)
  // Fire tiles blocking path, fire boots placed before the fire
  {
    w: 9, h: 9, chips: 2,
    grid: [
      [1,1,1,1,1,1,1,1,1],
      [1,0,0,0,0,0,0,0,1],
      [1,0,0,15,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,1],
      [1,1,1,12,1,1,1,1,1],
      [1,0,0,2,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,1],
      [1,0,0,2,0,0,3,0,1],
      [1,1,1,1,1,1,1,1,1]
    ],
    start: [1, 1],
    tut: [
      "Fire ahead! Find boots first — check 'ls /backpack'.",
      "Without boots, fire is deadly."
    ]
  },
  // Level 8: Deep Water (9x9, 3 chips)
  // Water tiles, water boots, plus a red key/door for review
  {
    w: 9, h: 9, chips: 3,
    grid: [
      [1,1,1,1,1,1,1,1,1],
      [1,0,0,0,0,0,0,0,1],
      [1,0,16,0,4,0,0,0,1],
      [1,0,0,0,0,0,0,0,1],
      [1,1,1,1,8,1,1,1,1],
      [1,0,13,13,13,13,0,0,1],
      [1,0,0,0,2,0,0,0,1],
      [1,0,2,0,0,0,2,3,1],
      [1,1,1,1,1,1,1,1,1]
    ],
    start: [1, 1],
    tut: ["Water works like fire. Find the right boots."]
  },
  // Level 9: Mixed Bag (11x11, 4 chips)
  // Keys, doors, fire, water, boots — all mechanics combined
  {
    w: 11, h: 11, chips: 4,
    grid: [
      [1,1,1,1,1,1,1,1,1,1,1],
      [1,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,1],
      [1,0,15,0,16,0,4,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,1],
      [1,1,12,1,1,8,1,1,13,1,1],
      [1,0,0,0,0,0,0,0,0,0,1],
      [1,0,2,0,2,0,2,0,2,0,1],
      [1,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,3,0,0,0,0,1],
      [1,1,1,1,1,1,1,1,1,1,1]
    ],
    start: [1, 1],
    tut: ["Everything you've learned, all at once."]
  },
  // Level 10: On Ice (13x13, 3 chips)
  // Ice sliding tutorial. Simple ice patches, plan entry angles.
  {
    w: 13, h: 13, chips: 3,
    grid: [
      [1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,14,14,14,14,14,14,4,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,2,0,0,0,1,0,0,0,0,0,1],
      [1,0,0,0,0,0,1,0,0,0,0,0,1],
      [1,0,0,0,0,0,1,14,14,14,2,0,1],
      [1,0,0,0,0,0,1,0,0,0,0,0,1],
      [1,0,0,0,0,0,1,0,0,0,0,0,1],
      [1,0,0,0,8,0,0,0,0,0,2,3,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1]
    ],
    start: [1, 1],
    tut: [
      "Ice! You'll slide until you hit something.",
      "Plan your entry angle carefully."
    ]
  },
  // Level 11: Something Follows (9x9, 2 chips)
  // Crawler tutorial. Simple level with one crawler enemy.
  {
    w: 9, h: 9, chips: 2,
    grid: [
      [1,1,1,1,1,1,1,1,1],
      [1,0,0,0,0,0,0,0,1],
      [1,0,1,1,1,0,1,0,1],
      [1,0,1,2,0,0,1,0,1],
      [1,0,1,0,0,0,0,0,1],
      [1,0,0,0,0,1,1,0,1],
      [1,0,1,0,0,0,2,0,1],
      [1,0,0,0,0,0,0,3,1],
      [1,1,1,1,1,1,1,1,1]
    ],
    start: [1, 1],
    entities: [
      { pid: 1001, type: 'crawler', pos: [7, 1] }
    ],
    tut: [
      "Something is chasing you! Enemies move when you move.",
      "Use 'ps' to see enemy positions."
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
  ps: "ps — List enemy processes (PID, type, position)",
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
