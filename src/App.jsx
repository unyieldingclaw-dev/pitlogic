import { useState, useEffect } from 'react';
import { MEATS } from './data/meats';
import { G } from './data/cuts';
import { save, load, replaceAll as storageReplaceAll } from './hooks/useStorage.js';
import { useRecipes } from './hooks/useRecipes.js';
import { usePrefs } from './hooks/usePrefs';
import { dur, shortDate } from './utils/helpers';
import { mergeCooks } from './utils/dataPortability.js';
import { LayoutDashboard, Flame, Clock, BarChart2, BookOpen, FlaskConical, Settings } from 'lucide-react';
import HistoryTab from './components/HistoryTab';
import ActiveTab from './components/ActiveTab';
import GuideTab from './components/GuideTab';
import DetailView from './components/DetailView';
import StallCard from './components/StallCard';
import DashboardTab from './components/DashboardTab';
import AnalyticsTab from './components/AnalyticsTab';
import RecipesTab from './components/RecipesTab';
import MultiCookBar from './components/MultiCookBar';
import SettingsSheet from './components/SettingsSheet';

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
  const [tab, setTab]               = useState('dashboard');
  const [view, setView]             = useState('history');
  const [cooks, setCooks]           = useState([]);
  const [activeCooks, setActiveCooks] = useState([]);
  const [activeCookIdx, setActiveCookIdx] = useState(0);
  const [detailId, setDetailId]     = useState(null);
  const [guideKey, setGuideKey]     = useState('Brisket');
  const [guideCat, setGuideCat]     = useState('Beef');
  const [loaded, setLoaded]         = useState(false);
  const [tick, setTick]             = useState(0);
  const [msg, setMsg]               = useState('');
  const [dismissed, setDismissed]   = useState({});
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { recipes, add: addRecipe, remove: removeRecipe, importMany: importManyRecipes, replaceAll: replaceAllRecipes } = useRecipes();
  const { prefs, setCutPref, resetCutPref } = usePrefs();
  const [form, setForm]             = useState({ name: '', meat: 'Beef', cut: 'Brisket', smokerTarget: 225, probes: [{ name: 'Probe 1', target: 203 }], mop: { enabled: false, intervalMin: 45, label: '' }, smokerLowAlarm: { enabled: false, threshold: 200 }, weight: '', equipment: '', pellet: '' });
  const [entry, setEntry]           = useState({ temps: [''], smokerTemp: '' });

  const activeId = activeCooks[activeCookIdx] ?? null;
  const activeCook = cooks.find(c => c.id === activeId) ?? null;
  const allActiveCooks = activeCooks.map(id => cooks.find(c => c.id === id)).filter(Boolean);

  useEffect(() => {
    if (activeCooks.length > 0) { const t = setInterval(() => setTick(n => n + 1), 6000); return () => clearInterval(t); }
  }, [activeCooks.length]);

  useEffect(() => {
    const d = load();
    if (d) { setCooks(d.cooks || []); setActiveCooks(d.activeCooks || (d.aid ? [d.aid] : [])); setDismissed(d.dis || {}); }
    setLoaded(true);
  }, []);

  const persist = (nc, ac, dis) => save({ cooks: nc, activeCooks: ac, dis });
  const update  = (nc, ac = activeCooks, dis = dismissed) => { setCooks(nc); persist(nc, ac, dis); };

  const flash = m => { setMsg(m); setTimeout(() => setMsg(''), 2500); };

  useEffect(() => {
    const cuts = MEATS[form.meat] || [];
    if (!cuts.includes(form.cut)) {
      const cut = cuts[0];
      const g = G[cut];
      const pref = prefs.cutPrefs?.[cut];
      setForm(f => ({ ...f, cut,
        smokerTarget: pref?.pit ?? g?.pit ?? 225,
        probes: f.probes.map(p => ({ ...p, target: pref?.pull ?? g?.pull ?? 165 }))
      }));
    }
  }, [form.meat]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const g = G[form.cut];
    const pref = prefs.cutPrefs?.[form.cut];
    if (g) setForm(f => ({ ...f,
      smokerTarget: pref?.pit ?? g.pit ?? 225,
      probes: f.probes.map(p => ({ ...p, target: pref?.pull ?? g.pull ?? 165 }))
    }));
  }, [form.cut]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeCook) setEntry({ temps: activeCook.probes.map(() => ''), smokerTemp: '' });
  }, [activeId]);

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

  const dis = key => { const d = { ...dismissed, [key]: true }; setDismissed(d); persist(cooks, activeCooks, d); };

  const stalls    = getStalls(activeCook);
  const wrapAlert = getWrapAlert(activeCook);
  const coAlert   = getCarryover(activeCook);

  const startCook = () => {
    const now = Date.now();
    const cook = {
      id: String(now), name: form.name || `${form.meat} — ${form.cut}`,
      meat: form.meat, cut: form.cut, smokerTarget: Number(form.smokerTarget),
      startTime: now, endTime: null, status: 'active',
      probes: form.probes.map((p, i) => ({ id: i, name: p.name, target: Number(p.target), readings: [] })),
      smokerReadings: [], notes: '', rating: 0,
      weight: form.weight ? Number(form.weight) : null,
      equipment: form.equipment || '',
      pellet: form.pellet || '',
      linkedRecipes: [],
      mopTimer: form.mop?.enabled
        ? { enabled: true, intervalMin: form.mop.intervalMin, label: form.mop.label || '', events: [] }
        : null,
      smokerLowAlarm: form.smokerLowAlarm?.enabled
        ? { enabled: true, threshold: Number(form.smokerLowAlarm.threshold) }
        : null,
    };
    const nc = [cook, ...cooks];
    const newActive = [...activeCooks, cook.id];
    setCooks(nc); setActiveCooks(newActive); setActiveCookIdx(newActive.length - 1);
    persist(nc, newActive, dismissed);
    setForm({ name: '', meat: 'Beef', cut: 'Brisket', smokerTarget: 225, probes: [{ name: 'Probe 1', target: 203 }], mop: { enabled: false, intervalMin: 45, label: '' }, smokerLowAlarm: { enabled: false, threshold: 200 }, weight: '', equipment: '', pellet: '' });
    setView('active'); setTab('active');
  };

  const endCook = () => {
    const id = activeId;
    const nc = cooks.map(c => c.id === id ? { ...c, status: 'complete', endTime: Date.now() } : c);
    const newActive = activeCooks.filter(aid => aid !== id);
    setCooks(nc); setActiveCooks(newActive); setActiveCookIdx(Math.max(0, activeCookIdx - 1));
    persist(nc, newActive, dismissed);
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

  const updateSmokerAlarm = (cookId, alarm) => {
    update(cooks.map(c => c.id === cookId ? { ...c, smokerLowAlarm: alarm } : c));
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
    const newActive = activeCooks.filter(aid => aid !== id);
    setCooks(nc); setActiveCooks(newActive); persist(nc, newActive, dismissed);
    if (activeCooks.includes(id)) setActiveCookIdx(Math.max(0, activeCookIdx - 1));
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
    setForm({ name: '', meat, cut, smokerTarget: g?.pit || 225, probes: [{ name: 'Probe 1', target: g?.pull || 165 }], mop: { enabled: false, intervalMin: 45, label: '' }, weight: '', equipment: '', pellet: '' });
    setView('new'); setTab('active');
  };

  const handleDismiss = key => {
    if (key === 'dismiss_wrap') dis(`wrap_${activeId}`);
    else if (typeof key === 'string' && key.startsWith('dismiss_stall_')) dis(`stall_${activeId}_${key.split('_').pop()}`);
    else if (key === 'dismiss_co') dis(`co_${activeId}`);
    else endCook();
  };

  const logSprayEvent = cookId => {
    const now = Date.now();
    const mins = +((now - (cooks.find(c => c.id === cookId)?.startTime || now)) / 60000).toFixed(2);
    const nc = cooks.map(c => {
      if (c.id !== cookId || !c.mopTimer) return c;
      return { ...c, mopTimer: { ...c.mopTimer, events: [...(c.mopTimer.events || []), { ts: now, time: mins }] } };
    });
    update(nc);
  };

  const handleImportCooks = ({ cooks: incoming, activeCooks: incomingActive, mode }) => {
    if (mode === 'merge') {
      const { merged } = mergeCooks(cooks, incoming);
      setCooks(merged);
      persist(merged, activeCooks, dismissed);
    } else {
      const newActive = (incomingActive || []).filter(id => incoming.some(c => c.id === id && c.status === 'active'));
      setCooks(incoming); setActiveCooks(newActive); setActiveCookIdx(0); setDismissed({});
      persist(incoming, newActive, {});
    }
  };

  const handleImportRecipes = ({ recipes: incoming, mode }) => {
    if (mode === 'merge') importManyRecipes(incoming);
    else replaceAllRecipes(incoming);
  };

  const handleNavClick = id => {
    setTab(id);
    if (id === 'active') {
      if (!activeId) setView('new'); else setView('active');
    }
    if (id !== 'history' && id !== 'dashboard') setDetailId(null);
  };

  if (!loaded) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: 'var(--bg)', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, color: 'var(--ember)',
        textShadow: '0 0 30px rgba(255,107,53,0.6)', letterSpacing: '0.1em' }}>PitLogic</div>
      <div style={{ fontSize: 12, color: 'var(--text3)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Loading your cooks…</div>
    </div>
  );

  const isDetail = view === 'detail';

  const NAV_ITEMS = [
    { id: 'dashboard', Icon: LayoutDashboard, label: 'Dashboard',  mobileLabel: 'Home'    },
    { id: 'active',    Icon: Flame,           label: activeId ? 'Active Cook' : 'New Cook', mobileLabel: activeId ? 'Active' : 'Cook' },
    { id: 'history',   Icon: Clock,           label: 'History',    mobileLabel: 'History' },
    { id: 'analytics', Icon: BarChart2,        label: 'Analytics',  mobileLabel: 'Stats'   },
    { id: 'guide',     Icon: BookOpen,        label: 'Guides',     mobileLabel: 'Guides'  },
    { id: 'recipes',   Icon: FlaskConical,    label: 'Recipes',    mobileLabel: 'Recipes' },
  ];

  return (
    <div id="root">
      {/* Background flame */}
      <div style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center', overflow: 'hidden' }}>
        <svg viewBox="0 0 200 340" xmlns="http://www.w3.org/2000/svg"
          style={{ width: '82vw', maxWidth: 680, minWidth: 280, opacity: 0.14 }}>
          <defs>
            <linearGradient id="flameOuter" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%"   stopColor="#8B1A00" />
              <stop offset="22%"  stopColor="#CC3300" />
              <stop offset="52%"  stopColor="#FF6B35" />
              <stop offset="80%"  stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="flameMid" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%"   stopColor="#FF6B35" />
              <stop offset="40%"  stopColor="#F59E0B" />
              <stop offset="75%"  stopColor="#FDE68A" />
              <stop offset="100%" stopColor="#FDE68A" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="flameCore" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%"   stopColor="#FBBF24" />
              <stop offset="45%"  stopColor="#FEF3C7" />
              <stop offset="100%" stopColor="#FFFFFF"  stopOpacity="0" />
            </linearGradient>
            <radialGradient id="baseGlow" cx="50%" cy="100%" r="50%">
              <stop offset="0%"   stopColor="#FF6B35" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#FF6B35" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Base heat glow */}
          <ellipse className="flame-glow" cx="100" cy="330" rx="88" ry="22" fill="url(#baseGlow)" />

          {/* Outer flame body — widest, darkest, most red */}
          <path className="flame-outer" fill="url(#flameOuter)" d="
            M100 328
            C 40 328  5 278  5 224
            C  5 170 28 148 52 112
            C 44 133 48 156 60 167
            C 52 122 70  80 100  14
            C130  80 148 122 140 167
            C152 156 156 133 148 112
            C172 148 195 170 195 224
            C195 278 160 328 100 328Z
          " />

          {/* Mid flame — narrower, amber */}
          <path className="flame-mid" fill="url(#flameMid)" d="
            M100 294
            C 63 294 40 264 40 234
            C 40 204 55 190 68 168
            C 63 184 65 202 75 211
            C 70 180 83 150 100  82
            C117 150 130 180 125 211
            C135 202 137 184 132 168
            C145 190 160 204 160 234
            C160 264 137 294 100 294Z
          " />

          {/* Inner core — narrowest, pale yellow-white */}
          <path className="flame-core" fill="url(#flameCore)" d="
            M100 258
            C 74 258 56 234 56 210
            C 56 186 67 176 77 158
            C 73 172 75 188 83 196
            C 79 168 89 144 100 104
            C111 144 121 168 117 196
            C125 188 127 172 123 158
            C133 176 144 186 144 210
            C144 234 126 258 100 258Z
          " />
        </svg>
      </div>

      <MultiCookBar activeCooks={allActiveCooks} />

      {/* Toast */}
      {msg && (
        <div style={{
          position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--ember)', color: '#fff', padding: '9px 20px',
          borderRadius: 20, fontSize: 13, fontWeight: 500, zIndex: 999,
          boxShadow: '0 4px 20px rgba(255,107,53,0.4)'
        }}>
          {msg}
        </div>
      )}

      {/* Sidebar (desktop) */}
      <aside className="app-sidebar" style={{
        display: 'none', flexDirection: 'column',
        background: 'var(--surface)', borderRight: '1px solid var(--border2)',
        padding: '1.5rem 0', minHeight: '100vh', position: 'sticky', top: 0, height: '100vh', overflowY: 'auto',
      }} id="app-sidebar">
        <div style={{ padding: '0 1.25rem 1.5rem', borderBottom: '1px solid var(--border2)', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: 'var(--ember)',
              textShadow: '0 0 20px rgba(255,107,53,0.5)', letterSpacing: '0.05em' }}>PitLogic</div>
            <button aria-label="Settings" onClick={() => setShowSettings(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)',
                padding: 4, borderRadius: 6, marginTop: 4 }}>
              <Settings size={16} />
            </button>
          </div>
          <div style={{ fontSize: 9, letterSpacing: '0.15em', color: 'var(--text3)', marginTop: 2, textTransform: 'uppercase' }}>Cook Tracker</div>
        </div>

        {activeId && activeCook && (
          <button onClick={() => handleNavClick('active')} style={{ margin: '0 .75rem 1rem', padding: '8px 12px', background: 'none',
            borderRadius: 8, border: '1px solid rgba(255,107,53,0.3)', cursor: 'pointer',
            width: 'calc(100% - 1.5rem)', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--ember)', fontWeight: 500 }}>
              <span className="live-pulse" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--ember)', display: 'inline-block' }} />
              ACTIVE COOK
            </div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2, fontFamily: 'var(--mono)' }}>{activeCook.name}</div>
          </button>
        )}

        <nav aria-label="Main navigation">
          {NAV_ITEMS.map(({ id, Icon, label }) => (
            <button key={id} onClick={() => handleNavClick(id)} aria-current={tab === id ? 'page' : undefined} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '11px 1.25rem', border: 'none',
              background: tab === id
                ? 'linear-gradient(90deg, rgba(255,107,53,0.14), rgba(245,158,11,0.04))'
                : 'transparent',
              color: tab === id ? 'var(--ember)' : 'var(--text2)',
              fontSize: 14, fontFamily: 'var(--font)',
              borderLeft: `3px solid ${tab === id ? 'var(--ember)' : 'transparent'}`,
              boxShadow: tab === id ? 'var(--glow-ember)' : 'none',
              cursor: 'pointer', width: '100%', textAlign: 'left', transition: 'all .15s',
            }}>
              <Icon size={18} />{label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Header */}
        <header style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1rem',
          background: 'linear-gradient(180deg, var(--surface) 0%, var(--bg) 100%)',
          borderBottom: '1px solid var(--border)',
          position: 'sticky', top: 0, zIndex: 10,
        }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700,
              color: 'var(--ember)', textShadow: '0 0 16px rgba(255,107,53,0.4)', letterSpacing: '0.05em', lineHeight: 1 }}>PitLogic</div>
            <div style={{ fontSize: 9, letterSpacing: '0.15em', color: 'var(--text3)', textTransform: 'uppercase' }}>Cook Tracker</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button aria-label="Settings" onClick={() => setShowSettings(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 6, borderRadius: 8 }}>
              <Settings size={18} />
            </button>
            {activeId && activeCook && tab !== 'active' && (
              <button className="btn" style={{ borderColor: 'rgba(255,107,53,0.4)', color: 'var(--ember)',
                display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
                onClick={() => handleNavClick('active')}>
                <span className="live-pulse" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--ember)', display: 'inline-block' }} />
                Active Cook
              </button>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="app-content">
          {isDetail && (
            <DetailView cooks={cooks} detailId={detailId}
              onBack={() => { setView('history'); setTab('history'); }}
              onDelete={deleteCook} onSave={saveCookNotes} flash={flash} />
          )}
          {!isDetail && tab === 'dashboard' && (
            <DashboardTab cooks={cooks} activeId={activeId} activeCook={activeCook}
              allActiveCooks={allActiveCooks} tick={tick}
              onGoActive={(cookId) => {
                if (cookId) {
                  const idx = activeCooks.indexOf(cookId);
                  if (idx !== -1) setActiveCookIdx(idx);
                }
                handleNavClick('active');
              }}
              onNewCook={() => { setTab('active'); setView('new'); }}
              onSelectCook={id => { setDetailId(id); setView('detail'); }} />
          )}
          {!isDetail && tab === 'history' && (
            <HistoryTab cooks={cooks} activeId={activeId} activeCook={activeCook} tick={tick}
              onSelectCook={id => { setDetailId(id); setView('detail'); }}
              onNewCook={() => { setView('new'); setTab('active'); }}
              onGoActive={() => { setView('active'); setTab('active'); }} />
          )}
          {!isDetail && tab === 'active' && (
            <ActiveTab view={view} form={form} setForm={setForm}
              cooks={cooks} activeCook={activeCook} entry={entry} setEntry={setEntry}
              stalls={stalls} wrapAlert={wrapAlert} coAlert={coAlert}
              confirmEnd={confirmEnd} setConfirmEnd={setConfirmEnd}
              tick={tick} onStart={startCook} onEnd={handleDismiss}
              onLog={logReading} onCSV={handleCSV} onGoGuide={goGuide}
              allActiveCooks={allActiveCooks} activeCookIdx={activeCookIdx}
              setActiveCookIdx={setActiveCookIdx}
              onAddCook={() => setView('new')}
              onSprayEvent={logSprayEvent}
              onUpdateSmokerAlarm={updateSmokerAlarm}
              prefs={prefs}
              setCutPref={setCutPref} />
          )}
          {!isDetail && tab === 'analytics' && (
            <AnalyticsTab cooks={cooks} />
          )}
          {!isDetail && tab === 'guide' && (
            <GuideTab guideKey={guideKey} setGuideKey={setGuideKey}
              guideCat={guideCat} setGuideCat={setGuideCat} onStartCook={startFromGuide} />
          )}
          {!isDetail && tab === 'recipes' && (
            <RecipesTab flash={flash} recipes={recipes} onAdd={addRecipe} onRemove={removeRecipe} onImportMany={importManyRecipes} />
          )}
          {!isDetail && tab === 'stall' && <StallCard />}
        </main>
      </div>

      <SettingsSheet
        open={showSettings}
        onClose={() => setShowSettings(false)}
        cookState={{ cooks, activeCooks }}
        recipes={recipes}
        onImportCooks={handleImportCooks}
        onImportRecipes={handleImportRecipes}
        prefs={prefs}
        resetCutPref={resetCutPref}
      />

      {/* Bottom nav (mobile) */}
      <nav id="bottom-nav" aria-label="Main navigation" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, height: 64,
        background: 'var(--surface)', borderTop: '1px solid var(--border)',
        display: 'flex', alignItems: 'stretch', zIndex: 20,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {NAV_ITEMS.map(({ id, Icon, mobileLabel }) => (
          <button key={id} onClick={() => handleNavClick(id)} aria-current={tab === id ? 'page' : undefined} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 3, border: 'none',
            background: 'transparent',
            color: tab === id ? 'var(--ember)' : 'var(--text3)',
            fontSize: 10, fontFamily: 'var(--font)', cursor: 'pointer',
            transition: 'color .15s',
          }}>
            <Icon size={20} />{mobileLabel}
          </button>
        ))}
      </nav>
    </div>
  );
}
