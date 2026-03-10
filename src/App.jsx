import { useState, useEffect, useRef, useCallback } from "react";
import { THEMES } from "./themes.js";
import { T, LEVELS } from "./levels.js";
import { createState, lineExec } from "./interpreter.js";
import { generateLevel } from "./levelgen.js";

const VR = 4;

export default function Game() {
  const [theme, setTheme] = useState("paper");
  const [lvl, setLvl] = useState(0);
  const [gameState, setGameState] = useState(null);
  const [log, setLog] = useState([]);
  const [inp, setInp] = useState("");
  const [hist, setHist] = useState([]);
  const [hI, setHI] = useState(-1);
  const [fin, setFin] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editorText, setEditorText] = useState("");
  const [running, setRunning] = useState(false);
  const [runLines, setRunLines] = useState([]);
  const [runHighlight, setRunHighlight] = useState(-1);
  const [sheetSnap, setSheetSnap] = useState("log");
  const [isMobile, setIsMobile] = useState(false);

  const logR = useRef(null), inR = useRef(null), edR = useRef(null);
  const stateRef = useRef(null);
  const runAbort = useRef(false);

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
        if (isMobile) setSheetSnap("full");
      } else if (o.t === "bash") {
        runScript(o.x.fn, o.x.src, o.x.mode);
      } else if (o.t === "reset") {
        load(stateRef.current.level, true);
        out("Level reset. Scripts preserved.");
      } else if (o.t === "death") {
        // Handle death - show message and auto-reset after 1s
        err("You died! (" + o.x + ")");
        setTimeout(() => {
          load(stateRef.current.level, true);
          out("Level reset. Scripts preserved.");
        }, 1000);
      } else if (o.t === "o" || o.t === "e" || o.t === "s" || o.t === "c") {
        setLog(prev => [...prev, o]);
      }
    }
  };

  const execCommand = (raw) => {
    const result = lineExec(stateRef.current, raw);
    stateRef.current = result.state;
    setGameState(result.state);
    applyOutput(result.output);
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
        if (mode === "--slow") await delay(80);
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
      if (mode === "--slow") await delay(200);
    }
    setRunHighlight(-1); setRunning(false);
    out(fn + ": exited with code 0");
  };

  const delay = (ms) => new Promise(r => setTimeout(r, ms));
  const stepResolve = useRef(null);
  const waitForStep = () => new Promise(r => { stepResolve.current = r; });

  const execInput = (raw) => {
    const s = raw.trim(); if (!s) return;
    setHist(prev => [s, ...prev]); setHI(-1);

    if (running && stepResolve.current) {
      stepResolve.current(); stepResolve.current = null;
      return;
    }

    out("$ " + s, "c");
    if (gameState?.won && !fin) {
      const nl = lvl + 1;
      // No longer cap at LEVELS.length - procedural levels continue forever
      setLvl(nl);
      load(nl);
      return;
    }
    if (s === "abort" && running) { runAbort.current = true; return; }
    execCommand(s);
  };

  const saveEditor = () => {
    if (!editing) return;
    const newScripts = { ...stateRef.current.scripts, [editing]: editorText };
    const newState = { ...stateRef.current, scripts: newScripts };
    stateRef.current = newState;
    setGameState(newState);
    setEditing(null);
    out("Saved " + editing);
    if (isMobile) setSheetSnap("log");
  };

  const cancelEditor = () => {
    setEditing(null);
    if (isMobile) setSheetSnap("log");
  };

  const onKey = (e) => {
    if (e.key === "Enter") { execInput(inp); setInp(""); }
    else if (e.key === "ArrowUp") {
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

  const rows = [];
  for (let y = vy0; y < vy1; y++) {
    const cells = [];
    for (let x = vx0; x < vx1; x++) {
      const isP = x === pos[0] && y === pos[1];
      const t = grid[y][x];
      const { em, bg } = getTileRender(t);
      cells.push(<span key={x} style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 34, height: 34, fontSize: 20, background: bg,
        border: "1px solid " + th.gridBorder, borderRadius: 3,
      }}>{isP ? th.player : em}</span>);
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
              spellCheck={false} autoComplete="off" aria-label="Command input"
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
            spellCheck={false} autoComplete="off" aria-label="Command input"
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: th.fg, fontFamily: "inherit", fontSize: "inherit", caretColor: th.accent }} />
        </div>
      )}
    </div>
  );
}
