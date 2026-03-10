import { T } from './levels.js';

/**
 * Level shape types with their weights at different difficulty ranges
 * Easy (1-3): more maze/arena
 * Medium (4-6): balanced
 * Hard (7-10): more vault/icemaze
 */
const SHAPES = {
  maze: { name: 'Maze', minDiff: 1, maxDiff: 10, weight: (d) => d <= 3 ? 3 : 1 },
  waterworld: { name: 'Waterworld', minDiff: 2, maxDiff: 10, weight: (d) => 1 },
  corridor: { name: 'Corridor', minDiff: 2, maxDiff: 10, weight: (d) => 1 },
  arena: { name: 'Arena', minDiff: 1, maxDiff: 10, weight: (d) => d <= 3 ? 2 : 1 },
  icemaze: { name: 'Ice Maze', minDiff: 4, maxDiff: 10, weight: (d) => d >= 7 ? 3 : 1 },
  vault: { name: 'Vault', minDiff: 5, maxDiff: 10, weight: (d) => d >= 7 ? 3 : 1 },
};

/**
 * Generate a procedural level
 * @param {number} difficulty - 1 to 10, scales grid size and complexity
 * @param {string} [forceShape] - optional shape to force (for testing)
 * @returns {object} level object with grid, start, chips, w, h, tut, shape
 */
export function generateLevel(difficulty, forceShape = null) {
  // Clamp difficulty to 1-10
  const d = Math.max(1, Math.min(10, difficulty));

  // Grid size scales with difficulty: 9x9 at d=1, 21x21 at d=10
  const baseSize = 9 + Math.round((d - 1) * 12 / 9);
  const size = baseSize % 2 === 0 ? baseSize + 1 : baseSize; // Ensure odd for maze
  const w = size;
  const h = size;

  // Pick shape based on difficulty weights
  const shape = forceShape || pickShape(d);

  // Initialize grid with walls
  const grid = [];
  for (let y = 0; y < h; y++) {
    grid.push(new Array(w).fill(T.W));
  }

  // Generate shape-specific layout
  let shapeResult;
  switch (shape) {
    case 'waterworld':
      shapeResult = generateWaterworld(grid, w, h, d);
      break;
    case 'corridor':
      shapeResult = generateCorridor(grid, w, h, d);
      break;
    case 'arena':
      shapeResult = generateArena(grid, w, h, d);
      break;
    case 'icemaze':
      shapeResult = generateIcemaze(grid, w, h, d);
      break;
    case 'vault':
      shapeResult = generateVault(grid, w, h, d);
      break;
    case 'maze':
    default:
      shapeResult = generateMaze(grid, w, h, d);
      break;
  }

  // Validate level - ensure all required items are reachable
  if (!validateLevel(grid, w, h, shapeResult.start, shapeResult.placed)) {
    // If validation fails, try again (recursive with same difficulty)
    return generateLevel(difficulty, forceShape);
  }

  return {
    w,
    h,
    chips: shapeResult.chipCount,
    grid,
    start: shapeResult.start,
    shape,
    tut: [SHAPES[shape].name + " (difficulty " + d + ")"],
  };
}

/**
 * Pick a shape based on difficulty-weighted probabilities
 */
function pickShape(d) {
  const eligible = Object.entries(SHAPES).filter(
    ([_, cfg]) => d >= cfg.minDiff && d <= cfg.maxDiff
  );

  const totalWeight = eligible.reduce((sum, [_, cfg]) => sum + cfg.weight(d), 0);
  let random = Math.random() * totalWeight;

  for (const [name, cfg] of eligible) {
    random -= cfg.weight(d);
    if (random <= 0) return name;
  }

  return 'maze'; // Fallback
}

/**
 * Generate standard maze layout (existing algorithm)
 */
function generateMaze(grid, w, h, d) {
  carveMaze(grid, w, h);
  return placeItems(grid, w, h, d);
}

/**
 * Generate waterworld - floor with water bodies and thin land bridges
 */
function generateWaterworld(grid, w, h, d) {
  // Start with all floor
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      grid[y][x] = T.F;
    }
  }

  // Add water bodies
  const waterBodies = 2 + Math.floor(d / 2);
  for (let i = 0; i < waterBodies; i++) {
    const cx = 2 + Math.floor(Math.random() * (w - 4));
    const cy = 2 + Math.floor(Math.random() * (h - 4));
    const radius = 1 + Math.floor(Math.random() * 2);

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx > 0 && nx < w - 1 && ny > 0 && ny < h - 1) {
          if (Math.abs(dx) + Math.abs(dy) <= radius + 1) {
            grid[ny][nx] = T.WATER;
          }
        }
      }
    }
  }

  // Create land bridges through water
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      if (grid[y][x] === T.WATER && Math.random() < 0.15) {
        grid[y][x] = T.F;
      }
    }
  }

  // Place water boots early
  const result = placeItems(grid, w, h, d, { forceBoots: [T.BOOTS_WATER] });
  return result;
}

/**
 * Generate corridor - long narrow paths with doors
 */
function generateCorridor(grid, w, h, d) {
  // Create main corridor
  const midY = Math.floor(h / 2);
  for (let x = 1; x < w - 1; x++) {
    grid[midY][x] = T.F;
    // Random branches
    if (Math.random() < 0.3) {
      const branchLen = 2 + Math.floor(Math.random() * 3);
      const dir = Math.random() < 0.5 ? -1 : 1;
      for (let i = 1; i <= branchLen; i++) {
        const ny = midY + i * dir;
        if (ny > 0 && ny < h - 1) {
          grid[ny][x] = T.F;
        }
      }
    }
  }

  // Add some cross corridors
  const crossCount = 2 + Math.floor(d / 3);
  for (let i = 0; i < crossCount; i++) {
    const x = 2 + Math.floor(Math.random() * (w - 4));
    for (let y = 1; y < h - 1; y++) {
      if (Math.random() < 0.7) {
        grid[y][x] = T.F;
      }
    }
  }

  return placeItems(grid, w, h, d);
}

/**
 * Generate arena - large open center with edge walls and pillars
 */
function generateArena(grid, w, h, d) {
  // Fill center with floor
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      grid[y][x] = T.F;
    }
  }

  // Add random pillars
  const pillarCount = 3 + Math.floor(d / 2);
  for (let i = 0; i < pillarCount; i++) {
    const px = 2 + Math.floor(Math.random() * (w - 4));
    const py = 2 + Math.floor(Math.random() * (h - 4));
    grid[py][px] = T.W;
    // Sometimes make 2x2 pillars
    if (Math.random() < 0.3) {
      if (px + 1 < w - 1) grid[py][px + 1] = T.W;
      if (py + 1 < h - 1) grid[py + 1][px] = T.W;
      if (px + 1 < w - 1 && py + 1 < h - 1) grid[py + 1][px + 1] = T.W;
    }
  }

  // Scatter some hazards in arena
  const hazardCount = Math.floor(d / 2);
  const floors = getFloors(grid, w, h);
  shuffle(floors);

  for (let i = 0; i < hazardCount && floors.length > 0; i++) {
    const pos = floors.pop();
    grid[pos[1]][pos[0]] = Math.random() < 0.5 ? T.FIRE : T.WATER;
  }

  return placeItems(grid, w, h, d, { extraHazards: false });
}

/**
 * Generate icemaze - heavy ice coverage with walls to stop slides
 */
function generateIcemaze(grid, w, h, d) {
  // Carve basic maze first
  carveMaze(grid, w, h);

  // Convert many floor tiles to ice
  const iceChance = 0.5 + (d - 4) * 0.05; // 50-80% ice based on difficulty
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      if (grid[y][x] === T.F && Math.random() < iceChance) {
        grid[y][x] = T.ICE;
      }
    }
  }

  // Ensure start position is floor (not ice) for easier beginning
  const floors = getFloors(grid, w, h);
  if (floors.length === 0) {
    // Convert some ice back to floor if no floor tiles
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        if (grid[y][x] === T.ICE) {
          grid[y][x] = T.F;
          floors.push([x, y]);
          if (floors.length >= 5) break;
        }
      }
      if (floors.length >= 5) break;
    }
  }

  return placeItems(grid, w, h, d, { skipIce: true });
}

/**
 * Generate vault - small rooms connected by doors
 */
function generateVault(grid, w, h, d) {
  // Create grid of rooms
  const roomSize = 3;
  const roomsX = Math.floor((w - 2) / (roomSize + 1));
  const roomsY = Math.floor((h - 2) / (roomSize + 1));

  const rooms = [];

  for (let ry = 0; ry < roomsY; ry++) {
    for (let rx = 0; rx < roomsX; rx++) {
      const baseX = 1 + rx * (roomSize + 1);
      const baseY = 1 + ry * (roomSize + 1);

      // Carve room
      for (let dy = 0; dy < roomSize; dy++) {
        for (let dx = 0; dx < roomSize; dx++) {
          const x = baseX + dx;
          const y = baseY + dy;
          if (x < w - 1 && y < h - 1) {
            grid[y][x] = T.F;
          }
        }
      }

      rooms.push({ x: baseX, y: baseY, rx, ry });
    }
  }

  // Connect adjacent rooms with doors
  const keyTypes = [T.KR, T.KB, T.KG, T.KY];
  const doorTypes = [T.DR, T.DB, T.DG, T.DY];
  let doorIndex = 0;

  for (const room of rooms) {
    // Connect to right neighbor
    if (room.rx < roomsX - 1) {
      const doorX = room.x + roomSize;
      const doorY = room.y + 1;
      if (doorX < w - 1 && doorY < h - 1) {
        if (Math.random() < 0.6) {
          grid[doorY][doorX] = doorTypes[doorIndex % 4];
          doorIndex++;
        } else {
          grid[doorY][doorX] = T.F;
        }
      }
    }

    // Connect to bottom neighbor
    if (room.ry < roomsY - 1) {
      const doorX = room.x + 1;
      const doorY = room.y + roomSize;
      if (doorX < w - 1 && doorY < h - 1) {
        if (Math.random() < 0.6) {
          grid[doorY][doorX] = doorTypes[doorIndex % 4];
          doorIndex++;
        } else {
          grid[doorY][doorX] = T.F;
        }
      }
    }
  }

  // Place keys to match doors
  const floors = getFloors(grid, w, h);
  shuffle(floors);

  // Count doors of each color and place matching keys
  const doorCounts = [0, 0, 0, 0];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = doorTypes.indexOf(grid[y][x]);
      if (idx >= 0) doorCounts[idx]++;
    }
  }

  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < doorCounts[i] && floors.length > 0; j++) {
      const pos = floors.shift();
      grid[pos[1]][pos[0]] = keyTypes[i];
    }
  }

  return placeItems(grid, w, h, d, { skipKeysDoors: true });
}

/**
 * Get all floor tiles from grid
 */
function getFloors(grid, w, h) {
  const floors = [];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      if (grid[y][x] === T.F) {
        floors.push([x, y]);
      }
    }
  }
  return floors;
}

/**
 * Get all passable tiles (floor, ice) from grid
 */
function getPassable(grid, w, h) {
  const tiles = [];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      if (grid[y][x] === T.F || grid[y][x] === T.ICE) {
        tiles.push([x, y]);
      }
    }
  }
  return tiles;
}

/**
 * Place items on the grid (chips, keys, doors, boots, hazards, exit)
 */
function placeItems(grid, w, h, d, options = {}) {
  const { forceBoots = [], skipKeysDoors = false, skipIce = false, extraHazards = true } = options;

  // Find all passable tiles for placement
  const passable = getPassable(grid, w, h);
  shuffle(passable);

  // Place start position (first passable tile that's floor, not ice)
  let start = null;
  for (let i = 0; i < passable.length; i++) {
    const [x, y] = passable[i];
    if (grid[y][x] === T.F) {
      start = passable.splice(i, 1)[0];
      break;
    }
  }
  if (!start && passable.length > 0) {
    start = passable.shift();
  }

  // Track placed items
  const placed = {
    chips: [],
    keys: [],
    doors: [],
    boots: [],
    hazards: [],
    exit: null,
  };

  // Calculate counts
  const chipCount = 2 + d;
  const keyDoorPairs = skipKeysDoors ? 0 : Math.min(Math.floor(d / 3) + 1, 4);
  const hazardCount = extraHazards ? Math.floor(d / 2) : 0;

  // Place chips
  for (let i = 0; i < chipCount && passable.length > 0; i++) {
    const pos = passable.shift();
    grid[pos[1]][pos[0]] = T.C;
    placed.chips.push(pos);
  }

  // Place key/door pairs
  if (!skipKeysDoors) {
    const keyTypes = [
      { key: T.KR, door: T.DR },
      { key: T.KB, door: T.DB },
      { key: T.KG, door: T.DG },
      { key: T.KY, door: T.DY },
    ];

    for (let i = 0; i < keyDoorPairs && passable.length >= 2; i++) {
      const keyType = keyTypes[i % keyTypes.length];
      const keyPos = passable.shift();
      grid[keyPos[1]][keyPos[0]] = keyType.key;
      placed.keys.push(keyPos);

      const doorPos = findDoorPosition(grid, w, h, start, keyPos, passable);
      if (doorPos) {
        grid[doorPos[1]][doorPos[0]] = keyType.door;
        placed.doors.push(doorPos);
        const idx = passable.findIndex(p => p[0] === doorPos[0] && p[1] === doorPos[1]);
        if (idx >= 0) passable.splice(idx, 1);
      }
    }
  }

  // Place forced boots
  for (const bootType of forceBoots) {
    if (passable.length > 0) {
      const pos = passable.shift();
      grid[pos[1]][pos[0]] = bootType;
      placed.boots.push(pos);
    }
  }

  // Place hazards and boots
  const hazardTypes = [
    { hazard: T.FIRE, boot: T.BOOTS_FIRE },
    { hazard: T.WATER, boot: T.BOOTS_WATER },
  ];

  for (let i = 0; i < hazardCount && passable.length >= 2; i++) {
    const hazardType = hazardTypes[i % hazardTypes.length];
    const bootPos = passable.shift();
    grid[bootPos[1]][bootPos[0]] = hazardType.boot;
    placed.boots.push(bootPos);

    const hazardPos = passable.shift();
    grid[hazardPos[1]][hazardPos[0]] = hazardType.hazard;
    placed.hazards.push(hazardPos);
  }

  // Place ice (passable, no boot needed)
  if (!skipIce && d >= 5 && passable.length >= 2) {
    const icePos = passable.shift();
    grid[icePos[1]][icePos[0]] = T.ICE;

    const iceBootPos = passable.shift();
    grid[iceBootPos[1]][iceBootPos[0]] = T.BOOTS_ICE;
    placed.boots.push(iceBootPos);
  }

  // Place exit
  if (passable.length > 0) {
    const exitPos = passable.shift();
    grid[exitPos[1]][exitPos[0]] = T.E;
    placed.exit = exitPos;
  }

  return { start, placed, chipCount };
}

/**
 * Carve a maze using randomized DFS
 */
function carveMaze(grid, w, h) {
  const stack = [[1, 1]];
  grid[1][1] = T.F;

  const dirs = [[0, -2], [0, 2], [-2, 0], [2, 0]];

  while (stack.length > 0) {
    const [cx, cy] = stack[stack.length - 1];

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

    const [nx, ny, hx, hy] = neighbors[Math.floor(Math.random() * neighbors.length)];
    grid[cy + hy][cx + hx] = T.F;
    grid[ny][nx] = T.F;
    stack.push([nx, ny]);
  }

  // Add extra passages
  const extraPassages = Math.floor((w * h) / 50);
  for (let i = 0; i < extraPassages; i++) {
    const x = 1 + Math.floor(Math.random() * (w - 2));
    const y = 1 + Math.floor(Math.random() * (h - 2));
    if (grid[y][x] === T.W) {
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
  const reachableFromStart = bfs(grid, w, h, start, null);

  if (!reachableFromStart.has(keyPos[0] + "," + keyPos[1])) {
    return null;
  }

  for (const pos of floors) {
    let floorNeighbors = 0;
    const neighbors = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    for (const [dx, dy] of neighbors) {
      const nx = pos[0] + dx;
      const ny = pos[1] + dy;
      if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
        const tile = grid[ny][nx];
        if (tile === T.F || tile === T.ICE) {
          floorNeighbors++;
        }
      }
    }

    if (floorNeighbors === 2 && reachableFromStart.has(pos[0] + "," + pos[1])) {
      return pos;
    }
  }

  for (const pos of floors) {
    if (reachableFromStart.has(pos[0] + "," + pos[1])) {
      return pos;
    }
  }

  return null;
}

/**
 * BFS to find reachable positions
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
  if (!start) return false;
  if (!placed.exit) return false;
  if (placed.chips.length === 0) return false;

  const reachable = bfsWithItems(grid, w, h, start, placed);

  for (const chipPos of placed.chips) {
    if (!reachable.has(chipPos[0] + "," + chipPos[1])) {
      return false;
    }
  }

  if (!reachable.has(placed.exit[0] + "," + placed.exit[1])) {
    return false;
  }

  return true;
}

/**
 * BFS that simulates item collection
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
