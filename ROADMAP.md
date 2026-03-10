# ChipShell Roadmap

A Chip's Challenge-inspired puzzle game where the UI is a Linux terminal. Players navigate tile-based levels using shell commands, write scripts to solve puzzles, and eventually build programmable infrastructure.

## Phase 1 — Playable Core ✅

- Grid renders with emoji tiles (themed per skin)
- Player moves with `mv dx dy`
- Walls, floor, chips, exit
- Collect all chips to unlock exit
- Viewport scrolls with player
- Sticky terminal input with up-arrow command history
- `ls` shows adjacent tiles
- `ls /backpack` shows inventory
- `man` command for help
- `pwd`, `whoami`, `cat /tile`
- Win condition per level
- 3 handcrafted levels (7x7, 9x9, 11x11)
- 5 switchable themes: paper, retro, candy, forest, terminal
- `&&` command chaining
- Aliases with defaults (r/l/u/d) and custom `alias name='cmd'`
- `repeat N cmd`
- `for i in 1..N; do cmd; done`

## Phase 2 — Script Editor ✅

- `nano <name>.sh` opens script editor (split panel desktop, pull-up sheet mobile)
- Editor with line numbers
- Save/cancel, scripts persist across level resets
- `bash <name>.sh` with three execution modes:
  - `--slow` — 200ms per line, highlights current line, shows exit code per line
  - `--step` — pauses each line, press Enter to advance
  - `--instant` — runs all at once, shows full exit code report
- `abort` command to kill running scripts
- `reset` — restart level, keep all scripts
- `ls /scripts`, `cat <script>`, `rm <script>`
- Comments with `#` supported in scripts
- Interpreter returns exit codes (0/1), scripts halt on first error with line number
- Quick iteration loop: write → run → see failure → edit → reset → run

## Phase 3 — Keys, Doors, Hazards

- Colored keys (red, blue, green, yellow) + matching doors
- Fire, water, ice tiles
- Boots (fire boots, flippers, ice skates) as auto-pickup protection
- `use` command for manual item interactions
- Procedurally generated levels with scaling size
- Level generator guarantees solvability (reachable-path-first, valid key/door dependency order)

## Phase 4 — Enemies

- Enemy types as processes:
  - 🐛 `bug` — moves randomly
  - 🪱 `worm` — follows fixed patrol path (cron job)
  - 🎁 `trojan` — disguised as pickup until adjacent
  - 👻 `rootkit` — invisible until `ps` or `grep` reveals it
  - 🔀 `fork_bomb` — splits into two when approached
  - 😈 `daemon` — stationary, blocks commands in radius ("permission denied")
  - 💀 `zombie` — dead process blocking a tile, needs `kill -9`
  - 🕷️ `crawler` — chases player with pathfinding
- Tick system: enemies move after each player command
- `ps` to list enemies with PIDs and positions
- `kill <pid>` with weapon items, `kill -9` for zombies, `sudo kill` for daemons
- `grep <pattern>` to scan map for specific tile types
- Death → restart level
- No direct combat early, avoidance-based. Weapons unlock later.

## Phase 5 — Advanced Scripting

- `bash script.sh` executes all commands in one tick (tactical advantage for dodging)
- Levels designed to require scripting to solve timing puzzles
- Levels with pre-placed broken scripts that need debugging under pressure
- `if/else` conditionals in scripts
- Variable support
- Scripts can query game state (check adjacent tiles, inventory, enemy positions)

## Phase 6 — Building & Programmable Entities

- `touch <name>.sh` — create a buildable entity on current tile
- `nano <name>.sh` — write its behavior script
- Buildable types:
  - Doors: open/close based on triggers
  - Turrets: fire at enemies on interval
  - Traps: activate when enemy steps on tile
  - Bridges: span water/lava
- Script behavior language:
  - `on_adjacent`, `on_step`, `on_tick` — event triggers
  - `sleep N` — wait N turns
  - `ps --nearest --type <type>` — query entities
  - `kill`, `open`, `close`, `toggle` — actions
  - Conditionals: `if [ $(ls /backpack | grep red_key) ]; then open; fi`
- Resource constraints:
  - Limited `touch` uses per level (build budget)
  - Max script line count (CPU quota)
  - `df` shows remaining build resources
- Debug levels: walk into room full of enemies, find broken turret script, fix syntax error before dying

## Design Principles

- **The game teaches Linux.** Every mechanic maps to a real command or concept.
- **Scripting is the core mechanic**, not an afterthought. Introduced in Phase 2, required by Phase 5.
- **Iterate fast.** Quick reset, persistent scripts, visible execution with line highlighting.
- **Progressive complexity.** Early levels: move and collect. Mid: chain and script. Late: build and debug under pressure.
- **Not a terminal.** Despite the command interface, the visual design is warm and themeable, not dark-mode-by-default.
