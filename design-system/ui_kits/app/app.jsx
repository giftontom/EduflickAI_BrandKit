/* ============================================================
   EDUFLICK AI · APP UI KIT · main app
   Click a flick card to open the player. Bottom nav switches screens.
   ============================================================ */
function App() {
  const [tab, setTab] = React.useState('feed');
  const [flick, setFlick] = React.useState(null);

  const screen = {
    feed:   <FeedScreen onOpen={setFlick} />,
    search: <SearchScreen onOpen={setFlick} />,
    saved:  <SavedScreen onOpen={setFlick} />,
    profile:<ProfileScreen />,
  }[tab];

  return (
    <IOSDevice dark>
      <div style={{ display:'flex', flexDirection:'column', height:'100%', background:T.ink }}>
        <div style={{ flex:1, overflow:'auto' }} key={tab}>{screen}</div>
        <BottomNav active={tab} onNav={setTab} />
      </div>
      {flick && <FlickPlayer lesson={flick} onClose={()=>setFlick(null)} />}
    </IOSDevice>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
