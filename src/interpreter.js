import { T, LEVELS, DIR, TNAME, MAN, DOOR_KEY, KEY_ITEM, HAZARD_BOOT, BOOT_ITEM } from './levels.js';
import { THEMES } from './themes.js';

// Re-export constants for convenience
export { T, LEVELS, DIR, TNAME, MAN, THEMES, DOOR_KEY, KEY_ITEM, HAZARD_BOOT, BOOT_ITEM };

/**
 * Create initial game state from a level index or level object
 * @param {number|object} levelOrIndex - level index or level object
 * @returns {object} game state
 */
export function createState(levelOrIndex) {
  const isIndex = typeof levelOrIndex === 'number';
  const lv = isIndex ? LEVELS[levelOrIndex] : levelOrIndex;
  return {
    grid: lv.grid.map(r => [...r]),
    pos: [...lv.start],
    chips: 0,
    needed: lv.chips,
    backpack: [],
    won: false,
    aliases: { r: "mv 1 0", l: "mv -1 0", u: "mv 0 -1", d: "mv 0 1" },
    scripts: {},
    level: isIndex ? levelOrIndex : -1, // -1 for generated levels
    levelObj: lv, // Store level object for dimensions
    moves: 0, // Track successful commands
  };
}

/**
 * Execute a single move step and handle tile interactions
 * @param {object} state - game state
 * @param {number} dx - x direction (-1, 0, or 1)
 * @param {number} dy - y direction (-1, 0, or 1)
 * @param {array} output - output array to append to
 * @param {function} out - output function
 * @param {function} err - error function
 * @returns {{ state: object, output: array, exitCode: number, blocked?: boolean }}
 */
function moveOnce(state, dx, dy, output, out, err) {
  const lv = state.levelObj || LEVELS[state.level];
  const nx = state.pos[0] + dx, ny = state.pos[1] + dy;

  if (nx < 0 || ny < 0 || nx >= lv.w || ny >= lv.h) {
    err("mv: out of bounds");
    return { state, output, exitCode: 1, blocked: true };
  }

  const tile = state.grid[ny][nx];

  if (tile === T.W) {
    err("mv: permission denied");
    return { state, output, exitCode: 1, blocked: true };
  }

  if (tile === T.E && state.chips < state.needed) {
    err("mv: exit locked (" + String(state.needed - state.chips) + " left)");
    return { state, output, exitCode: 1, blocked: true };
  }

  // Door handling - check for matching key
  if (DOOR_KEY[tile]) {
    const neededKey = DOOR_KEY[tile];
    if (!state.backpack.includes(neededKey)) {
      err("mv: need " + neededKey);
      return { state, output, exitCode: 1, blocked: true };
    }
  }

  // Hazard handling - check for boots (before moving)
  if (HAZARD_BOOT[tile] !== undefined) {
    const neededBoot = HAZARD_BOOT[tile];
    if (neededBoot && !state.backpack.includes(neededBoot)) {
      // Death! Return death marker
      const reason = tile === T.FIRE ? "fire" : "water";
      return { state, output: [{ t: "death", x: reason }], exitCode: 1 };
    }
    // Ice is passable without boots (neededBoot is null for ice)
  }

  // Create new state with updated position
  let newState = {
    ...state,
    pos: [nx, ny],
  };

  // Handle door - consume key and convert to floor
  if (DOOR_KEY[tile]) {
    const neededKey = DOOR_KEY[tile];
    const newGrid = newState.grid.map(r => [...r]);
    newGrid[ny][nx] = T.F; // Convert door to floor
    const keyIndex = newState.backpack.indexOf(neededKey);
    const filteredBackpack = [...newState.backpack];
    filteredBackpack.splice(keyIndex, 1);
    newState = {
      ...newState,
      grid: newGrid,
      backpack: filteredBackpack,
    };
    out("Opened " + (TNAME[tile] || "door"));
  }

  // Pick up key
  if (KEY_ITEM[tile]) {
    const keyItem = KEY_ITEM[tile];
    const newGrid = newState.grid.map(r => [...r]);
    newGrid[ny][nx] = T.F;
    newState = {
      ...newState,
      grid: newGrid,
      backpack: [...newState.backpack, keyItem],
    };
    out("Picked up " + keyItem);
  }

  // Pick up boot
  if (BOOT_ITEM[tile]) {
    const bootItem = BOOT_ITEM[tile];
    const newGrid = newState.grid.map(r => [...r]);
    newGrid[ny][nx] = T.F;
    newState = {
      ...newState,
      grid: newGrid,
      backpack: [...newState.backpack, bootItem],
    };
    out("Picked up " + bootItem);
  }

  // Pick up chip
  if (tile === T.C) {
    const newGrid = newState.grid.map(r => [...r]);
    newGrid[ny][nx] = T.F;
    const newChips = newState.chips + 1;
    const newBackpack = [...newState.backpack, "chip"];
    newState = {
      ...newState,
      grid: newGrid,
      chips: newChips,
      backpack: newBackpack,
    };
    out("Picked up chip");
    if (newChips >= newState.needed) {
      out("All chips collected! Exit unlocked.");
    }
  }

  // Win condition
  if (tile === T.E && newState.chips >= newState.needed) {
    newState = { ...newState, won: true };
    out("Level complete! Press Enter.");
  }

  return { state: newState, output, exitCode: 0 };
}

/**
 * Execute a single command (no && chaining)
 * @param {object} state - game state
 * @param {string} raw - command string
 * @returns {{ state: object, output: array, exitCode: number }}
 */
export function execOne(state, raw) {
  const output = [];
  const out = (x, t = "o") => output.push({ t, x });
  const err = (x) => out(x, "e");

  const s = raw.trim();
  if (!s) return { state, output, exitCode: 0 };

  const parts = s.split(/\s+/);
  const cmd = parts[0];

  // Comments
  if (cmd.startsWith("#")) return { state, output, exitCode: 0 };

  // Alias expansion (only for single-word commands)
  if (state.aliases[cmd] && parts.length === 1) {
    return lineExec(state, state.aliases[cmd]);
  }

  // clear - returns marker (actual clear is handled by React)
  if (cmd === "clear") {
    return { state, output: [{ t: "clear", x: "" }], exitCode: 0 };
  }

  // theme - returns theme info (actual theme switch handled by React)
  if (cmd === "theme") {
    if (parts.length < 2) {
      out("Themes: " + Object.keys(THEMES).join(", "));
      return { state, output, exitCode: 0 };
    }
    if (THEMES[parts[1]]) {
      out("Theme: " + parts[1]);
      return { state, output: [{ t: "theme", x: parts[1] }, ...output], exitCode: 0 };
    }
    err("theme: '" + parts[1] + "' not found");
    return { state, output, exitCode: 1 };
  }

  // man
  if (cmd === "man") {
    if (parts.length < 2) {
      out("Commands: " + Object.keys(MAN).join(", "));
      return { state, output, exitCode: 0 };
    }
    if (MAN[parts[1]]) {
      out(MAN[parts[1]]);
      return { state, output, exitCode: 0 };
    }
    err("No manual for '" + parts[1] + "'");
    return { state, output, exitCode: 1 };
  }

  // mv
  if (cmd === "mv") {
    if (parts.length < 3) {
      err("Usage: mv <dx> <dy>");
      return { state, output, exitCode: 1 };
    }
    const dx = +parts[1], dy = +parts[2];
    if (isNaN(dx) || isNaN(dy)) {
      err("mv: bad args");
      return { state, output, exitCode: 1 };
    }
    if (Math.abs(dx) + Math.abs(dy) !== 1) {
      err("mv: cardinal only");
      return { state, output, exitCode: 1 };
    }

    // Use moveOnce helper for initial move, then handle ice sliding
    const result = moveOnce(state, dx, dy, output, out, err);
    if (result.exitCode !== 0) {
      return result;
    }

    let newState = result.state;

    // Ice sliding - keep moving in same direction while on ice
    const lv = newState.levelObj || LEVELS[newState.level];
    let currentTile = newState.grid[newState.pos[1]][newState.pos[0]];

    while (currentTile === T.ICE && !newState.won) {
      out("Sliding on ice...");
      const slideResult = moveOnce(newState, dx, dy, output, out, err);

      if (slideResult.exitCode !== 0) {
        // Hit wall or out of bounds - stop on current ice tile
        if (slideResult.blocked) {
          out("Stopped at edge.");
          break;
        }
        // Death during slide (fire/water)
        return slideResult;
      }

      newState = slideResult.state;
      currentTile = newState.grid[newState.pos[1]][newState.pos[0]];
    }

    return { state: newState, output, exitCode: 0 };
  }

  // ls
  if (cmd === "ls") {
    if (parts[1] === "/backpack") {
      out(state.backpack.length ? state.backpack.join(", ") : "(empty)");
      return { state, output, exitCode: 0 };
    }
    if (parts[1] === "/scripts") {
      const k = Object.keys(state.scripts);
      out(k.length ? k.join("  ") : "No scripts. Try: nano solve.sh");
      return { state, output, exitCode: 0 };
    }
    const lv = state.levelObj || LEVELS[state.level];
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
      const x = state.pos[0] + dx, y = state.pos[1] + dy;
      const nm = DIR[dx + "," + dy];
      if (x < 0 || y < 0 || x >= lv.w || y >= lv.h) {
        out(nm + ": edge");
        return;
      }
      const t = state.grid[y][x];
      out(nm + ": " + (t === T.E ? (state.chips >= state.needed ? "exit (open)" : "exit (locked)") : (TNAME[t] || "floor")));
    });
    return { state, output, exitCode: 0 };
  }

  // pwd
  if (cmd === "pwd") {
    out("[" + state.pos[0] + ", " + state.pos[1] + "]");
    return { state, output, exitCode: 0 };
  }

  // whoami
  if (cmd === "whoami") {
    out("Player | Chips: " + state.chips + "/" + state.needed + " | Level: " + (state.level + 1) + " | Moves: " + state.moves);
    return { state, output, exitCode: 0 };
  }

  // cat
  if (cmd === "cat") {
    if (parts[1] === "/tile") {
      const pp = state.pos;
      out("[" + pp[0] + "," + pp[1] + "]: " + (TNAME[state.grid[pp[1]][pp[0]]] || "floor"));
      return { state, output, exitCode: 0 };
    }
    const sc = state.scripts[parts[1]];
    if (sc !== undefined) {
      out(sc || "(empty script)");
      return { state, output, exitCode: 0 };
    }
    err("cat: try 'cat /tile' or 'cat <script.sh>'");
    return { state, output, exitCode: 1 };
  }

  // alias
  if (cmd === "alias") {
    if (parts.length < 2) {
      const k = Object.keys(state.aliases);
      if (!k.length) {
        out("No aliases");
        return { state, output, exitCode: 0 };
      }
      k.forEach(key => out(key + "='" + state.aliases[key] + "'"));
      return { state, output, exitCode: 0 };
    }
    const rest = parts.slice(1).join(" ");
    const m = rest.match(/^(\w+)=['"](.*?)['"]$/);
    if (!m) {
      err("Usage: alias name='command'");
      return { state, output, exitCode: 1 };
    }
    const newAliases = { ...state.aliases, [m[1]]: m[2] };
    out("alias " + m[1] + "='" + m[2] + "'");
    return { state: { ...state, aliases: newAliases }, output, exitCode: 0 };
  }

  // unalias
  if (cmd === "unalias") {
    if (parts.length < 2) {
      err("Usage: unalias name");
      return { state, output, exitCode: 1 };
    }
    const newAliases = { ...state.aliases };
    delete newAliases[parts[1]];
    out("Removed '" + parts[1] + "'");
    return { state: { ...state, aliases: newAliases }, output, exitCode: 0 };
  }

  // repeat
  if (cmd === "repeat") {
    if (parts.length < 3) {
      err("Usage: repeat N cmd");
      return { state, output, exitCode: 1 };
    }
    const cnt = +parts[1];
    if (isNaN(cnt) || cnt < 1 || cnt > 50) {
      err("repeat: 1-50");
      return { state, output, exitCode: 1 };
    }
    const sub = parts.slice(2).join(" ");
    let currentState = state;
    const allOutput = [];
    for (let i = 0; i < cnt; i++) {
      const result = execOne(currentState, sub);
      currentState = result.state;
      allOutput.push(...result.output);
      if (result.exitCode !== 0 || currentState.won) {
        return { state: currentState, output: allOutput, exitCode: result.exitCode };
      }
    }
    return { state: currentState, output: allOutput, exitCode: 0 };
  }

  // for
  if (cmd === "for") {
    const rawFor = parts.slice(1).join(" ");
    const m = rawFor.match(/^\w+\s+in\s+(\d+)\.\.(\d+);\s*do\s+(.+?);\s*done$/);
    if (!m) {
      err("Usage: for i in 1..N; do cmd; done");
      return { state, output, exitCode: 1 };
    }
    const start = +m[1], end = +m[2];
    if (end - start + 1 > 50) {
      err("for: max 50 iterations");
      return { state, output, exitCode: 1 };
    }
    let currentState = state;
    const allOutput = [];
    for (let i = start; i <= end; i++) {
      const result = lineExec(currentState, m[3]);
      currentState = result.state;
      allOutput.push(...result.output);
      if (result.exitCode !== 0 || currentState.won) {
        return { state: currentState, output: allOutput, exitCode: result.exitCode };
      }
    }
    return { state: currentState, output: allOutput, exitCode: 0 };
  }

  // nano - returns marker (actual editor handled by React)
  if (cmd === "nano") {
    if (parts.length < 2) {
      err("Usage: nano <n>.sh");
      return { state, output, exitCode: 1 };
    }
    return { state, output: [{ t: "nano", x: parts[1] }], exitCode: 0 };
  }

  // bash - returns marker (actual script running handled by React)
  if (cmd === "bash") {
    if (parts.length < 2) {
      err("Usage: bash <n>.sh [--slow|--step|--instant]");
      return { state, output, exitCode: 1 };
    }
    const fn = parts[1];
    const mode = parts[2] || "--slow";
    const sc = state.scripts[fn];
    if (sc === undefined) {
      err("bash: " + fn + ": No such file");
      return { state, output, exitCode: 1 };
    }
    return { state, output: [{ t: "bash", x: { fn, mode, src: sc } }], exitCode: 0 };
  }

  // reset - returns marker (actual reset handled by React)
  if (cmd === "reset") {
    return { state, output: [{ t: "reset", x: "" }], exitCode: 0 };
  }

  // rm
  if (cmd === "rm") {
    if (parts.length < 2) {
      err("Usage: rm <n>.sh");
      return { state, output, exitCode: 1 };
    }
    const fn = parts[1];
    if (state.scripts[fn] === undefined) {
      err("rm: " + fn + ": not found");
      return { state, output, exitCode: 1 };
    }
    const newScripts = { ...state.scripts };
    delete newScripts[fn];
    out("Removed " + fn);
    return { state: { ...state, scripts: newScripts }, output, exitCode: 0 };
  }

  // Unknown command
  err(cmd + ": command not found");
  return { state, output, exitCode: 1 };
}

/**
 * Execute a line with && chaining support
 * @param {object} state - game state
 * @param {string} line - command line (may contain &&)
 * @returns {{ state: object, output: array, exitCode: number }}
 */
export function lineExec(state, line) {
  const segs = line.split("&&").map(s => s.trim()).filter(Boolean);
  let currentState = state;
  const allOutput = [];

  for (const seg of segs) {
    if (currentState.won) {
      return { state: currentState, output: allOutput, exitCode: 0 };
    }
    const result = execOne(currentState, seg);
    currentState = result.state;
    allOutput.push(...result.output);
    if (result.exitCode !== 0) {
      return { state: currentState, output: allOutput, exitCode: result.exitCode };
    }
  }

  return { state: currentState, output: allOutput, exitCode: 0 };
}
