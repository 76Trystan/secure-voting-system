const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(cors());
app.use(express.json());
app.use(helmet());

app.use(
	rateLimit({
		windowMs: 15 * 60 * 1000,
		max: 100,
	})
);

// ------------------------
// STORAGE
// ------------------------

const sessions = {};

// ------------------------
// HELPERS
// ------------------------

const sanitize = (str) =>
	typeof str === "string" ? str.replace(/[<>]/g, "") : "";

const verifyAdmin = (req, res, next) => {
	const { key, adminToken } = req.body;
	const session = sessions[key];

	if (!session || session.adminToken !== adminToken) {
		return res.status(403).json({ error: "Unauthorized" });
	}
	next();
};

// ------------------------
// ROUTES
// ------------------------

app.post("/create-session", (_req, res) => {
	const key = uuidv4();
	const adminToken = uuidv4();

	sessions[key] = {
		key,
		adminToken,
		locked: false,
		users: {},
		currentPoll: null,
		pollHistory: [],
	};

	res.json({ key, adminToken });
});

app.post("/join-session", (req, res) => {
	const { key } = req.body;
	const session = sessions[key];

	if (!session) return res.status(404).json({ error: "Not found" });
	if (session.locked)
		return res.status(403).json({ error: "Locked" });

	const userId = uuidv4();

	session.users[userId] = {
		id: userId,
		voted: false,
		votes: [],
	};

	res.json({ userId });
});

app.post("/lock-session", verifyAdmin, (req, res) => {
	sessions[req.body.key].locked = true;
	res.json({ success: true });
});

app.post("/create-poll", verifyAdmin, (req, res) => {
	const { key, question, options, maxVotes } = req.body;
	const session = sessions[key];

	if (!session) return res.status(404).json({ error: "Not found" });

	const cleanOptions = options.map(sanitize);

	session.currentPoll = {
		question: sanitize(question),
		options: cleanOptions,
		maxVotes,
		votes: {},
	};

	Object.values(session.users).forEach((u) => {
		u.voted = false;
		u.votes = [];
	});

	res.json({ success: true });
});

app.post("/vote", (req, res) => {
	const { key, userId, selectedOptions } = req.body;
	const session = sessions[key];

	if (!session) return res.status(404).json({ error: "Not found" });

	const user = session.users[userId];
	if (!user) return res.status(403).json({ error: "Invalid user" });

	if (user.voted)
		return res.status(400).json({ error: "Already voted" });

	const poll = session.currentPoll;
	if (!poll)
		return res.status(400).json({ error: "No active poll" });

	if (
		!Array.isArray(selectedOptions) ||
		selectedOptions.length > poll.maxVotes ||
		selectedOptions.some((opt) => !poll.options.includes(opt))
	) {
		return res.status(400).json({ error: "Invalid vote" });
	}

	selectedOptions.forEach((opt) => {
		poll.votes[opt] = (poll.votes[opt] || 0) + 1;
	});

	user.voted = true;
	user.votes = selectedOptions;

	res.json({ success: true });
});

app.post("/close-poll", verifyAdmin, (req, res) => {
	const session = sessions[req.body.key];

	session.pollHistory.push(session.currentPoll);
	session.currentPoll = null;

	res.json({ success: true });
});

app.get("/session/:key", (req, res) => {
	const session = sessions[req.params.key];
	if (!session) return res.status(404).json({ error: "Not found" });

	res.json({
		locked: session.locked,
		currentPoll: session.currentPoll,
		userCount: Object.keys(session.users).length,
	});
});

app.listen(5000, () => {
	console.log("Server running");
});