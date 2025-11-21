import React, { useState, useEffect } from 'react';
import './App.css';

const App = () => {
  const [view, setView] = useState('home');
  const [sessionKey, setSessionKey] = useState('');
  const [inputKey, setInputKey] = useState('');
  const [userId, setUserId] = useState(null);
  const [sessions, setSessions] = useState({});
  const [currentSessionKey, setCurrentSessionKey] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  // Poll states (top-level Hooks)
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [maxVotes, setMaxVotes] = useState(1);
  const [showPollCreator, setShowPollCreator] = useState(false);

  // User vote state (top-level, not conditional)
  const [selectedOptions, setSelectedOptions] = useState([]);

  // --- Utility functions ---
  const generateSessionKey = () =>
    Math.floor(100000 + Math.random() * 900000).toString();

  const generateUserId = () =>
    Math.floor(1000 + Math.random() * 9000).toString();

  // --- Session management ---
  const createSession = () => {
    const newKey = generateSessionKey();
    const newSession = {
      key: newKey,
      locked: false,
      users: {},
      currentPoll: null,
      pollHistory: [],
      admin: true
    };
    setSessions(prev => ({ ...prev, [newKey]: newSession }));
    setSessionKey(newKey);
    setCurrentSessionKey(newKey);
    setIsAdmin(true);
    setView('admin');
  };

  const joinSession = () => {
    if (!inputKey || !sessions[inputKey]) {
      alert('Invalid session key!');
      return;
    }
    if (sessions[inputKey].locked) {
      alert('This session is locked.');
      return;
    }

    const newUserId = generateUserId();
    setSessions(prev => ({
      ...prev,
      [inputKey]: {
        ...prev[inputKey],
        users: {
          ...prev[inputKey].users,
          [newUserId]: { id: newUserId, voted: false, votes: [] }
        }
      }
    }));

    setUserId(newUserId);
    setCurrentSessionKey(inputKey);
    setIsAdmin(false);
    setView('user');
  };

  const lockSession = () => {
    setSessions(prev => ({
      ...prev,
      [currentSessionKey]: {
        ...prev[currentSessionKey],
        locked: true
      }
    }));
  };

  // --- Poll management ---
  const addPollOption = () => setPollOptions([...pollOptions, '']);
  const removePollOption = index => {
    if (pollOptions.length > 2)
      setPollOptions(pollOptions.filter((_, i) => i !== index));
  };
  const updatePollOption = (index, value) => {
    const copy = [...pollOptions];
    copy[index] = value;
    setPollOptions(copy);
  };

  const createPoll = () => {
    if (!pollQuestion.trim() || pollOptions.some(o => !o.trim())) {
      alert('Fill in all fields.');
      return;
    }

    const newPoll = {
      question: pollQuestion,
      options: pollOptions.filter(o => o.trim()),
      maxVotes,
      votes: {},
      active: true
    };

    setSessions(prev => {
      const usersUpdated = {};
      Object.keys(prev[currentSessionKey].users).forEach(u => {
        usersUpdated[u] = { ...prev[currentSessionKey].users[u], voted: false, votes: [] };
      });

      return {
        ...prev,
        [currentSessionKey]: {
          ...prev[currentSessionKey],
          currentPoll: newPoll,
          users: usersUpdated
        }
      };
    });

    setPollQuestion('');
    setPollOptions(['', '']);
    setMaxVotes(1);
    setShowPollCreator(false);
  };

  const submitVote = selected => {
    if (selected.length === 0) {
      alert('Select at least one.');
      return;
    }

    const currentPoll = sessions[currentSessionKey]?.currentPoll;
    if (!currentPoll) return;

    if (selected.length > currentPoll.maxVotes) {
      alert('Too many selected.');
      return;
    }

    setSessions(prev => {
      const poll = prev[currentSessionKey].currentPoll;
      const voteCounts = { ...poll.votes };

      selected.forEach(o => {
        voteCounts[o] = (voteCounts[o] || 0) + 1;
      });

      return {
        ...prev,
        [currentSessionKey]: {
          ...prev[currentSessionKey],
          currentPoll: { ...poll, votes: voteCounts },
          users: {
            ...prev[currentSessionKey].users,
            [userId]: { ...prev[currentSessionKey].users[userId], voted: true, votes: selected }
          }
        }
      };
    });

    setSelectedOptions([]); // reset after submit
  };

  const closePoll = () => {
    setSessions(prev => ({
      ...prev,
      [currentSessionKey]: {
        ...prev[currentSessionKey],
        pollHistory: [
          ...prev[currentSessionKey].pollHistory,
          prev[currentSessionKey].currentPoll
        ],
        currentPoll: null
      }
    }));
  };

  const endSession = () => {
    if (!window.confirm('End session?')) return;

    setSessions(prev => {
      const copy = { ...prev };
      delete copy[currentSessionKey];
      return copy;
    });

    setView('home');
    setSessionKey('');
    setCurrentSessionKey('');
    setIsAdmin(false);
  };

  // --- Effect to handle session end ---
  useEffect(() => {
    if (view === 'user' && !sessions[currentSessionKey]) {
      alert('Session ended.');
      setView('home');
      setUserId(null);
      setCurrentSessionKey('');
    }
  }, [sessions, currentSessionKey, view]);

  // ===== VIEWS =====

  // --- Home View ---
  if (view === 'home') {
    return (
      <div className="page">
        <div className="panel">
          <h1 className="title">Anonymous Voting</h1>

          <button className="btn primary" onClick={createSession}>
            Create New Session
          </button>

          <div className="divider">or</div>

          <input
            className="input"
            placeholder="Enter Session Key"
            value={inputKey}
            onChange={e => setInputKey(e.target.value)}
            maxLength="6"
          />

          <button className="btn green" onClick={joinSession}>
            Join Session
          </button>
        </div>
      </div>
    );
  }

  // --- Admin View ---
  if (view === 'admin' && isAdmin) {
    const session = sessions[currentSessionKey];
    if (!session) return null;

    const userCount = Object.keys(session.users).length;
    const currentPoll = session.currentPoll;

    return (
      <div className="page admin">
        <div className="panel">
          <h1 className="title">Admin Dashboard</h1>
          <p className="subtitle">Session Key: {sessionKey}</p>
          <p className="info">Users in session: {userCount}</p>

          {!session.locked ? (
            <button className="btn orange" onClick={lockSession}>
              Lock Session
            </button>
          ) : (
            <p className="locked">Session Locked</p>
          )}

          {!currentPoll && !showPollCreator && (
            <button className="btn primary" onClick={() => setShowPollCreator(true)}>
              Create Poll
            </button>
          )}

          {showPollCreator && !currentPoll && (
            <div className="poll-builder">
              <h2>Create Poll</h2>

              <input
                className="input"
                placeholder="Poll question"
                value={pollQuestion}
                onChange={e => setPollQuestion(e.target.value)}
              />

              <h4>Options:</h4>
              {pollOptions.map((o, i) => (
                <div className="row" key={i}>
                  <input
                    className="input"
                    value={o}
                    placeholder={`Option ${i + 1}`}
                    onChange={e => updatePollOption(i, e.target.value)}
                  />
                  {pollOptions.length > 2 && (
                    <button className="btn red small" onClick={() => removePollOption(i)}>
                      X
                    </button>
                  )}
                </div>
              ))}

              <button className="btn green small" onClick={addPollOption}>
                Add Option
              </button>

              <input
                className="input"
                type="number"
                min="1"
                max={pollOptions.length}
                value={maxVotes}
                onChange={e => setMaxVotes(Number(e.target.value))}
              />

              <button className="btn primary" onClick={createPoll}>
                Finalize Poll
              </button>

              <button className="btn gray" onClick={() => setShowPollCreator(false)}>
                Cancel
              </button>
            </div>
          )}

          {currentPoll && (
            <div className="poll-results">
              <h2>{currentPoll.question}</h2>
              {currentPoll.options.map((opt, i) => {
                const votes = currentPoll.votes[opt] || 0;
                const percent = userCount ? (votes / userCount) * 100 : 0;

                return (
                  <div key={i} className="result">
                    <div className="label">{opt}</div>
                    <div className="bar">
                      <div className="fill" style={{ width: percent + '%' }} />
                    </div>
                    <div className="value">{votes} votes</div>
                  </div>
                );
              })}

              <button className="btn red" onClick={closePoll}>
                Close Poll
              </button>
            </div>
          )}

          <button className="btn red" onClick={endSession}>
            End Session
          </button>
        </div>
      </div>
    );
  }

  // --- User View ---
  if (view === 'user' && !isAdmin) {
    const session = sessions[currentSessionKey];
    if (!session) return null;

    const currentPoll = session.currentPoll;
    const userHasVoted = session.users[userId]?.voted;

    const toggleOption = opt => {
      if (selectedOptions.includes(opt)) {
        setSelectedOptions(selectedOptions.filter(x => x !== opt));
      } else if (selectedOptions.length < currentPoll.maxVotes) {
        setSelectedOptions([...selectedOptions, opt]);
      }
    };

    return (
      <div className="page user">
        <div className="panel">
          <h1 className="title">Voting Session</h1>
          <p>Your ID: {userId}</p>

          {session.locked === false && <p>Waiting for admin...</p>}
          {session.locked && !currentPoll && <p>Waiting for poll...</p>}

          {currentPoll && !userHasVoted && (
            <>
              <h2>{currentPoll.question}</h2>
              <p>Select up to {currentPoll.maxVotes} options</p>

              {currentPoll.options.map((o, i) => (
                <button
                  key={i}
                  className={`option ${selectedOptions.includes(o) ? 'selected' : ''}`}
                  onClick={() => toggleOption(o)}
                >
                  {o}
                </button>
              ))}

              <button className="btn primary" onClick={() => submitVote(selectedOptions)}>
                Submit
              </button>
            </>
          )}

          {currentPoll && userHasVoted && (
            <p className="thanks">Thank you for voting!</p>
          )}
        </div>
      </div>
    );
  }

  return null;
};

export default App;
