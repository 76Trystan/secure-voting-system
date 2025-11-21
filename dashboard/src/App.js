import React, { useState, useEffect } from 'react';
import './App.css'; // Make sure this file exists

const BACKEND_URL = "http://localhost:5000"; // Change to deployed backend URL when live

const App = () => {
  const [view, setView] = useState('home');
  const [inputKey, setInputKey] = useState('');
  const [userId, setUserId] = useState(null);
  const [currentSessionKey, setCurrentSessionKey] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [sessions, setSessions] = useState({});
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [maxVotes, setMaxVotes] = useState(1);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState([]);

  // Backend Functions
  const createSession = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/create-session`, { method: 'POST' });
      const data = await res.json();
      setCurrentSessionKey(data.key);
      setIsAdmin(true);
      setView('admin');
    } catch (err) { console.error(err); alert('Failed to create session'); }
  };

  const joinSession = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/join-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: inputKey })
      });
      const data = await res.json();
      if (data.error) return alert(data.error);

      setUserId(data.userId);
      setCurrentSessionKey(inputKey);
      setIsAdmin(false);
      setView('user');
    } catch (err) { console.error(err); alert('Failed to join session'); }
  };

  const submitVote = async (selectedOptions) => {
    if (!selectedOptions.length) return alert('Please select at least one option!');
    try {
      await fetch(`${BACKEND_URL}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: currentSessionKey, userId, selectedOptions })
      });
      alert('Vote submitted!');
      setSelectedOptions([]);
    } catch (err) { console.error(err); alert('Failed to submit vote'); }
  };

  const createPoll = async () => {
    if (!pollQuestion.trim() || pollOptions.some(opt => !opt.trim())) {
      return alert('Please fill in all fields!');
    }
    try {
      await fetch(`${BACKEND_URL}/create-poll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: currentSessionKey,
          question: pollQuestion,
          options: pollOptions.filter(opt => opt.trim()),
          maxVotes
        })
      });
      setPollQuestion('');
      setPollOptions(['', '']);
      setMaxVotes(1);
      setShowPollCreator(false);
    } catch (err) { console.error(err); alert('Failed to create poll'); }
  };

  const lockSession = async () => {
    try {
      await fetch(`${BACKEND_URL}/lock-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: currentSessionKey })
      });
      alert('Session locked!');
    } catch (err) { console.error(err); alert('Failed to lock session'); }
  };

  const closePoll = async () => {
    try {
      await fetch(`${BACKEND_URL}/close-poll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: currentSessionKey })
      });
      setShowPollCreator(false);
    } catch (err) { console.error(err); alert('Failed to close poll'); }
  };

  const endSession = () => {
    if (!window.confirm('Are you sure you want to end this session? All users will be disconnected.')) return;
    setCurrentSessionKey('');
    setUserId(null);
    setView('home');
    setIsAdmin(false);
    setSessions(prev => { const newSessions = { ...prev }; delete newSessions[currentSessionKey]; return newSessions; });
  };

  // Poll Option Helpers
  const addPollOption = () => setPollOptions([...pollOptions, '']);
  const removePollOption = i => pollOptions.length > 2 && setPollOptions(pollOptions.filter((_, idx) => idx !== i));
  const updatePollOption = (i, val) => setPollOptions(pollOptions.map((opt, idx) => idx === i ? val : opt));

  // Fetch Session Periodically
  useEffect(() => {
    if (!currentSessionKey) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/session/${currentSessionKey}`);
        const data = await res.json();
        setSessions(prev => ({ ...prev, [currentSessionKey]: data }));
      } catch (err) { console.error(err); }
    }, 1000);
    return () => clearInterval(interval);
  }, [currentSessionKey]);

  // Views
  if (view === 'home') {
    return (
      <div className="container">
        <h1 className="title">Anonymous Voting</h1>
        <button className="btn primary" onClick={createSession}>Create New Session</button>
        <div className="divider">or</div>
        <input className="input" placeholder="Enter Session Key" value={inputKey} onChange={e => setInputKey(e.target.value)} />
        <button className="btn success" onClick={joinSession}>Join Session</button>
      </div>
    );
  }

  if (view === 'admin' && isAdmin) {
    const session = sessions[currentSessionKey] || { users: {}, currentPoll: null, locked: false };
    const userCount = Object.keys(session.users).length;
    const currentPoll = session.currentPoll;

    return (
      <div className="container">
        <h2 className="subtitle">Admin Dashboard</h2>
        <p>Session Key: <strong>{currentSessionKey}</strong></p>
        <p>Users: {userCount}</p>

        {!session.locked ? (
          <button className="btn warning" onClick={lockSession}>Lock Session</button>
        ) : <p className="locked">Session Locked</p>}

        {!currentPoll && !showPollCreator && (
          <button className="btn primary" onClick={() => setShowPollCreator(true)}>Create Poll</button>
        )}

        {showPollCreator && !currentPoll && (
          <div className="poll-creator">
            <h3>Create Poll</h3>
            <input className="input" placeholder="Question" value={pollQuestion} onChange={e => setPollQuestion(e.target.value)} />
            {pollOptions.map((opt, i) => (
              <div className="poll-option" key={i}>
                <input className="input" value={opt} onChange={e => updatePollOption(i, e.target.value)} />
                {pollOptions.length > 2 && <button className="btn danger" onClick={() => removePollOption(i)}>Remove</button>}
              </div>
            ))}
            <button className="btn success" onClick={addPollOption}>Add Option</button>
            <input className="input" type="number" min="1" max={pollOptions.length} value={maxVotes} onChange={e => setMaxVotes(Number(e.target.value))} />
            <button className="btn primary" onClick={createPoll}>Create Poll</button>
            <button className="btn secondary" onClick={() => setShowPollCreator(false)}>Cancel</button>
          </div>
        )}

        {currentPoll && (
          <div className="poll-display">
            <h3>{currentPoll.question}</h3>
            <ul>
              {currentPoll.options.map((opt, i) => (
                <li key={i}>{opt} - Votes: {currentPoll.votes[opt] || 0}</li>
              ))}
            </ul>
            <button className="btn danger" onClick={closePoll}>Close Poll</button>
          </div>
        )}

        <button className="btn danger" onClick={endSession}>End Session</button>
      </div>
    );
  }

  if (view === 'user' && !isAdmin) {
    const session = sessions[currentSessionKey];
    if (!session) return <div className="container">Session ended</div>;
    const currentPoll = session.currentPoll;
    const userHasVoted = session.users[userId]?.voted;

    const toggleOption = opt => {
      if (selectedOptions.includes(opt)) setSelectedOptions(selectedOptions.filter(o => o !== opt));
      else if (selectedOptions.length < currentPoll.maxVotes) setSelectedOptions([...selectedOptions, opt]);
    };

    return (
      <div className="container">
        <h2 className="subtitle">User Dashboard</h2>
        <p>Your ID: <strong>{userId}</strong></p>
        {!session.locked && <p className="status">Waiting for admin to lock session...</p>}
        {session.locked && !currentPoll && <p className="status">Waiting for poll...</p>}
        {currentPoll && !userHasVoted && (
          <div className="poll-display">
            <h3>{currentPoll.question}</h3>
            {currentPoll.options.map((opt, i) => (
              <label key={i} className="poll-option">
                <input type="checkbox" checked={selectedOptions.includes(opt)} onChange={() => toggleOption(opt)} />
                {opt}
              </label>
            ))}
            <button className="btn primary" onClick={() => submitVote(selectedOptions)}>Submit Vote</button>
          </div>
        )}
        {currentPoll && userHasVoted && <p className="status">Thank you for voting! Please wait for admin.</p>}
      </div>
    );
  }

  return null;
};

export default App;
