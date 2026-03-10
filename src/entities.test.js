import { describe, it, expect } from 'vitest';
import { spawnEntity, tickEntities, checkCollision, findPath } from './entities.js';
import { T } from './levels.js';

describe('spawnEntity', () => {
  it('adds entity to state', () => {
    const state = {
      entities: [],
      pos: [1, 1],
    };
    const newState = spawnEntity(state, 'crawler', [5, 5]);
    expect(newState.entities).toHaveLength(1);
    expect(newState.entities[0].type).toBe('crawler');
    expect(newState.entities[0].pos).toEqual([5, 5]);
  });

  it('assigns incrementing PID starting at 1001', () => {
    let state = {
      entities: [],
      pos: [1, 1],
    };
    state = spawnEntity(state, 'crawler', [5, 5]);
    expect(state.entities[0].pid).toBe(1001);

    state = spawnEntity(state, 'crawler', [6, 6]);
    expect(state.entities[1].pid).toBe(1002);

    state = spawnEntity(state, 'crawler', [7, 7]);
    expect(state.entities[2].pid).toBe(1003);
  });

  it('does not mutate original state', () => {
    const state = {
      entities: [],
      pos: [1, 1],
    };
    const newState = spawnEntity(state, 'crawler', [5, 5]);
    expect(state.entities).toHaveLength(0);
    expect(newState.entities).toHaveLength(1);
  });
});

describe('tickEntities', () => {
  const makeGrid = (w, h, fillTile = T.F) => {
    const grid = [];
    for (let y = 0; y < h; y++) {
      grid.push(new Array(w).fill(fillTile));
    }
    // Add walls around edges
    for (let x = 0; x < w; x++) {
      grid[0][x] = T.W;
      grid[h - 1][x] = T.W;
    }
    for (let y = 0; y < h; y++) {
      grid[y][0] = T.W;
      grid[y][w - 1] = T.W;
    }
    return grid;
  };

  it('crawler moves toward player', () => {
    const state = {
      grid: makeGrid(7, 7),
      pos: [1, 1],
      entities: [{ pid: 1001, type: 'crawler', pos: [5, 1] }],
      levelObj: { w: 7, h: 7 },
    };
    const result = tickEntities(state);
    // Crawler should move one step closer (left)
    expect(result.state.entities[0].pos).toEqual([4, 1]);
  });

  it('crawler takes shortest path (not diagonal)', () => {
    const grid = makeGrid(9, 9);
    // Place a wall that forces a longer path
    grid[3][3] = T.W;
    grid[3][4] = T.W;
    grid[3][5] = T.W;

    const state = {
      grid,
      pos: [4, 1],
      entities: [{ pid: 1001, type: 'crawler', pos: [4, 5] }],
      levelObj: { w: 9, h: 9 },
    };
    const result = tickEntities(state);
    // Crawler should move one step along shortest path
    expect(result.state.entities[0].pos).toEqual([4, 4]);
  });

  it('crawler blocked by wall', () => {
    const grid = makeGrid(5, 5);
    // Completely wall off the crawler
    grid[1][2] = T.W;
    grid[2][2] = T.W;
    grid[3][2] = T.W;

    const state = {
      grid,
      pos: [1, 2],
      entities: [{ pid: 1001, type: 'crawler', pos: [3, 2] }],
      levelObj: { w: 5, h: 5 },
    };
    const result = tickEntities(state);
    // Crawler should not move (blocked)
    expect(result.state.entities[0].pos).toEqual([3, 2]);
  });

  it('crawler blocked by door', () => {
    const grid = makeGrid(5, 5);
    // Block all paths with doors
    grid[1][2] = T.DR;
    grid[2][2] = T.DR;
    grid[3][2] = T.DR;

    const state = {
      grid,
      pos: [1, 2],
      entities: [{ pid: 1001, type: 'crawler', pos: [3, 2] }],
      levelObj: { w: 5, h: 5 },
    };
    const result = tickEntities(state);
    // Crawler should not move through door (no path available)
    expect(result.state.entities[0].pos).toEqual([3, 2]);
  });

  it('crawler blocked by fire', () => {
    const grid = makeGrid(5, 5);
    // Block all paths with fire
    grid[1][2] = T.FIRE;
    grid[2][2] = T.FIRE;
    grid[3][2] = T.FIRE;

    const state = {
      grid,
      pos: [1, 2],
      entities: [{ pid: 1001, type: 'crawler', pos: [3, 2] }],
      levelObj: { w: 5, h: 5 },
    };
    const result = tickEntities(state);
    // Crawler should not move through fire (no path available)
    expect(result.state.entities[0].pos).toEqual([3, 2]);
  });

  it('crawler blocked by water', () => {
    const grid = makeGrid(5, 5);
    // Block all paths with water
    grid[1][2] = T.WATER;
    grid[2][2] = T.WATER;
    grid[3][2] = T.WATER;

    const state = {
      grid,
      pos: [1, 2],
      entities: [{ pid: 1001, type: 'crawler', pos: [3, 2] }],
      levelObj: { w: 5, h: 5 },
    };
    const result = tickEntities(state);
    // Crawler should not move through water (no path available)
    expect(result.state.entities[0].pos).toEqual([3, 2]);
  });

  it('crawler walks on floor', () => {
    const state = {
      grid: makeGrid(7, 7),
      pos: [1, 1],
      entities: [{ pid: 1001, type: 'crawler', pos: [3, 1] }],
      levelObj: { w: 7, h: 7 },
    };
    const result = tickEntities(state);
    expect(result.state.entities[0].pos).toEqual([2, 1]);
  });

  it('crawler walks on ice (no slide)', () => {
    const grid = makeGrid(7, 7);
    grid[1][2] = T.ICE;

    const state = {
      grid,
      pos: [1, 1],
      entities: [{ pid: 1001, type: 'crawler', pos: [3, 1] }],
      levelObj: { w: 7, h: 7 },
    };
    const result = tickEntities(state);
    // Crawler moves onto ice but doesn't slide
    expect(result.state.entities[0].pos).toEqual([2, 1]);
  });

  it('crawler ignores items (does not pick up chips/keys/boots)', () => {
    const grid = makeGrid(7, 7);
    grid[1][2] = T.C; // Chip
    grid[1][3] = T.KR; // Red key
    grid[1][4] = T.BOOTS_FIRE; // Fire boots

    const state = {
      grid,
      pos: [1, 1],
      entities: [{ pid: 1001, type: 'crawler', pos: [5, 1] }],
      levelObj: { w: 7, h: 7 },
    };

    // Tick multiple times to move crawler through items
    let result = tickEntities(state);
    result = tickEntities(result.state);
    result = tickEntities(result.state);

    // Items should still be on grid
    expect(result.state.grid[1][2]).toBe(T.C);
    expect(result.state.grid[1][3]).toBe(T.KR);
    expect(result.state.grid[1][4]).toBe(T.BOOTS_FIRE);
  });

  it('crawler does not move if no path to player', () => {
    const grid = makeGrid(7, 7);
    // Completely wall off player
    grid[1][2] = T.W;
    grid[2][1] = T.W;
    grid[2][2] = T.W;

    const state = {
      grid,
      pos: [1, 1],
      entities: [{ pid: 1001, type: 'crawler', pos: [5, 5] }],
      levelObj: { w: 7, h: 7 },
    };
    const result = tickEntities(state);
    expect(result.state.entities[0].pos).toEqual([5, 5]);
  });

  it('multiple crawlers each move independently', () => {
    const state = {
      grid: makeGrid(9, 9),
      pos: [4, 4],
      entities: [
        { pid: 1001, type: 'crawler', pos: [1, 4] },
        { pid: 1002, type: 'crawler', pos: [7, 4] },
        { pid: 1003, type: 'crawler', pos: [4, 1] },
      ],
      levelObj: { w: 9, h: 9 },
    };
    const result = tickEntities(state);

    // Each crawler should move one step toward player
    expect(result.state.entities[0].pos).toEqual([2, 4]); // moved right
    expect(result.state.entities[1].pos).toEqual([6, 4]); // moved left
    expect(result.state.entities[2].pos).toEqual([4, 2]); // moved down
  });

  it('returns death output when crawler reaches player position', () => {
    const state = {
      grid: makeGrid(5, 5),
      pos: [2, 2],
      entities: [{ pid: 1001, type: 'crawler', pos: [3, 2] }],
      levelObj: { w: 5, h: 5 },
    };
    const result = tickEntities(state);
    expect(result.state.entities[0].pos).toEqual([2, 2]);
    expect(result.output).toContainEqual(
      expect.objectContaining({ t: 'death', x: expect.stringContaining('1001') })
    );
  });
});

describe('checkCollision', () => {
  it('returns null when no entity on player', () => {
    const state = {
      pos: [1, 1],
      entities: [{ pid: 1001, type: 'crawler', pos: [5, 5] }],
    };
    const result = checkCollision(state);
    expect(result).toBeNull();
  });

  it('returns death marker when entity on player pos', () => {
    const state = {
      pos: [3, 3],
      entities: [{ pid: 1001, type: 'crawler', pos: [3, 3] }],
    };
    const result = checkCollision(state);
    expect(result).not.toBeNull();
    expect(result.t).toBe('death');
  });

  it('includes PID in death message', () => {
    const state = {
      pos: [3, 3],
      entities: [{ pid: 1042, type: 'crawler', pos: [3, 3] }],
    };
    const result = checkCollision(state);
    expect(result.x).toContain('1042');
  });

  it('detects collision with any of multiple entities', () => {
    const state = {
      pos: [3, 3],
      entities: [
        { pid: 1001, type: 'crawler', pos: [1, 1] },
        { pid: 1002, type: 'crawler', pos: [3, 3] },
        { pid: 1003, type: 'crawler', pos: [5, 5] },
      ],
    };
    const result = checkCollision(state);
    expect(result).not.toBeNull();
    expect(result.x).toContain('1002');
  });
});

describe('A* pathfinding (findPath)', () => {
  const makeGrid = (w, h) => {
    const grid = [];
    for (let y = 0; y < h; y++) {
      grid.push(new Array(w).fill(T.F));
    }
    // Add walls around edges
    for (let x = 0; x < w; x++) {
      grid[0][x] = T.W;
      grid[h - 1][x] = T.W;
    }
    for (let y = 0; y < h; y++) {
      grid[y][0] = T.W;
      grid[y][w - 1] = T.W;
    }
    return grid;
  };

  it('finds shortest path in open grid', () => {
    const grid = makeGrid(7, 7);
    const path = findPath(grid, 7, 7, [5, 3], [1, 3]);
    // Path should exist and first step should be moving left
    expect(path).not.toBeNull();
    expect(path.length).toBeGreaterThan(0);
    expect(path[0]).toEqual([4, 3]);
  });

  it('navigates around walls', () => {
    const grid = makeGrid(7, 7);
    // Add wall in direct path
    grid[3][3] = T.W;
    grid[3][2] = T.W;

    const path = findPath(grid, 7, 7, [5, 3], [1, 3]);
    // Path should exist but go around wall
    expect(path).not.toBeNull();
    expect(path.length).toBeGreaterThan(4); // Longer than direct path
  });

  it('returns empty path when blocked', () => {
    const grid = makeGrid(7, 7);
    // Completely wall off destination
    grid[2][1] = T.W;
    grid[2][2] = T.W;
    grid[3][2] = T.W;
    grid[4][2] = T.W;
    grid[4][1] = T.W;

    const path = findPath(grid, 7, 7, [5, 3], [1, 3]);
    expect(path).toEqual([]);
  });

  it('handles player adjacent to crawler (one step path)', () => {
    const grid = makeGrid(5, 5);
    const path = findPath(grid, 5, 5, [2, 2], [1, 2]);
    expect(path).toHaveLength(1);
    expect(path[0]).toEqual([1, 2]);
  });

  it('handles crawler already on player position', () => {
    const grid = makeGrid(5, 5);
    const path = findPath(grid, 5, 5, [2, 2], [2, 2]);
    expect(path).toEqual([]);
  });
});
