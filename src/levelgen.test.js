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

    expect(typeof level.w).toBe('number');
    expect(typeof level.h).toBe('number');
    expect(typeof level.chips).toBe('number');
    expect(Array.isArray(level.grid)).toBe(true);
    expect(Array.isArray(level.start)).toBe(true);
    expect(level.start.length).toBe(2);
    expect(Array.isArray(level.tut)).toBe(true);
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
