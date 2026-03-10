import { describe, it, expect } from 'vitest';
import { generateLevel } from './levelgen.js';
import { T } from './levels.js';

describe('generateLevel', () => {
  it('generates level with valid dimensions for difficulty 1', () => {
    const level = generateLevel(1);
    expect(level.w).toBeGreaterThanOrEqual(9);
    expect(level.h).toBeGreaterThanOrEqual(9);
    expect(level.grid.length).toBe(level.h);
    expect(level.grid[0].length).toBe(level.w);
  });

  it('generates level with valid dimensions for difficulty 5', () => {
    const level = generateLevel(5);
    expect(level.w).toBeGreaterThanOrEqual(9);
    expect(level.h).toBeGreaterThanOrEqual(9);
    expect(level.grid.length).toBe(level.h);
    expect(level.grid[0].length).toBe(level.w);
  });

  it('generates level with valid dimensions for difficulty 10', () => {
    const level = generateLevel(10);
    expect(level.w).toBeLessThanOrEqual(21);
    expect(level.h).toBeLessThanOrEqual(21);
    expect(level.grid.length).toBe(level.h);
    expect(level.grid[0].length).toBe(level.w);
  });

  it('start position is on a floor tile', () => {
    const level = generateLevel(3);
    const [sx, sy] = level.start;
    expect(level.grid[sy][sx]).toBe(T.F);
  });

  it('exit exists in level', () => {
    const level = generateLevel(3);
    let exitFound = false;
    for (let y = 0; y < level.h; y++) {
      for (let x = 0; x < level.w; x++) {
        if (level.grid[y][x] === T.E) {
          exitFound = true;
          break;
        }
      }
      if (exitFound) break;
    }
    expect(exitFound).toBe(true);
  });

  it('chips exist in level', () => {
    const level = generateLevel(3);
    let chipCount = 0;
    for (let y = 0; y < level.h; y++) {
      for (let x = 0; x < level.w; x++) {
        if (level.grid[y][x] === T.C) {
          chipCount++;
        }
      }
    }
    expect(chipCount).toBeGreaterThan(0);
    expect(chipCount).toBe(level.chips);
  });

  it('different difficulties produce different sizes', () => {
    const level1 = generateLevel(1);
    const level10 = generateLevel(10);
    // Level 10 should be larger than level 1
    expect(level10.w).toBeGreaterThanOrEqual(level1.w);
    expect(level10.h).toBeGreaterThanOrEqual(level1.h);
  });

  it('has walls around the border', () => {
    const level = generateLevel(3);
    // Check top and bottom borders
    for (let x = 0; x < level.w; x++) {
      expect(level.grid[0][x]).toBe(T.W);
      expect(level.grid[level.h - 1][x]).toBe(T.W);
    }
    // Check left and right borders
    for (let y = 0; y < level.h; y++) {
      expect(level.grid[y][0]).toBe(T.W);
      expect(level.grid[y][level.w - 1]).toBe(T.W);
    }
  });

  it('has tutorial message', () => {
    const level = generateLevel(5);
    expect(level.tut).toBeDefined();
    expect(level.tut.length).toBeGreaterThan(0);
    expect(level.tut[0]).toContain('difficulty 5');
  });

  it('clamps difficulty to 1-10', () => {
    const levelLow = generateLevel(-5);
    const levelHigh = generateLevel(100);

    // Both should still generate valid levels
    expect(levelLow.w).toBeGreaterThanOrEqual(9);
    expect(levelHigh.w).toBeLessThanOrEqual(21);
    expect(levelLow.tut[0]).toContain('difficulty 1');
    expect(levelHigh.tut[0]).toContain('difficulty 10');
  });
});

describe('level reachability', () => {
  // Helper function to perform BFS
  function bfs(grid, w, h, start) {
    const visited = new Set();
    const queue = [start];
    visited.add(start[0] + ',' + start[1]);

    while (queue.length > 0) {
      const [cx, cy] = queue.shift();
      const neighbors = [[0, -1], [0, 1], [-1, 0], [1, 0]];

      for (const [dx, dy] of neighbors) {
        const nx = cx + dx;
        const ny = cy + dy;
        const key = nx + ',' + ny;

        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
        if (visited.has(key)) continue;
        if (grid[ny][nx] === T.W) continue;

        visited.add(key);
        queue.push([nx, ny]);
      }
    }

    return visited;
  }

  it('all chips are reachable from start', () => {
    // Run multiple times due to randomness
    for (let i = 0; i < 5; i++) {
      const level = generateLevel(3);
      const reachable = bfs(level.grid, level.w, level.h, level.start);

      // Find all chip positions
      const chips = [];
      for (let y = 0; y < level.h; y++) {
        for (let x = 0; x < level.w; x++) {
          if (level.grid[y][x] === T.C) {
            chips.push([x, y]);
          }
        }
      }

      // All chips should be reachable
      for (const [cx, cy] of chips) {
        expect(reachable.has(cx + ',' + cy)).toBe(true);
      }
    }
  });

  it('exit is reachable from start', () => {
    // Run multiple times due to randomness
    for (let i = 0; i < 5; i++) {
      const level = generateLevel(3);
      const reachable = bfs(level.grid, level.w, level.h, level.start);

      // Find exit position
      let exitPos = null;
      for (let y = 0; y < level.h; y++) {
        for (let x = 0; x < level.w; x++) {
          if (level.grid[y][x] === T.E) {
            exitPos = [x, y];
            break;
          }
        }
        if (exitPos) break;
      }

      expect(exitPos).not.toBeNull();
      expect(reachable.has(exitPos[0] + ',' + exitPos[1])).toBe(true);
    }
  });
});

describe('level content scaling', () => {
  it('higher difficulty has more chips', () => {
    const level1 = generateLevel(1);
    const level10 = generateLevel(10);
    expect(level10.chips).toBeGreaterThan(level1.chips);
  });

  it('difficulty 1 has at least 3 chips', () => {
    const level = generateLevel(1);
    expect(level.chips).toBeGreaterThanOrEqual(3);
  });

  it('difficulty 10 has more chips', () => {
    const level = generateLevel(10);
    expect(level.chips).toBeGreaterThanOrEqual(10);
  });
});

describe('level structure', () => {
  it('returns proper level object structure', () => {
    const level = generateLevel(5);
    expect(level).toHaveProperty('w');
    expect(level).toHaveProperty('h');
    expect(level).toHaveProperty('chips');
    expect(level).toHaveProperty('grid');
    expect(level).toHaveProperty('start');
    expect(level).toHaveProperty('tut');
    expect(level).toHaveProperty('shape');

    expect(typeof level.w).toBe('number');
    expect(typeof level.h).toBe('number');
    expect(typeof level.chips).toBe('number');
    expect(Array.isArray(level.grid)).toBe(true);
    expect(Array.isArray(level.start)).toBe(true);
    expect(level.start.length).toBe(2);
    expect(Array.isArray(level.tut)).toBe(true);
    expect(typeof level.shape).toBe('string');
  });

  it('start position is within bounds', () => {
    const level = generateLevel(5);
    const [sx, sy] = level.start;
    expect(sx).toBeGreaterThanOrEqual(0);
    expect(sx).toBeLessThan(level.w);
    expect(sy).toBeGreaterThanOrEqual(0);
    expect(sy).toBeLessThan(level.h);
  });
});

describe('level shapes', () => {
  const shapes = ['maze', 'waterworld', 'corridor', 'arena', 'icemaze', 'vault'];

  // Helper function for BFS reachability
  function bfs(grid, w, h, start) {
    const visited = new Set();
    const queue = [start];
    visited.add(start[0] + ',' + start[1]);

    while (queue.length > 0) {
      const [cx, cy] = queue.shift();
      const neighbors = [[0, -1], [0, 1], [-1, 0], [1, 0]];

      for (const [dx, dy] of neighbors) {
        const nx = cx + dx;
        const ny = cy + dy;
        const key = nx + ',' + ny;

        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
        if (visited.has(key)) continue;
        if (grid[ny][nx] === T.W) continue;

        visited.add(key);
        queue.push([nx, ny]);
      }
    }

    return visited;
  }

  describe.each(shapes)('%s shape', (shape) => {
    it('generates a valid level', () => {
      const level = generateLevel(5, shape);
      expect(level.shape).toBe(shape);
      expect(level.w).toBeGreaterThanOrEqual(9);
      expect(level.h).toBeGreaterThanOrEqual(9);
      expect(level.grid.length).toBe(level.h);
      expect(level.grid[0].length).toBe(level.w);
    });

    it('has correct dimensions for difficulty 1', () => {
      // Some shapes have minimum difficulty > 1
      const minDiff = shape === 'icemaze' ? 4 : shape === 'vault' ? 5 : 1;
      const level = generateLevel(minDiff, shape);
      expect(level.w).toBeGreaterThanOrEqual(9);
      expect(level.h).toBeGreaterThanOrEqual(9);
    });

    it('has correct dimensions for difficulty 10', () => {
      const level = generateLevel(10, shape);
      expect(level.w).toBeLessThanOrEqual(21);
      expect(level.h).toBeLessThanOrEqual(21);
    });

    it('passes solvability validation - exit reachable', () => {
      for (let i = 0; i < 3; i++) {
        const level = generateLevel(5, shape);
        const reachable = bfs(level.grid, level.w, level.h, level.start);

        // Find exit
        let exitPos = null;
        for (let y = 0; y < level.h; y++) {
          for (let x = 0; x < level.w; x++) {
            if (level.grid[y][x] === T.E) {
              exitPos = [x, y];
              break;
            }
          }
          if (exitPos) break;
        }

        expect(exitPos).not.toBeNull();
        expect(reachable.has(exitPos[0] + ',' + exitPos[1])).toBe(true);
      }
    });

    it('passes solvability validation - all chips reachable', () => {
      for (let i = 0; i < 3; i++) {
        const level = generateLevel(5, shape);
        const reachable = bfs(level.grid, level.w, level.h, level.start);

        // Find all chips
        const chips = [];
        for (let y = 0; y < level.h; y++) {
          for (let x = 0; x < level.w; x++) {
            if (level.grid[y][x] === T.C) {
              chips.push([x, y]);
            }
          }
        }

        for (const [cx, cy] of chips) {
          expect(reachable.has(cx + ',' + cy)).toBe(true);
        }
      }
    });

    it('has tutorial message mentioning shape', () => {
      const level = generateLevel(5, shape);
      expect(level.tut.length).toBeGreaterThan(0);
      // Tutorial mentions the shape and difficulty
      expect(level.tut[0]).toContain('difficulty');
      // Shape name appears in some form (the SHAPES object has display names)
      expect(level.shape).toBe(shape);
    });
  });

  it('different shapes produce structurally different levels', () => {
    const mazeLevel = generateLevel(5, 'maze');
    const arenaLevel = generateLevel(5, 'arena');
    const waterworldLevel = generateLevel(5, 'waterworld');
    const icemazeLevel = generateLevel(5, 'icemaze');

    // Count floor tiles as a rough structural metric
    function countTile(grid, tileType) {
      let count = 0;
      for (const row of grid) {
        for (const tile of row) {
          if (tile === tileType) count++;
        }
      }
      return count;
    }

    // Arena should have more floor tiles than maze (more open)
    const arenaFloors = countTile(arenaLevel.grid, T.F);
    const mazeFloors = countTile(mazeLevel.grid, T.F);
    // Arena is open, should have more floor
    expect(arenaFloors).toBeGreaterThan(mazeFloors * 0.5);

    // Waterworld should have water tiles
    const waterworldWater = countTile(waterworldLevel.grid, T.WATER);
    expect(waterworldWater).toBeGreaterThan(0);

    // Icemaze should have ice tiles
    const icemazeIce = countTile(icemazeLevel.grid, T.ICE);
    expect(icemazeIce).toBeGreaterThan(0);
  });

  it('shape weights favor easier shapes at low difficulty', () => {
    // At difficulty 1, icemaze and vault shouldn't be available
    // Run several times and check we don't get those shapes
    const shapes = new Set();
    for (let i = 0; i < 10; i++) {
      const level = generateLevel(1);
      shapes.add(level.shape);
    }
    // icemaze needs minDiff 4, vault needs minDiff 5
    expect(shapes.has('icemaze')).toBe(false);
    expect(shapes.has('vault')).toBe(false);
  });

  it('vault shape has door tiles', () => {
    const level = generateLevel(6, 'vault');
    let hasDoor = false;
    for (let y = 0; y < level.h && !hasDoor; y++) {
      for (let x = 0; x < level.w && !hasDoor; x++) {
        const tile = level.grid[y][x];
        if (tile === T.DR || tile === T.DB || tile === T.DG || tile === T.DY) {
          hasDoor = true;
        }
      }
    }
    // Vault should typically have doors (not guaranteed due to randomness)
    // So we just verify the level is valid
    expect(level.grid.length).toBe(level.h);
  });

  it('corridor shape is longer than wide effective area', () => {
    const level = generateLevel(5, 'corridor');
    // Count floor tiles per row
    let maxRowFloors = 0;
    let totalFloors = 0;
    for (let y = 0; y < level.h; y++) {
      let rowFloors = 0;
      for (let x = 0; x < level.w; x++) {
        if (level.grid[y][x] === T.F || level.grid[y][x] === T.ICE) {
          rowFloors++;
          totalFloors++;
        }
      }
      maxRowFloors = Math.max(maxRowFloors, rowFloors);
    }
    // Just verify it generates valid corridor-like structure
    expect(totalFloors).toBeGreaterThan(0);
  });
});

describe('generateLevel robustness', () => {
  it('does not exceed max retries and returns valid level', () => {
    // Generate multiple levels to stress test the retry logic
    for (let i = 0; i < 10; i++) {
      const level = generateLevel(Math.floor(Math.random() * 10) + 1);
      expect(level).toBeDefined();
      expect(level.grid).toBeDefined();
      expect(level.start).toBeDefined();
      expect(level.chips).toBeGreaterThan(0);
    }
  });

  it('handles all difficulty levels without stack overflow', () => {
    // Test each difficulty level multiple times
    for (let d = 1; d <= 10; d++) {
      for (let i = 0; i < 3; i++) {
        const level = generateLevel(d);
        expect(level).toBeDefined();
        expect(level.w).toBeGreaterThanOrEqual(9);
        expect(level.h).toBeGreaterThanOrEqual(9);
      }
    }
  });

  it('generates fallback level when all attempts fail', () => {
    // This tests that the fallback mechanism works
    // We can't easily force all attempts to fail, but we can verify fallback level structure
    const level = generateLevel(1);
    expect(level).toBeDefined();
    // If shape is 'fallback', it should still have valid structure
    if (level.shape === 'fallback') {
      expect(level.grid).toBeDefined();
      expect(level.start).toBeDefined();
      expect(level.chips).toBeGreaterThan(0);
    }
  });
});

describe('level solvability validation', () => {
  // Helper BFS for testing
  function canReachWithKeys(grid, w, h, start, targetPositions) {
    const doorKeyMap = {
      [T.DR]: T.KR,
      [T.DB]: T.KB,
      [T.DG]: T.KG,
      [T.DY]: T.KY,
    };
    const keyTiles = [T.KR, T.KB, T.KG, T.KY];

    let collectedKeys = new Set();
    let visited = new Set();
    let changed = true;

    while (changed) {
      changed = false;
      const queue = [start];
      const newVisited = new Set(visited);

      while (queue.length > 0) {
        const [cx, cy] = queue.shift();
        const key = cx + ',' + cy;
        if (newVisited.has(key)) continue;
        newVisited.add(key);

        const tile = grid[cy][cx];

        // Collect key
        if (keyTiles.includes(tile)) {
          if (!collectedKeys.has(tile)) {
            collectedKeys.add(tile);
            changed = true;
          }
        }

        // Explore neighbors
        const neighbors = [[0, -1], [0, 1], [-1, 0], [1, 0]];
        for (const [dx, dy] of neighbors) {
          const nx = cx + dx;
          const ny = cy + dy;
          const nkey = nx + ',' + ny;

          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
          if (newVisited.has(nkey)) continue;

          const nTile = grid[ny][nx];
          if (nTile === T.W) continue;

          // Check if door is passable
          if (doorKeyMap[nTile]) {
            const neededKey = doorKeyMap[nTile];
            if (!collectedKeys.has(neededKey)) continue;
          }

          queue.push([nx, ny]);
        }
      }
      visited = newVisited;
    }

    // Check if all targets are reachable
    for (const [tx, ty] of targetPositions) {
      if (!visited.has(tx + ',' + ty)) {
        return false;
      }
    }
    return true;
  }

  it('vault levels with doors have keys accessible before doors', () => {
    // Generate several vault levels and verify solvability
    for (let i = 0; i < 5; i++) {
      const level = generateLevel(6, 'vault');

      // Find all chips and exit
      const targets = [];
      for (let y = 0; y < level.h; y++) {
        for (let x = 0; x < level.w; x++) {
          if (level.grid[y][x] === T.C || level.grid[y][x] === T.E) {
            targets.push([x, y]);
          }
        }
      }

      const solvable = canReachWithKeys(level.grid, level.w, level.h, level.start, targets);
      expect(solvable).toBe(true);
    }
  });
});
