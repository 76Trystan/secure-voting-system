import { useEffect, useState } from "react";
import "./App.css";

const BACKEND_URL = "https://secure-voting-system-ybp8.onrender.com";

const App = () => {
	const [view, setView] = useState("home");
	const [inputKey, setInputKey] = useState("");
	const [userId, setUserId] = useState(null);
	const [adminToken, setAdminToken] = useState("");
	const [currentSessionKey, setCurrentSessionKey] = useState("");
	const [sessionData, setSessionData] = useState(null);

	const [pollQuestion, setPollQuestion] = useState("");
	const [pollOptions, setPollOptions] = useState(["", ""]);
	const [maxVotes, setMaxVotes] = useState(1);
	const [showPollCreator, setShowPollCreator] = useState(false);
	const [selectedOptions, setSelectedOptions] = useState([]);

	// ------------------------
	// SESSION
	// ------------------------

	const createSession = async () => {
		const res = await fetch(`${BACKEND_URL}/create-session`, {
			method: "POST",
		});
		const data = await res.json();

		setCurrentSessionKey(data.key);
		setAdminToken(data.adminToken);
		setView("admin");
	};

	const joinSession = async () => {
		const res = await fetch(`${BACKEND_URL}/join-session`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ key: inputKey }),
		});
		const data = await res.json();

		if (data.error) return alert(data.error);

		setUserId(data.userId);
		setCurrentSessionKey(inputKey);
		setView("user");
	};

	// ------------------------
	// ADMIN ACTIONS
	// ------------------------

	const lockSession = async () => {
		await fetch(`${BACKEND_URL}/lock-session`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				key: currentSessionKey,
				adminToken,
			}),
		});
	};

	const createPoll = async () => {
		if (!pollQuestion.trim()) return alert("Invalid question");

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

		setShowPollCreator(false);
	};

	const closePoll = async () => {
		await fetch(`${BACKEND_URL}/close-poll`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				key: currentSessionKey,
				adminToken,
			}),
		});
	};

	// ------------------------
	// USER ACTIONS
	// ------------------------

	const submitVote = async () => {
		await fetch(`${BACKEND_URL}/vote`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				key: currentSessionKey,
				userId,
				selectedOptions,
			}),
		});

		setSelectedOptions([]);
	};

	// ------------------------
	// POLLING
	// ------------------------

	useEffect(() => {
		if (!currentSessionKey) return;

		const interval = setInterval(async () => {
			const res = await fetch(
				`${BACKEND_URL}/session/${currentSessionKey}`
			);
			const data = await res.json();
			setSessionData(data);
		}, 3000);

		return () => clearInterval(interval);
	}, [currentSessionKey]);

	// ------------------------
	// UI
	// ------------------------

	if (view === "home") {
		return (
			<div className="container">
				<h1>Anonymous Voting</h1>

				<button onClick={createSession}>Create Session</button>

				<input
					value={inputKey}
					onChange={(e) => setInputKey(e.target.value)}
					placeholder="Session key"
				/>
				<button onClick={joinSession}>Join</button>
			</div>
		);
	}

	if (view === "admin") {
		return (
			<div>
				<h2>Admin</h2>

				<button onClick={lockSession}>Lock</button>

				{!sessionData?.currentPoll && (
					<button onClick={() => setShowPollCreator(true)}>
						New Poll
					</button>
				)}

				{showPollCreator && (
					<div>
						<input
							value={pollQuestion}
							onChange={(e) =>
								setPollQuestion(e.target.value.slice(0, 200))
							}
						/>
						<button onClick={createPoll}>Create</button>
					</div>
				)}

				{sessionData?.currentPoll && (
					<div>
						<h3>{sessionData.currentPoll.question}</h3>
						<button onClick={closePoll}>Close Poll</button>
					</div>
				)}
			</div>
		);
	}

	if (view === "user") {
		if (!sessionData) return <div>Loading...</div>;

		const poll = sessionData.currentPoll;

		return (
			<div>
				<h2>User</h2>

				{poll && (
					<div>
						<h3>{poll.question}</h3>

						{poll.options.map((opt) => (
							<label key={opt}>
								<input
									type="checkbox"
									checked={selectedOptions.includes(opt)}
									onChange={() => {
										if (selectedOptions.includes(opt)) {
											setSelectedOptions(
												selectedOptions.filter(
													(o) => o !== opt
												)
											);
										} else if (
											selectedOptions.length <
											poll.maxVotes
										) {
											setSelectedOptions([
												...selectedOptions,
												opt,
											]);
										}
									}}
								/>
								{opt}
							</label>
						))}

						<button onClick={submitVote}>Vote</button>
					</div>
				)}
			</div>
		);
	}

	return null;
};

export default App;