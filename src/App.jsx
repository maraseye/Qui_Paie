import { useState, useRef, useCallback, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Plus, Trash2, Ban, CheckCircle2, RotateCcw, Volume2, VolumeX,
  Users, History, Dices, RefreshCw, Trophy, Sparkles,
  AlertCircle, Star
} from 'lucide-react';
import {
  playDrumRoll,
  playRevealSound,
  playJokerSound,
  playExcludeSound,
  playAddSound,
  playReplaySound,
} from './soundManager.js';

// Colored avatars
const AVATAR_COLORS = [
  '#f7b731','#7b2ff7','#ff4757','#2ed573',
  '#1e90ff','#ff6b35','#a55bff','#ffa502',
  '#ff3f6c','#00d2d3','#54a0ff','#ff9ff3',
];
function getAvatarColor(id) { return AVATAR_COLORS[id % AVATAR_COLORS.length]; }

function Avatar({ name, id, size = 32 }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: size, height: size, borderRadius: '50%',
      background: getAvatarColor(id), color: '#fff',
      fontWeight: 900, fontSize: size * 0.45, flexShrink: 0,
      boxShadow: `0 0 0 2px ${getAvatarColor(id)}40`, userSelect: 'none',
    }}>
      {name ? name[0].toUpperCase() : '?'}
    </span>
  );
}

let nextId = 1;
const SAMPLE_NAMES = ['Alice', 'Bob', 'Charlie', 'Diana'];
function createParticipant(name) {
  const id = nextId++;
  return { id, name: name.trim(), excluded: false, paid: false, joker: false };
}
function pickWinner(participants) {
  const eligible = participants.filter(p => !p.excluded);
  if (eligible.length === 0) return null;
  return eligible[Math.floor(Math.random() * eligible.length)];
}

// Animation phases
const PHASE = { IDLE: 'idle', SUSPENSE: 'suspense', REVEAL: 'reveal' };

export default function App() {
  const [participants, setParticipants] = useState(() => SAMPLE_NAMES.map(createParticipant));
  const [inputName, setInputName] = useState('');
  const [inputError, setInputError] = useState('');
  const [phase, setPhase] = useState(PHASE.IDLE);
  const [cycleIndex, setCycleIndex] = useState(0);   // index shown during suspense
  const [winner, setWinner] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [history, setHistory] = useState([]);

  const inputRef = useRef(null);
  const stopDrumRef = useRef(null);
  const cycleIntervalRef = useRef(null);

  const eligible = participants.filter(p => !p.excluded);

  // ── Draw ───────────────────────────────────────────────
  const handleDraw = useCallback(() => {
    if (phase !== PHASE.IDLE || eligible.length < 2) {
      if (eligible.length < 2)
        setInputError(eligible.length === 0 ? 'Ajoutez des participants !' : 'Il faut au moins 2 participants actifs !');
      setTimeout(() => setInputError(''), 2500);
      return;
    }

    const win = pickWinner(participants);
    setPhase(PHASE.SUSPENSE);
    setWinner(null);

    // Cycle names fast during suspense
    let i = 0;
    let speed = 80;
    let ticks = 0;
    const FAST_TICKS = 18;
    const SLOW_TICKS = 12;

    function scheduleCycle() {
      cycleIntervalRef.current = setTimeout(() => {
        i = (i + 1) % eligible.length;
        setCycleIndex(i);
        ticks++;
        if (ticks < FAST_TICKS) {
          speed = 80;
        } else {
          speed = 80 + ((ticks - FAST_TICKS) / SLOW_TICKS) * 320;
        }
        if (ticks < FAST_TICKS + SLOW_TICKS) {
          scheduleCycle();
        }
      }, speed);
    }
    scheduleCycle();

    // Drum roll
    if (soundOn) {
      stopDrumRef.current = playDrumRoll(() => {});
    }

    // After ~3.2s reveal
    setTimeout(() => {
      clearTimeout(cycleIntervalRef.current);
      setPhase(PHASE.REVEAL);
      setWinner(win);

      const isJoker = win.joker;
      setHistory(prev => [{ id: Date.now(), name: win.name, avatarId: win.id, joker: isJoker }, ...prev]);

      if (soundOn) {
        isJoker ? playJokerSound() : playRevealSound();
      }

      confetti({
        particleCount: isJoker ? 180 : 120,
        spread: isJoker ? 100 : 80,
        origin: { y: 0.45 },
        colors: isJoker
          ? ['#2ed573', '#f7b731', '#ffffff', '#a55bff']
          : ['#f7b731', '#7b2ff7', '#ff4757', '#2ed573', '#1e90ff'],
      });

      setTimeout(() => setModalOpen(true), 400);
    }, 3300);
  }, [phase, eligible, participants, soundOn]);

  // ── Participants ───────────────────────────────────────
  const handleAddParticipant = useCallback(() => {
    const name = inputName.trim();
    if (!name) { setInputError('Entrez un prénom !'); setTimeout(() => setInputError(''), 2000); return; }
    if (name.length > 24) { setInputError('Maximum 24 caractères !'); setTimeout(() => setInputError(''), 2000); return; }
    if (participants.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      setInputError('Ce prénom existe déjà !'); setTimeout(() => setInputError(''), 2000); return;
    }
    setParticipants(prev => [...prev, createParticipant(name)]);
    setInputName('');
    if (soundOn) playAddSound();
    inputRef.current?.focus();
  }, [inputName, participants, soundOn]);

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleAddParticipant(); };
  const handleRemove = (id) => setParticipants(prev => prev.filter(p => p.id !== id));
  const handleToggleExclude = (id) => {
    setParticipants(prev => prev.map(p => p.id === id ? { ...p, excluded: !p.excluded } : p));
    if (soundOn) playExcludeSound();
  };
  const handleToggleJoker = (id) => {
    setParticipants(prev => prev.map(p => p.id === id ? { ...p, joker: !p.joker } : p));
  };

  const handleExcludeWinner = () => {
    if (!winner) return;
    setParticipants(prev => prev.map(p => p.id === winner.id ? { ...p, excluded: true, paid: true } : p));
    if (soundOn) playExcludeSound();
    setModalOpen(false);
  };
  const handleReplay = useCallback(() => {
    setModalOpen(false);
    setWinner(null);
    setPhase(PHASE.IDLE);
    if (soundOn) playReplaySound();
    setTimeout(handleDraw, 300);
  }, [soundOn, handleDraw]);

  const handleReset = () => {
    setPhase(PHASE.IDLE);
    setWinner(null);
    setModalOpen(false);
  };

  const handleResetExcluded = () => setParticipants(prev => prev.map(p => ({ ...p, excluded: false, paid: false })));
  const handleClearAll = () => {
    setParticipants([]);
    setWinner(null);
    setPhase(PHASE.IDLE);
    setModalOpen(false);
  };

  useEffect(() => {
    return () => {
      clearTimeout(cycleIntervalRef.current);
      stopDrumRef.current?.();
    };
  }, []);

  const isJokerWinner = winner?.joker;

  // Name shown during cycling
  const cycleParticipant = eligible[cycleIndex % Math.max(1, eligible.length)];

  return (
    <>
      <div className="bg-blobs" aria-hidden="true">
        <div className="blob blob1" /><div className="blob blob2" /><div className="blob blob3" />
      </div>

      <div className="app-container">
        {/* Header */}
        <header className="app-header">
          <div className="logo-icon-wrap"><Dices size={34} strokeWidth={1.8} /></div>
          <h1>Qui Paie ?</h1>
          <p className="tagline">Laissez le destin décider !</p>
        </header>

        <main className="main-layout">

          {/* LEFT: Reveal Stage */}
          <section className="reveal-section">
            <div className={`reveal-stage glass-card${phase === PHASE.REVEAL ? (isJokerWinner ? ' stage-joker' : ' stage-winner') : ''}`}>

              {/* IDLE */}
              {phase === PHASE.IDLE && (
                <div className="stage-idle">
                  <div className="idle-icon"><Dices size={64} strokeWidth={1.2} /></div>
                  <p className="idle-hint">
                    {eligible.length < 2
                      ? 'Ajoutez au moins 2 participants'
                      : `${eligible.length} participants prêts`}
                  </p>
                  <button
                    className="btn btn-draw"
                    onClick={handleDraw}
                    disabled={eligible.length < 2}
                  >
                    <Sparkles size={20} strokeWidth={2} />
                    Tirer au sort !
                  </button>
                  {inputError && (
                    <p className="draw-error" role="alert">
                      <AlertCircle size={14} strokeWidth={2.5} style={{ display: 'inline', marginRight: 4 }} />
                      {inputError}
                    </p>
                  )}
                </div>
              )}

              {/* SUSPENSE */}
              {phase === PHASE.SUSPENSE && (
                <div className="stage-suspense">
                  <div className="suspense-dots">
                    <span /><span /><span />
                  </div>
                  <div className="suspense-label">En train de choisir…</div>
                  <div className="suspense-ticker" aria-live="off">
                    {cycleParticipant && (
                      <>
                        <Avatar name={cycleParticipant.name} id={cycleParticipant.id} size={56} />
                        <span className="ticker-name">{cycleParticipant.name}</span>
                      </>
                    )}
                  </div>
                  <div className="suspense-bars">
                    <span /><span /><span /><span /><span />
                  </div>
                </div>
              )}

              {/* REVEAL */}
              {phase === PHASE.REVEAL && winner && (
                <div className={`stage-reveal${isJokerWinner ? ' joker' : ''}`}>
                  <div className="reveal-crown">
                    {isJokerWinner ? <Star size={40} strokeWidth={1.5} fill="currentColor" /> : <Trophy size={40} strokeWidth={1.5} />}
                  </div>
                  <div className="reveal-avatar">
                    <Avatar name={winner.name} id={winner.id} size={96} />
                  </div>
                  <div className="reveal-name">{winner.name}</div>
                  {isJokerWinner
                    ? <div className="reveal-verdict joker-verdict">
                        <Star size={14} strokeWidth={2} style={{ display:'inline', marginRight:6, verticalAlign:'middle' }} />
                        JOKER ! Les autres paient pour lui 🎉
                      </div>
                    : <div className="reveal-verdict loser-verdict">
                        C&apos;est toi qui paies ! 💸
                      </div>
                  }
                  <button className="btn btn-ghost btn-sm" style={{ marginTop: 16 }} onClick={handleReset}>
                    <RefreshCw size={14} strokeWidth={2.5} /> Nouvelle partie
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* RIGHT: Participants panel */}
          <section className="glass-card participants-panel">
            <h2>
              <Users size={18} strokeWidth={2.5} />
              Participants
              <span className="active-count">{eligible.length}/{participants.length} actifs</span>
            </h2>

            <div className="add-input-row">
              <input
                ref={inputRef}
                type="text" className="name-input"
                placeholder="Ajouter un prénom…" value={inputName}
                onChange={e => setInputName(e.target.value)}
                onKeyDown={handleKeyDown} maxLength={24} autoComplete="off"
              />
              <button className="btn btn-add" onClick={handleAddParticipant} aria-label="Ajouter">
                <Plus size={20} strokeWidth={3} />
              </button>
            </div>
            {inputError && phase === PHASE.IDLE && (
              <p className="input-hint" role="alert">
                <AlertCircle size={13} strokeWidth={2.5} style={{ display:'inline', marginRight:4 }} />
                {inputError}
              </p>
            )}

            {participants.length === 0
              ? (
                <div className="empty-state">
                  <Users size={40} strokeWidth={1.2} opacity={0.3} />
                  <p>Ajoutez au moins 2 participants<br />pour commencer !</p>
                </div>
              )
              : (
                <ul className="participants-list" role="list">
                  {participants.map(p => (
                    <li key={p.id} className={`participant-item${p.excluded ? ' excluded' : ''}${p.joker ? ' has-joker' : ''}`}>
                      <Avatar name={p.name} id={p.id} size={30} />
                      <span className="participant-name">{p.name}</span>
                      {p.joker && <span className="participant-badge badge-joker"><Star size={9} strokeWidth={2.5} style={{ marginRight:2 }} />Joker</span>}
                      {p.paid && <span className="participant-badge badge-paid"><Trophy size={9} strokeWidth={2.5} style={{ marginRight:2 }} />Payé</span>}
                      {p.excluded && !p.paid && <span className="participant-badge badge-excluded"><Ban size={9} strokeWidth={2.5} style={{ marginRight:2 }} />Exclu</span>}
                      <div className="participant-actions">
                        <button
                          className={`icon-btn${p.joker ? ' joker-active' : ''}`}
                          onClick={() => handleToggleJoker(p.id)}
                          title={p.joker ? 'Retirer le Joker (ne paie pas)' : 'Activer Joker (ne paie pas)'}
                        >
                          <Star size={15} strokeWidth={2} fill={p.joker ? 'currentColor' : 'none'} color={p.joker ? '#f7b731' : undefined} />
                        </button>
                        <button className="icon-btn" onClick={() => handleToggleExclude(p.id)} title={p.excluded ? 'Réactiver' : 'Exclure'}>
                          {p.excluded ? <CheckCircle2 size={15} strokeWidth={2} color="#2ed573" /> : <Ban size={15} strokeWidth={2} color="#ff4757" />}
                        </button>
                        <button className="icon-btn" onClick={() => handleRemove(p.id)} title="Supprimer">
                          <Trash2 size={15} strokeWidth={2} color="#ff4757" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )
            }

            <div className="panel-actions">
              <button className="btn btn-ghost" onClick={handleResetExcluded}>
                <RotateCcw size={14} strokeWidth={2.5} /> Réactiver tous
              </button>
              <button className="btn btn-danger" onClick={handleClearAll}>
                <Trash2 size={14} strokeWidth={2.5} /> Tout effacer
              </button>
            </div>

            {/* Joker legend */}
            <div className="joker-legend">
              <Star size={13} strokeWidth={2} fill="#f7b731" color="#f7b731" />
              <span><b>Joker</b> = si tiré, ne paie pas (les autres paient pour lui)</span>
            </div>

            <div className="sound-toggle-row">
              <label className="toggle-label" htmlFor="sound-toggle">
                {soundOn ? <Volume2 size={16} strokeWidth={2} /> : <VolumeX size={16} strokeWidth={2} />}
                {soundOn ? 'Sons activés' : 'Sons désactivés'}
              </label>
              <label className="switch">
                <input type="checkbox" id="sound-toggle" checked={soundOn} onChange={e => setSoundOn(e.target.checked)} />
                <span className="slider-track" />
              </label>
            </div>
          </section>
        </main>

        {/* History */}
        {history.length > 0 && (
          <section className="glass-card history-section-card">
            <h2><History size={18} strokeWidth={2.5} /> Historique</h2>
            <div className="history-list">
              {history.map((h, i) => (
                <span key={h.id} className={`history-tag${h.joker ? ' joker-tag' : ''}`}>
                  <span className="h-num">{history.length - i}</span>
                  <Avatar name={h.name} id={h.avatarId} size={20} />
                  {h.name}
                  {h.joker && <Star size={10} fill="#f7b731" color="#f7b731" strokeWidth={2} />}
                </span>
              ))}
            </div>
            <div style={{ marginTop: 12 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setHistory([])}>
                <Trash2 size={13} strokeWidth={2} /> Effacer
              </button>
            </div>
          </section>
        )}
      </div>

      {/* Winner modal */}
      <div
        className={`modal-overlay${modalOpen ? ' active' : ''}`}
        role="dialog" aria-modal="true" aria-labelledby="modal-title"
        onClick={e => e.target === e.currentTarget && setModalOpen(false)}
      >
        <div className={`modal${isJokerWinner ? ' modal-joker' : ''}`}>
          <div className="modal-avatar">
            {winner && <Avatar name={winner.name} id={winner.id} size={80} />}
          </div>
          {isJokerWinner
            ? <>
                <h2 className="modal-title" id="modal-title">
                  <Star size={20} strokeWidth={1.5} fill="currentColor" style={{ display:'inline', marginRight:8 }} />
                  JOKER !
                </h2>
                <p className="modal-winner-name joker-name">{winner?.name}</p>
                <p className="modal-subtitle">Ne paie pas — les autres paient à sa place 🥂</p>
              </>
            : <>
                <h2 className="modal-title" id="modal-title">C&apos;est toi qui paies !</h2>
                <p className="modal-winner-name">{winner?.name}</p>
                <p className="modal-subtitle">Bonne chance pour la prochaine fois 😜</p>
              </>
          }
          <div className="modal-actions">
            <button className="btn btn-outline" onClick={handleExcludeWinner}>
              <Ban size={15} strokeWidth={2.5} /> Exclure (a déjà payé)
            </button>
            <button className="btn btn-primary" onClick={handleReplay}>
              <RefreshCw size={15} strokeWidth={2.5} /> Rejouer !
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
