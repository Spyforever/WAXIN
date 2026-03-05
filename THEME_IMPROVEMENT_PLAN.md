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
- **Verification**:
    - **Boot Check**: Restart the OS and verify the boot terminal shows `Loading system themes... OK`.
    - **ZenFS Discovery**:
        1. Open the Browser Console.
        2. Create a dummy theme: `await fs.promises.writeFile('/C:/Program Files/Plus!/Themes/Test.theme', '[Control Panel\\Colors]\nBackground=0 128 128')`.
        3. Open the "Desktop Themes" app.
        4. Verify "Test" appears in the Theme dropdown.
    - **Parser Test**:
        1. Ensure the system is booted (this loads the theme parser).
        2. In the console, call `window.getColorsFromThemeFile('[Control Panel\\Colors]\\nBackground=0 128 128')`.
        3. Verify it returns `{ Background: "rgb(0, 128, 128)" }`.

## Phase 2: UI Integration & Basic Application
**Goal**: Allow users to select ZenFS themes and apply basic visual changes (Colors/Wallpaper).

- **Desktop Themes UI (`src/apps/desktop-themes/`)**:
    - Populate the theme dropdown with `.theme` files from ZenFS.
    - Disable/bypass the Theme Wizard when a `.theme` file is selected.
    - Update the preview container to show the themed wallpaper and colors.
- **Basic Application**:
    - Implement the flow in `ThemeManager` to apply `[Control Panel\Colors]` and `[Control Panel\Desktop]` (Wallpaper) from the `.theme` file.
- **Verification**:
    - **Selection**: Select a `.theme` file in the "Desktop Themes" app; verify the preview updates immediately without showing the "Theme Wizard".
    - **Apply Colors**: Click "Apply" and verify the system colors (buttons, title bars, background) change to match the `.theme` file.
    - **Apply Wallpaper**: Verify the desktop wallpaper changes to the path specified in the `.theme` file.

## Phase 3: Assets Integration (Cursors & Sounds)
**Goal**: Enable themed mouse pointers and system sounds from ZenFS.

- **Asset Loading Logic**:
    - Implement a utility to resolve ZenFS paths to Blob URLs for use in the browser.
- **Sound Manager (`src/system/sound-manager.js`)**:
    - Update to support playing `.wav` files from ZenFS URLs.
- **Cursor Manager (`src/system/cursor-manager.js`)**:
    - Update to support applying `.cur` and `.ani` cursors from ZenFS URLs.
- **Verification**:
    - **Cursors**: Apply a theme with a custom `Arrow` cursor; verify the mouse pointer changes when hovering over the desktop.
    - **Sounds**: Apply a theme with a custom `Open` sound; verify the sound plays when opening an application (e.g., Notepad).
    - **Network Traffic**: Check the Network tab in DevTools to ensure assets are being loaded from `blob:` URLs.

## Phase 4: Shell Icons & Advanced Settings
**Goal**: Apply themed icons to system folders and implement advanced desktop settings.

- **Themed Icons**:
    - Update `src/shell/explorer/interface/file-icon-renderer.js` and `getThemedIconObj` to respect the icon paths defined in the current theme.
    - Handle Recycle Bin `full` and `empty` states.
- **Advanced Desktop Settings**:
    - Implement `Tilewallpaper` and `Pattern` support in the desktop background component.
    - Integrate `ScreenSaveActive` with the Screensaver manager.
- **Verification**:
    - **Desktop Icons**: Verify "My Computer" and "Network Neighborhood" icons on the desktop match the theme.
    - **Recycle Bin**: Delete a file and verify the Recycle Bin icon changes to the "full" version defined in the theme.
    - **Tiling**: Set a small image as wallpaper with `TileWallpaper=1` in the theme; verify it tiles across the desktop.

## Phase 5: Cleanup & Defaults
**Goal**: Finalize the system and remove legacy hardcoded data.

- **Remove Hardcoded Themes**:
    - Delete themes from `src/config/themes.js` (keeping only the "Default" fallback).
- **Final System Init**:
    - Ensure `/C:/Program Files/Plus!/Themes` is created during system boot.
- **Verification**:
    - **Regression Check**: Ensure no hardcoded themes (like "Dangerous Creatures") appear in the list anymore unless their `.theme` files are present in ZenFS.
    - **Default Fallback**: Delete all themes from ZenFS; verify the system still boots and functions correctly using the "Windows Default" theme.
