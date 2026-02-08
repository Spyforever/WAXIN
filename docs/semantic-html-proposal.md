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

## Summary of Benefits
1. **Accessibility**: Screen readers can better navigate the application using landmark roles (main, footer, nav).
2. **SEO/Maintainability**: Using standard tags makes the structure more predictable for developers.
3. **Standards Alignment**: Better alignment with modern web development best practices.
