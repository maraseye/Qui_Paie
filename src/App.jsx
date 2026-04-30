import { useState, useRef, useCallback, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Plus, Trash2, Ban, CheckCircle2, RotateCcw, Volume2, VolumeX,
  Users, History, Dices, RefreshCw, Trophy, Sparkles, Star,
  AlertCircle, ArrowLeft, ChevronRight
} from 'lucide-react';
import {
  playDrumRoll, playRevealSound, playJokerSound,
  playExcludeSound, playAddSound, playReplaySound,
} from './soundManager.js';

/* ── Avatar ─────────────────────────────────────────────── */
const AVATAR_COLORS = [
  '#f7b731','#7b2ff7','#ff4757','#2ed573',
  '#1e90ff','#ff6b35','#a55bff','#ffa502',
  '#ff3f6c','#00d2d3','#54a0ff','#ff9ff3',
];
function Avatar({ name, id, size = 32 }) {
  const bg = AVATAR_COLORS[id % AVATAR_COLORS.length];
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', justifyContent:'center',
      width:size, height:size, borderRadius:'50%', background:bg, color:'#fff',
      fontWeight:900, fontSize:size*0.45, flexShrink:0, userSelect:'none',
      boxShadow:`0 0 0 3px ${bg}30`,
    }}>
      {name?.[0]?.toUpperCase() ?? '?'}
    </span>
  );
}

/* ── Data ───────────────────────────────────────────────── */
let nextId = 1;
function mkParticipant(name) { return { id: nextId++, name: name.trim(), excluded: false, paid: false }; }
function pickWinner(list) {
  const el = list.filter(p => !p.excluded);
  return el.length ? el[Math.floor(Math.random() * el.length)] : null;
}

/* ── Views ──────────────────────────────────────────────── */
const VIEW = { MODE: 'mode', PARTICIPANTS: 'participants', DRAW: 'draw' };
const PHASE = { SUSPENSE: 'suspense', REVEAL: 'reveal' };

/* ════════════════════════════════════════════════════════ */
export default function App() {
  const [view, setView]               = useState(VIEW.MODE);
  const [mode, setMode]               = useState(null);   // 'pays' | 'free'
  const [participants, setParticipants] = useState([]);
  const [soundOn, setSoundOn]         = useState(true);

  // Draw state
  const [phase, setPhase]             = useState(null);
  const [cycleIdx, setCycleIdx]       = useState(0);
  const [winner, setWinner]           = useState(null);
  const [history, setHistory]         = useState([]);
  const [modalOpen, setModalOpen]     = useState(false);

  const cycleRef = useRef(null);
  const stopDrum = useRef(null);

  /* ── Navigation ─────────────────────────────────────── */
  const selectMode = (m) => { setMode(m); setView(VIEW.PARTICIPANTS); };
  const goBack = () => {
    if (view === VIEW.DRAW) { clearTimeout(cycleRef.current); stopDrum.current?.(); setPhase(null); setView(VIEW.PARTICIPANTS); }
    else if (view === VIEW.PARTICIPANTS) { setView(VIEW.MODE); setParticipants([]); }
  };
  const goToDraw = () => { setView(VIEW.DRAW); setPhase(null); setWinner(null); setModalOpen(false); };

  /* ── Draw logic ─────────────────────────────────────── */
  const eligible = participants.filter(p => !p.excluded);

  const startDraw = useCallback(() => {
    const win = pickWinner(participants);
    if (!win) return;
    setPhase(PHASE.SUSPENSE);
    setWinner(null);
    setModalOpen(false);

    let i = 0, ticks = 0;
    const FAST = 20, SLOW = 12;
    function scheduleCycle() {
      const speed = ticks < FAST ? 70 : 70 + ((ticks - FAST) / SLOW) * 340;
      cycleRef.current = setTimeout(() => {
        i = (i + 1) % eligible.length;
        setCycleIdx(i);
        ticks++;
        if (ticks < FAST + SLOW) scheduleCycle();
      }, speed);
    }
    scheduleCycle();

    if (soundOn) stopDrum.current = playDrumRoll(() => {});

    setTimeout(() => {
      clearTimeout(cycleRef.current);
      setPhase(PHASE.REVEAL);
      setWinner(win);

      const isLucky = mode === 'free';
      setHistory(prev => [{ id: Date.now(), name: win.name, avatarId: win.id, isLucky }, ...prev]);

      if (soundOn) isLucky ? playJokerSound() : playRevealSound();

      confetti({
        particleCount: isLucky ? 200 : 120,
        spread: isLucky ? 110 : 80,
        origin: { y: 0.45 },
        colors: isLucky
          ? ['#2ed573','#f7b731','#ffffff','#a55bff']
          : ['#f7b731','#7b2ff7','#ff4757','#2ed573','#1e90ff'],
      });
      setTimeout(() => setModalOpen(true), 400);
    }, 3500);
  }, [participants, eligible, mode, soundOn]);

  useEffect(() => {
    if (view === VIEW.DRAW && phase === null) startDraw();
  }, [view]);   // eslint-disable-line

  useEffect(() => () => { clearTimeout(cycleRef.current); stopDrum.current?.(); }, []);

  const handleExcludeWinner = () => {
    if (!winner) return;
    setParticipants(prev => prev.map(p => p.id === winner.id ? { ...p, excluded: true, paid: true } : p));
    if (soundOn) playExcludeSound();
    setModalOpen(false);
  };
  const handleReplay = () => {
    setModalOpen(false); setWinner(null); setPhase(null);
    if (soundOn) playReplaySound();
    setTimeout(startDraw, 300);
  };

  const isLuckyMode = mode === 'free';
  const cycleParticipant = eligible[cycleIdx % Math.max(1, eligible.length)];

  /* ════════════ RENDER ════════════════════════════════════ */

  /* ── Page 1: Mode ───────────────────────────────────── */
  if (view === VIEW.MODE) return (
    <>
      <Blobs />
      <div className="page page-mode">
        <div className="mode-header">
          <div className="logo-icon-wrap"><Dices size={32} strokeWidth={1.8} /></div>
          <h1>Qui Paie ?</h1>
          <p className="tagline">Comment voulez-vous jouer ?</p>
        </div>
        <div className="mode-cards">
          <button className="mode-card mode-pays" onClick={() => selectMode('pays')}>
            <div className="mode-card-icon"><Dices size={48} strokeWidth={1.3} /></div>
            <div className="mode-card-title">Qui paie ?</div>
            <div className="mode-card-desc">La personne tirée au sort règle l&apos;addition pour tout le groupe.</div>
            <div className="mode-card-cta">Choisir <ChevronRight size={16} /></div>
          </button>
          <button className="mode-card mode-free" onClick={() => selectMode('free')}>
            <div className="mode-card-icon"><Star size={48} strokeWidth={1.3} /></div>
            <div className="mode-card-title">Qui ne paie pas ?</div>
            <div className="mode-card-desc">La personne tirée est épargnée — les autres paient à sa place !</div>
            <div className="mode-card-cta">Choisir <ChevronRight size={16} /></div>
          </button>
        </div>
        <SoundToggle soundOn={soundOn} setSoundOn={setSoundOn} />
      </div>
    </>
  );

  /* ── Page 2: Participants ───────────────────────────── */
  if (view === VIEW.PARTICIPANTS) return (
    <>
      <Blobs />
      <div className="page page-participants">
        <div className="page-nav">
          <button className="btn-back" onClick={goBack}><ArrowLeft size={18} strokeWidth={2.5} /> Retour</button>
          <span className={`mode-badge ${isLuckyMode ? 'badge-free' : 'badge-pays'}`}>
            {isLuckyMode ? <><Star size={12} strokeWidth={2} /> Qui ne paie pas</> : <><Dices size={12} strokeWidth={2} /> Qui paie</>}
          </span>
        </div>

        <ParticipantsForm
          participants={participants}
          setParticipants={setParticipants}
          soundOn={soundOn}
          onLaunch={goToDraw}
        />

        <SoundToggle soundOn={soundOn} setSoundOn={setSoundOn} />
      </div>
    </>
  );

  /* ── Page 3: Draw (full screen) ─────────────────────── */
  return (
    <>
      <Blobs />
      <div className={`page page-draw${isLuckyMode ? ' lucky-mode' : ''}`}>
        {/* Back button (only when idle/revealed) */}
        {phase !== PHASE.SUSPENSE && (
          <button className="btn-back draw-back" onClick={goBack}>
            <ArrowLeft size={18} strokeWidth={2.5} /> Participants
          </button>
        )}

        {/* Mode badge */}
        <span className={`mode-badge draw-mode-badge ${isLuckyMode ? 'badge-free' : 'badge-pays'}`}>
          {isLuckyMode ? <><Star size={12} strokeWidth={2} /> Qui ne paie pas</> : <><Dices size={12} strokeWidth={2} /> Qui paie</>}
        </span>

        {/* SUSPENSE */}
        {phase === PHASE.SUSPENSE && (
          <div className="draw-suspense">
            <div className="suspense-label"><Sparkles size={16} strokeWidth={2} /> En train de choisir…</div>
            <div className="suspense-ticker">
              {cycleParticipant && (
                <div className="ticker-inner" key={cycleParticipant.id}>
                  <Avatar name={cycleParticipant.name} id={cycleParticipant.id} size={72} />
                  <span className="ticker-name">{cycleParticipant.name}</span>
                </div>
              )}
            </div>
            <div className="suspense-bars">
              {[...Array(7)].map((_, i) => <span key={i} style={{ animationDelay: `${i * 0.1}s` }} />)}
            </div>
          </div>
        )}

        {/* REVEAL */}
        {phase === PHASE.REVEAL && winner && (
          <div className={`draw-reveal${isLuckyMode ? ' reveal-lucky' : ''}`}>
            <div className="reveal-eyebrow">
              {isLuckyMode
                ? <><Star size={20} fill="currentColor" strokeWidth={1.5} /> L&apos;élu du jour</>
                : <><Trophy size={20} strokeWidth={1.5} /> Le perdant</>
              }
            </div>
            <div className="reveal-avatar-wrap">
              <Avatar name={winner.name} id={winner.id} size={120} />
            </div>
            <div className="reveal-name">{winner.name}</div>
            <div className={`reveal-verdict ${isLuckyMode ? 'verdict-lucky' : 'verdict-loser'}`}>
              {isLuckyMode
                ? 'Ne paie pas — les autres se cotisent ! 🎉'
                : 'C\'est toi qui régales ! 💸'}
            </div>

            <div className="reveal-actions">
              <button className="btn btn-ghost" onClick={handleExcludeWinner}>
                <Ban size={15} strokeWidth={2.5} /> Exclure (a déjà payé)
              </button>
              <button className={`btn ${isLuckyMode ? 'btn-lucky' : 'btn-primary'}`} onClick={handleReplay}>
                <RefreshCw size={15} strokeWidth={2.5} /> Rejouer !
              </button>
            </div>
          </div>
        )}

        {/* History strip */}
        {history.length > 1 && phase === PHASE.REVEAL && (
          <div className="draw-history">
            {history.slice(1, 6).map((h, i) => (
              <span key={h.id} className={`history-tag${h.isLucky ? ' joker-tag' : ''}`}>
                <Avatar name={h.name} id={h.avatarId} size={18} />
                {h.name}
                {h.isLucky && <Star size={9} fill="#f7b731" color="#f7b731" />}
              </span>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/* ── Sub-components ──────────────────────────────────────── */

function Blobs() {
  return (
    <div className="bg-blobs" aria-hidden="true">
      <div className="blob blob1" /><div className="blob blob2" /><div className="blob blob3" />
    </div>
  );
}

function SoundToggle({ soundOn, setSoundOn }) {
  return (
    <div className="sound-toggle-row">
      <label className="toggle-label" htmlFor="sound-toggle">
        {soundOn ? <Volume2 size={16} strokeWidth={2} /> : <VolumeX size={16} strokeWidth={2} />}
        {soundOn ? 'Sons activés' : 'Désactivés'}
      </label>
      <label className="switch">
        <input type="checkbox" id="sound-toggle" checked={soundOn} onChange={e => setSoundOn(e.target.checked)} />
        <span className="slider-track" />
      </label>
    </div>
  );
}

function ParticipantsForm({ participants, setParticipants, soundOn, onLaunch }) {
  const [inputName, setInputName] = useState('');
  const [inputError, setInputError] = useState('');
  const inputRef = useRef(null);

  const add = () => {
    const name = inputName.trim();
    if (!name) { setInputError('Entrez un prénom !'); setTimeout(() => setInputError(''), 2000); return; }
    if (name.length > 24) { setInputError('Max 24 caractères !'); setTimeout(() => setInputError(''), 2000); return; }
    if (participants.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      setInputError('Ce prénom existe déjà !'); setTimeout(() => setInputError(''), 2000); return;
    }
    setParticipants(prev => [...prev, mkParticipant(name)]);
    setInputName(''); setInputError('');
    if (soundOn) playAddSound();
    inputRef.current?.focus();
  };

  const remove = (id) => setParticipants(prev => prev.filter(p => p.id !== id));
  const toggleExclude = (id) => {
    setParticipants(prev => prev.map(p => p.id === id ? { ...p, excluded: !p.excluded } : p));
    if (soundOn) playExcludeSound();
  };
  const eligible = participants.filter(p => !p.excluded);

  return (
    <div className="participants-form">
      <h2 className="participants-title">
        <Users size={22} strokeWidth={2.5} /> Les participants
        {participants.length > 0 && <span className="active-count">{eligible.length}/{participants.length} actifs</span>}
      </h2>

      <div className="add-input-row">
        <input
          ref={inputRef}
          type="text" className="name-input"
          placeholder="Entrer un prénom…"
          value={inputName}
          onChange={e => setInputName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          maxLength={24} autoComplete="off"
        />
        <button className="btn btn-add" onClick={add} aria-label="Ajouter"><Plus size={22} strokeWidth={3} /></button>
      </div>
      {inputError && <p className="input-hint"><AlertCircle size={13} style={{ display:'inline', marginRight:4 }} />{inputError}</p>}

      {participants.length === 0
        ? <div className="empty-state"><Users size={44} strokeWidth={1.1} opacity={0.25} /><p>Personne pour l&apos;instant…<br />Ajoutez vos amis !</p></div>
        : (
          <ul className="participants-list">
            {participants.map(p => (
              <li key={p.id} className={`participant-item${p.excluded ? ' excluded' : ''}`}>
                <Avatar name={p.name} id={p.id} size={32} />
                <span className="participant-name">{p.name}</span>
                {p.excluded && <span className="participant-badge badge-excluded"><Ban size={9} style={{ marginRight:2 }} />Exclu</span>}
                <div className="participant-actions">
                  <button className="icon-btn" onClick={() => toggleExclude(p.id)} title={p.excluded ? 'Réactiver' : 'Exclure'}>
                    {p.excluded ? <CheckCircle2 size={16} strokeWidth={2} color="#2ed573" /> : <Ban size={16} strokeWidth={2} color="#ff4757" />}
                  </button>
                  <button className="icon-btn" onClick={() => remove(p.id)} title="Supprimer">
                    <Trash2 size={16} strokeWidth={2} color="#ff4757" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )
      }

      {participants.length > 1 && (
        <div className="participants-footer">
          <button className="btn btn-ghost btn-sm" onClick={() => setParticipants(prev => prev.map(p => ({ ...p, excluded: false })))}>
            <RotateCcw size={13} /> Réactiver tous
          </button>
          <button className="btn btn-launch" onClick={onLaunch} disabled={eligible.length < 2}>
            <Sparkles size={18} strokeWidth={2} />
            Lancer le tirage !
            <ChevronRight size={18} strokeWidth={2.5} />
          </button>
        </div>
      )}
    </div>
  );
}
