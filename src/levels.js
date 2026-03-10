export const T = { F: 0, W: 1, C: 2, E: 3 };

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
  [T.E]: "exit"
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
