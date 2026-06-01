/* ============================================================
   EDUFLICK AI · WEB UI KIT · shared components
   Educator/institution dashboard (dark) + marketing (indigo).
   ============================================================ */
const T = {
  ink:'#0A0B10', ink2:'#11131C', ink3:'#181B28', iink:'#0B0822',
  paper:'#F5F2EA', paper2:'#ECE7DA', paperDim:'#C9C5BA', muted:'#7A7F90',
  i100:'#DCE0FF', i200:'#B7C0FF', i300:'#8B97FF', i400:'#6E78F5', i500:'#5B5BF0', i600:'#4B3FE0', i700:'#3A2BB8',
  warn:'#FF6E5A', success:'#4ADE80',
  line:'rgba(245,242,234,0.08)', line2:'rgba(245,242,234,0.16)',
  fDisplay:"'Manrope',sans-serif", fSerif:"'Instrument Serif',serif", fMono:"'JetBrains Mono',monospace",
  easeOut:'cubic-bezier(0.16,1,0.3,1)',
};

function Mark({ size = 24, fill = T.i500, style = {} }) {
  return (<svg width={size} height={size} viewBox="0 0 180 180" style={{ display:'block', ...style }} aria-label="Eduflick mark">
    <path d="M 13 13 L 167 13 L 167 82 L 120 112.5 L 167 143 L 167 167 L 13 167 Z" fill={fill}/></svg>);
}
function Wordmark({ size = 18, color = T.paper, ai = T.i300 }) {
  return (<span style={{ fontFamily:T.fDisplay, fontWeight:800, fontSize:size, letterSpacing:'-0.045em', lineHeight:1, color, display:'inline-flex', alignItems:'baseline' }}>
    eduflick<span style={{ color:ai, marginLeft:'0.16em' }}>AI</span></span>);
}
function Icon({ name, size = 18, color = 'currentColor', style = {} }) {
  return (<svg width={size} height={size} style={{ display:'block', color, ...style }} aria-hidden="true"><use href={`#ic-${name}`} /></svg>);
}
function Em({ children, color = T.i300 }) {
  return <em style={{ fontFamily:T.fSerif, fontStyle:'italic', fontWeight:400, color }}>{children}</em>;
}
function Mono({ children, up = true, color = T.muted, size = 10, style = {} }) {
  return (<span style={{ fontFamily:T.fMono, fontWeight:500, fontSize:size, letterSpacing: up?'0.18em':'0.05em',
    textTransform: up?'uppercase':'none', color, ...style }}>{children}</span>);
}
function Button({ children, kind = 'primary', size = 'md', onClick, icon, style = {} }) {
  const [h,setH]=React.useState(false);
  const base={ fontFamily:T.fDisplay, fontWeight:700, letterSpacing:'-0.01em', cursor:'pointer',
    border:'1px solid transparent', borderRadius:10, transition:`all .25s ${T.easeOut}`,
    display:'inline-flex', alignItems:'center', justifyContent:'center', gap:8, whiteSpace:'nowrap',
    fontSize:size==='sm'?13:14.5, padding:size==='sm'?'8px 14px':'11px 20px' };
  const kinds={ primary:{background:T.i500,color:T.paper}, secondary:{background:'rgba(245,242,234,0.06)',color:T.paper,borderColor:T.line2}, ghost:{background:'transparent',color:T.i300} };
  const hov = h&&kind==='primary'?{background:T.i400,transform:'translateY(-2px)',boxShadow:'0 8px 24px -8px rgba(91,91,240,0.55)'}:{};
  return (<button onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{...base,...kinds[kind],...hov,...style}}>
    {icon&&<Icon name={icon} size={16}/>}{children}</button>);
}
function Tag({ children, active, onClick }) {
  return (<span onClick={onClick} style={{ fontFamily:T.fMono, fontSize:10.5, letterSpacing:'0.04em', padding:'6px 12px',
    borderRadius:999, cursor:onClick?'pointer':'default', border:`1px solid ${active?'rgba(91,91,240,0.45)':T.line2}`,
    background:active?'rgba(91,91,240,0.16)':'transparent', color:active?T.i200:T.paperDim, transition:`all .2s ${T.easeOut}` }}>{children}</span>);
}

// Titled panel
function Panel({ title, accent, right, children, style = {}, pad = 24 }) {
  return (<div style={{ background:T.ink2, border:`1px solid ${T.line}`, borderRadius:16, padding:pad, ...style }}>
    {(title||right) && <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:18 }}>
      <div style={{ fontFamily:T.fDisplay, fontWeight:800, fontSize:16, letterSpacing:'-0.02em', textTransform:'lowercase', color:T.paper }}>
        {title} {accent && <Em>{accent}</Em>}</div>{right}</div>}
    {children}</div>);
}

// Stat card
function StatCard({ label, value, unit, delta, deltaColor = T.success }) {
  return (<div style={{ background:T.ink2, border:`1px solid ${T.line}`, borderRadius:16, padding:'22px 24px' }}>
    <Mono size={9.5} color={T.muted}>{label}</Mono>
    <div style={{ display:'flex', alignItems:'baseline', gap:2, marginTop:12 }}>
      <span style={{ fontFamily:T.fDisplay, fontWeight:900, fontSize:40, letterSpacing:'-0.035em', color:T.paper, lineHeight:1 }}>{value}</span>
      {unit && <Em>{unit}</Em>}</div>
    {delta && <div style={{ fontFamily:T.fMono, fontSize:10, letterSpacing:'0.04em', color:deltaColor, marginTop:10 }}>{delta}</div>}
  </div>);
}

// Top nav — app variant
function TopNav({ links, active, onNav, right }) {
  return (<div style={{ display:'flex', alignItems:'center', gap:36, padding:'0 26px', height:60,
    borderBottom:`1px solid ${T.line}`, background:'rgba(10,11,16,0.6)', flexShrink:0 }}>
    <div style={{ display:'flex', alignItems:'center', gap:10 }}><Mark size={22}/><Wordmark size={18}/></div>
    <div style={{ display:'flex', gap:6, flex:1 }}>
      {links.map(l=>{ const on=active===l;
        return (<span key={l} onClick={()=>onNav&&onNav(l)} style={{ fontFamily:T.fDisplay, fontWeight:600, fontSize:13.5,
          letterSpacing:'-0.01em', textTransform:'lowercase', color:on?T.paper:T.muted, padding:'8px 12px', borderRadius:8,
          background:on?'rgba(91,91,240,0.12)':'transparent', cursor:'pointer', transition:`all .2s ${T.easeOut}` }}>{l}</span>);})}
    </div>
    {right}</div>);
}

// Dashboard sidebar
function Sidebar({ items, active, onNav }) {
  return (<div style={{ width:206, flexShrink:0, borderRight:`1px solid ${T.line}`, padding:'18px 14px', display:'flex', flexDirection:'column', gap:3 }}>
    {items.map(it=>{ const on=active===it.k;
      return (<div key={it.k} onClick={()=>onNav(it.k)} style={{ display:'flex', alignItems:'center', gap:11, padding:'10px 12px',
        borderRadius:9, cursor:'pointer', color:on?T.paper:T.muted, background:on?'rgba(91,91,240,0.12)':'transparent',
        transition:`all .2s ${T.easeOut}` }}>
        <Icon name={it.icon} size={17} color={on?T.i300:T.muted}/>
        <span style={{ fontFamily:T.fDisplay, fontWeight:on?700:600, fontSize:13.5, letterSpacing:'-0.01em', textTransform:'lowercase' }}>{it.label}</span>
      </div>);})}
    <div style={{ flex:1 }}/>
    <div style={{ padding:'14px 12px', borderRadius:12, background:'linear-gradient(150deg,#3A2BB8,#0B0822)', border:'1px solid rgba(139,151,255,0.2)' }}>
      <Mono size={8.5} color={T.i200}>plan · institution</Mono>
      <div style={{ fontFamily:T.fDisplay, fontWeight:700, fontSize:13, color:T.paper, marginTop:6, lineHeight:1.3 }}>2,847 of 5,000 seats</div>
      <div style={{ height:5, borderRadius:3, background:'rgba(245,242,234,0.16)', marginTop:9, overflow:'hidden' }}>
        <div style={{ width:'57%', height:'100%', background:T.i400 }}/></div>
    </div>
  </div>);
}

// Simple CSS bar chart
function BarChart({ data, height = 140 }) {
  const max = Math.max(...data.map(d=>d.v));
  return (<div style={{ display:'flex', alignItems:'flex-end', gap:8, height }}>
    {data.map((d,i)=>(<div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:8, height:'100%', justifyContent:'flex-end' }}>
      <div style={{ width:'100%', maxWidth:26, height:`${(d.v/max)*100}%`, borderRadius:'5px 5px 2px 2px',
        background: d.hi?T.i500:'rgba(91,91,240,0.32)', transition:`height .5s ${T.easeOut}` }}/>
      <Mono size={8} color={T.muted}>{d.l}</Mono>
    </div>))}</div>);
}

Object.assign(window, { T, Mark, Wordmark, Icon, Em, Mono, Button, Tag, Panel, StatCard, TopNav, Sidebar, BarChart });
