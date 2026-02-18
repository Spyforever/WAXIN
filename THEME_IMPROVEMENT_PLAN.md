# Desktop Themes Improvement Plan (Phased Approach)

This plan outlines the transition of the Desktop Themes application from a hardcoded list to a dynamic system that loads and parses `.theme` files from ZenFS (`/C:/Program Files/Plus!/Themes`).

## Phase 1: Infrastructure & Discovery
**Goal**: Establish the ability to find and parse `.theme` files from ZenFS.

- **Parser Enhancement (`public/os-gui/parse-theme.js`)**:
    - Update `parseINIString` for robustness.
    - Implement path resolution for `%ThemeDir%` (theme folder) and `%WinDir%` (`/C:/WINDOWS`).
    - Implement `getColorsFromThemeFile`, `getIconsFromThemeFile`, `getCursorsFromThemeFile`, `getDesktopConfigFromThemeFile`, and `getSoundsFromThemeFile`.
- **Theme Discovery (`src/system/theme-manager.js`)**:
    - Implement `loadThemesFromZenFS()` to scan `/C:/Program Files/Plus!/Themes`.
    - Update `getThemes()` to include discovered files.
- **Runnable/Testable**:
    - Verify themes are detected in ZenFS via the console.
    - Run unit tests for the parser to ensure all sections (Icons, Cursors, Sounds, Desktop) are correctly extracted from a sample `.theme` string.

## Phase 2: UI Integration & Basic Application
**Goal**: Allow users to select ZenFS themes and apply basic visual changes (Colors/Wallpaper).

- **Desktop Themes UI (`src/apps/desktop-themes/`)**:
    - Populate the theme dropdown with `.theme` files from ZenFS.
    - Disable/bypass the Theme Wizard when a `.theme` file is selected.
    - Update the preview container to show the themed wallpaper and colors.
- **Basic Application**:
    - Implement the flow in `ThemeManager` to apply `[Control Panel\Colors]` and `[Control Panel\Desktop]` (Wallpaper) from the `.theme` file.
- **Runnable/Testable**:
    - Open the "Desktop Themes" app; verify ZenFS themes appear in the list.
    - Select a theme and click "Apply"; verify system colors and wallpaper change.

## Phase 3: Assets Integration (Cursors & Sounds)
**Goal**: Enable themed mouse pointers and system sounds from ZenFS.

- **Asset Loading Logic**:
    - Implement a utility to resolve ZenFS paths to Blob URLs for use in the browser.
- **Sound Manager (`src/system/sound-manager.js`)**:
    - Update to support playing `.wav` files from ZenFS URLs.
- **Cursor Manager (`src/system/cursor-manager.js`)**:
    - Update to support applying `.cur` and `.ani` cursors from ZenFS URLs.
- **Runnable/Testable**:
    - Apply a theme with custom sounds/cursors; verify sounds play on events (e.g., opening a window) and cursors update system-wide.

## Phase 4: Shell Icons & Advanced Settings
**Goal**: Apply themed icons to system folders and implement advanced desktop settings.

- **Themed Icons**:
    - Update `src/shell/explorer/interface/file-icon-renderer.js` and `getThemedIconObj` to respect the icon paths defined in the current theme.
    - Handle Recycle Bin `full` and `empty` states.
- **Advanced Desktop Settings**:
    - Implement `Tilewallpaper` and `Pattern` support in the desktop background component.
    - Integrate `ScreenSaveActive` with the Screensaver manager.
- **Runnable/Testable**:
    - Verify "My Computer", "Network Neighborhood", and "Recycle Bin" icons change on the desktop.
    - Verify wallpaper tiling behavior matches the `.theme` file setting.

## Phase 5: Cleanup & Defaults
**Goal**: Finalize the system and remove legacy hardcoded data.

- **Remove Hardcoded Themes**:
    - Delete themes from `src/config/themes.js` (keeping only the "Default" fallback).
- **Final System Init**:
    - Ensure `/C:/Program Files/Plus!/Themes` is created during system boot.
- **Runnable/Testable**:
    - Verify the system boots correctly with "Windows Default".
    - Verify all functionality remains intact without the hardcoded `themes.js` list.
