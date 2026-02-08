# Proposal: Semantic HTML Improvements for Windows 98 Web Edition

This document outlines a proposal to improve the semantic structure of the HTML used in the Windows 98 Web Edition project. The goal is to move away from generic `<div>` elements where more descriptive HTML5 tags can be used, improving accessibility and code clarity.

## 1. Main Shell Structure (`src/shell/ui.js`)

The core UI currently uses several `<div>` elements to define the main application areas.

### Proposed Changes:
- Replace `#app-container` with `<main>` to indicate the primary content area of the application.
- Replace `.taskbar` with `<footer>` to reflect its position and role as a persistent utility bar at the bottom of the screen.

| Element Selector | Current Tag | Proposed Tag |
|------------------|-------------|--------------|
| `#app-container` | `div`       | `main`       |
| `.taskbar`       | `div`       | `footer`     |

### Example:
**Before:**
```javascript
const appContainer = document.createElement('div');
appContainer.id = 'app-container';
const taskbar = document.createElement('div');
taskbar.className = 'taskbar';
```

**Proposed:**
```javascript
const appContainer = document.createElement('main');
appContainer.id = 'app-container';
const taskbar = document.createElement('footer');
taskbar.className = 'taskbar';
```

---

## 2. Taskbar Components (`src/shell/taskbar/taskbar.js`)

The taskbar contains navigation and status information.

### Proposed Changes:
- Use `<nav>` inside the taskbar for areas that facilitate application switching and navigation.
- Use `<section>` for the system tray.

| Component Area | Proposed Tag | Reason |
|----------------|--------------|--------|
| Taskbar (outer) | `footer` | Main bottom utility bar. |
| Quick Launch / Icon Area | `nav` | Navigation for common links. |
| Taskbar App Area | `nav` | Navigation between open windows. |
| System Tray | `section` | A distinct area for system status/tray apps. |

---

## 3. Start Menu (`src/shell/start-menu/start-menu.js`)

The Start Menu is a primary navigation element for the entire OS.

### Proposed Changes:
- Use `<nav aria-label="Start Menu">` as the container for the start menu.

### Example:
**Before:**
```html
<div id="start-menu" class="start-menu hidden">
  <ul class="start-menu-list">
    <!-- ... -->
  </ul>
</div>
```

**Proposed:**
```html
<nav id="start-menu" class="start-menu hidden" aria-label="Start Menu">
  <ul class="start-menu-list">
    <!-- ... -->
  </ul>
</nav>
```

---

## 4. Boot Screen (`index.html`)

The boot screen is an introductory sequence that precedes the main application.

### Proposed Changes:
- Use `<section>` for the `#boot-screen` and `#splash-screen`.

### Example:
**Before:**
```html
<div id="boot-screen">
    <div id="initial-boot-message">Initializing...</div>
    <!-- ... -->
</div>
```

**Proposed:**
```html
<section id="boot-screen" aria-live="polite">
    <div id="initial-boot-message">Initializing...</div>
    <!-- ... -->
</section>
```

---

## 5. Desktop Area (`src/shell/ui.js`)

The desktop area is where icons are placed and windows are rendered.

### Proposed Changes:
- Use `<section>` for `#desktop-area` to define it as a specific functional region of the application.

---

## 6. Windowing System (`public/os-gui/$Window.js`)

The windowing system is responsible for creating and managing application windows and dialogs.

### Proposed Changes:
- Replace the outer window `<div>` with `<article role="window">`. While `role="window"` is not a standard ARIA role (it's often `role="dialog"` or just a landmark), `<article>` is appropriate for self-contained components like windows. For modal dialogs, `<dialog>` should be considered.
- Replace `.window-titlebar` with `<header>`.
- Replace `.window-content` with `<section>`.

| Element Selector | Current Tag | Proposed Tag |
|------------------|-------------|--------------|
| `.window`        | `div`       | `article` or `dialog` |
| `.window-titlebar`| `div`      | `header`     |
| `.window-content` | `div`      | `section`    |

### Example (Standard Window):
**Before:**
```html
<div class="window os-window">
    <div class="window-titlebar">...</div>
    <div class="window-content">...</div>
</div>
```

**Proposed:**
```html
<article class="window os-window">
    <header class="window-titlebar">...</header>
    <section class="window-content">...</section>
</article>
```

---

## 7. Dialog Windows (`src/shared/components/dialog-window.js`)

Dialog windows are often modal and represent a specific interaction.

### Proposed Changes:
- For modal dialogs, use the native `<dialog>` element. This provides built-in accessibility features and a proper top-layer rendering (though `z-index` management is already handled by the system).

---

## 8. Menus and Popups (`public/os-gui/MenuPopup.js`, `public/os-gui/MenuBar.js`)

Menus currently use a mix of `div`, `table`, `tr`, and `td` with ARIA roles.

### Proposed Changes:
- Replace the outer menu `div` with `<ul>`.
- Replace menu rows (`tr`) with `<li>`.
- While the `table` layout provides excellent alignment, a CSS Grid or Flexbox approach using `<ul>` and `<li>` would be more semantically correct for a list of actions.

| Component | Current Tag | Proposed Tag |
|-----------|-------------|--------------|
| Menu Popup| `div`       | `ul`         |
| Menu Item | `tr`        | `li`         |

---

## Summary of Benefits
1. **Accessibility**: Landmark tags like `<header>` and `<nav>` provide better navigation for assistive technologies.
2. **Code Clarity**: Semantic tags clearly define the purpose of each structural element, making the code easier to understand and maintain.
3. **Future Proofing**: Moving towards standard HTML5 and ARIA patterns ensures better compatibility with future browser features.
