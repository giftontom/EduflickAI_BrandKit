/* ============================================================
   EDUFLICK AI · WEB UI KIT · app shell
   Toggle between the educator dashboard and the public site.
   ============================================================ */
function SettingsScreen() {
  return (<div>
    <PageHead title="settings" sub="institution · eduflick AI" />
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
      <Panel title="white-label">
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {[['institution mark','replaces eduflick mark in-product'],['SSO','SAML · enabled'],['"powered by eduflick"','footer credit · required']].map(([l,d],i)=>(
            <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div><div style={{ fontFamily:T.fDisplay, fontWeight:600, fontSize:13.5, color:T.paper, textTransform:'lowercase' }}>{l}</div>
                <Mono size={9} color={T.muted} style={{ marginTop:3, display:'block' }}>{d}</Mono></div>
              <div style={{ width:42, height:24, borderRadius:999, background: i<2?T.i500:T.ink3, border:`1px solid ${i<2?T.i500:T.line2}`, position:'relative' }}>
                <div style={{ position:'absolute', top:2, left:i<2?20:2, width:18, height:18, borderRadius:'50%', background:T.paper, transition:'left .2s' }}/></div>
            </div>))}
        </div>
      </Panel>
      <Panel title="brand" accent="palette">
        <div style={{ display:'flex', gap:10, marginBottom:18 }}>
          {['#5B5BF0','#3A2BB8','#0B0822','#F5F2EA'].map(c=> <div key={c} style={{ flex:1, height:48, borderRadius:10, background:c, border:`1px solid ${T.line}` }}/>)}
        </div>
        <Mono size={9.5} color={T.muted}>indigo + neutral · never a third hue</Mono>
      </Panel>
    </div>
  </div>);
}

function App() {
  const [mode,setMode]=React.useState('app');
  const [sec,setSec]=React.useState('overview');

  if(mode==='site'){
    return (<ChromeWindow width={1280} height={812} url="eduflick.ai" tabs={[{title:'Eduflick AI — a feed for thinking'}]}>
      <Marketing onEnter={()=>setMode('app')} />
    </ChromeWindow>);
  }

  const items=[
    {k:'overview',label:'overview',icon:'grid'},
    {k:'library',label:'library',icon:'book'},
    {k:'analytics',label:'analytics',icon:'arrow-up'},
    {k:'settings',label:'settings',icon:'settings'},
  ];
  const screen={ overview:<Overview/>, library:<Library/>, analytics:<Analytics/>, settings:<SettingsScreen/> }[sec];

  return (<ChromeWindow width={1280} height={812} url="app.eduflick.ai/dashboard" tabs={[{title:'Eduflick AI · Dashboard'}]}>
    <div style={{ height:'100%', display:'flex', flexDirection:'column', background:T.ink, color:T.paper }}>
      <TopNav links={[]} right={<div style={{ display:'flex', alignItems:'center', gap:14, color:T.paperDim }}>
        <Icon name="search" size={18}/><Icon name="bell" size={18}/>
        <span onClick={()=>setMode('site')} style={{ fontFamily:T.fMono, fontSize:9.5, letterSpacing:'0.16em', textTransform:'uppercase', color:T.i300, cursor:'pointer', border:`1px solid ${T.line2}`, padding:'7px 12px', borderRadius:8 }}>view site ↗</span>
        <div style={{ width:30, height:30, borderRadius:9, background:T.i500, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:T.fDisplay, fontWeight:700, fontSize:12, color:T.paper }}>N</div>
      </div>} />
      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
        <Sidebar items={items} active={sec} onNav={setSec} />
        <div style={{ flex:1, overflow:'auto', padding:'26px 30px 40px' }} key={sec}>{screen}</div>
      </div>
    </div>
  </ChromeWindow>);
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
