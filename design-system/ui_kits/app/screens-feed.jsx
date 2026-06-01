/* ============================================================
   EDUFLICK AI · APP UI KIT · data + screens
   ============================================================ */
const LESSONS = [
  { id:'047', title:'mitosis', subject:'biology', flicks:8, idx:3,
    concept:'one cell becomes two — each a perfect copy.',
    body:'Mitosis cuts a cell in half. Then it does it again. The DNA copies itself, the chromosomes line up at the centre, and the spindle pulls them apart — two identical daughter cells, every time.' },
  { id:'048', title:'supply & demand', subject:'economics', flicks:6, idx:0,
    concept:'price is where two curves meet.',
    body:'When supply rises and demand holds, price falls. When demand rises and supply holds, price climbs. The point where the two lines cross is the market price — the only price that clears.' },
  { id:'049', title:'photons', subject:'physics', flicks:5, idx:0,
    concept:'light is a particle and a wave at once.',
    body:'A photon carries energy in a discrete packet, yet travels as a wave. It has no mass, never slows, and the colour you see is just its frequency. The dual nature is the whole story.' },
  { id:'050', title:'the krebs cycle', subject:'biology', flicks:8, idx:0,
    concept:'how a cell turns food into fuel.',
    body:'Inside the mitochondria, a loop of reactions strips electrons from sugar and stores them as ATP — the cell\u2019s currency. Eight steps, one turn, endlessly repeating.' },
  { id:'051', title:'opportunity cost', subject:'economics', flicks:4, idx:0,
    concept:'every yes is a no to something else.',
    body:'The true cost of a choice is the next-best option you gave up. Not the money — the alternative. Economists measure decisions by what they displace.' },
];
const SUBJECTS = [
  { k:'biology', c:'#5B5BF0' }, { k:'math', c:'#4B3FE0' }, { k:'physics', c:'#3A2BB8' },
  { k:'chemistry', c:'#6E78F5' }, { k:'history', c:'#261A82' }, { k:'economics', c:'#5B5BF0' },
];

// ---- Feed card ----
function FeedCard({ lesson, lead = false, onOpen }) {
  const [hover, setHover] = React.useState(false);
  return (
    <div onClick={()=>onOpen(lesson)} onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
      style={{ borderRadius:14, padding:18, display:'grid', gridTemplateColumns:'1fr auto',
        gap:14, alignItems:'center', cursor:'pointer', transition:`all 0.25s ${T.easeOut}`,
        transform: hover?'translateX(3px)':'none',
        background: lead?'linear-gradient(150deg,#3A2BB8,#0B0822)':(hover?T.ink3:T.ink2),
        border:`1px solid ${lead?'rgba(139,151,255,0.25)':(hover?T.line2:T.line)}` }}>
      <div>
        {lead && <Mono size={9} color={T.i200} style={{ display:'block', marginBottom:8 }}>continue learning</Mono>}
        <div style={{ fontFamily:T.fDisplay, fontWeight:700, fontSize:17, letterSpacing:'-0.02em', color:T.paper }}>
          {lesson.title} <span style={{ color:T.muted, fontWeight:600 }}>· 60s</span>
        </div>
        <div style={{ marginTop:7, display:'flex', alignItems:'center', gap:8 }}>
          <Mono size={9} color={lead?T.i200:T.muted}>{lesson.subject} · {lesson.flicks} flicks</Mono>
          {lesson.idx>0 && <div style={{ display:'flex', gap:3 }}>
            {Array.from({length:lesson.flicks}).map((_,i)=>(
              <span key={i} style={{ width:7, height:3, borderRadius:2, background: i<lesson.idx?T.i400:'rgba(245,242,234,0.16)' }}/>
            ))}
          </div>}
        </div>
      </div>
      <div style={{ width:42, height:42, borderRadius:10, flexShrink:0,
        background: lead?'rgba(245,242,234,0.14)':'rgba(91,91,240,0.14)',
        display:'flex', alignItems:'center', justifyContent:'center', color: lead?T.paper:T.i300 }}>
        <Icon name="play" size={16} />
      </div>
    </div>
  );
}

// ---- Feed screen ----
function FeedScreen({ onOpen }) {
  const [filter, setFilter] = React.useState('for you');
  return (
    <div>
      <TopBar title="your" accent="feed." right={<>
        <Icon name="bell" size={20} /><Mark size={22} fill={T.i500} />
      </>} />
      <div style={{ display:'flex', gap:8, padding:'2px 20px 16px' }}>
        {['for you','trending','saved'].map(f=>(
          <Tag key={f} active={filter===f} onClick={()=>setFilter(f)}>{f}</Tag>
        ))}
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:12, padding:'0 16px 24px' }}>
        <FeedCard lesson={LESSONS[0]} lead onOpen={onOpen} />
        {LESSONS.slice(1).map(l=> <FeedCard key={l.id} lesson={l} onOpen={onOpen} />)}
      </div>
    </div>
  );
}

// ---- Flick player (the signature screen) ----
function FlickPlayer({ lesson, onClose }) {
  const [idx, setIdx] = React.useState(Math.max(lesson.idx,1));
  const [playing, setPlaying] = React.useState(true);
  const [saved, setSaved] = React.useState(false);
  return (
    <div style={{ position:'absolute', inset:0, zIndex:40, display:'flex', flexDirection:'column',
      background:'linear-gradient(160deg,#3A2BB8 0%,#0B0822 70%)', overflow:'hidden' }}>
      {/* texture */}
      <div style={{ position:'absolute', inset:0, opacity:0.5, pointerEvents:'none',
        backgroundImage:'linear-gradient(rgba(245,242,234,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(245,242,234,0.04) 1px,transparent 1px)',
        backgroundSize:'40px 40px' }} />
      {/* watermark mark */}
      <div style={{ position:'absolute', right:-40, bottom:60, opacity:0.06, pointerEvents:'none' }}>
        <Mark size={320} fill={T.paper} />
      </div>
      {/* segment progress */}
      <div style={{ display:'flex', gap:5, padding:'58px 18px 0', position:'relative', zIndex:2 }}>
        {Array.from({length:lesson.flicks}).map((_,i)=>(
          <div key={i} style={{ flex:1, height:3, borderRadius:2, overflow:'hidden', background:'rgba(245,242,234,0.2)' }}>
            <div style={{ height:'100%', background:T.paper, width: i<idx?'100%':(i===idx?'45%':'0%'),
              transition:`width 0.4s ${T.easeIO}` }}/>
          </div>
        ))}
      </div>
      {/* top row */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 18px', position:'relative', zIndex:2 }}>
        <div onClick={onClose} style={{ cursor:'pointer', color:T.paper, display:'flex', alignItems:'center', gap:8 }}>
          <Icon name="arrow-up" size={18} style={{ transform:'rotate(180deg)' }} />
          <Mono size={9} color={T.i200}>lesson {lesson.id} · {lesson.subject}</Mono>
        </div>
        <Mono size={9} color={T.i200}>{idx+1} / {lesson.flicks}</Mono>
      </div>
      {/* body */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center', padding:'0 26px', position:'relative', zIndex:2 }}>
        <Mono size={10} color={T.i200} style={{ marginBottom:18 }}>flick {idx+1} · 60 seconds</Mono>
        <div style={{ fontFamily:T.fDisplay, fontWeight:900, fontSize:46, letterSpacing:'-0.05em',
          lineHeight:0.95, textTransform:'lowercase', color:T.paper, marginBottom:20 }}>
          {lesson.title}.
        </div>
        <div style={{ fontFamily:T.fSerif, fontStyle:'italic', fontSize:23, lineHeight:1.3, color:T.i200, marginBottom:22 }}>
          {lesson.concept}
        </div>
        <div style={{ fontFamily:T.fDisplay, fontWeight:500, fontSize:15.5, lineHeight:1.6, color:'rgba(245,242,234,0.86)', maxWidth:'42ch' }}>
          {lesson.body}
        </div>
      </div>
      {/* controls */}
      <div style={{ padding:'0 22px 40px', position:'relative', zIndex:2 }}>
        <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:20 }}>
          <button onClick={()=>setIdx(Math.max(0,idx-1))} style={ctlBtn}><Icon name="arrow-right" size={18} style={{ transform:'rotate(180deg)' }} /></button>
          <button onClick={()=>setPlaying(!playing)} style={{ ...ctlBtn, width:58, height:58, background:T.paper, color:T.iink }}>
            {playing
              ? <svg width="18" height="18" viewBox="0 0 18 18"><rect x="3" y="2" width="4" height="14" rx="1.2" fill={T.iink}/><rect x="11" y="2" width="4" height="14" rx="1.2" fill={T.iink}/></svg>
              : <Icon name="play" size={20} color={T.iink} />}
          </button>
          <button onClick={()=>setIdx(Math.min(lesson.flicks-1,idx+1))} style={ctlBtn}><Icon name="arrow-right" size={18} /></button>
          <div style={{ flex:1 }} />
          <button onClick={()=>setSaved(!saved)} style={{ ...ctlBtn, color: saved?T.warn:T.paper }}><Icon name="heart" size={18} /></button>
          <button style={ctlBtn}><Icon name="share" size={18} /></button>
        </div>
        <div style={{ textAlign:'center' }}>
          <Mono size={8.5} color="rgba(245,242,234,0.5)">swipe up · next flick →</Mono>
        </div>
      </div>
    </div>
  );
}
const ctlBtn = { width:46, height:46, borderRadius:999, border:'1px solid rgba(245,242,234,0.2)',
  background:'rgba(245,242,234,0.08)', color:'#F5F2EA', display:'flex', alignItems:'center',
  justifyContent:'center', cursor:'pointer', flexShrink:0 };

Object.assign(window, { LESSONS, SUBJECTS, FeedCard, FeedScreen, FlickPlayer });
