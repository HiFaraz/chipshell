import { T, DOOR_KEY, HAZARD_BOOT } from './levels.js';

/**
 * Tiles that entities can walk on
 */
const WALKABLE = new Set([T.F, T.ICE, T.C, T.KR, T.KB, T.KG, T.KY, T.BOOTS_FIRE, T.BOOTS_WATER, T.BOOTS_ICE, T.E]);

/**
 * Tiles that block entities (walls, doors, fire, water)
 */
function isBlocked(tile) {
  if (tile === T.W) return true;
  if (DOOR_KEY[tile]) return true; // Doors
  if (tile === T.FIRE || tile === T.WATER) return true;
  return false;
}

/**
 * Spawn a new entity in the game state
 * @param {object} state - game state
 * @param {string} type - entity type ('crawler', etc.)
 * @param {[number, number]} pos - [x, y] position
 * @returns {object} new state with entity added
 */
export function spawnEntity(state, type, pos) {
  const maxPid = state.entities.reduce((max, e) => Math.max(max, e.pid), 1000);
  const newEntity = {
    pid: maxPid + 1,
    type,
    pos: [...pos],
  };
  return {
    ...state,
    entities: [...state.entities, newEntity],
  };
}

/**
 * Check if any entity is on the player's position
 * @param {object} state - game state
 * @returns {object|null} death marker or null
 */
export function checkCollision(state) {
  const [px, py] = state.pos;
  for (const entity of state.entities) {
    if (entity.pos[0] === px && entity.pos[1] === py) {
      return {
        t: 'death',
        x: `Process ${entity.pid} caught you!`,
      };
    }
  }
  return null;
}

/**
 * A* pathfinding from start to goal
 * @param {array} grid - 2D grid array
 * @param {number} w - grid width
 * @param {number} h - grid height
 * @param {[number, number]} start - [x, y] start position
 * @param {[number, number]} goal - [x, y] goal position
 * @returns {array} path as array of [x, y] positions (first step first), or empty if no path
 */
export function findPath(grid, w, h, start, goal) {
  const [sx, sy] = start;
  const [gx, gy] = goal;

  // Already at goal
  if (sx === gx && sy === gy) return [];

  // A* implementation
  const openSet = new Map(); // key -> { pos, g, f, parent }
  const closedSet = new Set();

  const key = (x, y) => `${x},${y}`;
  const heuristic = (x, y) => Math.abs(x - gx) + Math.abs(y - gy);

  const startKey = key(sx, sy);
  openSet.set(startKey, {
    pos: [sx, sy],
    g: 0,
    f: heuristic(sx, sy),
    parent: null,
  });

  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  while (openSet.size > 0) {
    // Find node with lowest f score
    let bestKey = null;
    let bestF = Infinity;
    for (const [k, node] of openSet) {
      if (node.f < bestF) {
        bestF = node.f;
        bestKey = k;
      }
    }

    const current = openSet.get(bestKey);
    openSet.delete(bestKey);
    closedSet.add(bestKey);

    const [cx, cy] = current.pos;

    // Check if reached goal
    if (cx === gx && cy === gy) {
      // Reconstruct path
      const path = [];
      let node = current;
      while (node.parent) {
        path.unshift(node.pos);
        node = node.parent;
      }
      return path;
    }

    // Explore neighbors
    for (const [dx, dy] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;
      const nKey = key(nx, ny);

      // Bounds check
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;

      // Already processed
      if (closedSet.has(nKey)) continue;

      // Check if walkable
      const tile = grid[ny][nx];
      if (isBlocked(tile)) continue;

      const tentativeG = current.g + 1;

      if (!openSet.has(nKey) || tentativeG < openSet.get(nKey).g) {
        openSet.set(nKey, {
          pos: [nx, ny],
          g: tentativeG,
          f: tentativeG + heuristic(nx, ny),
          parent: current,
        });
      }
    }
  }

  // No path found
  return [];
}

/**
 * Move all entities one step (tick)
 * @param {object} state - game state
 * @returns {{ state: object, output: array }} new state and any output messages
 */
export function tickEntities(state) {
  if (!state.entities || state.entities.length === 0) {
    return { state, output: [] };
  }

  const { grid, pos, levelObj } = state;
  const w = levelObj?.w || grid[0].length;
  const h = levelObj?.h || grid.length;
  const output = [];

  const newEntities = state.entities.map(entity => {
    if (entity.type === 'crawler') {
      const path = findPath(grid, w, h, entity.pos, pos);
      if (path.length > 0) {
        return { ...entity, pos: path[0] };
      }
    }
    return entity;
  });

  const newState = {
    ...state,
    entities: newEntities,
  };

  // Check for collision after movement
  const collision = checkCollision(newState);
  if (collision) {
    output.push(collision);
  }

  return { state: newState, output };
}
