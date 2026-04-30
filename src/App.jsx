import { useState, useRef, useCallback, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Plus, Trash2, Ban, CheckCircle2, RotateCcw, Volume2, VolumeX,
  Users, History, Dices, Clock, RefreshCw, Trophy, Sparkles,
  AlertCircle
} from 'lucide-react';
import SpinWheel from './SpinWheel.jsx';
import {
  playSpinLoop,
  playWinnerFanfare,
  playExcludeSound,
  playAddSound,
  playReplaySound,
} from './soundManager.js';

// Colored avatar letters instead of emojis
const AVATAR_COLORS = [
  '#f7b731','#7b2ff7','#ff4757','#2ed573',
  '#1e90ff','#ff6b35','#a55bff','#ffa502',
  '#ff3f6c','#00d2d3','#54a0ff','#ff9ff3',
];

function getAvatarColor(id) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

function Avatar({ name, id, size = 32 }) {
  const color = getAvatarColor(id);
  const initial = name ? name[0].toUpperCase() : '?';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        color: '#fff',
        fontWeight: 900,
        fontSize: size * 0.45,
        flexShrink: 0,
        boxShadow: `0 0 0 2px ${color}40`,
        userSelect: 'none',
      }}
    >
      {initial}
    </span>
  );
}

let nextId = 1;
const SAMPLE_NAMES = ['Alice', 'Bob', 'Charlie', 'Diana'];

function createParticipant(name) {
  const id = nextId++;
  return { id, name: name.trim(), excluded: false, paid: false };
}

function pickWinner(participants) {
  const eligible = participants.filter(p => !p.excluded);
  if (eligible.length === 0) return null;
  return eligible[Math.floor(Math.random() * eligible.length)];
}

function easeOut(t) {
  return 1 - Math.pow(1 - t, 4);
}

export default function App() {
  const [participants, setParticipants] = useState(() =>
    SAMPLE_NAMES.map(n => createParticipant(n))
  );
  const [inputName, setInputName] = useState('');
  const [inputError, setInputError] = useState('');
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [winner, setWinner] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [history, setHistory] = useState([]);
  const [resultState, setResultState] = useState({ name: null, caption: 'Appuyez sur SPIN pour commencer !' });

  const animFrameRef = useRef(null);
  const inputRef = useRef(null);

  const animateSpin = useCallback((targetRotation, duration, onDone) => {
    const startRotation = rotation;
    const startTime = performance.now();
    const diff = targetRotation - startRotation;

    function frame(now) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = easeOut(t);
      setRotation(startRotation + diff * eased);
      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(frame);
      } else {
        setRotation(targetRotation);
        onDone && onDone();
      }
    }
    animFrameRef.current = requestAnimationFrame(frame);
  }, [rotation]);

  const handleSpin = useCallback(() => {
    const eligible = participants.filter(p => !p.excluded);
    if (eligible.length < 2) {
      setInputError(eligible.length === 0 ? 'Ajoutez des participants !' : 'Il faut au moins 2 participants actifs !');
      setTimeout(() => setInputError(''), 2500);
      return;
    }
    if (spinning) return;

    setSpinning(true);
    setModalOpen(false);
    setResultState({ name: null, caption: 'En cours…' });

    const win = pickWinner(participants);
    const arc = (Math.PI * 2) / participants.length;
    const winnerIndex = participants.findIndex(p => p.id === win.id);
    const segCenter = winnerIndex * arc + arc / 2;
    const targetAngle = -Math.PI / 2 - segCenter;
    const extraSpins = (5 + Math.floor(Math.random() * 5)) * Math.PI * 2;
    const currentNorm = ((rotation % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const diff = ((targetAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) - currentNorm;
    const finalRotation = rotation + extraSpins + ((diff + Math.PI * 2) % (Math.PI * 2));

    if (soundOn) playSpinLoop(() => {});

    animateSpin(finalRotation, 4200, () => {
      setSpinning(false);
      setWinner(win);
      setResultState({ name: win.name, caption: "C'est toi qui paies !" });
      setHistory(prev => [...prev, { id: Date.now(), name: win.name, avatarId: win.id }]);

      if (soundOn) playWinnerFanfare();
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.55 },
        colors: ['#f7b731', '#7b2ff7', '#ff4757', '#2ed573', '#1e90ff'],
      });
      setTimeout(() => setModalOpen(true), 350);
    });
  }, [participants, spinning, rotation, animateSpin, soundOn]);

  const handleAddParticipant = useCallback(() => {
    const name = inputName.trim();
    if (!name) { setInputError('Entrez un prénom !'); setTimeout(() => setInputError(''), 2000); return; }
    if (name.length > 24) { setInputError('Maximum 24 caractères !'); setTimeout(() => setInputError(''), 2000); return; }
    if (participants.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      setInputError('Ce prénom existe déjà !'); setTimeout(() => setInputError(''), 2000); return;
    }
    setParticipants(prev => [...prev, createParticipant(name)]);
    setInputName('');
    setInputError('');
    if (soundOn) playAddSound();
    inputRef.current?.focus();
  }, [inputName, participants, soundOn]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') handleAddParticipant();
  }, [handleAddParticipant]);

  const handleRemove = useCallback((id) => {
    setParticipants(prev => prev.filter(p => p.id !== id));
  }, []);

  const handleToggleExclude = useCallback((id) => {
    setParticipants(prev => prev.map(p => p.id === id ? { ...p, excluded: !p.excluded } : p));
    if (soundOn) playExcludeSound();
  }, [soundOn]);

  const handleExcludeWinner = useCallback(() => {
    if (!winner) return;
    setParticipants(prev => prev.map(p => p.id === winner.id ? { ...p, excluded: true, paid: true } : p));
    if (soundOn) playExcludeSound();
    setModalOpen(false);
  }, [winner, soundOn]);

  const handleReplay = useCallback(() => {
    setModalOpen(false);
    setWinner(null);
    setResultState({ name: null, caption: 'Appuyez sur SPIN pour commencer !' });
    if (soundOn) playReplaySound();
    setTimeout(handleSpin, 300);
  }, [soundOn, handleSpin]);

  const handleResetExcluded = useCallback(() => {
    setParticipants(prev => prev.map(p => ({ ...p, excluded: false, paid: false })));
  }, []);

  const handleClearAll = useCallback(() => {
    setParticipants([]);
    setWinner(null);
    setModalOpen(false);
    setResultState({ name: null, caption: 'Appuyez sur SPIN pour commencer !' });
  }, []);

  const handleClearHistory = useCallback(() => setHistory([]), []);

  useEffect(() => {
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, []);

  const eligibleCount = participants.filter(p => !p.excluded).length;
  const hasResult = !!resultState.name;

  return (
    <>
      {/* Animated background blobs */}
      <div className="bg-blobs" aria-hidden="true">
        <div className="blob blob1" />
        <div className="blob blob2" />
        <div className="blob blob3" />
      </div>

      <div className="app-container">
        {/* Header */}
        <header className="app-header">
          <div className="logo-icon-wrap">
            <Dices size={48} strokeWidth={1.5} />
          </div>
          <h1>Qui Paie ?</h1>
          <p className="tagline">Laissez le destin décider !</p>
        </header>

        {/* Main layout */}
        <main className="main-layout">

          {/* LEFT: Wheel */}
          <section className="wheel-section">
            <div className="wheel-wrapper">
              <div className="wheel-pointer" aria-hidden="true">▼</div>
              <SpinWheel participants={participants} spinning={spinning} rotation={rotation} />
              <button
                className="wheel-center-btn"
                onClick={handleSpin}
                disabled={spinning || eligibleCount < 2}
                aria-label="Tirer au sort"
                title={eligibleCount < 2 ? 'Il faut au moins 2 participants actifs' : 'Tirer au sort'}
              >
                {spinning
                  ? <Clock size={26} strokeWidth={2} color="#fff" />
                  : <Dices size={26} strokeWidth={2} color="#fff" />
                }
                <span className="spin-text">{spinning ? '…' : 'SPIN!'}</span>
              </button>
            </div>

            {/* Result banner */}
            <div className={`glass-card result-banner${hasResult ? ' has-result' : ''}`} aria-live="polite">
              {hasResult
                ? <div className="result-avatar-wrap" key={resultState.name}>
                    <Avatar name={winner?.name} id={winner?.id ?? 0} size={52} />
                  </div>
                : <div className="result-avatar-icon"><Sparkles size={36} strokeWidth={1.5} opacity={0.4} /></div>
              }
              <div className="result-name">{hasResult ? resultState.name : '—'}</div>
              <div className="result-caption">{resultState.caption}</div>
            </div>
          </section>

          {/* RIGHT: Panel */}
          <section className="glass-card participants-panel">
            <h2>
              <Users size={18} strokeWidth={2.5} />
              Participants
              <span className="active-count">{eligibleCount}/{participants.length} actifs</span>
            </h2>

            {/* Add input */}
            <div className="add-input-row">
              <input
                ref={inputRef}
                type="text"
                className="name-input"
                placeholder="Ajouter un prénom…"
                value={inputName}
                onChange={e => setInputName(e.target.value)}
                onKeyDown={handleKeyDown}
                maxLength={24}
                autoComplete="off"
                id="name-input"
              />
              <button className="btn btn-add" onClick={handleAddParticipant} aria-label="Ajouter">
                <Plus size={20} strokeWidth={3} />
              </button>
            </div>
            {inputError && (
              <p className="input-hint" role="alert">
                <AlertCircle size={13} strokeWidth={2.5} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                {inputError}
              </p>
            )}

            {/* List */}
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
                    <li key={p.id} className={`participant-item${p.excluded ? ' excluded' : ''}`}>
                      <Avatar name={p.name} id={p.id} size={30} />
                      <span className="participant-name">{p.name}</span>
                      {p.paid && (
                        <span className="participant-badge badge-paid">
                          <Trophy size={10} strokeWidth={2.5} style={{ marginRight: 3 }} />
                          Payé
                        </span>
                      )}
                      {p.excluded && !p.paid && (
                        <span className="participant-badge badge-excluded">
                          <Ban size={10} strokeWidth={2.5} style={{ marginRight: 3 }} />
                          Exclu
                        </span>
                      )}
                      <div className="participant-actions">
                        <button
                          className="icon-btn"
                          onClick={() => handleToggleExclude(p.id)}
                          title={p.excluded ? 'Réactiver' : 'Exclure'}
                          aria-label={p.excluded ? `Réactiver ${p.name}` : `Exclure ${p.name}`}
                        >
                          {p.excluded
                            ? <CheckCircle2 size={16} strokeWidth={2} color="#2ed573" />
                            : <Ban size={16} strokeWidth={2} color="#ff4757" />
                          }
                        </button>
                        <button
                          className="icon-btn"
                          onClick={() => handleRemove(p.id)}
                          title={`Supprimer ${p.name}`}
                          aria-label={`Supprimer ${p.name}`}
                        >
                          <Trash2 size={16} strokeWidth={2} color="#ff4757" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )
            }

            {/* Actions */}
            <div className="panel-actions">
              <button className="btn btn-ghost" onClick={handleResetExcluded}>
                <RotateCcw size={15} strokeWidth={2.5} />
                Réactiver tous
              </button>
              <button className="btn btn-danger" onClick={handleClearAll}>
                <Trash2 size={15} strokeWidth={2.5} />
                Tout effacer
              </button>
            </div>

            {/* Sound toggle */}
            <div className="sound-toggle-row">
              <label className="toggle-label" htmlFor="sound-toggle">
                {soundOn
                  ? <Volume2 size={16} strokeWidth={2} />
                  : <VolumeX size={16} strokeWidth={2} />
                }
                {soundOn ? 'Sons activés' : 'Sons désactivés'}
              </label>
              <label className="switch">
                <input
                  type="checkbox"
                  id="sound-toggle"
                  checked={soundOn}
                  onChange={e => setSoundOn(e.target.checked)}
                />
                <span className="slider-track" />
              </label>
            </div>
          </section>
        </main>

        {/* History */}
        {history.length > 0 && (
          <section className="glass-card history-section">
            <h2>
              <History size={18} strokeWidth={2.5} />
              Historique
            </h2>
            <div className="history-list">
              {history.map((h, i) => (
                <span key={h.id} className="history-tag">
                  <span className="h-num">{i + 1}</span>
                  <Avatar name={h.name} id={h.avatarId} size={20} />
                  {h.name}
                </span>
              ))}
            </div>
            <div style={{ marginTop: 12 }}>
              <button className="btn btn-ghost btn-sm" onClick={handleClearHistory}>
                <Trash2 size={13} strokeWidth={2} />
                Effacer l&apos;historique
              </button>
            </div>
          </section>
        )}
      </div>

      {/* Winner modal */}
      <div
        className={`modal-overlay${modalOpen ? ' active' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={e => e.target === e.currentTarget && setModalOpen(false)}
      >
        <div className="modal">
          <div className="modal-avatar">
            {winner && <Avatar name={winner.name} id={winner.id} size={72} />}
          </div>
          <h2 className="modal-title" id="modal-title">C&apos;est toi qui paies !</h2>
          <p className="modal-winner-name">{winner?.name ?? '—'}</p>
          <p className="modal-subtitle">Bonne chance pour la prochaine fois 😜</p>
          <div className="modal-actions">
            <button id="exclude-btn" className="btn btn-outline" onClick={handleExcludeWinner}>
              <Ban size={16} strokeWidth={2.5} />
              Exclure (a déjà payé)
            </button>
            <button id="replay-btn" className="btn btn-primary" onClick={handleReplay}>
              <RefreshCw size={16} strokeWidth={2.5} />
              Rejouer !
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
