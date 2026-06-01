/* ============================================================
   EDUFLICK AI · APP UI KIT · shared components
   Brand: dark by default, indigo signal, the mark everywhere.
   Exports to window at the bottom.
   ============================================================ */
const T = {
  ink:'#0A0B10', ink2:'#11131C', ink3:'#181B28', iink:'#0B0822',
  paper:'#F5F2EA', paperDim:'#C9C5BA', muted:'#7A7F90',
  i200:'#B7C0FF', i300:'#8B97FF', i400:'#6E78F5', i500:'#5B5BF0', i700:'#3A2BB8',
  warn:'#FF6E5A', success:'#4ADE80',
  line:'rgba(245,242,234,0.08)', line2:'rgba(245,242,234,0.16)',
  fDisplay:"'Manrope',sans-serif", fSerif:"'Instrument Serif',serif", fMono:"'JetBrains Mono',monospace",
  easeOut:'cubic-bezier(0.16,1,0.3,1)', easeIO:'cubic-bezier(0.7,0,0.2,1)', spring:'cubic-bezier(0.34,1.56,0.64,1)',
};

// The mark — single closed path, the flick
function Mark({ size = 24, fill = T.i500, style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 180 180" style={{ display:'block', ...style }} aria-label="Eduflick mark">
      <path d="M 13 13 L 167 13 L 167 82 L 120 112.5 L 167 143 L 167 167 L 13 167 Z" fill={fill}/>
    </svg>
  );
}

// Wordmark built in HTML for reliable rendering
function Wordmark({ size = 22, color = T.paper, ai = T.i300, weight = 800 }) {
  return (
    <span style={{ fontFamily:T.fDisplay, fontWeight:weight, fontSize:size, letterSpacing:'-0.045em',
      lineHeight:1, color, display:'inline-flex', alignItems:'baseline' }}>
      eduflick<span style={{ color:ai, marginLeft:'0.16em' }}>AI</span>
    </span>
  );
}

// Icon via injected sprite (#ic-name)
function Icon({ name, size = 22, color = 'currentColor', style = {} }) {
  return (
    <svg width={size} height={size} style={{ display:'block', color, ...style }} aria-hidden="true">
      <use href={`#ic-${name}`} />
    </svg>
  );
}

// Editorial serif accent inline
function Em({ children, color = T.i300 }) {
  return <em style={{ fontFamily:T.fSerif, fontStyle:'italic', fontWeight:400, color }}>{children}</em>;
}

// Mono label
function Mono({ children, up = true, color = T.muted, size = 9.5, style = {} }) {
  return (
    <span style={{ fontFamily:T.fMono, fontWeight:500, fontSize:size,
      letterSpacing: up ? '0.18em' : '0.06em', textTransform: up ? 'uppercase' : 'none',
      color, ...style }}>{children}</span>
  );
}

// Pill button
function Button({ children, kind = 'primary', size = 'md', onClick, style = {}, icon }) {
  const base = {
    fontFamily:T.fDisplay, fontWeight:700, letterSpacing:'-0.01em', cursor:'pointer',
    border:'1px solid transparent', borderRadius:12, transition:`all 0.25s ${T.easeOut}`,
    display:'inline-flex', alignItems:'center', justifyContent:'center', gap:8, whiteSpace:'nowrap',
    fontSize: size==='sm'?13:15, padding: size==='sm'?'9px 16px':'13px 22px',
  };
  const kinds = {
    primary:{ background:T.i500, color:T.paper },
    secondary:{ background:'rgba(245,242,234,0.06)', color:T.paper, borderColor:T.line2 },
    ghost:{ background:'transparent', color:T.i300 },
  };
  const [hover, setHover] = React.useState(false);
  const hoverStyle = hover && kind==='primary' ? { background:T.i400, transform:'translateY(-2px)', boxShadow:'0 8px 24px -8px rgba(91,91,240,0.55)' } : {};
  return (
    <button onClick={onClick} onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
      style={{ ...base, ...kinds[kind], ...hoverStyle, ...style }}>
      {icon && <Icon name={icon} size={16} />}{children}
    </button>
  );
}

// Topic / status tag
function Tag({ children, active = false, onClick, style = {} }) {
  return (
    <span onClick={onClick} style={{ fontFamily:T.fMono, fontSize:11, letterSpacing:'0.04em',
      padding:'7px 14px', borderRadius:999, cursor:onClick?'pointer':'default',
      border:`1px solid ${active?'rgba(91,91,240,0.45)':T.line2}`,
      background: active?'rgba(91,91,240,0.16)':T.ink2, color: active?T.i200:T.paperDim,
      transition:`all 0.2s ${T.easeOut}`, ...style }}>{children}</span>
  );
}

// A spark badge — the mark glowing at a tier
function Spark({ size = 56, tier = 'flame', label }) {
  const glows = {
    flicker:'radial-gradient(circle,rgba(91,91,240,0.18) 0%,#0B0822 72%)',
    ember:'radial-gradient(circle,rgba(91,91,240,0.3) 0%,#0B0822 72%)',
    flame:'radial-gradient(circle,rgba(91,91,240,0.45) 0%,#0B0822 72%)',
    blaze:'radial-gradient(circle,rgba(91,91,240,0.6) 0%,#0B0822 72%)',
    legend:'radial-gradient(circle,rgba(183,192,255,0.55) 0%,rgba(91,91,240,0.6) 40%,#0B0822 82%)',
  };
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
      <div style={{ width:size, height:size, borderRadius:14, background:glows[tier],
        display:'flex', alignItems:'center', justifyContent:'center',
        boxShadow: tier==='legend'?'inset 0 0 0 1px rgba(183,192,255,0.3)':'none' }}>
        <Mark size={size*0.46} fill={T.paper} />
      </div>
      {label && <Mono size={8.5} color={T.muted}>{label}</Mono>}
    </div>
  );
}

// App top bar (inside the device, below status bar)
function TopBar({ title, accent, right }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'52px 20px 14px', position:'sticky', top:0, zIndex:10,
      background:`linear-gradient(${T.ink} 70%, rgba(10,11,16,0))` }}>
      <div style={{ fontFamily:T.fDisplay, fontWeight:800, fontSize:26, letterSpacing:'-0.035em',
        textTransform:'lowercase', color:T.paper }}>
        {title} {accent && <Em>{accent}</Em>}
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:14, color:T.paperDim }}>{right}</div>
    </div>
  );
}

// Bottom nav — sits above the home indicator
function BottomNav({ active, onNav }) {
  const items = [
    { key:'feed', icon:'grid', label:'feed' },
    { key:'search', icon:'search', label:'search' },
    { key:'saved', icon:'star', label:'saved' },
    { key:'profile', icon:'user', label:'profile' },
  ];
  return (
    <div style={{ display:'flex', justifyContent:'space-around', alignItems:'center',
      padding:'12px 12px 34px', background:'rgba(10,11,16,0.92)',
      backdropFilter:'blur(14px)', WebkitBackdropFilter:'blur(14px)',
      borderTop:`1px solid ${T.line}` }}>
      {items.map(it => {
        const on = active===it.key;
        return (
          <div key={it.key} onClick={()=>onNav(it.key)} style={{ display:'flex', flexDirection:'column',
            alignItems:'center', gap:5, cursor:'pointer', color: on?T.i300:T.muted,
            transition:`color 0.2s ${T.easeOut}` }}>
            <Icon name={it.icon} size={21} />
            <span style={{ fontFamily:T.fMono, fontSize:8, letterSpacing:'0.14em', textTransform:'uppercase' }}>{it.label}</span>
          </div>
        );
      })}
    </div>
  );
}

Object.assign(window, { T, Mark, Wordmark, Icon, Em, Mono, Button, Tag, Spark, TopBar, BottomNav });
