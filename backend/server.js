const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json()); // parse JSON bodies

// In-memory sessions (for demo, replace with database for persistence)
const sessions = {};

// Generate random keys and IDs
const generateSessionKey = () => Math.floor(100000 + Math.random() * 900000).toString();
const generateUserId = () => Math.floor(1000 + Math.random() * 9000).toString();

// --- Routes ---

// Create a new session
app.post('/create-session', (req, res) => {
  const key = generateSessionKey();
  sessions[key] = { key, locked: false, users: {}, currentPoll: null, pollHistory: [], admin: true };
  res.json(sessions[key]);
});

// Join a session
app.post('/join-session', (req, res) => {
  const { key } = req.body;
  const session = sessions[key];
  if (!session) return res.status(404).json({ error: 'Session not found' });
  if (session.locked) return res.status(403).json({ error: 'Session locked' });

  const userId = generateUserId();
  session.users[userId] = { id: userId, voted: false, votes: [] };
  res.json({ session, userId });
});

// Lock session
app.post('/lock-session', (req, res) => {
  const { key } = req.body;
  if (sessions[key]) sessions[key].locked = true;
  res.json(sessions[key]);
});

// Create a poll
app.post('/create-poll', (req, res) => {
  const { key, question, options, maxVotes } = req.body;
  if (!sessions[key]) return res.status(404).json({ error: 'Session not found' });

  const newPoll = { question, options, maxVotes, votes: {}, active: true };
  Object.keys(sessions[key].users).forEach(uid => {
    sessions[key].users[uid].voted = false;
    sessions[key].users[uid].votes = [];
  });
  sessions[key].currentPoll = newPoll;
  res.json(sessions[key]);
});

// Submit vote
app.post('/vote', (req, res) => {
  const { key, userId, selectedOptions } = req.body;
  const session = sessions[key];
  if (!session) return res.status(404).json({ error: 'Session not found' });

  selectedOptions.forEach(option => {
    session.currentPoll.votes[option] = (session.currentPoll.votes[option] || 0) + 1;
  });
  session.users[userId].voted = true;
  session.users[userId].votes = selectedOptions;
  res.json(session);
});

// Close poll
app.post('/close-poll', (req, res) => {
  const { key } = req.body;
  const session = sessions[key];
  if (!session) return res.status(404).json({ error: 'Session not found' });

  session.pollHistory.push(session.currentPoll);
  session.currentPoll = null;
  res.json(session);
});

// Get session data
app.get('/session/:key', (req, res) => {
  const session = sessions[req.params.key];
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json(session);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
