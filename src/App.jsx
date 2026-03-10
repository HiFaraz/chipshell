import { useState, useEffect, useRef, useCallback } from "react";
import { THEMES } from "./themes.js";
import { T, LEVELS } from "./levels.js";
import { createState, lineExec } from "./interpreter.js";
import { generateLevel } from "./levelgen.js";
import { getTipForLevel, getLevelSubtitle, DEATH_MESSAGES } from "./tips.js";

const VR = 4;

export default function Game() {
  const [theme, setTheme] = useState("paper");
  const [lvl, setLvl] = useState(0);
  const [gameState, setGameState] = useState(null);
  const [log, setLog] = useState([]);
  const [inp, setInp] = useState("");
  const [hist, setHist] = useState([]);
  const [hI, setHI] = useState(-1);
  const [editing, setEditing] = useState(null);
  const [editorText, setEditorText] = useState("");
  const [running, setRunning] = useState(false);
  const [runLines, setRunLines] = useState([]);
  const [runHighlight, setRunHighlight] = useState(-1);
  const [isMobile, setIsMobile] = useState(false);
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [interstitialData, setInterstitialData] = useState(null);
  const [showDeath, setShowDeath] = useState(null); // null or { type: 'fire'|'water' }

  const logR = useRef(null), inR = useRef(null), edR = useRef(null);
  const stateRef = useRef(null);
  const runAbort = useRef(false);
  const deathTimeoutRef = useRef(null);

  const th = THEMES[theme];

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check(); window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const load = useCallback((i, preserveScripts = false) => {
    let newState;
    let tut;

    if (i < LEVELS.length) {
      // Use handcrafted level
      newState = createState(i);
      tut = LEVELS[i].tut;
    } else {
      // Generate procedural level
      const difficulty = Math.min(i - LEVELS.length + 1, 10);
      const level = generateLevel(difficulty);
      newState = createState(level);
      newState.level = i; // Track overall level number
      tut = level.tut;
    }

    if (preserveScripts && stateRef.current) {
      newState.scripts = { ...stateRef.current.scripts };
    }
    setGameState(newState);
    stateRef.current = newState;
    setRunLines([]); setRunHighlight(-1); setRunning(false);
    runAbort.current = false;
    setLog(tut.map(x => ({ t: "s", x })));
  }, []);

  useEffect(() => { load(0); }, [load]);
  useEffect(() => { logR.current && (logR.current.scrollTop = logR.current.scrollHeight); }, [log]);
  useEffect(() => { if (!editing) inR.current?.focus(); }, [editing]);

  const out = (x, t = "o") => setLog(prev => [...prev, { t, x }]);
  const err = (x) => out(x, "e");

  const applyOutput = (output) => {
    for (const o of output) {
      if (o.t === "clear") {
        setLog([]);
      } else if (o.t === "theme") {
        setTheme(o.x);
      } else if (o.t === "nano") {
        const fn = o.x;
        setEditing(fn);
        setEditorText(stateRef.current.scripts[fn] || "# " + fn + "\n");
      } else if (o.t === "bash") {
        runScript(o.x.fn, o.x.src, o.x.mode);
      } else if (o.t === "reset") {
        load(stateRef.current.level, true);
        out("Level reset. Scripts preserved.");
      } else if (o.t === "death") {
        // Handle death - show death screen
        // Determine death type: "fire", "water", or "entity" (for Process X caught you)
        let deathType = o.x;
        if (typeof o.x === 'string' && o.x.includes('Process')) {
          deathType = 'entity';
        }
        setShowDeath({ type: deathType, message: o.x });
        // Clear any existing timeout to prevent race conditions
        if (deathTimeoutRef.current) {
          clearTimeout(deathTimeoutRef.current);
        }
        deathTimeoutRef.current = setTimeout(() => {
          deathTimeoutRef.current = null;
          setShowDeath(null);
          load(stateRef.current.level, true);
        }, 2000);
      } else if (o.t === "o" || o.t === "e" || o.t === "s" || o.t === "c") {
        setLog(prev => [...prev, o]);
      }
    }
  };

  const execCommand = (raw) => {
    const result = lineExec(stateRef.current, raw);
    let newState = result.state;

    // Increment moves on successful command
    if (result.exitCode === 0) {
      newState = { ...newState, moves: newState.moves + 1 };
    }

    stateRef.current = newState;
    setGameState(newState);
    applyOutput(result.output);

    // Check for win - show interstitial
    if (newState.won && !showInterstitial) {
      setInterstitialData({
        level: lvl,
        moves: newState.moves,
        chips: newState.chips,
        levelObj: newState.levelObj,
      });
      setShowInterstitial(true);
    }

    return result.exitCode;
  };

  const runScript = async (fn, src, mode) => {
    const rawLines = src.split("\n");
    const lines = rawLines.map((l, i) => ({ line: l, num: i + 1, code: null, status: "pending" }));
    setRunLines(lines); setRunHighlight(-1); setRunning(true);
    runAbort.current = false;
    out("$ bash " + fn + " " + mode, "c");

    if (mode === "--instant") {
      const results = [...lines];
      for (let i = 0; i < results.length; i++) {
        if (runAbort.current) break;
        const l = results[i].line.trim();
        if (!l || l.startsWith("#")) { results[i] = { ...results[i], code: 0, status: "ok" }; continue; }
        const code = execCommand(l);
        results[i] = { ...results[i], code, status: code === 0 ? "ok" : "err" };
        if (code !== 0) {
          err("Line " + results[i].num + ": exit code " + code);
          setRunLines([...results]); setRunHighlight(i); setRunning(false);
          out(fn + ": exited with code " + code + " at line " + results[i].num, "e");
          return;
        }
        if (stateRef.current.won) {
          results[i] = { ...results[i], code: 0, status: "ok" };
          setRunLines([...results]); setRunHighlight(i); setRunning(false);
          out(fn + ": exited with code 0"); return;
        }
      }
      setRunLines([...results]); setRunning(false);
      out(fn + ": exited with code 0");
      return;
    }

    for (let i = 0; i < lines.length; i++) {
      if (runAbort.current) { setRunning(false); out(fn + ": aborted", "e"); return; }
      setRunHighlight(i);
      const l = lines[i].line.trim();
      if (!l || l.startsWith("#")) {
        lines[i] = { ...lines[i], code: 0, status: "ok" };
        setRunLines([...lines]);
        if (mode === "--slow") await delay(150);
        continue;
      }

      if (mode === "--step") {
        await waitForStep();
      }

      const code = execCommand(l);
      lines[i] = { ...lines[i], code, status: code === 0 ? "ok" : "err" };
      setRunLines([...lines]);

      if (code !== 0) {
        err("Line " + lines[i].num + ": exit code " + code);
        setRunning(false);
        out(fn + ": exited with code " + code + " at line " + lines[i].num, "e");
        return;
      }
      if (stateRef.current.won) {
        setRunning(false); out(fn + ": exited with code 0"); return;
      }
      if (mode === "--slow") await delay(750);
    }
    setRunHighlight(-1); setRunning(false);
    out(fn + ": exited with code 0");
  };

  const delay = (ms) => new Promise(r => setTimeout(r, ms));
  const stepResolve = useRef(null);
  const waitForStep = () => new Promise(r => { stepResolve.current = r; });

  const execInput = (raw) => {
    const s = raw.trim(); if (!s) return;

    // Handle interstitial dismissal (any input dismisses)
    if (showInterstitial) {
      if (s === "next" || s === "n") {
        dismissInterstitial();
      }
      return;
    }

    // Handle death screen dismissal
    if (showDeath) {
      if (deathTimeoutRef.current) {
        clearTimeout(deathTimeoutRef.current);
        deathTimeoutRef.current = null;
      }
      setShowDeath(null);
      load(stateRef.current.level, true);
      return;
    }

    setHist(prev => [s, ...prev]); setHI(-1);

    if (running && stepResolve.current) {
      stepResolve.current(); stepResolve.current = null;
      return;
    }

    out("$ " + s, "c");
    if (s === "abort" && running) { runAbort.current = true; return; }
    if (s === "next" || s === "n") {
      if (gameState?.won) {
        const nl = lvl + 1;
        setLvl(nl);
        load(nl);
        return;
      }
    }
    execCommand(s);
  };

  const dismissInterstitial = () => {
    setShowInterstitial(false);
    setInterstitialData(null);
    const nl = lvl + 1;
    setLvl(nl);
    load(nl);
  };

  const saveEditor = () => {
    if (!editing) return;
    const newScripts = { ...stateRef.current.scripts, [editing]: editorText };
    const newState = { ...stateRef.current, scripts: newScripts };
    stateRef.current = newState;
    setGameState(newState);
    setEditing(null);
    out("Saved " + editing);
  };

  const cancelEditor = () => {
    setEditing(null);
  };

  const onKey = (e) => {
    if (e.key === "Enter") {
      // Handle interstitial dismissal
      if (showInterstitial) {
        dismissInterstitial();
        setInp("");
        return;
      }
      // Handle death screen dismissal
      if (showDeath) {
        if (deathTimeoutRef.current) {
          clearTimeout(deathTimeoutRef.current);
          deathTimeoutRef.current = null;
        }
        setShowDeath(null);
        load(stateRef.current.level, true);
        setInp("");
        return;
      }
      execInput(inp);
      setInp("");
    } else if (e.key === "ArrowUp") {
      e.preventDefault(); if (!hist.length) return;
      const i = Math.min(hI + 1, hist.length - 1); setHI(i); setInp(hist[i]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (hI <= 0) { setHI(-1); setInp(""); return; }
      setHI(hI - 1); setInp(hist[hI - 1]);
    }
  };

  if (!gameState) return null;

  const { grid, pos, chips, needed, won, levelObj } = gameState;
  const lv = levelObj || LEVELS[lvl];
  const vx0 = Math.max(0, Math.min(pos[0] - VR, lv.w - VR * 2 - 1));
  const vy0 = Math.max(0, Math.min(pos[1] - VR, lv.h - VR * 2 - 1));
  const vx1 = Math.min(lv.w, vx0 + VR * 2 + 1);
  const vy1 = Math.min(lv.h, vy0 + VR * 2 + 1);

  // Helper to get tile emoji and background
  const getTileRender = (t) => {
    let em = "";
    let bg = th.gridBg;

    switch (t) {
      case T.W: em = th.wall; bg = th.wallBg; break;
      case T.C: em = th.chip; break;
      case T.E: em = th.exit; bg = chips >= needed ? th.ok + "22" : th.accent + "22"; break;
      // Keys
      case T.KR: em = th.keyRed; bg = th.keyRedBg; break;
      case T.KB: em = th.keyBlue; bg = th.keyBlueBg; break;
      case T.KG: em = th.keyGreen; bg = th.keyGreenBg; break;
      case T.KY: em = th.keyYellow; bg = th.keyYellowBg; break;
      // Doors
      case T.DR: em = th.doorRed; bg = th.doorRedBg; break;
      case T.DB: em = th.doorBlue; bg = th.doorBlueBg; break;
      case T.DG: em = th.doorGreen; bg = th.doorGreenBg; break;
      case T.DY: em = th.doorYellow; bg = th.doorYellowBg; break;
      // Hazards
      case T.FIRE: em = th.fire; bg = th.fireBg; break;
      case T.WATER: em = th.water; bg = th.waterBg; break;
      case T.ICE: em = th.ice; bg = th.iceBg; break;
      // Boots
      case T.BOOTS_FIRE: em = th.bootsFire; bg = th.fireBg + "88"; break;
      case T.BOOTS_WATER: em = th.bootsWater; bg = th.waterBg + "88"; break;
      case T.BOOTS_ICE: em = th.bootsIce; bg = th.iceBg + "88"; break;
      default: break;
    }
    return { em, bg };
  };

  // Build entity position lookup
  const entityMap = new Map();
  if (gameState.entities) {
    for (const entity of gameState.entities) {
      entityMap.set(entity.pos[0] + ',' + entity.pos[1], entity);
    }
  }

  const rows = [];
  for (let y = vy0; y < vy1; y++) {
    const cells = [];
    for (let x = vx0; x < vx1; x++) {
      const isP = x === pos[0] && y === pos[1];
      const entity = entityMap.get(x + ',' + y);
      const t = grid[y][x];
      const { em, bg } = getTileRender(t);

      // Determine what to render: player > entity > tile
      let content = em;
      if (entity) {
        content = th.crawler || th.player;
      }
      if (isP) {
        content = th.player;
      }

      cells.push(<span key={x} style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 34, height: 34, fontSize: 20, background: bg,
        border: "1px solid " + th.gridBorder, borderRadius: 3,
      }}>{content}</span>);
    }
    rows.push(<div key={y} style={{ display: "flex", gap: 2 }}>{cells}</div>);
  }

  const lc = { s: th.accent, c: th.muted, o: th.fg, e: th.accent };

  const editorPanel = editing && (
    <div style={{
      display: "flex", flexDirection: "column",
      background: th.editorBg,
      borderLeft: isMobile ? "none" : "1px solid " + th.gridBorder,
      borderTop: isMobile ? "1px solid " + th.gridBorder : "none",
      overflow: "hidden",
      ...(isMobile ? { flex: 1 } : { width: 340 }),
    }}>
      <div style={{
        padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center",
        borderBottom: "1px solid " + th.gridBorder, fontSize: 13,
      }}>
        <span style={{ fontWeight: 700, color: th.accent }}>nano {editing}</span>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={saveEditor} style={{
            background: th.ok, color: "#fff", border: "none", borderRadius: 4,
            padding: "4px 10px", cursor: "pointer", fontSize: 12, fontFamily: th.font,
          }}>Save</button>
          <button onClick={cancelEditor} style={{
            background: th.muted + "44", color: th.fg, border: "none", borderRadius: 4,
            padding: "4px 10px", cursor: "pointer", fontSize: 12, fontFamily: th.font,
          }}>Cancel</button>
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <div style={{
          padding: "8px 0", width: 36, textAlign: "right",
          color: th.muted, fontSize: 12, lineHeight: "21px",
          borderRight: "1px solid " + th.gridBorder,
          overflow: "hidden", userSelect: "none",
        }}>
          {editorText.split("\n").map((_, i) => (
            <div key={i} style={{ paddingRight: 6 }}>{i + 1}</div>
          ))}
        </div>
        <textarea
          ref={edR}
          value={editorText}
          onChange={e => setEditorText(e.target.value)}
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
          aria-label={"Script editor for " + editing}
          style={{
            flex: 1, padding: 8, background: "transparent", border: "none", outline: "none",
            color: th.fg, fontFamily: "'Courier New', monospace", fontSize: 13,
            lineHeight: "21px", resize: "none", whiteSpace: "pre", overflowWrap: "normal",
            overflowX: "auto",
          }}
        />
      </div>
    </div>
  );

  const runPanel = runLines.length > 0 && !editing && (
    <div style={{
      borderLeft: isMobile ? "none" : "1px solid " + th.gridBorder,
      borderTop: isMobile ? "1px solid " + th.gridBorder : "none",
      background: th.editorBg, overflow: "auto",
      ...(isMobile ? { maxHeight: 200 } : { width: 300 }),
      padding: "8px 0", fontSize: 12,
    }}>
      <div style={{ padding: "0 12px 6px", fontWeight: 700, color: th.accent, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>
        Script {running ? "running..." : "finished"}
        {running && <button onClick={() => { runAbort.current = true; }} aria-label="Abort script execution" style={{ marginLeft: 8, color: th.accent, cursor: "pointer", textDecoration: "underline", background: "none", border: "none", padding: 0, font: "inherit" }}>abort</button>}
      </div>
      {runLines.map((l, i) => {
        const hi = i === runHighlight;
        const codeColor = l.code === null ? th.muted : l.code === 0 ? th.ok : th.accent;
        return (
          <div key={i} style={{
            display: "flex", gap: 6, padding: "1px 12px",
            background: hi ? th.lineHi : "transparent",
            fontFamily: "'Courier New', monospace",
            borderLeft: hi ? "3px solid " + th.accent : "3px solid transparent",
          }}>
            <span style={{ color: th.muted, width: 24, textAlign: "right", flexShrink: 0 }}>{l.num}</span>
            <span style={{ flex: 1, color: hi ? th.fg : th.muted, whiteSpace: "pre" }}>{l.line}</span>
            <span style={{ color: codeColor, width: 16, textAlign: "right", flexShrink: 0 }}>
              {l.code !== null ? l.code : ""}
            </span>
          </div>
        );
      })}
    </div>
  );

  // Theme-specific interstitial styling
  const getInterstitialStyle = () => {
    const base = {
      background: th.bg,
      color: th.fg,
      fontFamily: th.font,
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 32,
      textAlign: "center",
    };
    return base;
  };

  // Celebration interstitial screen
  if (showInterstitial && interstitialData) {
    const tip = getTipForLevel(interstitialData.level);
    const subtitle = getLevelSubtitle(interstitialData.level, interstitialData.levelObj);
    const isTerminal = theme === "terminal";
    const isCandy = theme === "candy";
    const isRetro = theme === "retro";

    return (
      <div style={getInterstitialStyle()} onClick={() => inR.current?.focus()}>
        <div style={{ maxWidth: 500, width: "100%" }}>
          {/* Header */}
          <div style={{
            fontSize: isTerminal ? 28 : 36,
            fontWeight: 700,
            color: th.accent,
            marginBottom: 8,
            letterSpacing: isTerminal ? 4 : 2,
            fontFamily: isTerminal ? "'IBM Plex Mono', monospace" : th.font,
          }}>
            {isTerminal ? "MISSION COMPLETE" : isCandy ? "LEVEL COMPLETE!" : "LEVEL COMPLETE"}
          </div>

          {/* Level number and subtitle */}
          <div style={{
            fontSize: 20,
            color: th.fg,
            marginBottom: 24,
          }}>
            Level {interstitialData.level + 1} {isCandy && "🎉"}
          </div>
          <div style={{
            fontSize: 16,
            color: th.muted,
            marginBottom: 32,
            fontStyle: theme === "paper" || theme === "forest" ? "italic" : "normal",
          }}>
            {subtitle}
          </div>

          {/* Stats */}
          <div style={{
            display: "flex",
            justifyContent: "center",
            gap: 32,
            marginBottom: 32,
            padding: "16px 24px",
            background: th.gridBg,
            borderRadius: 8,
            border: "1px solid " + th.gridBorder,
          }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: th.ok }}>{interstitialData.moves}</div>
              <div style={{ fontSize: 12, color: th.muted, textTransform: "uppercase", letterSpacing: 1 }}>Moves</div>
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: th.ok }}>{interstitialData.chips}</div>
              <div style={{ fontSize: 12, color: th.muted, textTransform: "uppercase", letterSpacing: 1 }}>Chips</div>
            </div>
          </div>

          {/* Tip */}
          <div style={{
            padding: "16px 20px",
            background: isTerminal ? th.headerBg : th.inputBg,
            borderRadius: 6,
            marginBottom: 32,
            borderLeft: "3px solid " + th.accent,
          }}>
            <div style={{ fontSize: 11, color: th.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
              {isTerminal ? "> TIP" : "Tip"}
            </div>
            <div style={{
              fontSize: 14,
              color: th.fg,
              fontFamily: "'Courier New', monospace",
              lineHeight: 1.5,
            }}>
              {tip}
            </div>
          </div>

          {/* Continue prompt */}
          <div style={{
            fontSize: 14,
            color: th.muted,
            animation: "pulse 2s infinite",
          }}>
            {isTerminal ? "Press Enter to proceed..." : isRetro ? "Press Enter or type 'next'" : "Press Enter to continue"}
          </div>
        </div>

        {/* Hidden input to capture Enter key */}
        <input
          ref={inR}
          value={inp}
          onChange={e => setInp(e.target.value)}
          onKeyDown={onKey}
          style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
          autoFocus
          autoCapitalize="none"
          autoCorrect="off"
          inputMode="text"
          aria-label="Press Enter to continue"
        />
      </div>
    );
  }

  // Death screen
  if (showDeath) {
    const deathInfo = DEATH_MESSAGES[showDeath.type] || { header: "GAME OVER", message: "You died!", tip: "Be more careful next time." };
    const isTerminal = theme === "terminal";

    return (
      <div style={{
        ...getInterstitialStyle(),
        background: isTerminal ? "#1a0505" : th.bg,
      }} onClick={() => {
        if (deathTimeoutRef.current) {
          clearTimeout(deathTimeoutRef.current);
          deathTimeoutRef.current = null;
        }
        setShowDeath(null);
        load(stateRef.current.level, true);
      }}>
        <div style={{ maxWidth: 400, width: "100%" }}>
          {/* Header */}
          <div style={{
            fontSize: isTerminal ? 28 : 32,
            fontWeight: 700,
            color: th.accent,
            marginBottom: 16,
            letterSpacing: isTerminal ? 4 : 2,
          }}>
            {deathInfo.header}
          </div>

          {/* Death message */}
          <div style={{
            fontSize: 16,
            color: th.fg,
            marginBottom: 24,
          }}>
            {showDeath.message && showDeath.type === 'entity' ? showDeath.message : deathInfo.message}
          </div>

          {/* Tip */}
          <div style={{
            padding: "12px 16px",
            background: th.gridBg,
            borderRadius: 6,
            marginBottom: 24,
            borderLeft: "3px solid " + th.accent,
          }}>
            <div style={{
              fontSize: 13,
              color: th.muted,
              fontFamily: "'Courier New', monospace",
            }}>
              {deathInfo.tip}
            </div>
          </div>

          {/* Continue prompt */}
          <div style={{
            fontSize: 13,
            color: th.muted,
          }}>
            Resetting in 2s... (or press Enter)
          </div>
        </div>

        {/* Hidden input */}
        <input
          ref={inR}
          onKeyDown={onKey}
          style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
          autoFocus
          autoCapitalize="none"
          autoCorrect="off"
          inputMode="text"
          aria-label="Press Enter to continue"
        />
      </div>
    );
  }

  if (isMobile) {
    return (
      <div style={{ background: th.bg, color: th.fg, fontFamily: th.font, height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}
        onClick={() => { if (!editing) inR.current?.focus(); }}>
        <div style={{ padding: "10px 16px", background: th.headerBg, borderBottom: "1px solid " + th.gridBorder, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
          <span style={{ fontWeight: 700, color: th.accent, fontSize: 15 }}>ChipShell</span>
          <span style={{ color: th.muted }}>Lv.{lvl + 1} | {th.chip} {chips}/{needed}</span>
        </div>
        <div style={{ padding: 12, display: "flex", justifyContent: "center", borderBottom: "1px solid " + th.gridBorder }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>{rows}</div>
        </div>
        {editing ? (
          editorPanel
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {runPanel}
            <div ref={logR} style={{ flex: 1, overflow: "auto", padding: "8px 16px", fontSize: 13, lineHeight: 1.7 }}>
              {log.map((l, i) => (
                <div key={i} style={{ color: lc[l.t], fontWeight: l.t === "c" ? 600 : 400, whiteSpace: "pre-wrap" }}>{l.x}</div>
              ))}
            </div>
          </div>
        )}
        {!editing && (
          <div style={{ padding: "10px 16px", background: th.inputBg, borderTop: "1px solid " + th.gridBorder, display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
            <span style={{ color: th.ok, fontWeight: 700 }}>$</span>
            <input ref={inR} value={inp} onChange={e => setInp(e.target.value)} onKeyDown={onKey}
              placeholder={running && stepResolve.current ? "press Enter to step..." : "type a command..."}
              spellCheck={false} autoComplete="off" autoCapitalize="none" autoCorrect="off" inputMode="text" aria-label="Command input"
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: th.fg, fontFamily: "inherit", fontSize: "inherit", caretColor: th.accent }} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ background: th.bg, color: th.fg, fontFamily: th.font, height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}
      onClick={() => { if (!editing) inR.current?.focus(); }}>
      <div style={{ padding: "10px 16px", background: th.headerBg, borderBottom: "1px solid " + th.gridBorder, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
        <span style={{ fontWeight: 700, color: th.accent, fontSize: 15 }}>ChipShell</span>
        <span style={{ color: th.muted }}>Lv.{lvl + 1} | {th.chip} {chips}/{needed}</span>
      </div>
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
          <div style={{ padding: 16, display: "flex", justifyContent: "center", borderBottom: "1px solid " + th.gridBorder }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>{rows}</div>
          </div>
          <div ref={logR} style={{ flex: 1, overflow: "auto", padding: "8px 16px", fontSize: 13, lineHeight: 1.7 }}>
            {log.map((l, i) => (
              <div key={i} style={{ color: lc[l.t], fontWeight: l.t === "c" ? 600 : 400, whiteSpace: "pre-wrap" }}>{l.x}</div>
            ))}
          </div>
        </div>
        {editorPanel}
        {!editing && runPanel}
      </div>
      {!editing && (
        <div style={{ padding: "10px 16px", background: th.inputBg, borderTop: "1px solid " + th.gridBorder, display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
          <span style={{ color: th.ok, fontWeight: 700 }}>$</span>
          <input ref={inR} value={inp} onChange={e => setInp(e.target.value)} onKeyDown={onKey}
            placeholder={running && stepResolve.current ? "press Enter to step..." : "type a command..."}
            spellCheck={false} autoComplete="off" autoCapitalize="none" autoCorrect="off" inputMode="text" aria-label="Command input"
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: th.fg, fontFamily: "inherit", fontSize: "inherit", caretColor: th.accent }} />
        </div>
      )}
    </div>
  );
}
