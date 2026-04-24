const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const app = express();
const PORT = process.env.PORT || 5000;

// Restrict CORS to known frontend origins only
const ALLOWED_ORIGINS = [
	"https://secure-voting-system-1.onrender.com",
	"http://localhost:3000",
];

app.use(
	cors({
		origin: (origin, callback) => {
			// Allow same-origin requests (no Origin header) and explicitly listed origins
			if (!origin || ALLOWED_ORIGINS.includes(origin)) {
				callback(null, true);
			} else {
				callback(new Error("Not allowed by CORS"));
			}
		},
	}),
);

// Limit request body to 10 KB to prevent oversized payload attacks
app.use(express.json({ limit: "10kb" }));

// In-memory sessions (for demo, replace with database for persistence)
const sessions = {};

// Cryptographically secure ID generation
const generateSessionKey = () =>
	(crypto.randomInt(900000) + 100000).toString();
const generateUserId = () => crypto.randomBytes(16).toString("hex");
const generateAdminToken = () => crypto.randomBytes(32).toString("hex");

// Reject keys that could cause prototype pollution or are malformed
const isValidSessionKey = (key) =>
	typeof key === "string" && /^\d{6}$/.test(key);

// Strip the adminToken and individual vote records before sending session to clients
const sanitizeSession = (session) => {
	const { adminToken, users, ...rest } = session;
	const safeUsers = Object.fromEntries(
		Object.entries(users).map(([uid, user]) => [
			uid,
			{ id: user.id, voted: user.voted },
		]),
	);
	return { ...rest, users: safeUsers };
};

// Middleware: verify the caller holds the admin token for the session
const requireAdmin = (req, res, next) => {
	const { key, adminToken } = req.body;
	if (!isValidSessionKey(key))
		return res.status(400).json({ error: "Invalid session key" });
	const session = sessions[key];
	if (!session) return res.status(404).json({ error: "Session not found" });
	if (
		!adminToken ||
		typeof adminToken !== "string" ||
		adminToken !== session.adminToken
	) {
		return res.status(403).json({ error: "Unauthorized" });
	}
	req.session = session;
	next();
};

// Create a new session
app.post("/create-session", (_req, res) => {
	const key = generateSessionKey();
	const adminToken = generateAdminToken();
	sessions[key] = {
		key,
		locked: false,
		users: {},
		currentPoll: null,
		pollHistory: [],
		adminToken,
	};
	// Return adminToken once — the admin must store it for subsequent requests
	res.json({ ...sanitizeSession(sessions[key]), adminToken });
});

// Join a session
app.post("/join-session", (req, res) => {
	const { key } = req.body;
	if (!isValidSessionKey(key))
		return res.status(400).json({ error: "Invalid session key" });
	const session = sessions[key];
	if (!session) return res.status(404).json({ error: "Session not found" });
	if (session.locked) return res.status(403).json({ error: "Session locked" });

	const userId = generateUserId();
	session.users[userId] = { id: userId, voted: false, votes: [] };
	// Never expose adminToken or other users' vote choices to joiners
	res.json({ session: sanitizeSession(session), userId });
});

// Lock session — admin only
app.post("/lock-session", requireAdmin, (req, res) => {
	req.session.locked = true;
	res.json(sanitizeSession(req.session));
});

// Create a poll — admin only
app.post("/create-poll", requireAdmin, (req, res) => {
	const { question, options, maxVotes } = req.body;

	if (
		typeof question !== "string" ||
		!question.trim() ||
		question.length > 200
	) {
		return res.status(400).json({ error: "Invalid question (max 200 chars)" });
	}
	if (!Array.isArray(options) || options.length < 2 || options.length > 20) {
		return res
			.status(400)
			.json({ error: "Options must be an array of 2–20 items" });
	}
	if (
		options.some(
			(opt) =>
				typeof opt !== "string" || !opt.trim() || opt.length > 100,
		)
	) {
		return res
			.status(400)
			.json({ error: "Each option must be a non-empty string (max 100 chars)" });
	}

	const maxVotesNum = Number(maxVotes);
	if (
		!Number.isInteger(maxVotesNum) ||
		maxVotesNum < 1 ||
		maxVotesNum > options.length
	) {
		return res.status(400).json({ error: "Invalid maxVotes value" });
	}

	const validOptions = options.map((opt) => opt.trim());
	const newPoll = {
		question: question.trim(),
		options: validOptions,
		maxVotes: maxVotesNum,
		votes: {},
		active: true,
	};

	Object.keys(req.session.users).forEach((uid) => {
		req.session.users[uid].voted = false;
		req.session.users[uid].votes = [];
	});
	req.session.currentPoll = newPoll;
	res.json(sanitizeSession(req.session));
});

// Submit vote
app.post("/vote", (req, res) => {
	const { key, userId, selectedOptions } = req.body;

	if (!isValidSessionKey(key))
		return res.status(400).json({ error: "Invalid session key" });
	const session = sessions[key];
	if (!session) return res.status(404).json({ error: "Session not found" });

	// Require an active poll before accepting any votes
	if (!session.currentPoll)
		return res.status(400).json({ error: "No active poll" });

	// Validate userId exists in this session (prevents voting as another user)
	if (typeof userId !== "string" || !session.users[userId]) {
		return res.status(403).json({ error: "Invalid user" });
	}

	// Prevent double voting
	if (session.users[userId].voted) {
		return res.status(400).json({ error: "Already voted" });
	}

	// Validate selectedOptions count against server-side maxVotes
	if (
		!Array.isArray(selectedOptions) ||
		selectedOptions.length === 0 ||
		selectedOptions.length > session.currentPoll.maxVotes
	) {
		return res.status(400).json({ error: "Invalid number of selections" });
	}

	// Validate every option is an actual poll option (no injected values)
	const validOptions = new Set(session.currentPoll.options);
	if (
		selectedOptions.some(
			(opt) => typeof opt !== "string" || !validOptions.has(opt),
		)
	) {
		return res.status(400).json({ error: "Invalid option selected" });
	}

	// Prevent duplicate selections within a single vote
	if (new Set(selectedOptions).size !== selectedOptions.length) {
		return res.status(400).json({ error: "Duplicate options in selection" });
	}

	selectedOptions.forEach((option) => {
		session.currentPoll.votes[option] =
			(session.currentPoll.votes[option] || 0) + 1;
	});
	session.users[userId].voted = true;
	session.users[userId].votes = selectedOptions;
	res.json(sanitizeSession(session));
});

// Close poll — admin only
app.post("/close-poll", requireAdmin, (req, res) => {
	if (!req.session.currentPoll) {
		return res.status(400).json({ error: "No active poll" });
	}
	req.session.pollHistory.push(req.session.currentPoll);
	req.session.currentPoll = null;
	res.json(sanitizeSession(req.session));
});

// End session — admin only; removes all session data from memory
app.post("/end-session", requireAdmin, (req, res) => {
	const { key } = req.body;
	delete sessions[key];
	res.json({ success: true });
});

// Get session data — strip adminToken and individual vote choices
app.get("/session/:key", (req, res) => {
	const key = req.params.key;
	if (!isValidSessionKey(key))
		return res.status(400).json({ error: "Invalid session key" });
	const session = sessions[key];
	if (!session) return res.status(404).json({ error: "Session not found" });
	res.json(sanitizeSession(session));
});

app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});
