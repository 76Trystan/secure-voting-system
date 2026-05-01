import { useEffect, useState } from "react";
import "./App.css";

const BACKEND_URL = "https://secure-voting-system-ybp8.onrender.com";

/* ========= Tiny SVG icons (inline, no deps) ========= */
const IconCheck = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconLock = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <rect x="2" y="6" width="10" height="7" rx="2" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M4 6V4a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);
const IconUsers = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <circle cx="5" cy="4" r="2" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M1 12c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="10.5" cy="4" r="1.5" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M13 12c0-1.7-1.1-3.1-2.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);
const IconVote = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
    <rect x="6" y="4" width="20" height="24" rx="3" stroke="#6366f1" strokeWidth="2"/>
    <path d="M11 16l3 3 7-7" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M11 10h10M11 22h6" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" opacity=".35"/>
  </svg>
);
const IconPlus = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);
const IconTrash = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <path d="M2 3.5h9M5 3.5V2.5a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v1M5.5 6v3.5M7.5 6v3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    <path d="M3 3.5l.7 7a.5.5 0 00.5.5h4.6a.5.5 0 00.5-.5l.7-7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
);

/* ========= Layout wrapper ========= */
const Page = ({ badge, children }) => (
  <div className="page">
    <header className="topbar">
      <span className="topbar-logo">Anonymous Voting</span>
      <span className="topbar-spacer" />
      {badge && <span className="topbar-badge">{badge}</span>}
    </header>
    <main className="main">{children}</main>
  </div>
);

/* ========= App ========= */
const App = () => {
  const [view, setView] = useState("home");
  const [inputKey, setInputKey] = useState("");
  const [userId, setUserId] = useState(null);
  const [currentSessionKey, setCurrentSessionKey] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [sessions, setSessions] = useState({});
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [maxVotes, setMaxVotes] = useState(1);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [adminToken, setAdminToken] = useState(null);

  /* ========= Backend functions (logic unchanged) ========= */
  const createSession = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/create-session`, { method: "POST" });
      const data = await res.json();
      setCurrentSessionKey(data.key);
      setAdminToken(data.adminToken);
      setIsAdmin(true);
      setView("admin");
    } catch (err) {
      console.error(err);
      alert("Failed to create session");
    }
  };

  const joinSession = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/join-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: inputKey }),
      });
      const data = await res.json();
      if (data.error) return alert(data.error);
      setUserId(data.userId);
      setCurrentSessionKey(inputKey);
      setIsAdmin(false);
      setView("user");
    } catch (err) {
      console.error(err);
      alert("Failed to join session");
    }
  };

  const submitVote = async (opts) => {
    if (!opts.length) return alert("Please select at least one option!");
    try {
      await fetch(`${BACKEND_URL}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: currentSessionKey, userId, selectedOptions: opts }),
      });
      alert("Vote submitted!");
      setSelectedOptions([]);
    } catch (err) {
      console.error(err);
      alert("Failed to submit vote");
    }
  };

  const createPoll = async () => {
    if (!pollQuestion.trim() || pollOptions.some((o) => !o.trim()))
      return alert("Please fill in all fields!");
    try {
      await fetch(`${BACKEND_URL}/create-poll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: currentSessionKey,
          adminToken,
          question: pollQuestion,
          options: pollOptions.filter((o) => o.trim()),
          maxVotes,
        }),
      });
      setPollQuestion("");
      setPollOptions(["", ""]);
      setMaxVotes(1);
      setShowPollCreator(false);
    } catch (err) {
      console.error(err);
      alert("Failed to create poll");
    }
  };

  const lockSession = async () => {
    try {
      await fetch(`${BACKEND_URL}/lock-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: currentSessionKey, adminToken }),
      });
    } catch (err) {
      console.error(err);
      alert("Failed to lock session");
    }
  };

  const closePoll = async () => {
    try {
      await fetch(`${BACKEND_URL}/close-poll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: currentSessionKey, adminToken }),
      });
      setShowPollCreator(false);
    } catch (err) {
      console.error(err);
      alert("Failed to close poll");
    }
  };

  const endSession = async () => {
    if (!window.confirm("End this session? All users will be disconnected.")) return;
    try {
      await fetch(`${BACKEND_URL}/end-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: currentSessionKey, adminToken }),
      });
    } catch (err) {
      console.error(err);
    }
    setCurrentSessionKey("");
    setAdminToken(null);
    setUserId(null);
    setView("home");
    setIsAdmin(false);
    setSessions((prev) => {
      const next = { ...prev };
      delete next[currentSessionKey];
      return next;
    });
  };

  /* ========= Poll option helpers (logic unchanged) ========= */
  const addPollOption = () => setPollOptions([...pollOptions, ""]);
  const removePollOption = (i) =>
    pollOptions.length > 2 && setPollOptions(pollOptions.filter((_, idx) => idx !== i));
  const updatePollOption = (i, val) =>
    setPollOptions(pollOptions.map((o, idx) => (idx === i ? val : o)));

  /* ========= Session polling (logic unchanged) ========= */
  useEffect(() => {
    if (!currentSessionKey) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/session/${currentSessionKey}`);
        const data = await res.json();
        setSessions((prev) => ({ ...prev, [currentSessionKey]: data }));
      } catch (err) {
        console.error(err);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [currentSessionKey]);

  /* ========= VIEW: HOME ========= */
  if (view === "home") {
    return (
      <Page>
        <div className="card card-sm card-hero">
          <div className="hero-icon">
            <IconVote />
          </div>
          <h1 className="hero-title">Anonymous Voting</h1>
          <p className="hero-sub">
            Fast, private ballots for your team or organisation.
          </p>

          <button className="btn btn-primary btn-full" onClick={createSession}>
            Create a new session
          </button>

          <div className="divider">or join existing</div>

          <div className="field mb-4">
            <label className="field-label" htmlFor="session-key-input">Session key</label>
            <input
              id="session-key-input"
              className="input input-key"
              maxLength={6}
              onChange={(e) => setInputKey(e.target.value.toUpperCase())}
              placeholder="ABC123"
              value={inputKey}
            />
          </div>
          <button
            className="btn btn-ghost btn-full"
            disabled={inputKey.length < 6}
            onClick={joinSession}
          >
            Join session
          </button>
        </div>
      </Page>
    );
  }

  /* ========= VIEW: ADMIN ========= */
  if (view === "admin" && isAdmin) {
    const session = sessions[currentSessionKey] || { users: {}, currentPoll: null, locked: false, pollHistory: [] };
    const userCount = Object.keys(session.users).length;
    const currentPoll = session.currentPoll;
    const totalVotes = currentPoll
      ? Object.values(currentPoll.votes || {}).reduce((a, b) => a + b, 0)
      : 0;
    const pollHistory = session.pollHistory || [];

    return (
      <Page badge="Admin">
        <div className="card card-lg">
          {/* ========= Header ========= */}
          <div className="admin-header">
            <div className="admin-header-left">
              <p className="section-title">Session</p>
              <div className="session-key-block">
                <div>
                  <div className="session-key-label">Share this key</div>
                  <div className="session-key-value">{currentSessionKey}</div>
                  <div className="session-key-hint">Participants enter this to join</div>
                </div>
              </div>
            </div>
            <div className="admin-header-right">
              <div className="stats-row">
                <span className="stat-chip">
                  <span className="stat-chip-dot" />
                  <IconUsers />
                  {userCount} {userCount === 1 ? "participant" : "participants"}
                </span>
                {session.locked
                  ? <span className="badge badge-amber"><span className="badge-dot" /><IconLock /> Locked</span>
                  : <span className="badge badge-green"><span className="badge-dot" />Open</span>
                }
              </div>
              <div className="action-row mt-2">
                {!session.locked && (
                  <button className="btn btn-warning btn-sm" onClick={lockSession}>
                    <IconLock /> Lock session
                  </button>
                )}
                <button className="btn btn-danger btn-sm" onClick={endSession}>
                  End session
                </button>
              </div>
            </div>
          </div>

          {/* ========= Active poll ========= */}
          <div className="card-section">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="section-title">Active poll</p>
              </div>
              {!currentPoll && !showPollCreator && (
                <button className="btn btn-primary btn-sm" onClick={() => setShowPollCreator(true)}>
                  <IconPlus /> New poll
                </button>
              )}
            </div>

            {/* ========= Poll creator ========= */}
            {showPollCreator && !currentPoll && (
              <div className="poll-form">
                <div className="field">
                  <label className="field-label">Question</label>
                  <input
                    className="input"
                    onChange={(e) => setPollQuestion(e.target.value)}
                    placeholder="e.g. Who should be elected treasurer?"
                    value={pollQuestion}
                  />
                </div>

                <div className="field">
                  <label className="field-label">Options</label>
                  {pollOptions.map((opt, i) => (
                    <div className="option-row mt-2" key={i}>
                      <span className="option-number">{i + 1}</span>
                      <input
                        className="input"
                        onChange={(e) => updatePollOption(i, e.target.value)}
                        placeholder={`Option ${i + 1}`}
                        value={opt}
                      />
                      {pollOptions.length > 2 && (
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          onClick={() => removePollOption(i)}
                          title="Remove option"
                        >
                          <IconTrash />
                        </button>
                      )}
                    </div>
                  ))}
                  <button className="btn btn-ghost btn-sm mt-3" onClick={addPollOption}>
                    <IconPlus /> Add option
                  </button>
                </div>

                <div className="max-votes-row">
                  <label htmlFor="max-votes">Max selections per voter</label>
                  <input
                    id="max-votes"
                    className="input"
                    max={pollOptions.length}
                    min="1"
                    onChange={(e) => setMaxVotes(Number(e.target.value))}
                    type="number"
                    value={maxVotes}
                  />
                </div>

                <div className="action-row mt-2">
                  <button className="btn btn-primary" onClick={createPoll}>
                    Launch poll
                  </button>
                  <button className="btn btn-ghost" onClick={() => setShowPollCreator(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* ========= No poll, no creator ========= */}
            {!currentPoll && !showPollCreator && (
              <div className="waiting-state">
                <p className="waiting-title">No active poll</p>
                <p className="waiting-sub">Create a poll above to start collecting votes.</p>
              </div>
            )}

            {/* ========= Live results ========= */}
            {currentPoll && (
              <div className="poll-card">
                <div className="poll-card-header">
                  <span className="poll-question">{currentPoll.question}</span>
                  <span className="badge badge-green"><span className="badge-dot" />Live · {totalVotes} {totalVotes === 1 ? "vote" : "votes"}</span>
                </div>
                <div className="poll-results">
                  {currentPoll.options.map((opt, i) => {
                    const count = currentPoll.votes?.[opt] || 0;
                    const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                    return (
                      <div className="result-row" key={i}>
                        <div className="result-meta">
                          <span className="result-label">{opt}</span>
                          <span className="result-count">{count} vote{count !== 1 ? "s" : ""} · {pct}%</span>
                        </div>
                        <div className="result-bar-bg">
                          <div className="result-bar-fill" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="poll-card-footer">
                  <button className="btn btn-danger btn-sm" onClick={closePoll}>
                    Close poll
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ========= Poll history ========= */}
          {pollHistory.length > 0 && (
            <div className="card-section">
              <p className="section-title mb-4">Poll history</p>
              <div className="history-list">
                {pollHistory.map((poll, i) => {
                  const total = Object.values(poll.votes || {}).reduce((a, b) => a + b, 0);
                  return (
                    <div className="history-item" key={i}>
                      <div className="history-q">{poll.question}</div>
                      <div className="history-tally">
                        {poll.options.map((opt) => (
                          <span key={opt} style={{ marginRight: "1rem" }}>
                            {opt}: <strong>{poll.votes?.[opt] || 0}</strong>
                          </span>
                        ))}
                        <span style={{ color: "var(--gray-400)" }}>({total} total)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </Page>
    );
  }

  /* ========= VIEW: USER ========= */
  if (view === "user" && !isAdmin) {
    const session = sessions[currentSessionKey];

    if (!session) {
      return (
        <Page badge="Voter">
          <div className="card card-sm card-hero">
            <p className="waiting-title">Session ended</p>
            <p className="waiting-sub">The admin has closed this session.</p>
          </div>
        </Page>
      );
    }

    const currentPoll = session.currentPoll;
    const userHasVoted = session.users[userId]?.voted;

    const toggleOption = (opt) => {
      if (selectedOptions.includes(opt))
        setSelectedOptions(selectedOptions.filter((o) => o !== opt));
      else if (selectedOptions.length < currentPoll.maxVotes)
        setSelectedOptions([...selectedOptions, opt]);
    };

    return (
      <Page badge="Voter">
        <div className="card card-sm">
          {/* ========= Status header ========= */}
          <div className="admin-header" style={{ flexDirection: "column", alignItems: "stretch", gap: "0.75rem" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="section-title">Your session</p>
                <p className="page-title" style={{ letterSpacing: "0.12em" }}>{currentSessionKey}</p>
              </div>
              <span className="badge badge-indigo"><span className="badge-dot" />Anonymous</span>
            </div>
          </div>

          {/* ========= Waiting states ========= */}
          {!session.locked && (
            <div className="card-section">
              <div className="waiting-state">
                <p className="waiting-title">Waiting for session to lock</p>
                <p className="waiting-sub">The admin will lock the session before polling begins.</p>
              </div>
            </div>
          )}

          {session.locked && !currentPoll && (
            <div className="card-section">
              <div className="waiting-state">
                <p className="waiting-title">
                  <span className="spinner" />
                  Waiting for poll…
                </p>
                <p className="waiting-sub">A question will appear here shortly.</p>
              </div>
            </div>
          )}

          {/* ========= Active poll ========= */}
          {currentPoll && !userHasVoted && (
            <div className="card-section">
              <p className="section-title mb-2">Question</p>
              <p className="poll-question mb-4">{currentPoll.question}</p>

              {currentPoll.maxVotes > 1 && (
                <p className="text-xs text-gray mb-4">
                  Select up to <strong>{currentPoll.maxVotes}</strong> options ({selectedOptions.length} selected)
                </p>
              )}

              <div className="vote-options">
                {currentPoll.options.map((opt, i) => {
                  const isSelected = selectedOptions.includes(opt);
                  return (
                    <label
                      className={`vote-option${isSelected ? " selected" : ""}`}
                      key={i}
                    >
                      <input type="checkbox" checked={isSelected} onChange={() => toggleOption(opt)} />
                      <span className="vote-check">
                        {isSelected && (
                          <span className="vote-check-tick">
                            <IconCheck />
                          </span>
                        )}
                      </span>
                      <span className="vote-option-label">{opt}</span>
                    </label>
                  );
                })}
              </div>

              <button
                className="btn btn-primary btn-full mt-6"
                disabled={selectedOptions.length === 0}
                onClick={() => submitVote(selectedOptions)}
              >
                Submit vote
              </button>
            </div>
          )}

          {/* ========= Already voted ========= */}
          {currentPoll && userHasVoted && (
            <div className="card-section">
              <div className="voted-state">
                <div className="voted-icon">✓</div>
                <p className="waiting-title">Vote recorded</p>
                <p className="waiting-sub">Your vote has been submitted anonymously. Waiting for the next question.</p>
              </div>
            </div>
          )}
        </div>
      </Page>
    );
  }

  return null;
};

export default App;
