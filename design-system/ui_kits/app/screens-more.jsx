/* ============================================================
   EDUFLICK AI · APP UI KIT · search · profile · saved
   ============================================================ */

// Subject tile — letter inside a mark-shaped clip
function SubjectTile({ letter, name, color, locked }) {
  return (
    <div style={{ background:T.ink2, border:`1px solid ${T.line}`, borderRadius:12,
      padding:'16px 14px', display:'flex', flexDirection:'column', alignItems:'center', gap:10,
      opacity: locked?0.45:1 }}>
      <div style={{ width:44, height:44, background: locked?T.ink3:color, display:'flex',
        alignItems:'center', justifyContent:'center',
        clipPath:'polygon(0% 0%,100% 0%,100% 45%,67% 62.5%,100% 79%,100% 100%,0% 100%)' }}>
        <span style={{ fontFamily:T.fSerif, fontStyle:'italic', fontSize:22, color: locked?T.muted:T.paper }}>{letter}</span>
      </div>
      <Mono size={9.5} color={T.paperDim}>{name}</Mono>
    </div>
  );
}

function SearchScreen({ onOpen }) {
  const trending = ['mitosis','rag','supply & demand','neural nets','the krebs cycle','photons'];
  return (
    <div>
      <TopBar title="search" right={<Mark size={22} fill={T.i500} />} />
      <div style={{ padding:'0 20px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, background:T.ink2,
          border:`1px solid ${T.line2}`, borderRadius:12, padding:'13px 15px' }}>
          <Icon name="search" size={18} color={T.muted} />
          <span style={{ fontFamily:T.fDisplay, fontWeight:500, fontSize:15, color:T.muted }}>search a topic, paper, or video…</span>
        </div>
      </div>
      <div style={{ padding:'24px 20px 8px' }}>
        <Mono size={9.5} color={T.muted}>trending now</Mono>
        <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:12 }}>
          {trending.map(t=> <Tag key={t}>{t}</Tag>)}
        </div>
      </div>
      <div style={{ padding:'18px 20px 8px' }}>
        <Mono size={9.5} color={T.muted}>browse subjects</Mono>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginTop:12 }}>
          <SubjectTile letter="B" name="biology" color="#5B5BF0" />
          <SubjectTile letter="M" name="math" color="#4B3FE0" />
          <SubjectTile letter="P" name="physics" color="#3A2BB8" />
          <SubjectTile letter="C" name="chemistry" color="#6E78F5" />
          <SubjectTile letter="E" name="economics" color="#5B5BF0" />
          <SubjectTile letter="H" name="history" color="#261A82" />
        </div>
      </div>
      <div style={{ padding:'18px 16px 24px' }}>
        <Mono size={9.5} color={T.muted} style={{ padding:'0 4px' }}>from your search</Mono>
        <div style={{ marginTop:12 }}>
          <FeedCard lesson={LESSONS[0]} onOpen={onOpen} />
        </div>
      </div>
    </div>
  );
}

function SavedScreen({ onOpen }) {
  return (
    <div>
      <TopBar title="saved" right={<Mark size={22} fill={T.i500} />} />
      <div style={{ padding:'0 20px 12px' }}>
        <span style={{ fontFamily:T.fSerif, fontStyle:'italic', fontSize:17, color:T.paperDim }}>
          flicks you flagged to revisit.
        </span>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:12, padding:'10px 16px 24px' }}>
        {LESSONS.slice(1,4).map(l=> <FeedCard key={l.id} lesson={l} onOpen={onOpen} />)}
      </div>
    </div>
  );
}

function ProfileScreen() {
  const stats = [
    { v:'128', l:'flicks' }, { v:'34', l:'day streak' }, { v:'4', l:'subjects' },
  ];
  return (
    <div>
      <TopBar title="profile" right={<Icon name="settings" size={20} />} />
      {/* header */}
      <div style={{ display:'flex', alignItems:'center', gap:16, padding:'4px 22px 22px' }}>
        <img src="../../assets/logo/social/avatar-indigo-1024.png" alt="" width="64" height="64"
          style={{ borderRadius:16, flexShrink:0 }} />
        <div>
          <div style={{ fontFamily:T.fDisplay, fontWeight:800, fontSize:22, letterSpacing:'-0.025em',
            textTransform:'lowercase', color:T.paper }}>riya <Em>sharma.</Em></div>
          <Mono size={9.5} color={T.muted} style={{ display:'block', marginTop:4 }}>learner · since 2025</Mono>
        </div>
      </div>
      {/* stats */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, padding:'0 20px' }}>
        {stats.map(s=>(
          <div key={s.l} style={{ background:T.ink2, border:`1px solid ${T.line}`, borderRadius:12, padding:'16px 14px' }}>
            <div style={{ fontFamily:T.fDisplay, fontWeight:900, fontSize:30, letterSpacing:'-0.03em', color:T.paper, lineHeight:1 }}>{s.v}</div>
            <Mono size={9} color={T.muted} style={{ display:'block', marginTop:7 }}>{s.l}</Mono>
          </div>
        ))}
      </div>
      {/* current streak spark */}
      <div style={{ margin:'18px 20px 0', padding:'20px', borderRadius:16,
        background:'linear-gradient(150deg,#3A2BB8,#0B0822)', border:'1px solid rgba(139,151,255,0.22)',
        display:'flex', alignItems:'center', gap:18 }}>
        <Spark size={62} tier="flame" />
        <div>
          <div style={{ fontFamily:T.fDisplay, fontWeight:800, fontSize:18, letterSpacing:'-0.02em',
            textTransform:'lowercase', color:T.paper }}>flame <Em color={T.i200}>spark.</Em></div>
          <div style={{ fontFamily:T.fDisplay, fontWeight:500, fontSize:13, color:'rgba(245,242,234,0.8)', marginTop:5, maxWidth:'30ch' }}>
            34-day streak. The rhythm sticks. 4 days to the next tier.
          </div>
        </div>
      </div>
      {/* subject badges */}
      <div style={{ padding:'22px 20px 8px' }}>
        <Mono size={9.5} color={T.muted}>subject badges · earned</Mono>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:10, marginTop:12 }}>
          <SubjectTile letter="B" name="biology" color="#5B5BF0" />
          <SubjectTile letter="E" name="econ" color="#5B5BF0" />
          <SubjectTile letter="P" name="physics" color="#3A2BB8" />
          <SubjectTile letter="A" name="art" color="#11131C" locked />
        </div>
      </div>
      <div style={{ height:24 }} />
    </div>
  );
}

Object.assign(window, { SubjectTile, SearchScreen, SavedScreen, ProfileScreen });
