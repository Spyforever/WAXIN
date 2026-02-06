# Windows 98 Web Edition

> A nostalgic, browser‑based recreation of the Windows 98 desktop — built for curious users, retro enthusiasts, and developers who love tinkering.

A web-based recreation of the classic Windows 98 desktop experience, built using HTML, CSS, and JavaScript.

Windows 98 Web Edition is a personal project inspired by curiosity, nostalgia, and an interest in how far modern browsers can be pushed to recreate complex desktop-style interfaces. It aims to feel familiar to anyone who once used Windows 98, while remaining approachable for developers who want to explore, learn from, or extend the system.

This project is not intended as a perfect emulator or a commercial product. Instead, it is an experiment in UI systems, interaction design, and playful web engineering.

---

## Table of Contents

* [Live Demo](#live-demo)
* [What You Can Do Here](#what-you-can-do-here)
* [Applications Included](#applications-included)
* [For Developers and Tinkerers](#for-developers-and-tinkerers)
* [Architecture Overview](#architecture-overview-placeholder)
* [AI Assistant](#ai-assistant)
* [Technologies Used](#technologies-used)
* [Running Locally](#running-locally)
* [Future Plans](#future-plans)
* [Assets and Credits](#assets-and-credits)

--- Instead, it is an experiment in UI systems, interaction design, and playful web engineering.

## Live Demo

Experience it directly in your browser:

👉 **[Windows 98 Web Edition](https://azayrahmad.github.io/win98-web/)**

*(Desktop browser recommended for the best experience.)*

## What You Can Do Here

* Explore a browser-based desktop that behaves like a classic operating system
* Launch, move, resize, and manage multiple windows
* Change themes, colors, wallpapers, and sound schemes
* Run classic games and utilities in a nostalgic environment
* Install the project as a Progressive Web App

For casual users, this is a fun retro playground. For developers, it is an open system that can be modified and extended.

## What You Can Do Here

* Explore a browser-based desktop that behaves like a classic operating system
* Launch, move, resize, and manage multiple windows
* Change themes, colors, wallpapers, and sound schemes
* Run classic games and utilities in a nostalgic environment
* Install the project as a Progressive Web App

For casual users, this is a fun retro playground. For developers, it is an open system that can be modified and extended.

## Applications Included

Windows 98 Web Edition includes a growing collection of built-in applications, similar to a real operating system distribution. These range from games and media players to productivity tools and system utilities.

Some examples include:

* Classic games such as Doom, Quake, Diablo, Prince of Persia, Solitaire, FreeCell, Minesweeper, and Pinball
* Media tools like Winamp (via Webamp), Media Player, and Flash Player
* Accessories such as Notepad, Paint, WordPad, Calculator, Image Viewer, and PDF Viewer
* System tools including File Explorer, Task Manager, Command Prompt, Display Properties, Disk Defragmenter, and Help
* An AI-powered Clippy assistant that can answer questions and guide users around the system

A complete and up-to-date list of applications, including development notes, is available here:

📄 **[Application Development Guide](./src/apps/README.md)**

## For Developers and Tinkerers

This project is designed to be forked, studied, and experimented with.

* Applications are registered through a central configuration file
* Apps can be window-based or function-based
* Context menus, menu bars, and keyboard shortcuts are configurable
* Themes and visual styles are data-driven and modifiable

If you are interested in creating your own apps, modifying existing ones, or building your own variant of the system, start with the Application Development Guide linked above.

## Architecture Overview (Placeholder)

> This section is intentionally reserved for deeper technical documentation.
> It will be expanded as the internal systems stabilize and mature.

This section will describe the internal structure of the system, including:

* Desktop and window management
* Application lifecycle and registration
* Event handling and focus management
* Theming and runtime style generation
* File system abstractions

*(Detailed documentation to be added.)*

## AI Assistant

Clippy is reintroduced as an optional, AI-powered assistant.

* Provides help and guidance inside the desktop
* Uses natural language for interaction
* Backed by a separate API responsible for LLM processing

The backend service lives in its own repository:
👉 **[resume-chat-api](https://github.com/azayrahmad/resume-chat-api)**

## Technologies Used

* **HTML, CSS, JavaScript** (no frontend frameworks)
* **Vite** for development and bundling
* **98.css** and **os-gui**, both heavily modified to fit the needs of this project
* Various open-source libraries used by individual applications (Webamp, highlight.js, Marked.js, etc.)

## Running Locally

```bash
npm install
npm run dev
```

The development server will run at `http://localhost:5173`.

## Future Plans

* Expand the command prompt and system utilities
* Add more classic applications and games
* Improve theme customization and persistence
* Add more documentation around architecture and internals

Suggestions and ideas are welcome.

## Assets and Credits

This project uses a mix of:

* Original assets created specifically for this project
* Third-party open-source recreations
* Visual elements inspired by classic Windows operating systems

Assets are used strictly for educational, archival, and non-commercial purposes.

All rights to original Windows artwork, icons, and media belong to **Microsoft Corporation**.
