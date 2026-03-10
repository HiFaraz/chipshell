import { T } from './levels.js';

/**
 * Generate a procedural level
 * @param {number} difficulty - 1 to 10, scales grid size and complexity
 * @returns {object} level object with grid, start, chips, w, h, tut
 */
export function generateLevel(difficulty) {
  // Clamp difficulty to 1-10
  const d = Math.max(1, Math.min(10, difficulty));

  // Grid size scales with difficulty: 9x9 at d=1, 21x21 at d=10
  // Formula: 9 + (d-1) * (12/9) rounded to nearest even, to keep odd sizes
  const baseSize = 9 + Math.round((d - 1) * 12 / 9);
  const size = baseSize % 2 === 0 ? baseSize + 1 : baseSize; // Ensure odd for maze
  const w = size;
  const h = size;

  // Initialize grid with walls
  const grid = [];
  for (let y = 0; y < h; y++) {
    grid.push(new Array(w).fill(T.W));
  }

  // Carve maze using randomized DFS
  carveMaze(grid, w, h);

  // Find all floor tiles for placement
  const floors = [];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      if (grid[y][x] === T.F) {
        floors.push([x, y]);
      }
    }
  }

  shuffle(floors);

  // Place start position (first floor tile)
  const start = floors.shift();

  // Calculate number of items based on difficulty
  const chipCount = 2 + d; // 3 to 12 chips
  const keyDoorPairs = Math.min(Math.floor(d / 3) + 1, 4); // 1 to 4 key/door pairs
  const hazardCount = Math.floor(d / 2); // 0 to 5 hazards

  // Track placed items and their positions for validation
  const placed = {
    chips: [],
    keys: [],
    doors: [],
    boots: [],
    hazards: [],
    exit: null,
  };

  // Place chips
  for (let i = 0; i < chipCount && floors.length > 0; i++) {
    const pos = floors.shift();
    grid[pos[1]][pos[0]] = T.C;
    placed.chips.push(pos);
  }

  // Place key/door pairs
  const keyTypes = [
    { key: T.KR, door: T.DR },
    { key: T.KB, door: T.DB },
    { key: T.KG, door: T.DG },
    { key: T.KY, door: T.DY },
  ];

  for (let i = 0; i < keyDoorPairs && floors.length >= 2; i++) {
    const keyType = keyTypes[i % keyTypes.length];

    // Place key first (must be reachable before door)
    const keyPos = floors.shift();
    grid[keyPos[1]][keyPos[0]] = keyType.key;
    placed.keys.push(keyPos);

    // Find a position for door that creates a chokepoint
    // Door should be placed such that key is reachable from start before door
    const doorPos = findDoorPosition(grid, w, h, start, keyPos, floors);
    if (doorPos) {
      grid[doorPos[1]][doorPos[0]] = keyType.door;
      placed.doors.push(doorPos);
      // Remove door position from floors
      const idx = floors.findIndex(p => p[0] === doorPos[0] && p[1] === doorPos[1]);
      if (idx >= 0) floors.splice(idx, 1);
    }
  }

  // Place hazards and boots
  const hazardTypes = [
    { hazard: T.FIRE, boot: T.BOOTS_FIRE },
    { hazard: T.WATER, boot: T.BOOTS_WATER },
  ];

  for (let i = 0; i < hazardCount && floors.length >= 2; i++) {
    const hazardType = hazardTypes[i % hazardTypes.length];

    // Place boot first (must be reachable before hazard blocks path)
    const bootPos = floors.shift();
    grid[bootPos[1]][bootPos[0]] = hazardType.boot;
    placed.boots.push(bootPos);

    // Place hazard
    const hazardPos = floors.shift();
    grid[hazardPos[1]][hazardPos[0]] = hazardType.hazard;
    placed.hazards.push(hazardPos);
  }

  // Place ice (passable, no boot needed but adds boot for future)
  if (d >= 5 && floors.length >= 2) {
    const icePos = floors.shift();
    grid[icePos[1]][icePos[0]] = T.ICE;

    const iceBootPos = floors.shift();
    grid[iceBootPos[1]][iceBootPos[0]] = T.BOOTS_ICE;
    placed.boots.push(iceBootPos);
  }

  // Place exit
  if (floors.length > 0) {
    const exitPos = floors.shift();
    grid[exitPos[1]][exitPos[0]] = T.E;
    placed.exit = exitPos;
  }

  // Validate level - ensure all required items are reachable
  if (!validateLevel(grid, w, h, start, placed)) {
    // If validation fails, try again (recursive with same difficulty)
    return generateLevel(difficulty);
  }

  return {
    w,
    h,
    chips: chipCount,
    grid,
    start,
    tut: ["Generated level (difficulty " + d + ")"],
  };
}

/**
 * Carve a maze using randomized DFS
 */
function carveMaze(grid, w, h) {
  // Start from position (1, 1)
  const stack = [[1, 1]];
  grid[1][1] = T.F;

  const dirs = [[0, -2], [0, 2], [-2, 0], [2, 0]];

  while (stack.length > 0) {
    const [cx, cy] = stack[stack.length - 1];

    // Find unvisited neighbors
    const neighbors = [];
    for (const [dx, dy] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx > 0 && nx < w - 1 && ny > 0 && ny < h - 1 && grid[ny][nx] === T.W) {
        neighbors.push([nx, ny, dx / 2, dy / 2]);
      }
    }

    if (neighbors.length === 0) {
      stack.pop();
      continue;
    }

    // Pick random neighbor
    const [nx, ny, hx, hy] = neighbors[Math.floor(Math.random() * neighbors.length)];

    // Carve path to neighbor
    grid[cy + hy][cx + hx] = T.F; // Wall between
    grid[ny][nx] = T.F; // Neighbor cell

    stack.push([nx, ny]);
  }

  // Add some extra passages for more open layout
  const extraPassages = Math.floor((w * h) / 50);
  for (let i = 0; i < extraPassages; i++) {
    const x = 1 + Math.floor(Math.random() * (w - 2));
    const y = 1 + Math.floor(Math.random() * (h - 2));
    if (grid[y][x] === T.W) {
      // Check if this would connect two floor tiles
      let floorNeighbors = 0;
      if (y > 0 && grid[y - 1][x] === T.F) floorNeighbors++;
      if (y < h - 1 && grid[y + 1][x] === T.F) floorNeighbors++;
      if (x > 0 && grid[y][x - 1] === T.F) floorNeighbors++;
      if (x < w - 1 && grid[y][x + 1] === T.F) floorNeighbors++;
      if (floorNeighbors >= 2) {
        grid[y][x] = T.F;
      }
    }
  }
}

/**
 * Find a good position for a door
 */
function findDoorPosition(grid, w, h, start, keyPos, floors) {
  // Find positions reachable from start without going through key position
  const reachableFromStart = bfs(grid, w, h, start, null);

  // Door should be:
  // 1. Reachable from start (before placing door)
  // 2. On a path to remaining floor tiles
  // 3. Key must be reachable from start before door

  // Check if key is reachable from start
  if (!reachableFromStart.has(keyPos[0] + "," + keyPos[1])) {
    return null; // Key not reachable, skip door placement
  }

  // Find a floor position that's reachable and would make a good chokepoint
  for (const pos of floors) {
    // Count floor neighbors - good chokepoints have 2 floor neighbors
    let floorNeighbors = 0;
    const neighbors = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    for (const [dx, dy] of neighbors) {
      const nx = pos[0] + dx;
      const ny = pos[1] + dy;
      if (nx >= 0 && nx < w && ny >= 0 && ny < h && grid[ny][nx] === T.F) {
        floorNeighbors++;
      }
    }

    if (floorNeighbors === 2 && reachableFromStart.has(pos[0] + "," + pos[1])) {
      return pos;
    }
  }

  // Fallback: just pick any reachable floor
  for (const pos of floors) {
    if (reachableFromStart.has(pos[0] + "," + pos[1])) {
      return pos;
    }
  }

  return null;
}

/**
 * BFS to find reachable positions
 * @param {Array} grid - the level grid
 * @param {number} w - width
 * @param {number} h - height
 * @param {Array} start - starting position [x, y]
 * @param {Set|null} blockers - set of "x,y" strings to treat as walls
 * @returns {Set} set of reachable "x,y" strings
 */
function bfs(grid, w, h, start, blockers) {
  const visited = new Set();
  const queue = [start];
  visited.add(start[0] + "," + start[1]);

  while (queue.length > 0) {
    const [cx, cy] = queue.shift();

    const neighbors = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    for (const [dx, dy] of neighbors) {
      const nx = cx + dx;
      const ny = cy + dy;
      const key = nx + "," + ny;

      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
      if (visited.has(key)) continue;
      if (blockers && blockers.has(key)) continue;

      const tile = grid[ny][nx];
      // Can pass through most tiles for reachability check
      // Walls are impassable
      if (tile === T.W) continue;

      visited.add(key);
      queue.push([nx, ny]);
    }
  }

  return visited;
}

/**
 * Validate that the level is solvable
 */
function validateLevel(grid, w, h, start, placed) {
  // Check basic requirements
  if (!placed.exit) return false;
  if (placed.chips.length === 0) return false;

  // Check all chips are reachable from start
  const reachable = bfsWithItems(grid, w, h, start, placed);

  for (const chipPos of placed.chips) {
    if (!reachable.has(chipPos[0] + "," + chipPos[1])) {
      return false;
    }
  }

  // Check exit is reachable
  if (!reachable.has(placed.exit[0] + "," + placed.exit[1])) {
    return false;
  }

  return true;
}

/**
 * BFS that simulates item collection
 * Simplified: assumes keys/boots are collectible and doors/hazards are passable with items
 */
function bfsWithItems(grid, w, h, start, placed) {
  const visited = new Set();
  const queue = [start];
  visited.add(start[0] + "," + start[1]);

  while (queue.length > 0) {
    const [cx, cy] = queue.shift();

    const neighbors = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    for (const [dx, dy] of neighbors) {
      const nx = cx + dx;
      const ny = cy + dy;
      const key = nx + "," + ny;

      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
      if (visited.has(key)) continue;

      const tile = grid[ny][nx];
      if (tile === T.W) continue;

      // For simplified validation, we allow passing through all non-wall tiles
      // A proper validator would track inventory state
      visited.add(key);
      queue.push([nx, ny]);
    }
  }

  return visited;
}

/**
 * Shuffle array in place (Fisher-Yates)
 */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
