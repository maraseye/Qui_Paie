import { useState, useRef, useCallback, useEffect } from 'react';
import confetti from 'canvas-confetti';
import SpinWheel from './SpinWheel.jsx';
import {
  playSpinLoop,
  playWinnerFanfare,
  playExcludeSound,
  playAddSound,
  playReplaySound,
} from './soundManager.js';

// Random emojis for participants
const EMOJIS = ['😀','😎','🤩','🥳','😘','🤓','😏','🥸','😤','🤑','😈','🫡','💪','🦁','🐯','🦊','🐸','🤠','👻','🫠'];

// Get a deterministic-ish emoji from name
const getEmoji = (name, id) => EMOJIS[(id + name.length) % EMOJIS.length];

let nextId = 1;

const SAMPLE_NAMES = ['Alice', 'Bob', 'Charlie', 'Diana'];

function createParticipant(name) {
  const id = nextId++;
  return { id, name: name.trim(), excluded: false, paid: false, emoji: getEmoji(name, id) };
}

// Pick a random winner from non-excluded participants
function pickWinner(participants) {
  const eligible = participants.filter(p => !p.excluded);
  if (eligible.length === 0) return null;
  return eligible[Math.floor(Math.random() * eligible.length)];
}

// Easing function for spin animation
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

  // Animate the wheel spinning
  const animateSpin = useCallback((targetRotation, duration, onDone) => {
    const startRotation = rotation;
    const startTime = performance.now();
    const diff = targetRotation - startRotation;

    function frame(now) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = easeOut(t);
      const current = startRotation + diff * eased;
      setRotation(current);

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
    const n = participants.filter(p => !p.excluded).length;

    // Calculate target rotation to land on winner
    const arc = (Math.PI * 2) / participants.length;
    const winnerIndex = participants.findIndex(p => p.id === win.id);
    // Pointer is at top (−π/2). We want center of winner's segment at top.
    const segCenter = winnerIndex * arc + arc / 2;
    const targetAngle = -Math.PI / 2 - segCenter;
    // Add random extra full spins (5-9)
    const extraSpins = (5 + Math.floor(Math.random() * 5)) * Math.PI * 2;
    const finalRotation = rotation + extraSpins + (targetAngle - ((rotation % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - targetAngle > 0 ? (rotation % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - targetAngle : 0));

    // Sound
    let stopSpin;
    if (soundOn) {
      stopSpin = playSpinLoop(() => {});
    }

    animateSpin(finalRotation, 4200, () => {
      setSpinning(false);
      setWinner(win);
      setResultState({ name: win.name, caption: `${win.emoji} C'est toi qui paies !` });

      // Add to history
      setHistory(prev => [...prev, { id: Date.now(), name: win.name, emoji: win.emoji }]);

      if (soundOn) playWinnerFanfare();

      // Confetti!
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
    if (!name) {
      setInputError('Entrez un prénom !');
      setTimeout(() => setInputError(''), 2000);
      return;
    }
    if (name.length > 24) {
      setInputError('Maximum 24 caractères !');
      setTimeout(() => setInputError(''), 2000);
      return;
    }
    if (participants.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      setInputError('Ce prénom existe déjà !');
      setTimeout(() => setInputError(''), 2000);
      return;
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
    setParticipants(prev => prev.map(p =>
      p.id === id ? { ...p, excluded: !p.excluded } : p
    ));
    if (soundOn) playExcludeSound();
  }, [soundOn]);

  const handleExcludeWinner = useCallback(() => {
    if (!winner) return;
    setParticipants(prev => prev.map(p =>
      p.id === winner.id ? { ...p, excluded: true, paid: true } : p
    ));
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

  const handleClearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
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
          <span className="logo-emoji">💸</span>
          <h1>Qui Paie ?</h1>
          <p className="tagline">Laissez le destin décider !</p>
        </header>

        {/* Main layout */}
        <main className="main-layout">

          {/* LEFT: Wheel */}
          <section className="wheel-section">
            <div className="wheel-wrapper">
              {/* Pointer */}
              <div className="wheel-pointer" aria-hidden="true">▼</div>

              {/* Canvas Wheel */}
              <SpinWheel
                participants={participants}
                spinning={spinning}
                rotation={rotation}
              />

              {/* Spin button (center overlay) */}
              <button
                className="wheel-center-btn"
                onClick={handleSpin}
                disabled={spinning || eligibleCount < 2}
                aria-label="Tirer au sort"
                title={eligibleCount < 2 ? 'Il faut au moins 2 participants actifs' : 'Tirer au sort'}
              >
                <span className="spin-icon">{spinning ? '⏳' : '🎰'}</span>
                <span className="spin-text">{spinning ? '…' : 'SPIN!'}</span>
              </button>
            </div>

            {/* Result banner */}
            <div
              className={`glass-card result-banner${hasResult ? ' has-result' : ''}`}
              style={{ maxWidth: 450, width: '100%', textAlign: 'center' }}
              aria-live="polite"
            >
              {hasResult
                ? <span className="result-avatar" key={resultState.name}>{winner?.emoji}</span>
                : <span className="result-avatar">🎯</span>
              }
              <div className="result-name">{hasResult ? resultState.name : '—'}</div>
              <div className="result-caption">{resultState.caption}</div>
            </div>
          </section>

          {/* RIGHT: Participants panel */}
          <section className="glass-card participants-panel">
            <h2>👥 Participants
              <span style={{ marginLeft: 'auto', fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
                {eligibleCount}/{participants.length} actifs
              </span>
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
                +
              </button>
            </div>
            {inputError && <p className="input-hint" role="alert">{inputError}</p>}

            {/* Participants list */}
            {participants.length === 0
              ? (
                <div className="empty-state">
                  <span className="empty-emoji">🫂</span>
                  <p>Ajoutez au moins 2 participants<br />pour commencer !</p>
                </div>
              )
              : (
                <ul className="participants-list" role="list">
                  {participants.map(p => (
                    <li
                      key={p.id}
                      className={`participant-item${p.excluded ? ' excluded' : ''}`}
                    >
                      <span className="participant-avatar">{p.emoji}</span>
                      <span className="participant-name">{p.name}</span>
                      {p.paid && <span className="participant-badge badge-paid">A payé</span>}
                      {p.excluded && !p.paid && <span className="participant-badge badge-excluded">Exclu</span>}
                      <div className="participant-actions">
                        <button
                          className="icon-btn"
                          onClick={() => handleToggleExclude(p.id)}
                          title={p.excluded ? 'Réactiver' : 'Exclure'}
                          aria-label={p.excluded ? `Réactiver ${p.name}` : `Exclure ${p.name}`}
                        >
                          {p.excluded ? '✅' : '⛔'}
                        </button>
                        <button
                          className="icon-btn"
                          onClick={() => handleRemove(p.id)}
                          title={`Supprimer ${p.name}`}
                          aria-label={`Supprimer ${p.name}`}
                        >
                          🗑️
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )
            }

            {/* Actions */}
            <div className="panel-actions">
              <button className="btn btn-ghost" onClick={handleResetExcluded} title="Réactiver tout le monde">
                ♻️ Réactiver tous
              </button>
              <button className="btn btn-danger" onClick={handleClearAll} title="Effacer tous les participants">
                🗑️ Tout effacer
              </button>
            </div>

            {/* Sound toggle */}
            <div className="sound-toggle-row">
              <label className="toggle-label" htmlFor="sound-toggle">
                <span>{soundOn ? '🔊' : '🔇'}</span>
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

        {/* History section */}
        {history.length > 0 && (
          <section className="glass-card history-section">
            <h2>📜 Historique</h2>
            <div className="history-list">
              {history.map((h, i) => (
                <span key={h.id} className="history-tag">
                  <span className="h-num">{i + 1}</span>
                  {h.emoji} {h.name}
                </span>
              ))}
            </div>
            <div style={{ marginTop: 12 }}>
              <button className="btn btn-ghost btn-sm" onClick={handleClearHistory}>
                Effacer l&apos;historique
              </button>
            </div>
          </section>
        )}
      </div>

      {/* Winner modal */}
      <div
        className={`modal-overlay${modalOpen ? ' active' : ''}`}
        id="modal-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={e => e.target === e.currentTarget && setModalOpen(false)}
      >
        <div className="modal">
          <span className="modal-emoji">{winner?.emoji ?? '😅'}</span>
          <h2 className="modal-title" id="modal-title">C&apos;est toi qui paies !</h2>
          <p className="modal-winner-name">{winner?.name ?? '—'}</p>
          <p className="modal-subtitle">Bonne chance pour la prochaine fois 😜</p>
          <div className="modal-actions">
            <button
              id="exclude-btn"
              className="btn btn-outline"
              onClick={handleExcludeWinner}
              title="Marquer comme ayant payé et exclure du prochain tirage"
            >
              ⛔ Exclure (a déjà payé)
            </button>
            <button
              id="replay-btn"
              className="btn btn-primary"
              onClick={handleReplay}
            >
              🔄 Rejouer !
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
