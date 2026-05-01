# Anonymous Voting Web App

A secure and private polling system that allows users to participate in anonymous votes. Built with **React** for the frontend and **Node.js/Express** for the backend.

---

## Web App Purpose

Built for organisations that need a lightweight, trustworthy way to run anonymous votes in real time, the kind of scenario where existing tools either do too much, cost too much, or simply aren't designed for it. Most popular polling platforms are built around audience engagement or quizzes, not genuine anonymous balloting. This app fills that gap: no accounts, no data retained between sessions, just a clean and fair vote.

---

## Features

- Create and join voting sessions with a unique session key  
- Admin can lock a session to prevent new users from joining  
- Create polls with multiple options and configurable maximum votes per user  
- Users can vote anonymously  
- Poll results are displayed live to the admin  
- Close polls and end sessions easily  
- Responsive and simple UI
- Voters can select one or more options per poll via a click-to-toggle interface  

---

## Demo

https://secure-voting-system-1.onrender.com/

Note: Render.com hibernates the site when inactive, so may take a minute to full start up

---

## Tech Stack

- **Frontend:** React 19 (Create React App)
- **Backend:** Node.js, Express 5
- **Styling:** Custom CSS, Inter (Google Fonts)
- **Communication:** REST API
- **Database:** None - all session data is held in memory and lost on server restart
- **Middleware:** CORS
