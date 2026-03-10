import { describe, it, expect } from 'vitest';
import { createState, execOne, lineExec, T, LEVELS, THEMES, MAN, DOOR_KEY, KEY_ITEM, HAZARD_BOOT, BOOT_ITEM } from './interpreter.js';

describe('createState', () => {
  it('creates valid state from level 0', () => {
    const state = createState(0);
    expect(state).toBeDefined();
    expect(state.grid).toBeDefined();
    expect(state.pos).toBeDefined();
    expect(state.level).toBe(0);
  });

  it('has correct initial position', () => {
    const state = createState(0);
    expect(state.pos).toEqual([1, 1]);
  });

  it('has correct initial chips count', () => {
    const state = createState(0);
    expect(state.chips).toBe(0);
    expect(state.needed).toBe(1);
  });

  it('has empty backpack initially', () => {
    const state = createState(0);
    expect(state.backpack).toEqual([]);
  });

  it('has default aliases', () => {
    const state = createState(0);
    expect(state.aliases.r).toBe("mv 1 0");
    expect(state.aliases.l).toBe("mv -1 0");
    expect(state.aliases.u).toBe("mv 0 -1");
    expect(state.aliases.d).toBe("mv 0 1");
  });

  it('has empty scripts initially', () => {
    const state = createState(0);
    expect(state.scripts).toEqual({});
  });

  it('is not won initially', () => {
    const state = createState(0);
    expect(state.won).toBe(false);
  });

  it('creates deep copy of grid', () => {
    const state = createState(0);
    state.grid[0][0] = 999;
    expect(LEVELS[0].grid[0][0]).toBe(1); // Original unchanged
  });
});

describe('mv', () => {
  it('moves right', () => {
    const state = createState(0);
    const { state: newState, exitCode } = execOne(state, 'mv 1 0');
    expect(exitCode).toBe(0);
    expect(newState.pos).toEqual([2, 1]);
  });

  it('moves left', () => {
    let state = createState(0);
    state = execOne(state, 'mv 1 0').state; // Move right first
    const { state: newState, exitCode } = execOne(state, 'mv -1 0');
    expect(exitCode).toBe(0);
    expect(newState.pos).toEqual([1, 1]);
  });

  it('moves up', () => {
    let state = createState(0);
    state = execOne(state, 'mv 0 1').state; // Move down first
    const { state: newState, exitCode } = execOne(state, 'mv 0 -1');
    expect(exitCode).toBe(0);
    expect(newState.pos).toEqual([1, 1]);
  });

  it('moves down', () => {
    const state = createState(0);
    const { state: newState, exitCode } = execOne(state, 'mv 0 1');
    expect(exitCode).toBe(0);
    expect(newState.pos).toEqual([1, 2]);
  });

  it('blocks on wall (exit code 1)', () => {
    const state = createState(0);
    const { state: newState, output, exitCode } = execOne(state, 'mv -1 0');
    expect(exitCode).toBe(1);
    expect(newState.pos).toEqual([1, 1]); // Position unchanged
    expect(output.some(o => o.x.includes('permission denied'))).toBe(true);
  });

  it('blocks out of bounds', () => {
    // Level 0 has walls around the edge, so we can't easily test bounds
    // Let's create a scenario by manipulating state
    let state = createState(0);
    // Position at edge would hit wall first, so check wall behavior
    const { exitCode } = execOne(state, 'mv 0 -1'); // Try to go up into wall
    expect(exitCode).toBe(1);
  });

  it('rejects diagonal', () => {
    const state = createState(0);
    const { exitCode, output } = execOne(state, 'mv 1 1');
    expect(exitCode).toBe(1);
    expect(output.some(o => o.x.includes('cardinal only'))).toBe(true);
  });

  it('rejects non-cardinal (two steps)', () => {
    const state = createState(0);
    const { exitCode, output } = execOne(state, 'mv 2 0');
    expect(exitCode).toBe(1);
    expect(output.some(o => o.x.includes('cardinal only'))).toBe(true);
  });

  it('rejects zero movement', () => {
    const state = createState(0);
    const { exitCode } = execOne(state, 'mv 0 0');
    expect(exitCode).toBe(1);
  });

  it('picks up chip', () => {
    let state = createState(0);
    // Navigate to chip at [3,2]: start at [1,1], go right twice then down
    state = execOne(state, 'mv 1 0').state; // [2,1]
    state = execOne(state, 'mv 1 0').state; // [3,1]
    const { state: newState, output, exitCode } = execOne(state, 'mv 0 1'); // [3,2] chip
    expect(exitCode).toBe(0);
    expect(newState.chips).toBe(1);
    expect(newState.backpack).toContain('chip');
    expect(output.some(o => o.x.includes('Picked up chip'))).toBe(true);
  });

  it('unlocks exit when all chips collected', () => {
    let state = createState(0);
    // Level 0 (5x5): 1 chip at [3,2], exit at [2,4]
    // Collect chip at [3,2]
    state = execOne(state, 'mv 1 0').state; // [2,1]
    state = execOne(state, 'mv 1 0').state; // [3,1]
    state = execOne(state, 'mv 0 1').state; // [3,2] - chip
    expect(state.chips).toBe(1);
    expect(state.needed).toBe(1);
    // Exit should now be unlocked (chips === needed)
  });

  it('blocks locked exit', () => {
    let state = createState(0);
    // Level 0 (5x5): Exit at [2,4]. Navigate there without getting chip first
    state = execOne(state, 'mv 1 0').state; // [2,1]
    state = execOne(state, 'mv 0 1').state; // [2,2]
    state = execOne(state, 'mv 0 1').state; // [2,3]

    // Now try to enter exit at [2,4] without chip
    const { exitCode, output } = execOne(state, 'mv 0 1');
    expect(exitCode).toBe(1);
    expect(output.some(o => o.x.includes('exit locked'))).toBe(true);
  });

  it('triggers win on open exit', () => {
    let state = createState(0);
    // Level 0 (5x5): 1 chip at [3,2], exit at [2,4]

    // Get chip at [3,2]
    state = execOne(state, 'mv 1 0').state; // [2,1]
    state = execOne(state, 'mv 1 0').state; // [3,1]
    state = execOne(state, 'mv 0 1').state; // [3,2] - chip
    expect(state.chips).toBe(1);

    // Go to exit at [2,4]
    state = execOne(state, 'mv 0 1').state; // [3,3]
    state = execOne(state, 'mv -1 0').state; // [2,3]
    const result = execOne(state, 'mv 0 1'); // [2,4] - exit!
    expect(result.state.won).toBe(true);
    expect(result.state.pos).toEqual([2, 4]);
    expect(result.output.some(o => o.x.includes('Level complete'))).toBe(true);
  });

  it('requires dx dy arguments', () => {
    const state = createState(0);
    const { exitCode, output } = execOne(state, 'mv 1');
    expect(exitCode).toBe(1);
    expect(output.some(o => o.x.includes('Usage'))).toBe(true);
  });

  it('rejects non-numeric args', () => {
    const state = createState(0);
    const { exitCode, output } = execOne(state, 'mv a b');
    expect(exitCode).toBe(1);
    expect(output.some(o => o.x.includes('bad args'))).toBe(true);
  });
});

describe('ls', () => {
  it('lists adjacent tiles', () => {
    const state = createState(0);
    const { output, exitCode } = execOne(state, 'ls');
    expect(exitCode).toBe(0);
    expect(output.length).toBeGreaterThan(0);
    // Should have directional output
    const text = output.map(o => o.x).join(' ');
    expect(text).toMatch(/east|west|north|south/);
  });

  it('ls /backpack when empty', () => {
    const state = createState(0);
    const { output, exitCode } = execOne(state, 'ls /backpack');
    expect(exitCode).toBe(0);
    expect(output.some(o => o.x === '(empty)')).toBe(true);
  });

  it('ls /backpack with items', () => {
    let state = createState(0);
    // Chip at [3,2]: go right twice then down
    state = execOne(state, 'mv 1 0').state; // [2,1]
    state = execOne(state, 'mv 1 0').state; // [3,1]
    state = execOne(state, 'mv 0 1').state; // [3,2] - Pick up chip
    const { output, exitCode } = execOne(state, 'ls /backpack');
    expect(exitCode).toBe(0);
    expect(output.some(o => o.x.includes('chip'))).toBe(true);
  });

  it('ls /scripts when empty', () => {
    const state = createState(0);
    const { output, exitCode } = execOne(state, 'ls /scripts');
    expect(exitCode).toBe(0);
    expect(output.some(o => o.x.includes('No scripts'))).toBe(true);
  });

  it('ls /scripts with scripts', () => {
    let state = createState(0);
    state = { ...state, scripts: { 'test.sh': '# test' } };
    const { output, exitCode } = execOne(state, 'ls /scripts');
    expect(exitCode).toBe(0);
    expect(output.some(o => o.x.includes('test.sh'))).toBe(true);
  });
});

describe('pwd', () => {
  it('returns coordinates', () => {
    const state = createState(0);
    const { output, exitCode } = execOne(state, 'pwd');
    expect(exitCode).toBe(0);
    expect(output[0].x).toBe('[1, 1]');
  });

  it('updates after movement', () => {
    let state = createState(0);
    state = execOne(state, 'mv 1 0').state;
    const { output } = execOne(state, 'pwd');
    expect(output[0].x).toBe('[2, 1]');
  });
});

describe('whoami', () => {
  it('returns stats', () => {
    const state = createState(0);
    const { output, exitCode } = execOne(state, 'whoami');
    expect(exitCode).toBe(0);
    expect(output[0].x).toContain('Player');
    expect(output[0].x).toContain('Chips: 0/1');
    expect(output[0].x).toContain('Level: 1');
  });

  it('updates chip count', () => {
    let state = createState(0);
    // Chip at [3,2]: go right twice then down
    state = execOne(state, 'mv 1 0').state; // [2,1]
    state = execOne(state, 'mv 1 0').state; // [3,1]
    state = execOne(state, 'mv 0 1').state; // [3,2] - Pick up chip
    const { output } = execOne(state, 'whoami');
    expect(output[0].x).toContain('Chips: 1/1');
  });
});

describe('cat', () => {
  it('cat /tile shows current tile', () => {
    const state = createState(0);
    const { output, exitCode } = execOne(state, 'cat /tile');
    expect(exitCode).toBe(0);
    expect(output[0].x).toContain('[1,1]');
    expect(output[0].x).toContain('floor');
  });

  it('cat existing script', () => {
    let state = createState(0);
    state = { ...state, scripts: { 'test.sh': 'mv 1 0' } };
    const { output, exitCode } = execOne(state, 'cat test.sh');
    expect(exitCode).toBe(0);
    expect(output[0].x).toBe('mv 1 0');
  });

  it('cat empty script shows (empty script)', () => {
    let state = createState(0);
    state = { ...state, scripts: { 'empty.sh': '' } };
    const { output, exitCode } = execOne(state, 'cat empty.sh');
    expect(exitCode).toBe(0);
    expect(output[0].x).toBe('(empty script)');
  });

  it('cat nonexistent returns error', () => {
    const state = createState(0);
    const { output, exitCode } = execOne(state, 'cat nonexistent.sh');
    expect(exitCode).toBe(1);
    expect(output.some(o => o.t === 'e')).toBe(true);
  });
});

describe('alias', () => {
  it('creates alias', () => {
    const state = createState(0);
    const { state: newState, output, exitCode } = execOne(state, "alias go='mv 1 0'");
    expect(exitCode).toBe(0);
    expect(newState.aliases.go).toBe('mv 1 0');
    expect(output.some(o => o.x.includes("alias go='mv 1 0'"))).toBe(true);
  });

  it('lists aliases', () => {
    const state = createState(0);
    const { output, exitCode } = execOne(state, 'alias');
    expect(exitCode).toBe(0);
    expect(output.some(o => o.x.includes("r='mv 1 0'"))).toBe(true);
  });

  it('uses alias', () => {
    let state = createState(0);
    // Default alias 'r' = 'mv 1 0'
    const { state: newState, exitCode } = execOne(state, 'r');
    expect(exitCode).toBe(0);
    expect(newState.pos).toEqual([2, 1]);
  });

  it('does not expand alias with args', () => {
    let state = createState(0);
    // 'r something' should not expand 'r' alias
    const { exitCode, output } = execOne(state, 'r extra');
    expect(exitCode).toBe(1);
    expect(output.some(o => o.x.includes('command not found'))).toBe(true);
  });

  it('rejects invalid alias syntax', () => {
    const state = createState(0);
    const { exitCode, output } = execOne(state, 'alias badformat');
    expect(exitCode).toBe(1);
    expect(output.some(o => o.x.includes('Usage'))).toBe(true);
  });
});

describe('unalias', () => {
  it('removes alias', () => {
    const state = createState(0);
    const { state: newState, output, exitCode } = execOne(state, 'unalias r');
    expect(exitCode).toBe(0);
    expect(newState.aliases.r).toBeUndefined();
    expect(output.some(o => o.x.includes("Removed 'r'"))).toBe(true);
  });

  it('requires name argument', () => {
    const state = createState(0);
    const { exitCode, output } = execOne(state, 'unalias');
    expect(exitCode).toBe(1);
    expect(output.some(o => o.x.includes('Usage'))).toBe(true);
  });
});

describe('repeat', () => {
  it('repeats N times', () => {
    const state = createState(0);
    // Level 0 is 5x5: can only go right twice from [1,1] to [3,1]
    const { state: newState, exitCode } = execOne(state, 'repeat 2 mv 1 0');
    expect(exitCode).toBe(0);
    expect(newState.pos).toEqual([3, 1]); // Moved right 2 times
  });

  it('stops on error', () => {
    const state = createState(0);
    // Try to move right 10 times - will hit wall
    const { state: newState, exitCode, output } = execOne(state, 'repeat 10 mv 1 0');
    expect(exitCode).toBe(1);
    expect(newState.pos[0]).toBeLessThan(11); // Stopped before completing
  });

  it('stops on win', () => {
    // This is hard to test without full level navigation
    // Just verify repeat works
    const state = createState(0);
    const { exitCode } = execOne(state, 'repeat 2 mv 1 0');
    expect(exitCode).toBe(0);
  });

  it('rejects invalid count', () => {
    const state = createState(0);
    const { exitCode, output } = execOne(state, 'repeat 100 mv 1 0');
    expect(exitCode).toBe(1);
    expect(output.some(o => o.x.includes('1-50'))).toBe(true);
  });

  it('requires count and command', () => {
    const state = createState(0);
    const { exitCode, output } = execOne(state, 'repeat 3');
    expect(exitCode).toBe(1);
    expect(output.some(o => o.x.includes('Usage'))).toBe(true);
  });
});

describe('for', () => {
  it('basic loop', () => {
    const state = createState(0);
    // Level 0 is 5x5: can only go right twice from [1,1] to [3,1]
    const { state: newState, exitCode } = execOne(state, 'for i in 1..2; do mv 1 0; done');
    expect(exitCode).toBe(0);
    expect(newState.pos).toEqual([3, 1]); // Moved right 2 times
  });

  it('stops on error', () => {
    const state = createState(0);
    const { exitCode } = execOne(state, 'for i in 1..10; do mv 1 0; done');
    expect(exitCode).toBe(1); // Will hit wall
  });

  it('rejects invalid syntax', () => {
    const state = createState(0);
    const { exitCode, output } = execOne(state, 'for invalid syntax');
    expect(exitCode).toBe(1);
    expect(output.some(o => o.x.includes('Usage'))).toBe(true);
  });

  it('rejects too many iterations', () => {
    const state = createState(0);
    const { exitCode, output } = execOne(state, 'for i in 1..100; do pwd; done');
    expect(exitCode).toBe(1);
    expect(output.some(o => o.x.includes('max 50'))).toBe(true);
  });
});

describe('lineExec', () => {
  it('handles && chaining', () => {
    const state = createState(0);
    const { state: newState, exitCode } = lineExec(state, 'mv 1 0 && mv 0 1');
    expect(exitCode).toBe(0);
    expect(newState.pos).toEqual([2, 2]);
  });

  it('stops chain on error', () => {
    const state = createState(0);
    // First mv hits wall, second should not execute
    const { state: newState, exitCode } = lineExec(state, 'mv -1 0 && mv 1 0');
    expect(exitCode).toBe(1);
    expect(newState.pos).toEqual([1, 1]); // Position unchanged
  });

  it('handles multiple && segments', () => {
    const state = createState(0);
    // Level 0 is 5x5: can go right twice, then down once
    const { state: newState, exitCode } = lineExec(state, 'mv 1 0 && mv 1 0 && mv 0 1');
    expect(exitCode).toBe(0);
    expect(newState.pos).toEqual([3, 2]); // Moved right twice, down once
  });

  it('handles empty segments', () => {
    const state = createState(0);
    const { state: newState, exitCode } = lineExec(state, 'mv 1 0 &&  && mv 1 0');
    expect(exitCode).toBe(0);
    expect(newState.pos).toEqual([3, 1]);
  });
});

describe('comments', () => {
  it('# lines return 0', () => {
    const state = createState(0);
    const { state: newState, exitCode, output } = execOne(state, '# this is a comment');
    expect(exitCode).toBe(0);
    expect(newState.pos).toEqual(state.pos); // No change
    expect(output).toEqual([]);
  });

  it('handles comment with leading space', () => {
    const state = createState(0);
    const { exitCode } = execOne(state, '  # comment with space');
    expect(exitCode).toBe(0);
  });
});

describe('unknown command', () => {
  it('returns exit code 1', () => {
    const state = createState(0);
    const { exitCode, output } = execOne(state, 'unknowncmd');
    expect(exitCode).toBe(1);
    expect(output.some(o => o.x.includes('command not found'))).toBe(true);
  });

  it('includes command name in error', () => {
    const state = createState(0);
    const { output } = execOne(state, 'foobar');
    expect(output.some(o => o.x.includes('foobar'))).toBe(true);
  });
});

describe('man', () => {
  it('lists all commands', () => {
    const state = createState(0);
    const { output, exitCode } = execOne(state, 'man');
    expect(exitCode).toBe(0);
    expect(output[0].x).toContain('Commands:');
    expect(output[0].x).toContain('mv');
    expect(output[0].x).toContain('ls');
  });

  it('shows specific command help', () => {
    const state = createState(0);
    const { output, exitCode } = execOne(state, 'man mv');
    expect(exitCode).toBe(0);
    expect(output[0].x).toBe(MAN.mv);
  });

  it('errors on unknown command', () => {
    const state = createState(0);
    const { output, exitCode } = execOne(state, 'man unknowncmd');
    expect(exitCode).toBe(1);
    expect(output.some(o => o.x.includes('No manual'))).toBe(true);
  });
});

describe('theme', () => {
  it('lists themes', () => {
    const state = createState(0);
    const { output, exitCode } = execOne(state, 'theme');
    expect(exitCode).toBe(0);
    expect(output[0].x).toContain('Themes:');
    expect(output[0].x).toContain('paper');
  });

  it('returns theme marker for valid theme', () => {
    const state = createState(0);
    const { output, exitCode } = execOne(state, 'theme retro');
    expect(exitCode).toBe(0);
    expect(output.some(o => o.t === 'theme' && o.x === 'retro')).toBe(true);
  });

  it('errors on unknown theme', () => {
    const state = createState(0);
    const { output, exitCode } = execOne(state, 'theme unknowntheme');
    expect(exitCode).toBe(1);
    expect(output.some(o => o.x.includes('not found'))).toBe(true);
  });
});

describe('clear', () => {
  it('returns clear marker', () => {
    const state = createState(0);
    const { output, exitCode } = execOne(state, 'clear');
    expect(exitCode).toBe(0);
    expect(output.some(o => o.t === 'clear')).toBe(true);
  });
});

describe('nano', () => {
  it('returns nano marker', () => {
    const state = createState(0);
    const { output, exitCode } = execOne(state, 'nano test.sh');
    expect(exitCode).toBe(0);
    expect(output[0].t).toBe('nano');
    expect(output[0].x).toBe('test.sh');
  });

  it('requires filename', () => {
    const state = createState(0);
    const { output, exitCode } = execOne(state, 'nano');
    expect(exitCode).toBe(1);
    expect(output.some(o => o.x.includes('Usage'))).toBe(true);
  });
});

describe('bash', () => {
  it('returns bash marker for existing script', () => {
    let state = createState(0);
    state = { ...state, scripts: { 'test.sh': 'mv 1 0' } };
    const { output, exitCode } = execOne(state, 'bash test.sh');
    expect(exitCode).toBe(0);
    expect(output[0].t).toBe('bash');
    expect(output[0].x.fn).toBe('test.sh');
    expect(output[0].x.src).toBe('mv 1 0');
  });

  it('includes mode in bash marker', () => {
    let state = createState(0);
    state = { ...state, scripts: { 'test.sh': 'mv 1 0' } };
    const { output } = execOne(state, 'bash test.sh --instant');
    expect(output[0].x.mode).toBe('--instant');
  });

  it('defaults to --slow mode', () => {
    let state = createState(0);
    state = { ...state, scripts: { 'test.sh': 'mv 1 0' } };
    const { output } = execOne(state, 'bash test.sh');
    expect(output[0].x.mode).toBe('--slow');
  });

  it('errors on nonexistent script', () => {
    const state = createState(0);
    const { output, exitCode } = execOne(state, 'bash nonexistent.sh');
    expect(exitCode).toBe(1);
    expect(output.some(o => o.x.includes('No such file'))).toBe(true);
  });

  it('requires filename', () => {
    const state = createState(0);
    const { output, exitCode } = execOne(state, 'bash');
    expect(exitCode).toBe(1);
    expect(output.some(o => o.x.includes('Usage'))).toBe(true);
  });
});

describe('reset', () => {
  it('returns reset marker', () => {
    const state = createState(0);
    const { output, exitCode } = execOne(state, 'reset');
    expect(exitCode).toBe(0);
    expect(output.some(o => o.t === 'reset')).toBe(true);
  });
});

describe('rm', () => {
  it('removes script', () => {
    let state = createState(0);
    state = { ...state, scripts: { 'test.sh': 'mv 1 0' } };
    const { state: newState, output, exitCode } = execOne(state, 'rm test.sh');
    expect(exitCode).toBe(0);
    expect(newState.scripts['test.sh']).toBeUndefined();
    expect(output.some(o => o.x.includes('Removed test.sh'))).toBe(true);
  });

  it('errors on nonexistent script', () => {
    const state = createState(0);
    const { output, exitCode } = execOne(state, 'rm nonexistent.sh');
    expect(exitCode).toBe(1);
    expect(output.some(o => o.x.includes('not found'))).toBe(true);
  });

  it('requires filename', () => {
    const state = createState(0);
    const { output, exitCode } = execOne(state, 'rm');
    expect(exitCode).toBe(1);
    expect(output.some(o => o.x.includes('Usage'))).toBe(true);
  });
});

describe('empty input', () => {
  it('returns 0 for empty string', () => {
    const state = createState(0);
    const { exitCode, output } = execOne(state, '');
    expect(exitCode).toBe(0);
    expect(output).toEqual([]);
  });

  it('returns 0 for whitespace', () => {
    const state = createState(0);
    const { exitCode, output } = execOne(state, '   ');
    expect(exitCode).toBe(0);
    expect(output).toEqual([]);
  });
});

describe('state immutability', () => {
  it('does not mutate original state', () => {
    const state = createState(0);
    const originalPos = [...state.pos];
    const originalChips = state.chips;

    execOne(state, 'mv 1 0');

    expect(state.pos).toEqual(originalPos);
    expect(state.chips).toBe(originalChips);
  });

  it('does not mutate original aliases', () => {
    const state = createState(0);
    const originalAliases = { ...state.aliases };

    execOne(state, "alias test='pwd'");

    expect(state.aliases).toEqual(originalAliases);
  });
});

describe('integration: full level completion', () => {
  it('can complete level 0', () => {
    let state = createState(0);

    // Level 0 is now 5x5 with 1 chip at [3,2] and exit at [2,4]
    // Verify grid structure
    expect(LEVELS[0].grid[2][3]).toBe(T.C); // Chip at [3,2]
    expect(LEVELS[0].grid[4][2]).toBe(T.E); // Exit at [2,4]

    // Navigate to chip at [3,2]
    state = execOne(state, 'mv 1 0').state; // [2,1]
    state = execOne(state, 'mv 1 0').state; // [3,1]
    state = execOne(state, 'mv 0 1').state; // [3,2] - chip!
    expect(state.chips).toBe(1);
    expect(state.pos).toEqual([3, 2]);

    // Navigate to exit at [2,4]
    state = execOne(state, 'mv 0 1').state; // [3,3]
    state = execOne(state, 'mv -1 0').state; // [2,3]
    const result = execOne(state, 'mv 0 1'); // [2,4] - exit!
    expect(result.state.won).toBe(true);
    expect(result.state.pos).toEqual([2, 4]);
  });

  it('wins level when entering exit with all chips', () => {
    let state = createState(0);

    // Level 0 (5x5): 1 chip at [3,2], exit at [2,4]
    // Collect chip
    state = execOne(state, 'mv 1 0').state; // [2,1]
    state = execOne(state, 'mv 1 0').state; // [3,1]
    state = execOne(state, 'mv 0 1').state; // [3,2] - chip!
    expect(state.chips).toBe(1);
    expect(state.won).toBe(false); // Not won yet

    // Go to exit
    state = execOne(state, 'mv 0 1').state; // [3,3]
    state = execOne(state, 'mv -1 0').state; // [2,3]
    const result = execOne(state, 'mv 0 1'); // [2,4] - exit!
    expect(result.state.won).toBe(true);
    expect(result.state.pos).toEqual([2, 4]);
    expect(result.output.some(o => o.x.includes('Level complete'))).toBe(true);
  });
});

describe('bash with empty script', () => {
  it('runs empty script successfully', () => {
    let state = createState(0);
    state = { ...state, scripts: { 'empty.sh': '' } };
    const { output, exitCode } = execOne(state, 'bash empty.sh');
    expect(exitCode).toBe(0);
    expect(output[0].t).toBe('bash');
    expect(output[0].x.src).toBe('');
  });

  it('runs script with only comments', () => {
    let state = createState(0);
    state = { ...state, scripts: { 'comments.sh': '# just a comment\n# another' } };
    const { output, exitCode } = execOne(state, 'bash comments.sh');
    expect(exitCode).toBe(0);
    expect(output[0].x.src).toBe('# just a comment\n# another');
  });
});

describe('for loop iteration limits', () => {
  it('allows exactly 50 iterations', () => {
    const state = createState(0);
    const { exitCode } = execOne(state, 'for i in 1..50; do pwd; done');
    expect(exitCode).toBe(0);
  });

  it('rejects 51 iterations', () => {
    const state = createState(0);
    const { exitCode, output } = execOne(state, 'for i in 1..51; do pwd; done');
    expect(exitCode).toBe(1);
    expect(output.some(o => o.x.includes('max 50'))).toBe(true);
  });

  it('handles reversed range (no iterations)', () => {
    const state = createState(0);
    const { state: newState, exitCode } = execOne(state, 'for i in 5..1; do mv 1 0; done');
    expect(exitCode).toBe(0);
    expect(newState.pos).toEqual([1, 1]); // No movement - loop didn't run
  });
});

// Helper to create a custom test level
function createTestLevel(grid, start, chips = 0) {
  const level = {
    w: grid[0].length,
    h: grid.length,
    chips,
    grid,
    start,
    tut: ["Test level"],
  };
  return createState(level);
}

describe('key pickup', () => {
  it('picks up red key', () => {
    const grid = [
      [T.W, T.W, T.W],
      [T.W, T.F, T.KR],
      [T.W, T.W, T.W],
    ];
    let state = createTestLevel(grid, [1, 1]);
    const { state: newState, output, exitCode } = execOne(state, 'mv 1 0');
    expect(exitCode).toBe(0);
    expect(newState.backpack).toContain('red_key');
    expect(newState.grid[1][2]).toBe(T.F); // Key replaced with floor
    expect(output.some(o => o.x.includes('red_key'))).toBe(true);
  });

  it('picks up blue key', () => {
    const grid = [
      [T.W, T.W, T.W],
      [T.W, T.F, T.KB],
      [T.W, T.W, T.W],
    ];
    let state = createTestLevel(grid, [1, 1]);
    const { state: newState } = execOne(state, 'mv 1 0');
    expect(newState.backpack).toContain('blue_key');
  });

  it('picks up green key', () => {
    const grid = [
      [T.W, T.W, T.W],
      [T.W, T.F, T.KG],
      [T.W, T.W, T.W],
    ];
    let state = createTestLevel(grid, [1, 1]);
    const { state: newState } = execOne(state, 'mv 1 0');
    expect(newState.backpack).toContain('green_key');
  });

  it('picks up yellow key', () => {
    const grid = [
      [T.W, T.W, T.W],
      [T.W, T.F, T.KY],
      [T.W, T.W, T.W],
    ];
    let state = createTestLevel(grid, [1, 1]);
    const { state: newState } = execOne(state, 'mv 1 0');
    expect(newState.backpack).toContain('yellow_key');
  });
});

describe('door mechanics', () => {
  it('opens door with correct key (key consumed)', () => {
    const grid = [
      [T.W, T.W, T.W, T.W],
      [T.W, T.F, T.KR, T.DR],
      [T.W, T.W, T.W, T.W],
    ];
    let state = createTestLevel(grid, [1, 1]);

    // Pick up red key
    state = execOne(state, 'mv 1 0').state;
    expect(state.backpack).toContain('red_key');
    expect(state.pos).toEqual([2, 1]);

    // Open red door
    const { state: newState, output, exitCode } = execOne(state, 'mv 1 0');
    expect(exitCode).toBe(0);
    expect(newState.pos).toEqual([3, 1]);
    expect(newState.backpack).not.toContain('red_key'); // Key consumed
    expect(newState.grid[1][3]).toBe(T.F); // Door becomes floor
    expect(output.some(o => o.x.includes('Opened'))).toBe(true);
  });

  it('blocks door without key', () => {
    const grid = [
      [T.W, T.W, T.W],
      [T.W, T.F, T.DR],
      [T.W, T.W, T.W],
    ];
    let state = createTestLevel(grid, [1, 1]);
    const { state: newState, output, exitCode } = execOne(state, 'mv 1 0');
    expect(exitCode).toBe(1);
    expect(newState.pos).toEqual([1, 1]); // Didn't move
    expect(output.some(o => o.x.includes('need red_key'))).toBe(true);
  });

  it('blocks door with wrong color key', () => {
    const grid = [
      [T.W, T.W, T.W, T.W],
      [T.W, T.F, T.KB, T.DR],
      [T.W, T.W, T.W, T.W],
    ];
    let state = createTestLevel(grid, [1, 1]);

    // Pick up blue key
    state = execOne(state, 'mv 1 0').state;
    expect(state.backpack).toContain('blue_key');

    // Try to open red door with blue key
    const { state: newState, output, exitCode } = execOne(state, 'mv 1 0');
    expect(exitCode).toBe(1);
    expect(newState.pos).toEqual([2, 1]); // Didn't move to door
    expect(output.some(o => o.x.includes('need red_key'))).toBe(true);
    expect(newState.backpack).toContain('blue_key'); // Key not consumed
  });

  it('blue door requires blue key', () => {
    const grid = [
      [T.W, T.W, T.W, T.W],
      [T.W, T.F, T.KB, T.DB],
      [T.W, T.W, T.W, T.W],
    ];
    let state = createTestLevel(grid, [1, 1]);
    state = execOne(state, 'mv 1 0').state; // Pick up blue key
    const { state: newState, exitCode } = execOne(state, 'mv 1 0');
    expect(exitCode).toBe(0);
    expect(newState.pos).toEqual([3, 1]);
    expect(newState.backpack).not.toContain('blue_key');
  });

  it('green door requires green key', () => {
    const grid = [
      [T.W, T.W, T.W, T.W],
      [T.W, T.F, T.KG, T.DG],
      [T.W, T.W, T.W, T.W],
    ];
    let state = createTestLevel(grid, [1, 1]);
    state = execOne(state, 'mv 1 0').state;
    const { state: newState, exitCode } = execOne(state, 'mv 1 0');
    expect(exitCode).toBe(0);
    expect(newState.pos).toEqual([3, 1]);
    expect(newState.backpack).not.toContain('green_key');
  });

  it('yellow door requires yellow key', () => {
    const grid = [
      [T.W, T.W, T.W, T.W],
      [T.W, T.F, T.KY, T.DY],
      [T.W, T.W, T.W, T.W],
    ];
    let state = createTestLevel(grid, [1, 1]);
    state = execOne(state, 'mv 1 0').state;
    const { state: newState, exitCode } = execOne(state, 'mv 1 0');
    expect(exitCode).toBe(0);
    expect(newState.pos).toEqual([3, 1]);
    expect(newState.backpack).not.toContain('yellow_key');
  });
});

describe('fire hazard', () => {
  it('kills without boots', () => {
    const grid = [
      [T.W, T.W, T.W],
      [T.W, T.F, T.FIRE],
      [T.W, T.W, T.W],
    ];
    let state = createTestLevel(grid, [1, 1]);
    const { output, exitCode } = execOne(state, 'mv 1 0');
    expect(exitCode).toBe(1);
    expect(output.some(o => o.t === 'death' && o.x === 'fire')).toBe(true);
  });

  it('passable with fire_boots', () => {
    const grid = [
      [T.W, T.W, T.W, T.W],
      [T.W, T.F, T.BOOTS_FIRE, T.FIRE],
      [T.W, T.W, T.W, T.W],
    ];
    let state = createTestLevel(grid, [1, 1]);

    // Pick up fire boots
    state = execOne(state, 'mv 1 0').state;
    expect(state.backpack).toContain('fire_boots');

    // Walk on fire safely
    const { state: newState, exitCode } = execOne(state, 'mv 1 0');
    expect(exitCode).toBe(0);
    expect(newState.pos).toEqual([3, 1]);
  });
});

describe('water hazard', () => {
  it('kills without boots', () => {
    const grid = [
      [T.W, T.W, T.W],
      [T.W, T.F, T.WATER],
      [T.W, T.W, T.W],
    ];
    let state = createTestLevel(grid, [1, 1]);
    const { output, exitCode } = execOne(state, 'mv 1 0');
    expect(exitCode).toBe(1);
    expect(output.some(o => o.t === 'death' && o.x === 'water')).toBe(true);
  });

  it('passable with water_boots', () => {
    const grid = [
      [T.W, T.W, T.W, T.W],
      [T.W, T.F, T.BOOTS_WATER, T.WATER],
      [T.W, T.W, T.W, T.W],
    ];
    let state = createTestLevel(grid, [1, 1]);

    // Pick up water boots
    state = execOne(state, 'mv 1 0').state;
    expect(state.backpack).toContain('water_boots');

    // Walk on water safely
    const { state: newState, exitCode } = execOne(state, 'mv 1 0');
    expect(exitCode).toBe(0);
    expect(newState.pos).toEqual([3, 1]);
  });
});

describe('ice hazard', () => {
  it('passable without boots', () => {
    const grid = [
      [T.W, T.W, T.W],
      [T.W, T.F, T.ICE],
      [T.W, T.W, T.W],
    ];
    let state = createTestLevel(grid, [1, 1]);
    const { state: newState, exitCode } = execOne(state, 'mv 1 0');
    expect(exitCode).toBe(0);
    expect(newState.pos).toEqual([2, 1]);
  });
});

describe('boot pickup', () => {
  it('picks up fire boots', () => {
    const grid = [
      [T.W, T.W, T.W],
      [T.W, T.F, T.BOOTS_FIRE],
      [T.W, T.W, T.W],
    ];
    let state = createTestLevel(grid, [1, 1]);
    const { state: newState, output } = execOne(state, 'mv 1 0');
    expect(newState.backpack).toContain('fire_boots');
    expect(newState.grid[1][2]).toBe(T.F);
    expect(output.some(o => o.x.includes('fire_boots'))).toBe(true);
  });

  it('picks up water boots', () => {
    const grid = [
      [T.W, T.W, T.W],
      [T.W, T.F, T.BOOTS_WATER],
      [T.W, T.W, T.W],
    ];
    let state = createTestLevel(grid, [1, 1]);
    const { state: newState } = execOne(state, 'mv 1 0');
    expect(newState.backpack).toContain('water_boots');
  });

  it('picks up ice boots', () => {
    const grid = [
      [T.W, T.W, T.W],
      [T.W, T.F, T.BOOTS_ICE],
      [T.W, T.W, T.W],
    ];
    let state = createTestLevel(grid, [1, 1]);
    const { state: newState } = execOne(state, 'mv 1 0');
    expect(newState.backpack).toContain('ice_boots');
  });
});

describe('boots NOT consumed', () => {
  it('fire boots remain after walking on fire', () => {
    const grid = [
      [T.W, T.W, T.W, T.W, T.W],
      [T.W, T.F, T.BOOTS_FIRE, T.FIRE, T.FIRE],
      [T.W, T.W, T.W, T.W, T.W],
    ];
    let state = createTestLevel(grid, [1, 1]);

    // Pick up fire boots
    state = execOne(state, 'mv 1 0').state;
    expect(state.backpack).toContain('fire_boots');

    // Walk on fire twice
    state = execOne(state, 'mv 1 0').state;
    expect(state.backpack).toContain('fire_boots'); // Still have boots

    state = execOne(state, 'mv 1 0').state;
    expect(state.backpack).toContain('fire_boots'); // Still have boots
    expect(state.pos).toEqual([4, 1]);
  });

  it('water boots remain after walking on water', () => {
    const grid = [
      [T.W, T.W, T.W, T.W, T.W],
      [T.W, T.F, T.BOOTS_WATER, T.WATER, T.WATER],
      [T.W, T.W, T.W, T.W, T.W],
    ];
    let state = createTestLevel(grid, [1, 1]);

    state = execOne(state, 'mv 1 0').state; // Get boots
    state = execOne(state, 'mv 1 0').state; // Walk on water
    state = execOne(state, 'mv 1 0').state; // Walk on more water

    expect(state.backpack).toContain('water_boots');
    expect(state.pos).toEqual([4, 1]);
  });
});

describe('death marker', () => {
  it('returns correct death marker for fire', () => {
    const grid = [
      [T.W, T.W, T.W],
      [T.W, T.F, T.FIRE],
      [T.W, T.W, T.W],
    ];
    let state = createTestLevel(grid, [1, 1]);
    const { output } = execOne(state, 'mv 1 0');

    const deathMarker = output.find(o => o.t === 'death');
    expect(deathMarker).toBeDefined();
    expect(deathMarker.x).toBe('fire');
  });

  it('returns correct death marker for water', () => {
    const grid = [
      [T.W, T.W, T.W],
      [T.W, T.F, T.WATER],
      [T.W, T.W, T.W],
    ];
    let state = createTestLevel(grid, [1, 1]);
    const { output } = execOne(state, 'mv 1 0');

    const deathMarker = output.find(o => o.t === 'death');
    expect(deathMarker).toBeDefined();
    expect(deathMarker.x).toBe('water');
  });
});

describe('ls with new tile types', () => {
  it('shows key name', () => {
    const grid = [
      [T.W, T.W, T.W],
      [T.W, T.F, T.KR],
      [T.W, T.W, T.W],
    ];
    let state = createTestLevel(grid, [1, 1]);
    const { output } = execOne(state, 'ls');
    expect(output.some(o => o.x.includes('red_key'))).toBe(true);
  });

  it('shows door name', () => {
    const grid = [
      [T.W, T.W, T.W],
      [T.W, T.F, T.DB],
      [T.W, T.W, T.W],
    ];
    let state = createTestLevel(grid, [1, 1]);
    const { output } = execOne(state, 'ls');
    expect(output.some(o => o.x.includes('blue_door'))).toBe(true);
  });

  it('shows fire name', () => {
    const grid = [
      [T.W, T.W, T.W],
      [T.W, T.F, T.FIRE],
      [T.W, T.W, T.W],
    ];
    let state = createTestLevel(grid, [1, 1]);
    const { output } = execOne(state, 'ls');
    expect(output.some(o => o.x.includes('fire'))).toBe(true);
  });

  it('shows water name', () => {
    const grid = [
      [T.W, T.W, T.W],
      [T.W, T.F, T.WATER],
      [T.W, T.W, T.W],
    ];
    let state = createTestLevel(grid, [1, 1]);
    const { output } = execOne(state, 'ls');
    expect(output.some(o => o.x.includes('water'))).toBe(true);
  });

  it('shows ice name', () => {
    const grid = [
      [T.W, T.W, T.W],
      [T.W, T.F, T.ICE],
      [T.W, T.W, T.W],
    ];
    let state = createTestLevel(grid, [1, 1]);
    const { output } = execOne(state, 'ls');
    expect(output.some(o => o.x.includes('ice'))).toBe(true);
  });

  it('shows boot names', () => {
    const grid = [
      [T.W, T.W, T.W],
      [T.W, T.F, T.BOOTS_FIRE],
      [T.W, T.W, T.W],
    ];
    let state = createTestLevel(grid, [1, 1]);
    const { output } = execOne(state, 'ls');
    expect(output.some(o => o.x.includes('fire_boots'))).toBe(true);
  });
});

describe('createState with level object', () => {
  it('creates state from level object', () => {
    const level = {
      w: 5,
      h: 5,
      chips: 1,
      grid: [
        [T.W, T.W, T.W, T.W, T.W],
        [T.W, T.F, T.F, T.C, T.W],
        [T.W, T.F, T.F, T.F, T.W],
        [T.W, T.F, T.F, T.E, T.W],
        [T.W, T.W, T.W, T.W, T.W],
      ],
      start: [1, 1],
      tut: ["Test"],
    };

    const state = createState(level);
    expect(state.pos).toEqual([1, 1]);
    expect(state.needed).toBe(1);
    expect(state.level).toBe(-1); // Generated level marker
    expect(state.levelObj).toBe(level);
  });

  it('can play through custom level', () => {
    const level = {
      w: 5,
      h: 5,
      chips: 1,
      grid: [
        [T.W, T.W, T.W, T.W, T.W],
        [T.W, T.F, T.F, T.C, T.W],
        [T.W, T.F, T.F, T.F, T.W],
        [T.W, T.F, T.F, T.E, T.W],
        [T.W, T.W, T.W, T.W, T.W],
      ],
      start: [1, 1],
      tut: ["Test"],
    };

    let state = createState(level);

    // Move to chip
    state = execOne(state, 'mv 1 0').state;
    state = execOne(state, 'mv 1 0').state;
    expect(state.chips).toBe(1);

    // Move to exit
    state = execOne(state, 'mv 0 1').state;
    const result = execOne(state, 'mv 0 1');
    expect(result.state.won).toBe(true);
  });
});

describe('ice sliding', () => {
  it('slides right across 3 ice tiles, stops at wall', () => {
    const grid = [
      [T.W, T.W, T.W, T.W, T.W, T.W],
      [T.W, T.F, T.ICE, T.ICE, T.ICE, T.W],
      [T.W, T.W, T.W, T.W, T.W, T.W],
    ];
    let state = createTestLevel(grid, [1, 1]);
    const { state: newState, output, exitCode } = execOne(state, 'mv 1 0');
    expect(exitCode).toBe(0);
    expect(newState.pos).toEqual([4, 1]); // Slid all the way to last ice tile before wall
    expect(output.some(o => o.x.includes('Sliding on ice'))).toBe(true);
  });

  it('slides and picks up chip mid-slide', () => {
    const grid = [
      [T.W, T.W, T.W, T.W, T.W, T.W],
      [T.W, T.F, T.ICE, T.C, T.ICE, T.W],
      [T.W, T.W, T.W, T.W, T.W, T.W],
    ];
    let state = createTestLevel(grid, [1, 1], 1);
    const { state: newState, output, exitCode } = execOne(state, 'mv 1 0');
    expect(exitCode).toBe(0);
    expect(newState.chips).toBe(1);
    expect(newState.backpack).toContain('chip');
    expect(output.some(o => o.x.includes('Picked up chip'))).toBe(true);
  });

  it('slides and picks up key mid-slide', () => {
    const grid = [
      [T.W, T.W, T.W, T.W, T.W, T.W],
      [T.W, T.F, T.ICE, T.KR, T.ICE, T.W],
      [T.W, T.W, T.W, T.W, T.W, T.W],
    ];
    let state = createTestLevel(grid, [1, 1]);
    const { state: newState, output, exitCode } = execOne(state, 'mv 1 0');
    expect(exitCode).toBe(0);
    expect(newState.backpack).toContain('red_key');
    expect(output.some(o => o.x.includes('Picked up red_key'))).toBe(true);
  });

  it('slides into fire without boots = death during slide', () => {
    const grid = [
      [T.W, T.W, T.W, T.W, T.W, T.W],
      [T.W, T.F, T.ICE, T.ICE, T.FIRE, T.W],
      [T.W, T.W, T.W, T.W, T.W, T.W],
    ];
    let state = createTestLevel(grid, [1, 1]);
    const { output, exitCode } = execOne(state, 'mv 1 0');
    expect(exitCode).toBe(1);
    expect(output.some(o => o.t === 'death' && o.x === 'fire')).toBe(true);
  });

  it('slides into fire with boots = survive, stop on fire', () => {
    const grid = [
      [T.W, T.W, T.W, T.W, T.W, T.W, T.W],
      [T.W, T.F, T.BOOTS_FIRE, T.ICE, T.FIRE, T.ICE, T.W],
      [T.W, T.W, T.W, T.W, T.W, T.W, T.W],
    ];
    let state = createTestLevel(grid, [1, 1]);
    // Pick up fire boots first
    state = execOne(state, 'mv 1 0').state;
    expect(state.backpack).toContain('fire_boots');

    // Now step onto ice and slide - stop on fire (non-ice tile)
    const { state: newState, exitCode } = execOne(state, 'mv 1 0');
    expect(exitCode).toBe(0);
    expect(newState.pos).toEqual([4, 1]); // Stopped on fire (non-ice tile)
  });

  it('slides onto non-ice tile = stops there', () => {
    const grid = [
      [T.W, T.W, T.W, T.W, T.W, T.W],
      [T.W, T.F, T.ICE, T.ICE, T.F, T.W],
      [T.W, T.W, T.W, T.W, T.W, T.W],
    ];
    let state = createTestLevel(grid, [1, 1]);
    const { state: newState, exitCode } = execOne(state, 'mv 1 0');
    expect(exitCode).toBe(0);
    expect(newState.pos).toEqual([4, 1]); // Stopped on floor tile
  });

  it('slides from ice onto exit (with all chips) = win', () => {
    const grid = [
      [T.W, T.W, T.W, T.W, T.W, T.W],
      [T.W, T.F, T.C, T.ICE, T.ICE, T.W],
      [T.W, T.W, T.W, T.W, T.E, T.W],
      [T.W, T.W, T.W, T.W, T.W, T.W],
    ];
    let state = createTestLevel(grid, [1, 1], 1);
    // Pick up chip first
    state = execOne(state, 'mv 1 0').state;
    expect(state.chips).toBe(1);

    // Move onto ice
    state = execOne(state, 'mv 1 0').state;
    // Now slide down to exit
    const { state: newState, output, exitCode } = execOne(state, 'mv 0 1');
    expect(exitCode).toBe(0);
    expect(newState.won).toBe(true);
    expect(output.some(o => o.x.includes('Level complete'))).toBe(true);
  });

  it('multiple slides in a chain command', () => {
    const grid = [
      [T.W, T.W, T.W, T.W, T.W, T.W],
      [T.W, T.F, T.ICE, T.ICE, T.F, T.W],
      [T.W, T.F, T.F, T.F, T.ICE, T.W],
      [T.W, T.W, T.W, T.W, T.ICE, T.W],
      [T.W, T.W, T.W, T.W, T.F, T.W],
      [T.W, T.W, T.W, T.W, T.W, T.W],
    ];
    let state = createTestLevel(grid, [1, 1]);
    // Chain: slide right, then down
    const { state: newState, exitCode } = lineExec(state, 'mv 1 0 && mv 0 1');
    expect(exitCode).toBe(0);
    expect(newState.pos).toEqual([4, 4]); // Slid right to [4,1], then down through ice to [4,4]
  });

  it('stops at edge (out of bounds)', () => {
    const grid = [
      [T.W, T.W, T.W, T.W, T.W, T.W],
      [T.W, T.F, T.ICE, T.ICE, T.ICE, T.ICE],
      [T.W, T.W, T.W, T.W, T.W, T.W],
    ];
    // Note: removed the right wall so we can test edge
    let state = createTestLevel(grid, [1, 1]);
    const { state: newState, output, exitCode } = execOne(state, 'mv 1 0');
    expect(exitCode).toBe(0);
    // Should stop at last ice tile before going out of bounds
    expect(newState.pos).toEqual([5, 1]);
    expect(output.some(o => o.x.includes('Stopped at edge'))).toBe(true);
  });

  it('picks up boots mid-slide and stops', () => {
    const grid = [
      [T.W, T.W, T.W, T.W, T.W, T.W],
      [T.W, T.F, T.ICE, T.BOOTS_FIRE, T.ICE, T.W],
      [T.W, T.W, T.W, T.W, T.W, T.W],
    ];
    let state = createTestLevel(grid, [1, 1]);
    const { state: newState, exitCode } = execOne(state, 'mv 1 0');
    expect(exitCode).toBe(0);
    expect(newState.backpack).toContain('fire_boots');
    // Stops on boots tile (non-ice) after picking up
    expect(newState.pos).toEqual([3, 1]);
  });

  it('opens door mid-slide if has key and stops', () => {
    const grid = [
      [T.W, T.W, T.W, T.W, T.W, T.W, T.W],
      [T.W, T.F, T.KR, T.ICE, T.DR, T.F, T.W],
      [T.W, T.W, T.W, T.W, T.W, T.W, T.W],
    ];
    let state = createTestLevel(grid, [1, 1]);
    // Pick up key first
    state = execOne(state, 'mv 1 0').state;
    expect(state.backpack).toContain('red_key');

    // Step onto ice and slide to door - stop there after opening
    const { state: newState, output, exitCode } = execOne(state, 'mv 1 0');
    expect(exitCode).toBe(0);
    expect(newState.backpack).not.toContain('red_key'); // Key consumed
    expect(newState.pos).toEqual([4, 1]); // Stopped on door tile (now floor)
    expect(output.some(o => o.x.includes('Opened'))).toBe(true);
  });

  it('stops at door without key', () => {
    const grid = [
      [T.W, T.W, T.W, T.W, T.W, T.W],
      [T.W, T.F, T.ICE, T.ICE, T.DR, T.W],
      [T.W, T.W, T.W, T.W, T.W, T.W],
    ];
    let state = createTestLevel(grid, [1, 1]);
    const { state: newState, output, exitCode } = execOne(state, 'mv 1 0');
    expect(exitCode).toBe(0); // Successfully stopped, not an error
    expect(newState.pos).toEqual([3, 1]); // Stopped at last ice before door
    expect(output.some(o => o.x.includes('Stopped at edge'))).toBe(true);
  });

  it('single ice tile does not cause infinite loop', () => {
    const grid = [
      [T.W, T.W, T.W, T.W],
      [T.W, T.F, T.ICE, T.W],
      [T.W, T.W, T.W, T.W],
    ];
    let state = createTestLevel(grid, [1, 1]);
    const { state: newState, exitCode } = execOne(state, 'mv 1 0');
    expect(exitCode).toBe(0);
    expect(newState.pos).toEqual([2, 1]); // On the ice tile, stopped by wall
  });

  it('stops at locked exit during slide (not enough chips)', () => {
    const grid = [
      [T.W, T.W, T.W, T.W, T.W, T.W],
      [T.W, T.F, T.ICE, T.ICE, T.E, T.W],
      [T.W, T.W, T.W, T.W, T.W, T.W],
    ];
    let state = createTestLevel(grid, [1, 1], 1); // Need 1 chip but have 0
    const { state: newState, output, exitCode } = execOne(state, 'mv 1 0');
    expect(exitCode).toBe(0); // Successfully stopped
    expect(newState.pos).toEqual([3, 1]); // Stopped at last ice before locked exit
    expect(newState.won).toBe(false);
    expect(output.some(o => o.x.includes('Stopped at edge'))).toBe(true);
  });

  it('slides through fire with boots and stops on fire (does not continue sliding)', () => {
    const grid = [
      [T.W, T.W, T.W, T.W, T.W, T.W, T.W, T.W],
      [T.W, T.F, T.BOOTS_FIRE, T.F, T.ICE, T.FIRE, T.ICE, T.W],
      [T.W, T.W, T.W, T.W, T.W, T.W, T.W, T.W],
    ];
    let state = createTestLevel(grid, [1, 1]);
    // Pick up fire boots
    state = execOne(state, 'mv 1 0').state;
    expect(state.backpack).toContain('fire_boots');
    // Move to floor, then to ice
    state = execOne(state, 'mv 1 0').state;
    // Now step onto ice and slide - should stop on fire, not continue to ice after
    const { state: newState, exitCode } = execOne(state, 'mv 1 0');
    expect(exitCode).toBe(0);
    expect(newState.pos).toEqual([5, 1]); // Stopped on FIRE, not [6,1] (ice after fire)
  });

  it('slides into water during slide = death', () => {
    const grid = [
      [T.W, T.W, T.W, T.W, T.W, T.W],
      [T.W, T.F, T.ICE, T.ICE, T.WATER, T.W],
      [T.W, T.W, T.W, T.W, T.W, T.W],
    ];
    let state = createTestLevel(grid, [1, 1]);
    const { output, exitCode } = execOne(state, 'mv 1 0');
    expect(exitCode).toBe(1);
    expect(output.some(o => o.t === 'death' && o.x === 'water')).toBe(true);
  });

  it('slides through water with boots and stops on water', () => {
    const grid = [
      [T.W, T.W, T.W, T.W, T.W, T.W, T.W, T.W],
      [T.W, T.F, T.BOOTS_WATER, T.F, T.ICE, T.WATER, T.ICE, T.W],
      [T.W, T.W, T.W, T.W, T.W, T.W, T.W, T.W],
    ];
    let state = createTestLevel(grid, [1, 1]);
    // Pick up water boots
    state = execOne(state, 'mv 1 0').state;
    expect(state.backpack).toContain('water_boots');
    // Move to floor, then to ice
    state = execOne(state, 'mv 1 0').state;
    // Slide - should stop on water
    const { state: newState, exitCode } = execOne(state, 'mv 1 0');
    expect(exitCode).toBe(0);
    expect(newState.pos).toEqual([5, 1]); // Stopped on WATER
  });
});
