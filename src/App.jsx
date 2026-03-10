import { useState, useEffect, useRef, useCallback } from "react";

const THEMES = {
  paper: {
    name:"Paper",bg:"#f5f0e8",fg:"#3a3a3a",muted:"#8a8070",accent:"#c0623a",
    ok:"#5a8a4a",gridBg:"#ebe6dc",gridBorder:"#d5cfc3",wallBg:"#8a8070",
    wall:"🧱",chip:"💎",exit:"🏁",player:"🧑",
    inputBg:"#ebe6dc",headerBg:"#ebe6dc",editorBg:"#ede8df",
    font:"'Courier New', monospace",lineHi:"#d8d0c0",
  },
  retro: {
    name:"Retro",bg:"#fef6e4",fg:"#172c66",muted:"#8e8d8a",accent:"#f582ae",
    ok:"#00b894",gridBg:"#fef6e4",gridBorder:"#e0d9cc",wallBg:"#172c66",
    wall:"🟦",chip:"⭐",exit:"🚪",player:"😎",
    inputBg:"#f9f1e1",headerBg:"#f9f1e1",editorBg:"#fdf3dc",
    font:"'Trebuchet MS', sans-serif",lineHi:"#f0e8d0",
  },
  candy: {
    name:"Candy",bg:"#fff0f5",fg:"#4a2040",muted:"#b08a9a",accent:"#ff6b9d",
    ok:"#51cf66",gridBg:"#fff5f9",gridBorder:"#f0d0e0",wallBg:"#e891b0",
    wall:"🍬",chip:"🍭",exit:"🌈",player:"🐱",
    inputBg:"#fff5f9",headerBg:"#fff0f5",editorBg:"#fff5f9",
    font:"'Georgia', serif",lineHi:"#ffe0ec",
  },
  forest: {
    name:"Forest",bg:"#f0f4e8",fg:"#2d3a1a",muted:"#7a8a60",accent:"#d4813a",
    ok:"#5a9a3a",gridBg:"#e8eede",gridBorder:"#c5d0a8",wallBg:"#6a7a50",
    wall:"🌲",chip:"🍄",exit:"🏕️",player:"🦊",
    inputBg:"#e8eede",headerBg:"#e8eede",editorBg:"#e5ecda",
    font:"'Palatino', serif",lineHi:"#d5ddbb",
  },
  terminal: {
    name:"Terminal",bg:"#0d1117",fg:"#c9d1d9",muted:"#8b949e",accent:"#58a6ff",
    ok:"#39d353",gridBg:"#0d1117",gridBorder:"#21262d",wallBg:"#1a1a2e",
    wall:"🧱",chip:"💎",exit:"🏁",player:"🧑",
    inputBg:"#161b22",headerBg:"#161b22",editorBg:"#161b22",
    font:"'IBM Plex Mono', monospace",lineHi:"#1c2333",
  },
};

const T={F:0,W:1,C:2,E:3};
const LEVELS=[
  {w:7,h:7,chips:2,grid:[[1,1,1,1,1,1,1],[1,0,0,0,0,0,1],[1,0,2,0,0,0,1],[1,0,0,0,1,0,1],[1,0,0,0,1,2,1],[1,0,0,0,0,3,1],[1,1,1,1,1,1,1]],start:[1,1],
    tut:["ChipShell v0.3 — type 'man' for commands","Collect all chips to unlock the exit.","Try: nano solve.sh to write a script","Default aliases: r/l/u/d for movement"]},
  {w:9,h:9,chips:4,grid:[[1,1,1,1,1,1,1,1,1],[1,0,0,0,1,0,0,0,1],[1,0,2,0,1,0,2,0,1],[1,0,0,0,0,0,0,0,1],[1,1,1,0,0,0,1,1,1],[1,0,0,0,0,0,0,0,1],[1,0,2,0,1,0,2,0,1],[1,0,0,0,1,0,0,3,1],[1,1,1,1,1,1,1,1,1]],start:[1,1],
    tut:["Level 2. Write scripts to navigate efficiently.","Try: nano solve.sh, then bash solve.sh"]},
  {w:11,h:11,chips:6,grid:[[1,1,1,1,1,1,1,1,1,1,1],[1,0,0,0,1,0,0,0,1,0,1],[1,0,2,0,0,0,1,0,0,0,1],[1,0,0,1,0,0,1,0,2,0,1],[1,1,0,1,0,0,0,0,1,0,1],[1,0,0,0,0,2,0,0,1,0,1],[1,0,1,1,0,0,1,0,0,0,1],[1,0,0,0,0,1,1,0,2,0,1],[1,2,0,1,0,0,0,0,1,0,1],[1,0,0,0,0,2,0,0,0,3,1],[1,1,1,1,1,1,1,1,1,1,1]],start:[1,1],
    tut:["Level 3. Script your way through."]},
];

const DIR={"1,0":"east","-1,0":"west","0,1":"south","0,-1":"north"};
const TNAME={[T.F]:"floor",[T.W]:"wall",[T.C]:"chip",[T.E]:"exit"};
const MAN={
  mv:"mv <dx> <dy> — Move. -1/1 per axis",
  ls:"ls [/backpack|/scripts] — List adjacent, inventory, or scripts",
  pwd:"pwd — Coordinates",whoami:"whoami — Stats",
  cat:"cat /tile|<script> — Inspect tile or view script",
  man:"man [cmd] — Help",clear:"clear — Clear output",
  alias:"alias name='cmd' — Create shortcut",
  unalias:"unalias name — Remove alias",
  repeat:"repeat N cmd — Run cmd N times",
  "for":"for i in 1..N; do cmd; done — Loop",
  theme:"theme [name] — Switch theme",
  nano:"nano <n>.sh — Open script editor",
  bash:"bash <n>.sh [--slow|--step|--instant] — Run script",
  reset:"reset — Restart current level (scripts preserved)",
  rm:"rm <n>.sh — Delete a script",
};
const VR=4;

export default function Game(){
  const [theme,setTheme]=useState("paper");
  const [lvl,setLvl]=useState(0);
  const [grid,setGrid]=useState(null);
  const [pos,setPos]=useState([0,0]);
  const [chips,setChips]=useState(0);
  const [need,setNeed]=useState(0);
  const [bp,setBp]=useState([]);
  const [log,setLog]=useState([]);
  const [inp,setInp]=useState("");
  const [hist,setHist]=useState([]);
  const [hI,setHI]=useState(-1);
  const [won,setWon]=useState(false);
  const [fin,setFin]=useState(false);
  const [als,setAls]=useState({r:"mv 1 0",l:"mv -1 0",u:"mv 0 -1",d:"mv 0 1"});
  const [scripts,setScripts]=useState({});
  const [editing,setEditing]=useState(null);
  const [editorText,setEditorText]=useState("");
  const [running,setRunning]=useState(false);
  const [runLines,setRunLines]=useState([]);
  const [runHighlight,setRunHighlight]=useState(-1);
  const [sheetSnap,setSheetSnap]=useState("log");
  const [isMobile,setIsMobile]=useState(false);

  const logR=useRef(null),inR=useRef(null),edR=useRef(null);
  const g=useRef(null),p=useRef(null),c=useRef(null),n=useRef(null),b_=useRef(null),w=useRef(false),a=useRef({r:"mv 1 0",l:"mv -1 0",u:"mv 0 -1",d:"mv 0 1"});
  const scriptsRef=useRef({});
  const runAbort=useRef(false);
  const lvlRef=useRef(0);

  const th=THEMES[theme];

  useEffect(()=>{
    const check=()=>setIsMobile(window.innerWidth<768);
    check();window.addEventListener("resize",check);
    return()=>window.removeEventListener("resize",check);
  },[]);

  const load=useCallback((i)=>{
    const lv=LEVELS[i];
    const gr=lv.grid.map(r=>[...r]);
    setGrid(gr);g.current=gr;
    setPos(lv.start);p.current=lv.start;
    setChips(0);c.current=0;
    setNeed(lv.chips);n.current=lv.chips;
    setBp([]);b_.current=[];
    setWon(false);w.current=false;
    setRunLines([]);setRunHighlight(-1);setRunning(false);
    runAbort.current=false;
    setLog(lv.tut.map(x=>({t:"s",x})));
    lvlRef.current=i;
  },[]);

  useEffect(()=>{load(0);},[load]);
  useEffect(()=>{logR.current&&(logR.current.scrollTop=logR.current.scrollHeight);},[log]);
  useEffect(()=>{if(!editing)inR.current?.focus();},[editing]);
  useEffect(()=>{a.current=als;},[als]);
  useEffect(()=>{scriptsRef.current=scripts;},[scripts]);

  const out=(x,t="o")=>setLog(prev=>[...prev,{t,x}]);
  const err=(x)=>out(x,"e");

  const one=(raw)=>{
    const s=raw.trim();if(!s)return 0;
    const parts=s.split(/\s+/);
    const cmd=parts[0];
    if(cmd.startsWith("#"))return 0;
    if(a.current[cmd]&&parts.length===1){return lineExec(a.current[cmd]);}
    if(cmd==="clear"){setLog([]);return 0;}
    if(cmd==="theme"){
      if(parts.length<2){out("Themes: "+Object.keys(THEMES).join(", "));return 0;}
      if(THEMES[parts[1]]){setTheme(parts[1]);out("Theme: "+parts[1]);return 0;}
      err("theme: '"+parts[1]+"' not found");return 1;
    }
    if(cmd==="man"){
      if(parts.length<2){out("Commands: "+Object.keys(MAN).join(", "));return 0;}
      MAN[parts[1]]?out(MAN[parts[1]]):err("No manual for '"+parts[1]+"'");return MAN[parts[1]]?0:1;
    }
    if(cmd==="mv"){
      if(parts.length<3){err("Usage: mv <dx> <dy>");return 1;}
      const dx=+parts[1],dy=+parts[2];
      if(isNaN(dx)||isNaN(dy)){err("mv: bad args");return 1;}
      if(Math.abs(dx)+Math.abs(dy)!==1){err("mv: cardinal only");return 1;}
      const lv=LEVELS[lvlRef.current],gr=g.current,pp=p.current;
      const nx=pp[0]+dx,ny=pp[1]+dy;
      if(nx<0||ny<0||nx>=lv.w||ny>=lv.h){err("mv: out of bounds");return 1;}
      const tile=gr[ny][nx];
      if(tile===T.W){err("mv: permission denied");return 1;}
      if(tile===T.E&&c.current<n.current){err("mv: exit locked ("+String(n.current-c.current)+" left)");return 1;}
      const np=[nx,ny];setPos(np);p.current=np;
      if(tile===T.C){
        gr[ny][nx]=T.F;setGrid(gr.map(r=>[...r]));g.current=gr;
        const nc=c.current+1;setChips(nc);c.current=nc;
        const nb=[...b_.current,"chip"];setBp(nb);b_.current=nb;
        out("Picked up chip");
        if(nc>=n.current)out("All chips collected! Exit unlocked.");
      }
      if(tile===T.E&&c.current>=n.current){
        w.current=true;setWon(true);
        if(lvlRef.current+1<LEVELS.length)out("Level complete! Press Enter.");
        else{out("All levels complete!");setFin(true);}
      }
      return 0;
    }
    if(cmd==="ls"){
      if(parts[1]==="/backpack"){out(b_.current.length?b_.current.join(", "):"(empty)");return 0;}
      if(parts[1]==="/scripts"){
        const k=Object.keys(scriptsRef.current);
        out(k.length?k.join("  "):"No scripts. Try: nano solve.sh");return 0;
      }
      const pp=p.current,gr=g.current,lv=LEVELS[lvlRef.current];
      [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy])=>{
        const x=pp[0]+dx,y=pp[1]+dy,nm=DIR[dx+","+dy];
        if(x<0||y<0||x>=lv.w||y>=lv.h){out(nm+": edge");return;}
        const t=gr[y][x];
        out(nm+": "+(t===T.E?(c.current>=n.current?"exit (open)":"exit (locked)"):(TNAME[t]||"floor")));
      });return 0;
    }
    if(cmd==="pwd"){out("["+p.current[0]+", "+p.current[1]+"]");return 0;}
    if(cmd==="whoami"){out("Player | Chips: "+c.current+"/"+n.current+" | Level: "+(lvlRef.current+1));return 0;}
    if(cmd==="cat"){
      if(parts[1]==="/tile"){const pp=p.current;out("["+pp[0]+","+pp[1]+"]: "+(TNAME[g.current[pp[1]][pp[0]]]||"floor"));return 0;}
      const sc=scriptsRef.current[parts[1]];
      if(sc!==undefined){out(sc||"(empty script)");return 0;}
      err("cat: try 'cat /tile' or 'cat <script.sh>'");return 1;
    }
    if(cmd==="alias"){
      if(parts.length<2){
        const k=Object.keys(a.current);
        if(!k.length){out("No aliases");return 0;}
        k.forEach(k=>out(k+"='"+a.current[k]+"'"));return 0;
      }
      const rest=parts.slice(1).join(" ");
      const m=rest.match(/^(\w+)=['"](.*?)['"]$/);
      if(!m){err("Usage: alias name='command'");return 1;}
      setAls(prev=>{const n={...prev,[m[1]]:m[2]};a.current=n;return n;});
      out("alias "+m[1]+"='"+m[2]+"'");return 0;
    }
    if(cmd==="unalias"){
      if(parts.length<2){err("Usage: unalias name");return 1;}
      setAls(prev=>{const n={...prev};delete n[parts[1]];a.current=n;return n;});
      out("Removed '"+parts[1]+"'");return 0;
    }
    if(cmd==="repeat"){
      if(parts.length<3){err("Usage: repeat N cmd");return 1;}
      const cnt=+parts[1];
      if(isNaN(cnt)||cnt<1||cnt>50){err("repeat: 1-50");return 1;}
      const sub=parts.slice(2).join(" ");
      for(let i=0;i<cnt;i++){const r=one(sub);if(r!==0||w.current)return r;}
      return 0;
    }
    if(cmd==="for"){
      const raw=parts.slice(1).join(" ");
      const m=raw.match(/^\w+\s+in\s+(\d+)\.\.(\d+);\s*do\s+(.+?);\s*done$/);
      if(!m){err("Usage: for i in 1..N; do cmd; done");return 1;}
      const s=+m[1],e=+m[2];
      if(e-s>50){err("for: max 50 iterations");return 1;}
      for(let i=s;i<=e;i++){const r=lineExec(m[3]);if(r!==0||w.current)return r;}
      return 0;
    }
    if(cmd==="nano"){
      if(parts.length<2){err("Usage: nano <n>.sh");return 1;}
      const fn=parts[1];
      setEditing(fn);
      setEditorText(scriptsRef.current[fn]||"# "+fn+"\n");
      if(isMobile)setSheetSnap("full");
      return 0;
    }
    if(cmd==="bash"){
      if(parts.length<2){err("Usage: bash <n>.sh [--slow|--step|--instant]");return 1;}
      const fn=parts[1],mode=parts[2]||"--slow";
      const sc=scriptsRef.current[fn];
      if(sc===undefined){err("bash: "+fn+": No such file");return 1;}
      runScript(fn,sc,mode);return 0;
    }
    if(cmd==="reset"){
      load(lvlRef.current);out("Level reset. Scripts preserved.");return 0;
    }
    if(cmd==="rm"){
      if(parts.length<2){err("Usage: rm <n>.sh");return 1;}
      const fn=parts[1];
      if(scriptsRef.current[fn]===undefined){err("rm: "+fn+": not found");return 1;}
      setScripts(prev=>{const n={...prev};delete n[fn];scriptsRef.current=n;return n;});
      out("Removed "+fn);return 0;
    }
    err(cmd+": command not found");return 1;
  };

  const lineExec=(l)=>{
    const segs=l.split("&&").map(s=>s.trim()).filter(Boolean);
    for(const s of segs){
      if(w.current)return 0;
      const r=one(s);if(r!==0)return r;
    }
    return 0;
  };

  const runScript=async(fn,src,mode)=>{
    const rawLines=src.split("\n");
    const lines=rawLines.map((l,i)=>({line:l,num:i+1,code:null,status:"pending"}));
    setRunLines(lines);setRunHighlight(-1);setRunning(true);
    runAbort.current=false;
    out("$ bash "+fn+" "+mode,"c");

    if(mode==="--instant"){
      const results=[...lines];
      for(let i=0;i<results.length;i++){
        if(runAbort.current)break;
        const l=results[i].line.trim();
        if(!l||l.startsWith("#")){results[i]={...results[i],code:0,status:"ok"};continue;}
        const code=lineExec(l);
        results[i]={...results[i],code,status:code===0?"ok":"err"};
        if(code!==0){
          err("Line "+results[i].num+": exit code "+code);
          setRunLines([...results]);setRunHighlight(i);setRunning(false);
          out(fn+": exited with code "+code+" at line "+results[i].num,"e");
          return;
        }
        if(w.current){
          results[i]={...results[i],code:0,status:"ok"};
          setRunLines([...results]);setRunHighlight(i);setRunning(false);
          out(fn+": exited with code 0");return;
        }
      }
      setRunLines([...results]);setRunning(false);
      out(fn+": exited with code 0");
      return;
    }

    for(let i=0;i<lines.length;i++){
      if(runAbort.current){setRunning(false);out(fn+": aborted","e");return;}
      setRunHighlight(i);
      const l=lines[i].line.trim();
      if(!l||l.startsWith("#")){
        lines[i]={...lines[i],code:0,status:"ok"};
        setRunLines([...lines]);
        if(mode==="--slow")await delay(80);
        continue;
      }

      if(mode==="--step"){
        await waitForStep();
      }

      const code=lineExec(l);
      lines[i]={...lines[i],code,status:code===0?"ok":"err"};
      setRunLines([...lines]);

      if(code!==0){
        err("Line "+lines[i].num+": exit code "+code);
        setRunning(false);
        out(fn+": exited with code "+code+" at line "+lines[i].num,"e");
        return;
      }
      if(w.current){
        setRunning(false);out(fn+": exited with code 0");return;
      }
      if(mode==="--slow")await delay(200);
    }
    setRunHighlight(-1);setRunning(false);
    out(fn+": exited with code 0");
  };

  const delay=(ms)=>new Promise(r=>setTimeout(r,ms));
  const stepResolve=useRef(null);
  const waitForStep=()=>new Promise(r=>{stepResolve.current=r;});

  const execInput=(raw)=>{
    const s=raw.trim();if(!s)return;
    setHist(prev=>[s,...prev]);setHI(-1);

    if(running&&stepResolve.current){
      stepResolve.current();stepResolve.current=null;
      return;
    }

    out("$ "+s,"c");
    if(won&&!fin){const nl=lvl+1;setLvl(nl);load(nl);return;}
    if(s==="abort"&&running){runAbort.current=true;return;}
    lineExec(s);
  };

  const saveEditor=()=>{
    if(!editing)return;
    setScripts(prev=>{const n={...prev,[editing]:editorText};scriptsRef.current=n;return n;});
    setEditing(null);
    out("Saved "+editing);
    if(isMobile)setSheetSnap("log");
  };

  const cancelEditor=()=>{
    setEditing(null);
    if(isMobile)setSheetSnap("log");
  };

  const onKey=(e)=>{
    if(e.key==="Enter"){execInput(inp);setInp("");}
    else if(e.key==="ArrowUp"){
      e.preventDefault();if(!hist.length)return;
      const i=Math.min(hI+1,hist.length-1);setHI(i);setInp(hist[i]);
    }else if(e.key==="ArrowDown"){
      e.preventDefault();
      if(hI<=0){setHI(-1);setInp("");return;}
      setHI(hI-1);setInp(hist[hI-1]);
    }
  };

  if(!grid)return null;

  const lv=LEVELS[lvl];
  const vx0=Math.max(0,Math.min(pos[0]-VR,lv.w-VR*2-1));
  const vy0=Math.max(0,Math.min(pos[1]-VR,lv.h-VR*2-1));
  const vx1=Math.min(lv.w,vx0+VR*2+1);
  const vy1=Math.min(lv.h,vy0+VR*2+1);

  const rows=[];
  for(let y=vy0;y<vy1;y++){
    const cells=[];
    for(let x=vx0;x<vx1;x++){
      const isP=x===pos[0]&&y===pos[1];
      const t=grid[y][x];
      let bg=th.gridBg;
      if(t===T.W)bg=th.wallBg;
      else if(t===T.E)bg=chips>=need?th.ok+"22":th.accent+"22";
      let em="";
      if(isP)em=th.player;
      else if(t===T.W)em=th.wall;
      else if(t===T.C)em=th.chip;
      else if(t===T.E)em=th.exit;
      cells.push(<span key={x} style={{
        display:"inline-flex",alignItems:"center",justifyContent:"center",
        width:34,height:34,fontSize:20,background:bg,
        border:"1px solid "+th.gridBorder,borderRadius:3,
      }}>{em}</span>);
    }
    rows.push(<div key={y} style={{display:"flex",gap:2}}>{cells}</div>);
  }

  const lc={s:th.accent,c:th.muted,o:th.fg,e:th.accent};

  const editorPanel=editing&&(
    <div style={{
      display:"flex",flexDirection:"column",
      background:th.editorBg,
      borderLeft:isMobile?"none":"1px solid "+th.gridBorder,
      borderTop:isMobile?"1px solid "+th.gridBorder:"none",
      overflow:"hidden",
      ...(isMobile?{flex:1}:{width:340}),
    }}>
      <div style={{
        padding:"8px 12px",display:"flex",justifyContent:"space-between",alignItems:"center",
        borderBottom:"1px solid "+th.gridBorder,fontSize:13,
      }}>
        <span style={{fontWeight:700,color:th.accent}}>nano {editing}</span>
        <div style={{display:"flex",gap:6}}>
          <button onClick={saveEditor} style={{
            background:th.ok,color:"#fff",border:"none",borderRadius:4,
            padding:"4px 10px",cursor:"pointer",fontSize:12,fontFamily:th.font,
          }}>Save</button>
          <button onClick={cancelEditor} style={{
            background:th.muted+"44",color:th.fg,border:"none",borderRadius:4,
            padding:"4px 10px",cursor:"pointer",fontSize:12,fontFamily:th.font,
          }}>Cancel</button>
        </div>
      </div>
      <div style={{flex:1,display:"flex",overflow:"hidden"}}>
        <div style={{
          padding:"8px 0",width:36,textAlign:"right",
          color:th.muted,fontSize:12,lineHeight:"21px",
          borderRight:"1px solid "+th.gridBorder,
          overflow:"hidden",userSelect:"none",
        }}>
          {editorText.split("\n").map((_,i)=>(
            <div key={i} style={{paddingRight:6}}>{i+1}</div>
          ))}
        </div>
        <textarea
          ref={edR}
          value={editorText}
          onChange={e=>setEditorText(e.target.value)}
          spellCheck={false}
          style={{
            flex:1,padding:8,background:"transparent",border:"none",outline:"none",
            color:th.fg,fontFamily:"'Courier New', monospace",fontSize:13,
            lineHeight:"21px",resize:"none",whiteSpace:"pre",overflowWrap:"normal",
            overflowX:"auto",
          }}
        />
      </div>
    </div>
  );

  const runPanel=runLines.length>0&&!editing&&(
    <div style={{
      borderLeft:isMobile?"none":"1px solid "+th.gridBorder,
      borderTop:isMobile?"1px solid "+th.gridBorder:"none",
      background:th.editorBg,overflow:"auto",
      ...(isMobile?{maxHeight:200}:{width:300}),
      padding:"8px 0",fontSize:12,
    }}>
      <div style={{padding:"0 12px 6px",fontWeight:700,color:th.accent,fontSize:11,textTransform:"uppercase",letterSpacing:1}}>
        Script {running?"running...":"finished"}
        {running&&<span onClick={()=>{runAbort.current=true;}} style={{marginLeft:8,color:th.accent,cursor:"pointer",textDecoration:"underline"}}>abort</span>}
      </div>
      {runLines.map((l,i)=>{
        const hi=i===runHighlight;
        const codeColor=l.code===null?th.muted:l.code===0?th.ok:th.accent;
        return(
          <div key={i} style={{
            display:"flex",gap:6,padding:"1px 12px",
            background:hi?th.lineHi:"transparent",
            fontFamily:"'Courier New', monospace",
            borderLeft:hi?"3px solid "+th.accent:"3px solid transparent",
          }}>
            <span style={{color:th.muted,width:24,textAlign:"right",flexShrink:0}}>{l.num}</span>
            <span style={{flex:1,color:hi?th.fg:th.muted,whiteSpace:"pre"}}>{l.line}</span>
            <span style={{color:codeColor,width:16,textAlign:"right",flexShrink:0}}>
              {l.code!==null?l.code:""}
            </span>
          </div>
        );
      })}
    </div>
  );

  if(isMobile){
    return(
      <div style={{background:th.bg,color:th.fg,fontFamily:th.font,height:"100vh",display:"flex",flexDirection:"column",overflow:"hidden"}}
        onClick={()=>{if(!editing)inR.current?.focus();}}>
        <div style={{padding:"10px 16px",background:th.headerBg,borderBottom:"1px solid "+th.gridBorder,display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:13}}>
          <span style={{fontWeight:700,color:th.accent,fontSize:15}}>ChipShell</span>
          <span style={{color:th.muted}}>Lv.{lvl+1} | {th.chip} {chips}/{need}</span>
        </div>
        <div style={{padding:12,display:"flex",justifyContent:"center",borderBottom:"1px solid "+th.gridBorder}}>
          <div style={{display:"flex",flexDirection:"column",gap:2}}>{rows}</div>
        </div>
        {editing?(
          editorPanel
        ):(
          <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
            {runPanel}
            <div ref={logR} style={{flex:1,overflow:"auto",padding:"8px 16px",fontSize:13,lineHeight:1.7}}>
              {log.map((l,i)=>(
                <div key={i} style={{color:lc[l.t],fontWeight:l.t==="c"?600:400,whiteSpace:"pre-wrap"}}>{l.x}</div>
              ))}
            </div>
          </div>
        )}
        {!editing&&(
          <div style={{padding:"10px 16px",background:th.inputBg,borderTop:"1px solid "+th.gridBorder,display:"flex",alignItems:"center",gap:8,fontSize:14}}>
            <span style={{color:th.ok,fontWeight:700}}>$</span>
            <input ref={inR} value={inp} onChange={e=>setInp(e.target.value)} onKeyDown={onKey}
              placeholder={running&&stepResolve.current?"press Enter to step...":"type a command..."}
              spellCheck={false} autoComplete="off"
              style={{flex:1,background:"transparent",border:"none",outline:"none",color:th.fg,fontFamily:"inherit",fontSize:"inherit",caretColor:th.accent}}/>
          </div>
        )}
      </div>
    );
  }

  return(
    <div style={{background:th.bg,color:th.fg,fontFamily:th.font,height:"100vh",display:"flex",flexDirection:"column",overflow:"hidden"}}
      onClick={()=>{if(!editing)inR.current?.focus();}}>
      <div style={{padding:"10px 16px",background:th.headerBg,borderBottom:"1px solid "+th.gridBorder,display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:13}}>
        <span style={{fontWeight:700,color:th.accent,fontSize:15}}>ChipShell</span>
        <span style={{color:th.muted}}>Lv.{lvl+1} | {th.chip} {chips}/{need}</span>
      </div>
      <div style={{flex:1,display:"flex",overflow:"hidden"}}>
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0}}>
          <div style={{padding:16,display:"flex",justifyContent:"center",borderBottom:"1px solid "+th.gridBorder}}>
            <div style={{display:"flex",flexDirection:"column",gap:2}}>{rows}</div>
          </div>
          <div ref={logR} style={{flex:1,overflow:"auto",padding:"8px 16px",fontSize:13,lineHeight:1.7}}>
            {log.map((l,i)=>(
              <div key={i} style={{color:lc[l.t],fontWeight:l.t==="c"?600:400,whiteSpace:"pre-wrap"}}>{l.x}</div>
            ))}
          </div>
        </div>
        {editorPanel}
        {!editing&&runPanel}
      </div>
      {!editing&&(
        <div style={{padding:"10px 16px",background:th.inputBg,borderTop:"1px solid "+th.gridBorder,display:"flex",alignItems:"center",gap:8,fontSize:14}}>
          <span style={{color:th.ok,fontWeight:700}}>$</span>
          <input ref={inR} value={inp} onChange={e=>setInp(e.target.value)} onKeyDown={onKey}
            placeholder={running&&stepResolve.current?"press Enter to step...":"type a command..."}
            spellCheck={false} autoComplete="off"
            style={{flex:1,background:"transparent",border:"none",outline:"none",color:th.fg,fontFamily:"inherit",fontSize:"inherit",caretColor:th.accent}}/>
        </div>
      )}
    </div>
  );
}
