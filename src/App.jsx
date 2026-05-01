import { useState, useEffect } from 'react';
import { MEATS } from './data/meats';
import { G } from './data/cuts';
import { save, load } from './hooks/useStorage.js';
import { dur, shortDate } from './utils/helpers';
import HistoryTab from './components/HistoryTab';
import ActiveTab from './components/ActiveTab';
import GuideTab from './components/GuideTab';
import DetailView from './components/DetailView';
import StallCard from './components/StallCard';

function parseCSV(text, cook) {
  const lines = text.trim().split('\n'); if (lines.length < 2) return null;
  const hdrs = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
  const tCol = hdrs.findIndex(h => /time|date/.test(h));
  const sCol = hdrs.findIndex(h => /smoker|ambient|pit|grill/.test(h));
  const pCols = hdrs.reduce((a, h, i) => { if (/probe|ch\s*\d|channel|temp/i.test(h) && !/smoker|ambient|pit/i.test(h)) a.push(i); return a; }, []);
  let startTs = null; const pData = cook.probes.map(() => []); const sData = [];
  lines.slice(1).forEach(line => {
    const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    const ts = tCol >= 0 ? new Date(cols[tCol]).getTime() : null;
    if (ts && isNaN(ts)) return;
    if (!startTs && ts) startTs = cook.startTime || ts;
    const mins = ts && startTs ? (ts - startTs) / 60000 : pData[0]?.length || 0;
    pCols.forEach((ci, pi) => { const temp = parseFloat(cols[ci]); if (!isNaN(temp) && pi < pData.length) pData[pi].push({ time: +mins.toFixed(2), ts: ts || Date.now(), temp }); });
    if (sCol >= 0) { const temp = parseFloat(cols[sCol]); if (!isNaN(temp)) sData.push({ time: +mins.toFixed(2), ts: ts || Date.now(), temp }); }
  });
  return { pData, sData };
}

export default function App() {
  const [tab, setTab]               = useState('history');
  const [view, setView]             = useState('history');
  const [cooks, setCooks]           = useState([]);
  const [activeId, setActiveId]     = useState(null);
  const [detailId, setDetailId]     = useState(null);
  const [guideKey, setGuideKey]     = useState('Brisket');
  const [guideCat, setGuideCat]     = useState('Beef');
  const [loaded, setLoaded]         = useState(false);
  const [tick, setTick]             = useState(0);
  const [msg, setMsg]               = useState('');
  const [dismissed, setDismissed]   = useState({});
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [form, setForm]             = useState({ name: '', meat: 'Beef', cut: 'Brisket', smokerTarget: 225, probes: [{ name: 'Probe 1', target: 203 }] });
  const [entry, setEntry]           = useState({ temps: [''], smokerTemp: '' });

  const activeCook = cooks.find(c => c.id === activeId);

  /* ── Timer ── */
  useEffect(() => {
    if (activeId) { const t = setInterval(() => setTick(n => n + 1), 6000); return () => clearInterval(t); }
  }, [activeId]);

  /* ── Load from storage ── */
  useEffect(() => {
    const d = load();
    if (d) { setCooks(d.cooks || []); setActiveId(d.aid || null); setDismissed(d.dis || {}); }
    setLoaded(true);
  }, []);

  /* ── Persist ── */
  const persist = (nc, aid, dis) => save({ cooks: nc, aid, dis });
  const update  = (nc, aid = activeId, dis = dismissed) => { setCooks(nc); persist(nc, aid, dis); };

  /* ── Flash toast ── */
  const flash = m => { setMsg(m); setTimeout(() => setMsg(''), 2500); };

  /* ── Auto-fill form when meat/cut changes ── */
  useEffect(() => {
    const cuts = MEATS[form.meat] || [];
    if (!cuts.includes(form.cut)) {
      const cut = cuts[0] || ''; const g = G[cut];
      setForm(f => ({ ...f, cut, smokerTarget: g?.pit || 225, probes: f.probes.map(p => ({ ...p, target: g?.pull || 165 })) }));
    }
  }, [form.meat]);

  useEffect(() => {
    const g = G[form.cut];
    if (g) setForm(f => ({ ...f, smokerTarget: g.pit || 225, probes: f.probes.map(p => ({ ...p, target: g.pull || 165 })) }));
  }, [form.cut]);

  useEffect(() => {
    if (activeCook) setEntry({ temps: activeCook.probes.map(() => ''), smokerTemp: '' });
  }, [activeId]);

  /* ── Alert detection ── */
  const getStalls = cook => {
    if (!cook) return {};
    const stalls = {};
    cook.probes.forEach((probe, i) => {
      const r = probe.readings; if (r.length < 3) return;
      const last = r[r.length - 1]; if (last.temp < 140 || last.temp > 185) return;
      const recent = r.slice(-4); const temps = recent.map(x => x.temp);
      const range = Math.max(...temps) - Math.min(...temps);
      const tdiff = recent[recent.length - 1].time - recent[0].time;
      if (range < 8 && tdiff >= 18 && !dismissed[`stall_${cook.id}_${i}`]) stalls[i] = last.temp;
    });
    return stalls;
  };

  const getWrapAlert = cook => {
    if (!cook) return false;
    const g = G[cook.cut];
    if (!g?.wrap || dismissed[`wrap_${cook.id}`]) return false;
    return cook.probes.some(p => { const last = p.readings[p.readings.length - 1]; return last && last.temp >= g.wrap && last.temp < g.pull - 5; });
  };

  const getCarryover = cook => {
    if (!cook) return false;
    const g = G[cook.cut];
    if (!g?.co || dismissed[`co_${cook.id}`]) return false;
    return cook.probes.some(p => { const last = p.readings[p.readings.length - 1]; return last && last.temp >= (g.pull - g.co - 5); });
  };

  const dis = key => { const d = { ...dismissed, [key]: true }; setDismissed(d); persist(cooks, activeId, d); };

  const stalls    = getStalls(activeCook);
  const wrapAlert = getWrapAlert(activeCook);
  const coAlert   = getCarryover(activeCook);

  /* ── Cook actions ── */
  const startCook = () => {
    const now = Date.now();
    const cook = {
      id: String(now), name: form.name || `${form.meat} — ${form.cut}`,
      meat: form.meat, cut: form.cut, smokerTarget: Number(form.smokerTarget),
      startTime: now, endTime: null, status: 'active',
      probes: form.probes.map((p, i) => ({ id: i, name: p.name, target: Number(p.target), readings: [] })),
      smokerReadings: [], notes: '', rating: 0
    };
    const nc = [cook, ...cooks]; setCooks(nc); setActiveId(cook.id);
    persist(nc, cook.id, dismissed);
    setForm({ name: '', meat: 'Beef', cut: 'Brisket', smokerTarget: 225, probes: [{ name: 'Probe 1', target: 203 }] });
    setView('active'); setTab('active');
  };

  const endCook = () => {
    const id = activeId;
    const nc = cooks.map(c => c.id === id ? { ...c, status: 'complete', endTime: Date.now() } : c);
    setCooks(nc); setActiveId(null); persist(nc, null, dismissed);
    setDetailId(id); setConfirmEnd(false); setView('detail'); setTab('history');
  };

  const logReading = () => {
    if (!activeCook) return;
    const now = Date.now(); const mins = +((now - activeCook.startTime) / 60000).toFixed(2);
    let logged = false;
    const nc = cooks.map(c => {
      if (c.id !== activeId) return c;
      const np = c.probes.map((p, i) => { const val = parseFloat(entry.temps[i]); if (isNaN(val)) return p; logged = true; return { ...p, readings: [...p.readings, { time: mins, ts: now, temp: val }] }; });
      const sv = parseFloat(entry.smokerTemp);
      const ns = isNaN(sv) ? c.smokerReadings : [...c.smokerReadings, { time: mins, ts: now, temp: sv }];
      if (!isNaN(sv)) logged = true;
      return { ...c, probes: np, smokerReadings: ns };
    });
    if (logged) { update(nc); setEntry({ temps: activeCook.probes.map(() => ''), smokerTemp: '' }); flash('Reading logged ✓'); }
  };

  const handleCSV = (e, cookId) => {
    const file = e.target.files[0]; if (!file) return;
    const cook = cooks.find(c => c.id === cookId); if (!cook) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const res = parseCSV(ev.target.result, cook); if (!res) { flash('Could not parse CSV'); return; }
      const { pData, sData } = res;
      const nc = cooks.map(c => { if (c.id !== cookId) return c; return { ...c, probes: c.probes.map((p, i) => ({ ...p, readings: [...p.readings, ...(pData[i] || [])] })), smokerReadings: [...c.smokerReadings, ...sData] }; });
      update(nc); flash('CSV imported ✓');
    };
    reader.readAsText(file); e.target.value = '';
  };

  const deleteCook = id => {
    if (!confirm('Delete this cook?')) return;
    const nc = cooks.filter(c => c.id !== id);
    const na = activeId === id ? null : activeId;
    setCooks(nc); persist(nc, na, dismissed);
    if (activeId === id) setActiveId(null);
    setView('history'); setTab('history');
  };

  const saveCookNotes = (id, notes, rating) => {
    const nc = cooks.map(c => c.id === id ? { ...c, notes, rating } : c);
    update(nc);
  };

  const goGuide = cut => {
    const me = Object.entries(MEATS).find(([, cs]) => cs.includes(cut));
    if (me) { setGuideCat(me[0]); setGuideKey(cut); setTab('guide'); }
  };

  const startFromGuide = cut => {
    const me = Object.entries(MEATS).find(([, cs]) => cs.includes(cut));
    if (!me) return;
    const [meat] = me; const g = G[cut];
    setForm({ name: '', meat, cut, smokerTarget: g?.pit || 225, probes: [{ name: 'Probe 1', target: g?.pull || 165 }] });
    setView('new'); setTab('active');
  };

  const handleDismiss = key => {
    if (key === 'dismiss_wrap') dis(`wrap_${activeId}`);
    else if (key.startsWith('dismiss_stall_')) dis(`stall_${activeId}_${key.split('_').pop()}`);
    else if (key === 'dismiss_co') dis(`co_${activeId}`);
    else endCook();
  };

  if (!loaded) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text2)' }}>Loading your cooks...</div>;

  const isDetail  = view === 'detail';
  const isNewOrActive = tab === 'active';

  return (
    <div>
      {/* Toast */}
      {msg && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'var(--amber)', color: '#fff', padding: '9px 20px', borderRadius: 20, fontSize: 13, fontWeight: 500, zIndex: 999 }}>
          {msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 0 .5rem', borderBottom: '0.5px solid var(--border)', marginBottom: '.5rem' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 500 }}>RFX Cook Tracker</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 1 }}>ThermoWorks RFX · Traeger guide + pitmaster tools</div>
        </div>
        {activeId && activeCook && tab !== 'active' && (
          <button className="btn" style={{ borderColor: 'var(--amber)', color: 'var(--amber)', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}
            onClick={() => { setView('active'); setTab('active'); }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--red)', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
            Active
          </button>
        )}
      </div>

      {/* Nav */}
      <div style={{ display: 'flex', borderBottom: '0.5px solid var(--border)', marginBottom: '1.5rem', overflowX: 'auto' }}>
        <button className={`nav-tab${tab === 'history' && !isDetail ? ' active' : ''}`} onClick={() => { setTab('history'); setView('history'); }}>📋 History</button>
        <button className={`nav-tab${tab === 'active' ? ' active' : ''}`} onClick={() => { setTab('active'); if (!activeId) setView('new'); else setView('active'); }}>
          {activeId
            ? <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>🔥 Active <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--red)', display: 'inline-block', animation: 'pulse 1.5s infinite' }} /></span>
            : '🔥 New cook'
          }
        </button>
        <button className={`nav-tab${tab === 'guide' ? ' active' : ''}`} onClick={() => setTab('guide')}>📖 Guide</button>
        <button className={`nav-tab${tab === 'stall' ? ' active' : ''}`} onClick={() => setTab('stall')}>🌡️ The Stall</button>
      </div>

      {/* Views */}
      {isDetail && (
        <DetailView
          cooks={cooks}
          detailId={detailId}
          onBack={() => { setView('history'); setTab('history'); }}
          onDelete={deleteCook}
          onSave={saveCookNotes}
          flash={flash}
        />
      )}
      {!isDetail && tab === 'history' && (
        <HistoryTab
          cooks={cooks}
          activeId={activeId}
          activeCook={activeCook}
          tick={tick}
          onSelectCook={id => { setDetailId(id); setView('detail'); }}
          onNewCook={() => { setView('new'); setTab('active'); }}
          onGoActive={() => { setView('active'); setTab('active'); }}
        />
      )}
      {!isDetail && tab === 'active' && (
        <ActiveTab
          view={view}
          form={form}
          setForm={setForm}
          activeCook={activeCook}
          entry={entry}
          setEntry={setEntry}
          stalls={stalls}
          wrapAlert={wrapAlert}
          coAlert={coAlert}
          confirmEnd={confirmEnd}
          setConfirmEnd={setConfirmEnd}
          tick={tick}
          onStart={startCook}
          onEnd={handleDismiss}
          onLog={logReading}
          onCSV={handleCSV}
          onGoGuide={goGuide}
        />
      )}
      {!isDetail && tab === 'guide' && (
        <GuideTab
          guideKey={guideKey}
          setGuideKey={setGuideKey}
          guideCat={guideCat}
          setGuideCat={setGuideCat}
          onStartCook={startFromGuide}
        />
      )}
      {!isDetail && tab === 'stall' && <StallCard />}
    </div>
  );
}