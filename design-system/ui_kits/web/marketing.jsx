/* ============================================================
   EDUFLICK AI · WEB UI KIT · marketing landing (public face)
   Dark indigo hero, paper-clean sections — the brand's public site.
   ============================================================ */
function MktNav({ onEnter }) {
  return (<div style={{ display:'flex', alignItems:'center', gap:36, padding:'0 40px', height:64, borderBottom:`1px solid ${T.line}`, position:'sticky', top:0, zIndex:20, background:'rgba(11,8,34,0.7)', backdropFilter:'blur(12px)' }}>
    <div style={{ display:'flex', alignItems:'center', gap:10 }}><Mark size={22}/><Wordmark size={18}/></div>
    <div style={{ display:'flex', gap:4, flex:1 }}>
      {['product','educators','pricing','about'].map(l=> <span key={l} style={{ fontFamily:T.fDisplay, fontWeight:600, fontSize:13.5, color:T.paperDim, textTransform:'lowercase', padding:'8px 12px', cursor:'pointer' }}>{l}</span>)}
    </div>
    <span style={{ fontFamily:T.fDisplay, fontWeight:600, fontSize:13.5, color:T.paperDim, cursor:'pointer', textTransform:'lowercase' }} onClick={onEnter}>log in</span>
    <Button size="sm" onClick={onEnter}>try free</Button>
  </div>);
}

function MiniFlick({ title, sub, lead, idx, n }) {
  return (<div style={{ borderRadius:12, padding:'14px 16px', display:'grid', gridTemplateColumns:'1fr auto', gap:12, alignItems:'center',
    background: lead?'linear-gradient(150deg,#5B5BF0,#3A2BB8)':'rgba(245,242,234,0.06)', border:`1px solid ${lead?'rgba(220,224,255,0.3)':'rgba(245,242,234,0.12)'}`, backdropFilter:'blur(4px)' }}>
    <div><div style={{ fontFamily:T.fDisplay, fontWeight:700, fontSize:14, color:T.paper, textTransform:'lowercase' }}>{title} <span style={{ opacity:0.6 }}>· 60s</span></div>
      <div style={{ marginTop:6, display:'flex', alignItems:'center', gap:7 }}>
        <Mono size={8} color={lead?T.i100:T.muted}>{sub}</Mono>
        <div style={{ display:'flex', gap:2 }}>{Array.from({length:n}).map((_,i)=><span key={i} style={{ width:6,height:3,borderRadius:2,background:i<idx?(lead?T.paper:T.i400):'rgba(245,242,234,0.18)' }}/>)}</div></div></div>
    <div style={{ width:34, height:34, borderRadius:9, background:lead?'rgba(245,242,234,0.18)':'rgba(91,91,240,0.16)', display:'flex', alignItems:'center', justifyContent:'center', color:lead?T.paper:T.i300 }}><Icon name="play" size={13}/></div>
  </div>);
}

function Marketing({ onEnter }) {
  return (<div style={{ background:T.iink, minHeight:'100%' }}>
    <MktNav onEnter={onEnter} />
    {/* hero */}
    <div style={{ position:'relative', overflow:'hidden', padding:'72px 40px 64px',
      background:'radial-gradient(900px 500px at 78% 0%, rgba(91,91,240,0.22), transparent 62%)' }}>
      <div style={{ position:'absolute', inset:0, opacity:0.5, pointerEvents:'none', backgroundImage:'linear-gradient(rgba(245,242,234,0.035) 1px,transparent 1px),linear-gradient(90deg,rgba(245,242,234,0.035) 1px,transparent 1px)', backgroundSize:'44px 44px' }}/>
      <div style={{ position:'relative', display:'grid', gridTemplateColumns:'1.1fr 0.9fr', gap:48, alignItems:'center', maxWidth:1120, margin:'0 auto' }}>
        <div>
          <Mono size={11} color={T.i300} style={{ letterSpacing:'0.28em' }}>short-form learning · ai-curated</Mono>
          <h1 style={{ fontFamily:T.fDisplay, fontWeight:900, fontSize:68, letterSpacing:'-0.055em', lineHeight:0.92, textTransform:'lowercase', color:T.paper, margin:'22px 0 0' }}>
            a feed for <Em color={T.i200}>thinking.</Em></h1>
          <p style={{ fontFamily:T.fSerif, fontStyle:'italic', fontSize:22, lineHeight:1.4, color:'rgba(245,242,234,0.82)', margin:'22px 0 0', maxWidth:'40ch' }}>
            Eduflick cuts any source — a lecture, a paper, a video — into one-minute flicks, sequenced to what you need next.</p>
          <div style={{ display:'flex', gap:12, marginTop:32 }}>
            <Button icon="play" onClick={onEnter}>start learning</Button>
            <Button kind="secondary" onClick={onEnter}>for educators</Button>
          </div>
          <div style={{ display:'flex', gap:34, marginTop:40 }}>
            {[['60s','per lesson'],['78%','retention'],['2,847','learners']].map(([v,l])=>(<div key={l}>
              <div style={{ fontFamily:T.fDisplay, fontWeight:900, fontSize:26, letterSpacing:'-0.03em', color:T.paper }}>{v}</div>
              <Mono size={9} color={T.muted} style={{ marginTop:3 }}>{l}</Mono></div>))}
          </div>
        </div>
        {/* hero visual: stacked flicks */}
        <div style={{ display:'flex', flexDirection:'column', gap:12, padding:'4px 0' }}>
          <Mono size={9} color={T.i300} style={{ marginBottom:2 }}>your feed · today</Mono>
          <MiniFlick title="mitosis" sub="biology · 8 flicks" lead idx={3} n={8} />
          <MiniFlick title="supply & demand" sub="economics · 6 flicks" idx={0} n={6} />
          <MiniFlick title="photons" sub="physics · 5 flicks" idx={0} n={5} />
          <MiniFlick title="the krebs cycle" sub="biology · 8 flicks" idx={0} n={8} />
        </div>
      </div>
    </div>
    {/* how it works */}
    <div style={{ padding:'56px 40px', borderTop:`1px solid ${T.line}`, maxWidth:1120, margin:'0 auto' }}>
      <Mono size={10} color={T.i300}>how it works</Mono>
      <h2 style={{ fontFamily:T.fDisplay, fontWeight:800, fontSize:34, letterSpacing:'-0.035em', textTransform:'lowercase', color:T.paper, margin:'14px 0 36px' }}>
        scroll. <Em>learn.</Em> repeat.</h2>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:1, background:T.line, border:`1px solid ${T.line}`, borderRadius:16, overflow:'hidden' }}>
        {[['i.','pick a topic','Search anything — or drop in a lecture, paper, or video. The library is free.'],
          ['ii.','ai curates the path','The AI sequences one-minute flicks tuned to what you need next. It explains every choice.'],
          ['iii.','flick through','One concept at a time. Every minute earns the next. Comprehension over completion.']].map(([n,t,d])=>(
          <div key={n} style={{ background:T.ink2, padding:'28px 26px' }}>
            <div style={{ fontFamily:T.fSerif, fontStyle:'italic', fontSize:30, color:T.i300, lineHeight:1 }}>{n}</div>
            <div style={{ fontFamily:T.fDisplay, fontWeight:800, fontSize:18, letterSpacing:'-0.02em', color:T.paper, textTransform:'lowercase', margin:'16px 0 10px' }}>{t}</div>
            <div style={{ fontFamily:T.fDisplay, fontWeight:500, fontSize:13.5, lineHeight:1.6, color:T.paperDim }}>{d}</div>
          </div>))}
      </div>
    </div>
    {/* CTA */}
    <div style={{ padding:'8px 40px 64px', maxWidth:1120, margin:'0 auto' }}>
      <div style={{ position:'relative', overflow:'hidden', borderRadius:22, padding:'52px 48px', background:'linear-gradient(150deg,#3A2BB8,#0B0822)', border:'1px solid rgba(139,151,255,0.22)' }}>
        <div style={{ position:'absolute', right:-30, bottom:-40, opacity:0.1 }}><Mark size={260} fill={T.paper} /></div>
        <div style={{ position:'relative' }}>
          <h2 style={{ fontFamily:T.fDisplay, fontWeight:900, fontSize:40, letterSpacing:'-0.04em', textTransform:'lowercase', color:T.paper, margin:0, maxWidth:'16ch' }}>
            learn anything <Em color={T.i200}>in sixty seconds.</Em></h2>
          <div style={{ display:'flex', gap:12, marginTop:26 }}>
            <Button onClick={onEnter}>try free</Button>
            <Button kind="secondary" onClick={onEnter}>book a demo</Button></div>
        </div>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:36 }}>
        <div style={{ display:'flex', alignItems:'center', gap:9 }}><Mark size={16}/><Wordmark size={14}/></div>
        <Mono size={9} color={T.muted}>a tomatrix technologies venture</Mono>
      </div>
    </div>
  </div>);
}
Object.assign(window, { Marketing });
