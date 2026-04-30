import { useMemo, useState } from "react";

const EMOJIS = ["😀", "😎", "🤖", "🦊", "🐼", "🐯", "🐸", "🐧", "🦄", "🐙"];

const DEFAULT_PLAYERS = [
  { id: crypto.randomUUID(), name: "Alex", avatar: "😎", paidCount: 0, excluded: false },
  { id: crypto.randomUUID(), name: "Sam", avatar: "🦊", paidCount: 0, excluded: false },
  { id: crypto.randomUUID(), name: "Nina", avatar: "🐼", paidCount: 0, excluded: false }
];

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function pickFairPayer(pool) {
  if (!pool.length) {
    return null;
  }
  const minCount = Math.min(...pool.map((player) => player.paidCount ?? 0));
  const candidates = pool.filter((player) => (player.paidCount ?? 0) === minCount);
  return pickRandom(candidates);
}

export default function App() {
  const [participants, setParticipants] = useState(DEFAULT_PLAYERS);
  const [nameInput, setNameInput] = useState("");
  const [emojiInput, setEmojiInput] = useState("😀");
  const [mode, setMode] = useState("classic");
  const [luckyEnabled, setLuckyEnabled] = useState(true);
  const [luckyProbability, setLuckyProbability] = useState(10);
  const [fairMode, setFairMode] = useState(true);
  const [animationOn, setAnimationOn] = useState(false);
  const [rouletteName, setRouletteName] = useState("");
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  const activeParticipants = useMemo(
    () => participants.filter((participant) => !participant.excluded),
    [participants]
  );

  function addParticipant() {
    const cleanName = nameInput.trim();
    if (!cleanName) {
      return;
    }
    setParticipants((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: cleanName,
        avatar: emojiInput || "😀",
        paidCount: 0,
        excluded: false
      }
    ]);
    setNameInput("");
    setEmojiInput(pickRandom(EMOJIS));
  }

  function updateParticipantName(id, value) {
    setParticipants((prev) =>
      prev.map((player) => (player.id === id ? { ...player, name: value } : player))
    );
  }

  function updateParticipantAvatar(id, value) {
    setParticipants((prev) =>
      prev.map((player) => (player.id === id ? { ...player, avatar: value || "😀" } : player))
    );
  }

  function removeParticipant(id) {
    setParticipants((prev) => prev.filter((player) => player.id !== id));
  }

  function toggleExclude(id) {
    setParticipants((prev) =>
      prev.map((player) => (player.id === id ? { ...player, excluded: !player.excluded } : player))
    );
  }

  function resetExclusions() {
    setParticipants((prev) => prev.map((player) => ({ ...player, excluded: false })));
  }

  function replay() {
    setResult(null);
  }

  function registerHistory(entry) {
    setHistory((prev) => [entry, ...prev].slice(0, 12));
  }

  function pickPayer(pool) {
    return fairMode ? pickFairPayer(pool) : pickRandom(pool);
  }

  function modeForDraw() {
    if (mode === "mixte") {
      return Math.random() < 0.5 ? "classic" : "chanceux";
    }
    return mode;
  }

  function resolveDraw(pool) {
    const drawMode = modeForDraw();
    const luckyPossible = luckyEnabled && drawMode === "chanceux";
    const luckyTriggered = luckyPossible && Math.random() * 100 < luckyProbability;

    if (drawMode === "classic" || !luckyTriggered) {
      const payer = pickPayer(pool);
      return {
        kind: "payer",
        drawMode,
        luckyTriggered: false,
        payerId: payer.id
      };
    }

    const lucky = pickRandom(pool);
    return {
      kind: "lucky",
      drawMode,
      luckyTriggered: true,
      luckyId: lucky.id
    };
  }

  function applyResult(drawResult) {
    const now = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    if (drawResult.kind === "payer") {
      const selected = participants.find((player) => player.id === drawResult.payerId);
      if (!selected) return;

      setParticipants((prev) =>
        prev.map((player) =>
          player.id === selected.id ? { ...player, paidCount: (player.paidCount ?? 0) + 1 } : player
        )
      );
      setResult({
        type: "payer",
        title: `${selected.name} paie l'addition 💸`,
        subtitle:
          drawResult.drawMode === "mixte"
            ? "Mode mixte: tirage classique."
            : "Mode classique: un seul payeur."
      });
      registerHistory({
        id: crypto.randomUUID(),
        text: `${selected.avatar} ${selected.name} paie`,
        at: now
      });
      return;
    }

    const lucky = participants.find((player) => player.id === drawResult.luckyId);
    if (!lucky) return;
    setResult({
      type: "lucky",
      title: `🎉 ${lucky.name} est le chanceux ! Il ne paie rien 😎`,
      subtitle: "Les autres paient pour lui 💸"
    });
    registerHistory({
      id: crypto.randomUUID(),
      text: `🍀 ${lucky.avatar} ${lucky.name} est chanceux`,
      at: now
    });
  }

  function launchDraw() {
    if (activeParticipants.length < 2) {
      setResult({
        type: "error",
        title: "Ajoute au moins 2 participants actifs pour tirer au sort.",
        subtitle: ""
      });
      return;
    }
    setResult(null);
    setAnimationOn(true);
    let ticks = 0;
    const maxTicks = 22;
    const interval = setInterval(() => {
      setRouletteName(pickRandom(activeParticipants).name);
      ticks += 1;
      if (ticks >= maxTicks) {
        clearInterval(interval);
        setAnimationOn(false);
        const draw = resolveDraw(activeParticipants);
        applyResult(draw);
      }
    }, 90);
  }

  return (
    <main className="app">
      <header className="hero">
        <h1>Qui Paie ?</h1>
        <p>Décidez rapidement, équitablement et avec style qui règle l'addition.</p>
      </header>

      <section className="card controls">
        <h2>Participants</h2>
        <div className="add-row">
          <input
            placeholder="Prénom"
            value={nameInput}
            onChange={(event) => setNameInput(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && addParticipant()}
          />
          <input
            className="emoji-input"
            value={emojiInput}
            onChange={(event) => setEmojiInput(event.target.value)}
            maxLength={2}
          />
          <button onClick={addParticipant}>Ajouter</button>
        </div>

        <div className="participants-list">
          {participants.map((player) => (
            <div key={player.id} className={`participant ${player.excluded ? "excluded" : ""}`}>
              <input
                className="avatar"
                value={player.avatar}
                onChange={(event) => updateParticipantAvatar(player.id, event.target.value)}
                maxLength={2}
              />
              <input
                className="name"
                value={player.name}
                onChange={(event) => updateParticipantName(player.id, event.target.value)}
              />
              <span className="stat">a payé: {player.paidCount}</span>
              <button onClick={() => toggleExclude(player.id)}>
                {player.excluded ? "Réintégrer" : "Exclure après paiement"}
              </button>
              <button className="danger" onClick={() => removeParticipant(player.id)}>
                Supprimer
              </button>
            </div>
          ))}
        </div>
        <button className="ghost" onClick={resetExclusions}>
          Réactiver tout le monde
        </button>
      </section>

      <section className="card game-settings">
        <h2>Modes de jeu</h2>
        <div className="mode-picker">
          <button className={mode === "classic" ? "active" : ""} onClick={() => setMode("classic")}>
            Classique
          </button>
          <button className={mode === "chanceux" ? "active" : ""} onClick={() => setMode("chanceux")}>
            Chanceux 🍀
          </button>
          <button className={mode === "mixte" ? "active" : ""} onClick={() => setMode("mixte")}>
            Mixte
          </button>
        </div>

        <div className="toggles">
          <label>
            <input
              type="checkbox"
              checked={luckyEnabled}
              onChange={(event) => setLuckyEnabled(event.target.checked)}
            />
            Activer le mode chanceux
          </label>
          <label>
            Probabilité chanceux: <strong>{luckyProbability}%</strong>
            <input
              type="range"
              min="0"
              max="100"
              value={luckyProbability}
              onChange={(event) => setLuckyProbability(Number(event.target.value))}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={fairMode}
              onChange={(event) => setFairMode(event.target.checked)}
            />
            Mode équitable (favorise ceux qui ont moins payé)
          </label>
        </div>
      </section>

      <section className="card draw-zone">
        <h2>Tirage</h2>
        <div className={`roulette ${animationOn ? "spinning" : ""}`}>
          {animationOn ? rouletteName || "..." : "Prêt ?"}
        </div>
        <div className="draw-actions">
          <button className="primary" onClick={launchDraw} disabled={animationOn}>
            Tirer au sort
          </button>
          <button onClick={replay}>Rejouer</button>
        </div>

        {result && (
          <div className={`result ${result.type}`}>
            <h3>{result.title}</h3>
            {result.subtitle && <p>{result.subtitle}</p>}
            {result.type === "lucky" && <div className="confetti">🎊 ✨ 🎉 🍀 🎉 ✨ 🎊</div>}
          </div>
        )}
      </section>

      <section className="card history">
        <h2>Historique des tirages</h2>
        {history.length === 0 && <p>Aucun tirage pour le moment.</p>}
        {history.length > 0 && (
          <ul>
            {history.map((entry) => (
              <li key={entry.id}>
                <span>{entry.text}</span>
                <small>{entry.at}</small>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
