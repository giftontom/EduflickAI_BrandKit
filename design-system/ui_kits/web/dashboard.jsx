/* ============================================================
   EDUFLICK AI · WEB UI KIT · dashboard screens
   Overview · Library · Analytics · Learners
   ============================================================ */
const CONTENT = [
  { t:'mitosis', s:'biology', c:'#5B5BF0', f:8, st:'live' },
  { t:'supply & demand', s:'economics', c:'#5B5BF0', f:6, st:'live' },
  { t:'photons', s:'physics', c:'#3A2BB8', f:5, st:'review' },
  { t:'the krebs cycle', s:'biology', c:'#5B5BF0', f:8, st:'live' },
  { t:'derivatives', s:'math', c:'#4B3FE0', f:7, st:'live' },
  { t:'the cold war', s:'history', c:'#261A82', f:9, st:'draft' },
  { t:'covalent bonds', s:'chemistry', c:'#6E78F5', f:6, st:'live' },
  { t:'opportunity cost', s:'economics', c:'#5B5BF0', f:4, st:'review' },
];
const LEARNERS = [
  { n:'Riya Sharma', sub:'biology', prog:82, tier:'flame', streak:34 },
  { n:'Arjun Nair', sub:'physics', prog:67, tier:'ember', streak:9 },
  { n:'Meera Iyer', sub:'economics', prog:91, tier:'blaze', streak:112 },
  { n:'Dev Patel', sub:'math', prog:54, tier:'ember', streak:7 },
  { n:'Sara Khan', sub:'chemistry', prog:73, tier:'flame', streak:41 },
];
const TIER_GLOW = { flicker:'rgba(91,91,240,0.4)', ember:'rgba(91,91,240,0.6)', flame:'rgba(110,120,245,0.85)', blaze:'rgba(139,151,255,1)', legend:'rgba(183,192,255,1)' };

function StatusBadge({ st }) {
  const map = { live:[T.success,'rgba(74,222,128,0.1)','rgba(74,222,128,0.3)'], review:[T.warn,'rgba(255,110,90,0.1)','rgba(255,110,90,0.32)'], draft:[T.muted,'rgba(122,127,144,0.12)',T.line2] };
  const [c,bg,bd]=map[st];
  return <span style={{ fontFamily:T.fMono, fontSize:8.5, letterSpacing:'0.14em', textTransform:'uppercase', color:c, background:bg, border:`1px solid ${bd}`, padding:'4px 8px', borderRadius:4 }}>{st}</span>;
}
function SubjectDot({ c, letter }) {
  return <div style={{ width:30, height:30, flexShrink:0, background:c, display:'flex', alignItems:'center', justifyContent:'center',
    clipPath:'polygon(0% 0%,100% 0%,100% 45%,67% 62.5%,100% 79%,100% 100%,0% 100%)' }}>
    <span style={{ fontFamily:T.fSerif, fontStyle:'italic', fontSize:15, color:T.paper }}>{letter}</span></div>;
}

function PageHead({ title, accent, sub, right }) {
  return (<div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:22 }}>
    <div><div style={{ fontFamily:T.fDisplay, fontWeight:800, fontSize:26, letterSpacing:'-0.03em', textTransform:'lowercase', color:T.paper }}>
      {title} {accent && <Em>{accent}</Em>}</div>
      {sub && <div style={{ marginTop:6 }}><Mono size={10} color={T.muted}>{sub}</Mono></div>}</div>
    {right}</div>);
}

function Overview() {
  const bars=[{l:'M',v:62},{l:'T',v:78},{l:'W',v:54},{l:'T',v:88},{l:'F',v:96,hi:true},{l:'S',v:71},{l:'S',v:44},
    {l:'M',v:69},{l:'T',v:82},{l:'W',v:90},{l:'T',v:103,hi:true},{l:'F',v:97},{l:'S',v:76},{l:'S',v:58}];
  const subjects=[{n:'biology',v:84},{n:'economics',v:71},{n:'physics',v:63},{n:'math',v:52},{n:'chemistry',v:38}];
  return (<div>
    <PageHead title="dashboard" accent="overview." sub="all institutions · last 14 days"
      right={<Button kind="secondary" size="sm" icon="download">export</Button>} />
    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:16 }}>
      <StatCard label="active learners" value="2,847" delta="↑ 340% YoY" />
      <StatCard label="flicks completed" value="12.4k" delta="↑ 8% this week" />
      <StatCard label="avg. retention" value="78" unit="%" delta="concepts retained" deltaColor={T.i300} />
    </div>
    <div style={{ display:'grid', gridTemplateColumns:'1.6fr 1fr', gap:16, marginBottom:16 }}>
      <Panel title="flicks completed" accent="· 14 days" right={<Mono size={9}>peak fri</Mono>}>
        <BarChart data={bars} />
      </Panel>
      <Panel title="top" accent="subjects">
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {subjects.map(s=>(<div key={s.n}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ fontFamily:T.fDisplay, fontWeight:600, fontSize:13, color:T.paperDim, textTransform:'lowercase' }}>{s.n}</span>
              <Mono size={9.5} color={T.muted}>{s.v}%</Mono></div>
            <div style={{ height:6, borderRadius:3, background:T.ink3, overflow:'hidden' }}>
              <div style={{ width:`${s.v}%`, height:'100%', background:T.i500 }}/></div>
          </div>))}
        </div>
      </Panel>
    </div>
    <Panel title="content" accent="· needs review" right={<Mono size={9} color={T.i300}>3 pending</Mono>}>
      <div style={{ display:'flex', flexDirection:'column' }}>
        {CONTENT.filter(c=>c.st!=='live').map((c,i)=>(<div key={i} style={{ display:'grid', gridTemplateColumns:'auto 1fr auto auto', gap:14, alignItems:'center', padding:'12px 0', borderBottom: i<2?`1px solid ${T.line}`:'none' }}>
        <SubjectDot c={c.c} letter={c.s[0].toUpperCase()} />
        <div><div style={{ fontFamily:T.fDisplay, fontWeight:700, fontSize:14, color:T.paper, textTransform:'lowercase' }}>{c.t}</div>
          <Mono size={9} color={T.muted} style={{ marginTop:3, display:'block' }}>{c.s} · {c.f} flicks</Mono></div>
        <StatusBadge st={c.st} />
        <Icon name="arrow-right" size={16} color={T.muted} /></div>))}
      </div>
    </Panel>
  </div>);
}

function Library() {
  const [filter,setFilter]=React.useState('all');
  const filters=['all','biology','economics','physics','math'];
  const list = filter==='all'?CONTENT:CONTENT.filter(c=>c.s===filter);
  return (<div>
    <PageHead title="content" accent="library." sub={`${CONTENT.length} lessons · 53 flicks`}
      right={<Button size="sm" icon="plus">new flick</Button>} />
    <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:18 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, background:T.ink2, border:`1px solid ${T.line2}`, borderRadius:10, padding:'10px 14px', width:280 }}>
        <Icon name="search" size={16} color={T.muted} /><span style={{ fontFamily:T.fDisplay, fontWeight:500, fontSize:13, color:T.muted }}>search lessons…</span></div>
      <div style={{ display:'flex', gap:7 }}>{filters.map(f=> <Tag key={f} active={filter===f} onClick={()=>setFilter(f)}>{f}</Tag>)}</div>
    </div>
    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
      {list.map((c,i)=>(<div key={i} style={{ background:T.ink2, border:`1px solid ${T.line}`, borderRadius:14, padding:18, transition:`all .2s ${T.easeOut}`, cursor:'pointer' }}
        onMouseEnter={e=>{e.currentTarget.style.borderColor=T.line2;e.currentTarget.style.transform='translateY(-2px)';}}
        onMouseLeave={e=>{e.currentTarget.style.borderColor=T.line;e.currentTarget.style.transform='none';}}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:32 }}>
          <SubjectDot c={c.c} letter={c.s[0].toUpperCase()} /><StatusBadge st={c.st} /></div>
        <div style={{ fontFamily:T.fDisplay, fontWeight:700, fontSize:16, letterSpacing:'-0.02em', color:T.paper, textTransform:'lowercase' }}>{c.t}</div>
        <Mono size={9} color={T.muted} style={{ marginTop:7, display:'block' }}>{c.s} · {c.f} flicks · 60s each</Mono>
      </div>))}
    </div>
  </div>);
}

function Analytics() {
  const ret=78;
  return (<div>
    <PageHead title="learning" accent="analytics." sub="comprehension over consumption" />
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1.4fr', gap:16, marginBottom:16 }}>
      <Panel title="concept" accent="retention">
        <div style={{ display:'flex', alignItems:'center', gap:24 }}>
          <div style={{ width:130, height:130, borderRadius:'50%', flexShrink:0,
            background:`conic-gradient(${T.i500} ${ret}%, ${T.ink3} 0)`, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{ width:96, height:96, borderRadius:'50%', background:T.ink2, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
              <span style={{ fontFamily:T.fDisplay, fontWeight:900, fontSize:32, letterSpacing:'-0.03em', color:T.paper, lineHeight:1 }}>{ret}<Em>%</Em></span>
              <Mono size={7.5} color={T.muted} style={{ marginTop:4 }}>retained</Mono></div></div>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {[['completion','92%'],['7-day recall','78%'],['30-day recall','64%']].map(([l,v])=>(<div key={l}>
              <Mono size={9} color={T.muted}>{l}</Mono>
              <div style={{ fontFamily:T.fDisplay, fontWeight:800, fontSize:20, letterSpacing:'-0.02em', color:T.paper }}>{v}</div></div>))}
          </div></div>
      </Panel>
      <Panel title="retention" accent="by subject">
        <div style={{ display:'flex', flexDirection:'column', gap:13 }}>
          {[['biology',86],['economics',79],['physics',72],['math',68],['chemistry',61],['history',55]].map(([n,v])=>(<div key={n}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
              <span style={{ fontFamily:T.fDisplay, fontWeight:600, fontSize:12.5, color:T.paperDim, textTransform:'lowercase' }}>{n}</span>
              <Mono size={9} color={T.muted}>{v}%</Mono></div>
            <div style={{ height:6, borderRadius:3, background:T.ink3, overflow:'hidden' }}><div style={{ width:`${v}%`, height:'100%', background:`linear-gradient(90deg,${T.i600},${T.i400})` }}/></div>
          </div>))}
        </div>
      </Panel>
    </div>
    <LearnerTable />
  </div>);
}

function LearnerTable() {
  return (<Panel title="learners" accent="· cohort 1" right={<Mono size={9}>{LEARNERS.length} active</Mono>} pad={0}>
    <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr 1.6fr 0.8fr', gap:16, padding:'14px 24px', borderBottom:`1px solid ${T.line}` }}>
      {['learner','subject','progress','streak'].map(h=> <Mono key={h} size={9} color={T.muted}>{h}</Mono>)}
    </div>
    {LEARNERS.map((l,i)=>(<div key={i} style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr 1.6fr 0.8fr', gap:16, padding:'14px 24px', alignItems:'center', borderBottom: i<LEARNERS.length-1?`1px solid ${T.line}`:'none' }}>
      <div style={{ display:'flex', alignItems:'center', gap:11 }}>
        <div style={{ width:28, height:28, borderRadius:8, background:T.ink3, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:T.fDisplay, fontWeight:700, fontSize:12, color:T.i200 }}>{l.n[0]}</div>
        <span style={{ fontFamily:T.fDisplay, fontWeight:600, fontSize:13.5, color:T.paper }}>{l.n}</span></div>
      <span style={{ fontFamily:T.fDisplay, fontWeight:500, fontSize:12.5, color:T.paperDim, textTransform:'lowercase' }}>{l.sub}</span>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ flex:1, height:6, borderRadius:3, background:T.ink3, overflow:'hidden' }}><div style={{ width:`${l.prog}%`, height:'100%', background:T.i500 }}/></div>
        <Mono size={9} color={T.muted}>{l.prog}%</Mono></div>
      <div style={{ display:'flex', alignItems:'center', gap:7 }}>
        <Mark size={13} fill={TIER_GLOW[l.tier]} /><Mono size={9.5} color={T.paperDim}>{l.streak}d</Mono></div>
    </div>))}
  </Panel>);
}

Object.assign(window, { CONTENT, LEARNERS, Overview, Library, Analytics, StatusBadge, SubjectDot });
