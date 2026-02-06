# Windows 98 Web Edition

A pixel-perfect recreation attempt of Windows 98 desktop GUI using just HTML, CSS, and JavaScript. Many of the default programs and features of Windows 98 are also included, either recreated from scratch or embedding existing open source ports. 

## Live Demo

Experience Windows 98 Web Edition live: **[Windows 98 Web Edition](https://azayrahmad.github.io/win98-web/)**

## Screenshots

*Default Desktop*
![Default Desktop with CRT filter enabled](./screenshots/default-desktop.PNG)

*Desktop with Clippy and Notepad*
![Desktop with Clippy and Notepad](./screenshots/desktop-with-clippy-notepad.PNG)

*Desktop with Winamp and App Maker*
![Desktop with Winamp and App Maker](./screenshots/desktop-with-appmaker-webamp.PNG)

*Desktop Context Menu with Theme Options*
![Desktop Context Menu with Theme Options](./screenshots/desktop-context-menu.PNG)

## Features

- **Windows Classic Desktop Experience**: Pixel-perfect remake attempt of Windows 98 desktop shell components and animations.

- **Desktop Themes**: Featuring all of the original Windows 98 desktop themes, complete with color schemes, wallpapers, icon sets, and sound sets (screensavers are WIP).

- **Theme Customization**: Upload your own .theme files and wallpapers to apply to the desktop. Change the colors, set wallpaper to stretch, tile, or center. All are saved privately to your cache. (WIP).

- **Programs and Games**: Ports of popular software used in Windows 98 are included here. Most of them are existing ports and remakes made by other people, but some of them are made by myself. See Featured Applications for more info.

- **Progressive Web App**: Install it on your machine as a desktop application.

- **Free**: Use it, download the source, fork it, add your own themes and apps and games, make it your own. I don't really care. Credit and attribution are nice though.

## Featured Applications

- **Assistant**: Clippy the Office Assistant has been resurrected, now powered with AI. Ask any question about Windows 98. Can even give you a short tour of the OS. For more details, see the [Clippy App README](./src/apps/clippy/README.md).
- **Notepad**: Your basic text editor, now with added syntax highlighting, code formatting, and Markdown preview. For more details, see the [Notepad App README](./src/apps/notepad/README.md).
- **Winamp**: Play your favorite songs and playlists here. Customize with your own skins. A faithful recreation of the classic Winamp music player that runs directly on the desktop. For more details, see the [Webamp App README](./src/apps/webamp/README.md).
- **Internet Explorer**: Surf the Internet like it was 1998. With Retro Mode enabled, you will be brought to 1998 archived version of your favorite websites.
- **Pinball**: A web port of Space Cadet Pinball.

For a full list of applications and instructions on how to create your own, refer to the [Application Development Guide](./src/apps/README.md).

## Architecture Overview

Windows 98 Web Edition is built with a modular architecture that separates system logic, shell components, and applications. It aims to mirror the structure of a real operating system while remaining entirely web-based.

- **System Core** (`src/system/`): Handles the fundamental "OS" logic, including the boot process (`os-init.js`), window management (`window-manager.js`), application lifecycle (`app-manager.js`), and a persistent virtual file system powered by **ZenFS**.
- **Shell** (`src/shell/`): Contains the desktop environment components like the Desktop icon view, Taskbar, Start Menu, and the File Explorer.
- **Applications** (`src/apps/`): Individual applications are decoupled from the core system. They extend a base `Application` class and are dynamically registered via a centralized configuration.
- **Global API** (`window.System`): A global object that exposes system-level utilities (like `launchApp`) to allow communication between different modules and applications.
- **Virtual File System**: Uses ZenFS to provide a Unix-like file system in the browser, with an IndexedDB backend on the `C:` drive for persistent user data, shortcuts, and settings.

## Technologies Used

- **Frontend Framework**: Vanilla JavaScript (ES6+), HTML5, and CSS3.
- **Development & Build**: [Vite](https://vitejs.dev/) for fast development and optimized production bundling.
- **Virtual File System**: [ZenFS](https://zenfs.dev/) for providing a robust, persistent file system in the browser.
- **UI Libraries**:
  - [98.css](https://jdan.github.io/98.css/): For authentic Windows 98 styling.
  - [os-gui](https://os-gui.js.org/): For core desktop GUI components like windows and menus (locally modified and extended).
- **External Libraries**: For a full list of third-party libraries used in this project, see [CREDITS.md](./CREDITS.md).

## Getting Started

To run this project locally, follow these steps:

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Run the Development Server:**
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:5173` (or another port if 5173 is in use).

## Future plans

- Command prompt (MS-DOS).
- BIOS setup.
- Calculator app.
- Disk Defragmenter simulator.
- More Windows 98 screensaver recreations.
- More web ports and DOS games.
- Let me know if you have ideas!

## Asset Sources

Windows 98 Web Edition uses a mixture of:

- original assets created specifically for this project,
- third-party open-source recreations
- visual elements derived from classic Windows operating systems for the purpose of historical interface recreation and compatibility.

Some graphical elements may have been redrawn, color-corrected, resized, or otherwise transformed from their original form to ensure they render correctly in modern browsers.

These assets are provided strictly for:
- educational
- archival
- non-commercial
- fair-use–oriented

purposes.

- Sound Effect by <a href="https://pixabay.com/users/freesound_community-46691455/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=35843">freesound_community</a> from <a href="https://pixabay.com//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=35843">Pixabay</a>

All rights to the original Windows artwork, icons, cursors, and media belong to Microsoft Corporation.
