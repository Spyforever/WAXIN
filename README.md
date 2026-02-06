# Windows 98 Web Edition

> A nostalgic, browser‑based recreation of the Windows 98 desktop — built for curious users, retro enthusiasts, and developers who love tinkering.

A web-based recreation of the classic Windows 98 desktop experience, built using HTML, CSS, and JavaScript.

Windows 98 Web Edition is a personal project inspired by curiosity, nostalgia, and an interest in how far modern browsers can be pushed to recreate complex desktop-style interfaces. It aims to feel familiar to anyone who once used Windows 98, while remaining approachable for developers who want to explore, learn from, or extend the system.

This project is not intended as a perfect emulator or a commercial product. Instead, it is an experiment in UI systems, interaction design, and playful web engineering.
Instead, it is an experiment in UI systems, interaction design, and playful web engineering.

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

--- 

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

## Architecture Overview

Windows 98 Web Edition is built with a modular architecture that separates system logic, shell components, and applications. It aims to mirror the structure of a real operating system while remaining entirely web-based.

- **System Core** (`src/system/`): Handles the fundamental "OS" logic, including the boot process (`os-init.js`), window management (`window-manager.js`), application lifecycle (`app-manager.js`), and a persistent virtual file system powered by **ZenFS**.
- **Shell** (`src/shell/`): Contains the desktop environment components like the Desktop icon view, Taskbar, Start Menu, and the File Explorer.
- **Applications** (`src/apps/`): Individual applications are decoupled from the core system. They extend a base `Application` class and are dynamically registered via a centralized configuration.
- **Global API** (`window.System`): A global object that exposes system-level utilities (like `launchApp`) to allow communication between different modules and applications.
- **Virtual File System**: Uses ZenFS to provide a Unix-like file system in the browser, with an IndexedDB backend on the `C:` drive for persistent user data, shortcuts, and settings.

## AI Assistant

Clippy is reintroduced as an optional, AI-powered assistant.

* Provides help and guidance inside the desktop
* Uses natural language for interaction
* Backed by a separate API responsible for LLM processing

The backend service lives in its own repository:
👉 **[resume-chat-api](https://github.com/azayrahmad/resume-chat-api)**

## Technologies Used

- **Frontend Framework**: Vanilla JavaScript (ES6+), HTML5, and CSS3.
- **Development & Build**: [Vite](https://vitejs.dev/) for fast development and optimized production bundling.
- **Virtual File System**: [ZenFS](https://zenfs.dev/) for providing a robust, persistent file system in the browser.
- **UI Libraries**:
  - [98.css](https://jdan.github.io/98.css/): For authentic Windows 98 styling.
  - [os-gui](https://os-gui.js.org/): For core desktop GUI components like windows and menus (locally modified and extended).
- **External Libraries**: For a full list of third-party libraries used in this project, see [CREDITS.md](./CREDITS.md).

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
