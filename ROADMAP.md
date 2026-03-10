# ChipShell Roadmap

A Chip's Challenge-inspired puzzle game where the UI is a Linux terminal. Players navigate tile-based levels using shell commands, write scripts to solve puzzles, and eventually build programmable infrastructure on the grid.

## Phase 1 — Playable Core ✅

- Grid renders with emoji tiles (themed per skin)
- Player moves with `mv dx dy`
- Walls, floor, chips, exit
- Collect all chips to unlock exit
- Viewport scrolls with player
- Sticky terminal input with up-arrow command history
- `ls`, `ls /backpack`, `pwd`, `whoami`, `cat /tile`, `man`
- Win condition per level
- 3 handcrafted tutorial levels (7x7, 9x9, 11x11)
- 5 switchable themes: paper, retro, candy, forest, terminal
- `&&` command chaining
- Aliases with defaults (r/l/u/d) and custom `alias name='cmd'`
- `repeat N cmd` and `for i in 1..N; do cmd; done`

## Phase 2 — Script Editor ✅

- `nano <name>.sh` opens script editor (split panel desktop, pull-up sheet mobile)
- Editor with line numbers, save/cancel
- Scripts persist across level resets
- `bash <name>.sh` with three execution modes: `--slow`, `--step`, `--instant`
- Line highlighting during execution, exit code per line
- `abort`, `reset`, `ls /scripts`, `cat <script>`, `rm <script>`
- Comments with `#`, halt on first error with line number
- Quick iteration loop: write → run → see failure → edit → reset → run

## Phase 3 — Keys, Doors, Hazards ✅

- Colored keys (red, blue, green, yellow) + matching doors
- Fire, water, ice tiles with protective boots
- Keys auto-pickup, doors consume matching key
- Hazards kill without boots; boots not consumed on use
- Death → auto-reset after message
- 5 handcrafted tutorial levels introducing each mechanic
- Procedural level generation with BFS-validated solvability
- Infinite levels after handcrafted ones, scaling difficulty 1-10

## Phase 4 — Ice Physics & Level Variety

Why now: ice sliding is the most iconic Chip's Challenge mechanic and it's purely a movement rule — no new systems needed. Level variety makes the existing game replayable before we add complexity.

- Ice sliding: stepping on ice continues movement until hitting wall or non-ice tile
- Scripts must account for ice physics (movement has side effects)
- Procedural generator level shapes:
  - Water world (thin land bridges over water)
  - Corridor gauntlet (long narrow paths with doors)
  - Open arena (wide spaces, scattered hazards)
  - Ice maze (large ice sections requiring planned entry angles)
  - Vault (dense key/door dependencies)
- Generator picks shape randomly, weighted by difficulty
- Handcrafted ice tutorial level inserted before procedural levels

## Phase 5 — Sound & Feedback

Why now: the game is silent and the script runner feels dead without audio feedback. Sound is not polish — it's core game feel. Adding it before enemies means the tick system will feel right from day one.

- Command feedback: subtle click on command entry
- Movement sounds: footstep on move, thud on wall, splash on water death, sizzle on fire
- Script execution: rising tone per successful line, buzzer on error, completion chime
- Chip/key/boot pickup sounds
- Door opening sound
- Death sound
- Level complete fanfare
- Ice sliding sound (continuous while sliding)
- Mute toggle command: `mute` / `unmute`
- Volume control: `vol 0-100`
- Use Tone.js (already available in artifact runtime)

## Phase 6 — Enemies (Minimal Viable Threat)

Why now: this is the riskiest system change. Everything is currently solo turn-based. Adding a tick system changes the entire feel. Ship the smallest possible version first, playtest, then expand.

### 6a — Tick system + one enemy type
- Tick system: enemies move after each player command
- One enemy only: 🕷️ `crawler` — chases player using pathfinding
- `ps` command lists enemies with PIDs and positions
- Death on contact → restart level
- Chained commands (`&&`) and scripts: each sub-command is one tick
- Handcrafted level introducing the crawler

### 6b — More enemy types
- 🐛 `bug` — moves randomly
- 🪱 `worm` — follows fixed patrol path (cron job)
- 💀 `zombie` — dead process blocking a tile, needs `kill -9` to clear
- `kill <pid>` command with weapon items (sword, firewall)
- Handcrafted levels introducing each enemy

### 6c — Advanced enemies
- 🎁 `trojan` — disguised as pickup until adjacent, then reveals and chases
- 👻 `rootkit` — invisible until `ps` or `grep` reveals it, then chases
- 🔀 `fork_bomb` — splits into two when you get close, keeps splitting
- 😈 `daemon` — stationary, creates zone where commands fail:
  - `mv` blocked ("permission denied")
  - `ls` returns nothing in daemon radius
  - `pwd` lies (returns wrong coordinates)
  - `kill` fails without `sudo`

### 6d — sudo as game mechanic
- `sudo` is a rare consumable pickup item
- Lets you run one command that would otherwise fail
- Use cases: kill a daemon, bypass a door without a key, override a wall
- Strategic resource — player must decide when to spend it
- `sudo` count shown in `whoami` output

## Phase 7 — Interpreter Rewrite

Why now: everything after this needs a real language, not an if/else chain. Phases 8-9 require conditionals, variables, pipes, and event hooks. Better to rewrite once than bolt on repeatedly.

- Proper tokenizer/parser (not regex matching)
- Variables: `$x=5`, `echo $x`, use in commands
- Conditionals: `if [ condition ]; then cmd; fi`
- Comparison operators for game state: `$chips -ge 3`, `$pos_x -eq 5`
- Pipes: `ls | grep key` (filter command output)
- Environment variables: `$PWD`, `$CHIPS`, `$LEVEL`, `$HP`
- Exit status: `$?` holds last exit code
- Functions: `fn name() { commands; }`
- All existing tests must still pass (backward compatible)
- New test suite for language features
- Benchmark: interpreter should handle 1000 commands/second for script execution

## Phase 8 — Advanced Scripting & Debug Levels

Why now: with a real interpreter and enemies, we can build the signature mechanic — debugging under pressure.

### 8a — Script-required levels
- `bash script.sh` executes all commands in one tick (dodge enemies by scripting)
- Levels impossible without scripting (timing puzzles, simultaneous actions)
- Scripts can query game state: `$ADJ_NORTH` (tile type), `$ENEMY_DIST` (nearest enemy distance)
- `cron` command: schedule a script to run every N ticks (`cron 3 patrol.sh`)

### 8b — Debug-under-pressure levels
- Pre-placed broken scripts on the ground
- Player must `nano` the script and fix bugs while enemies approach
- Editor stays open with grid visible — enemies move per keystroke in real time
- Script output updates live as you edit
- Levels with increasing debug difficulty:
  - Fix a syntax error (missing semicolon)
  - Fix a logic error (wrong direction)
  - Fix a runtime error (script references item player doesn't have)
  - Optimize a working-but-slow script before enemies arrive

### 8c — Permissions as mechanics
- File permissions on tiles: `chmod` to change access
- Some tiles are read-only (can see but not enter without `chmod`)
- `su` to temporarily become a different "user" who can access different areas
- `/etc/passwd` file in-level determines which user can access what

## Phase 9 — Building & Programmable Entities

Why now: the interpreter can handle it, enemies exist to defend against, and the player has learned scripting through 8 phases of practice.

- `touch <name>.sh` — create a buildable entity on current tile
- `nano <name>.sh` — write its behavior script
- Buildable types:
  - Doors: open/close based on triggers
  - Turrets: fire at enemies on interval
  - Traps: activate when enemy steps on tile
  - Bridges: span water/lava
  - Walls: block enemy pathfinding
- Script behavior language:
  - `on_adjacent <type>`, `on_step`, `on_tick` — event triggers
  - `sleep N` — wait N turns
  - `ps --nearest --type <type>` — query entities
  - `kill`, `open`, `close`, `toggle` — actions
  - Full conditional/variable support from Phase 7
- Resource constraints:
  - Limited `touch` uses per level (build budget, shown by `df`)
  - Max script line count per entity (CPU quota)
  - Some levels provide pre-built entities to modify, not build from scratch
- Pipe data between entities: `turret1.sh | door1.sh` (turret output triggers door)

## Future Ideas (Unsequenced)

These are mechanics that map to real Linux concepts but aren't yet placed in the roadmap. Each could become its own phase or be folded into an existing one.

- **Redirects**: `>` and `>>` to write command output to in-game files
- **stdin/stdout between entities**: pipe chains across the grid
- **Package manager**: `apt install <tool>` to unlock new commands mid-level
- **SSH**: `ssh <portal_id>` for teleporters between map regions
- **Networking levels**: multiple grids connected by `ssh`, solve puzzles across "machines"
- **Multiplayer**: two players on same grid, pipe data between them
- **Level editor**: `vim level.map` to create and share custom levels
- **Achievements as man pages**: `man achievements` shows what you've unlocked
- **Replay system**: record all commands, share as a script others can `bash`
- **Speedrun mode**: timer, move counter, par scores per level

## Design Principles

- **The game teaches Linux.** Every mechanic maps to a real command or concept.
- **Scripting is the core mechanic**, not an afterthought. Introduced in Phase 2, required by Phase 8, mastered by Phase 9.
- **Iterate fast.** Quick reset, persistent scripts, visible execution with line highlighting.
- **Progressive complexity.** Early: move and collect. Mid: chain and script. Late: build and debug under pressure.
- **Not a terminal.** The visual design is warm and themeable, not dark-mode-by-default.
- **Derisk the hard things early.** The tick system ships with one enemy type. The interpreter gets rewritten before advanced features need it. Debug levels are the validation target — every phase asks "does this get us closer?"
- **Sound is not polish.** Audio feedback makes every system feel alive. It ships before enemies so the tick system feels right from day one.
- **Validate before expanding.** Each sub-phase (6a, 6b, 6c, 6d) is playable and testable independently. Don't build 8 enemy types before proving 1 is fun.
