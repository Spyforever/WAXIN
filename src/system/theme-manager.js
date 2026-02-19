import {
  getItem,
  setItem,
  removeItem,
  LOCAL_STORAGE_KEYS,
} from './local-storage.js';
import { fs } from "@zenfs/core";
import { existsAsync, resolveCaseInsensitivePath } from "./zenfs-utils.js";
import { themes } from '../config/themes.js';
import { colorSchemes } from '../config/color-schemes.js';
import { applyCursorTheme } from './cursor-manager.js';
import {
  requestBusyState,
  releaseBusyState,
} from './busy-state-manager.js';
import { preloadThemeAssets } from './asset-preloader.js';
import screensaverManager from './screensaver-utils.js';

let parserPromise = null;
let activeTheme = null; // In-memory cache to avoid repeated localStorage access
let zenFSThemes = {};

export function loadThemeParser() {
  if (!parserPromise) {
    parserPromise = new Promise((resolve, reject) => {
      // Check for a version marker to ensure we have the updated parser
      if (window.__THEME_PARSER_VERSION__ >= 4) {
        return resolve();
      }
      const script = document.createElement("script");
      script.src = "./os-gui/parse-theme.js?v=" + Date.now();
      script.onload = resolve;
      script.onerror = () => {
        parserPromise = null; // Reset on error
        reject(new Error("Failed to load theme parser."));
      };
      document.head.appendChild(script);
    });
  }
  return parserPromise;
}

export function getCustomThemes() {
  return getItem(LOCAL_STORAGE_KEYS.CUSTOM_THEMES) || {};
}

export function saveCustomTheme(themeId, themeData) {
  const customThemes = getCustomThemes();
  customThemes[themeId] = themeData;
  setItem(LOCAL_STORAGE_KEYS.CUSTOM_THEMES, customThemes);
  document.dispatchEvent(new CustomEvent("custom-themes-changed"));
}

export function deleteCustomTheme(themeId) {
  const customThemes = getCustomThemes();
  delete customThemes[themeId];
  setItem(LOCAL_STORAGE_KEYS.CUSTOM_THEMES, customThemes);
  document.dispatchEvent(new CustomEvent("custom-themes-changed"));
}

export async function loadThemesFromZenFS() {
  const themesPathRequested = "/C:/Program Files/Plus!/Themes";
  try {
    await loadThemeParser();

    const themesPath = await resolveCaseInsensitivePath(themesPathRequested);
    if (!themesPath || !(await existsAsync(themesPath))) {
      console.warn("Themes directory not found:", themesPathRequested);
      return {};
    }
    const files = await fs.promises.readdir(themesPath);
    const themeFiles = files.filter((f) => f.toLowerCase().endsWith(".theme"));

    if (themeFiles.length > 0) {
      const foundIds = new Set();
      for (const file of themeFiles) {
        const fullPath = `${themesPath}/${file}`;
        const themeId = `zenfs-${file.toLowerCase().replace(/\.theme$/i, "")}`;
        foundIds.add(themeId);

        if (!zenFSThemes[themeId]) {
          // Basic info for the list. We'll parse fully on selection/application.
          zenFSThemes[themeId] = {
            id: themeId,
            name: file.replace(/\.theme$/i, ""),
            path: fullPath,
            isZenFS: true,
          };
        } else {
          // Update path in case it changed (e.g. parent folder casing changed)
          zenFSThemes[themeId].path = fullPath;
        }
      }

      // Remove themes that no longer exist, but keep 'custom'
      for (const id in zenFSThemes) {
        if (id !== "custom" && id.startsWith("zenfs-") && !foundIds.has(id)) {
          delete zenFSThemes[id];
        }
      }
    }

    return zenFSThemes;
  } catch (error) {
    console.error("Failed to load themes from ZenFS:", error);
    return {};
  }
}

export function getThemes() {
  const customThemes = getCustomThemes();
  return { ...themes, ...customThemes, ...zenFSThemes };
}

export function getColorSchemes() {
  return colorSchemes;
}

// Gets the full theme object from localStorage, with a fallback to default.
// Gets the ID of the base active theme.
export function getActiveThemeId() {
  return getItem(LOCAL_STORAGE_KEYS.ACTIVE_THEME) || "default";
}

// Gets the full theme object for the base active theme.
export function getActiveTheme() {
  const allThemes = getThemes();
  const activeId = getActiveThemeId();
  const theme = allThemes[activeId];
  if (theme) return theme;

  // If it's a ZenFS theme that hasn't been discovered yet, we might need to trigger discovery
  // But discovery is async and this function is sync.
  // We'll return default for now but apps should call loadThemesFromZenFS on start.
  return themes.default;
}

// --- Individual Scheme Getters with Overrides ---

export function getColorSchemeId() {
  return getItem(LOCAL_STORAGE_KEYS.COLOR_SCHEME) || getActiveThemeId();
}

export function getSoundSchemeName() {
  return (
    getItem(LOCAL_STORAGE_KEYS.SOUND_SCHEME) || getActiveTheme().soundScheme
  );
}

export function getIconSchemeName() {
  return (
    getItem(LOCAL_STORAGE_KEYS.ICON_SCHEME) || getActiveTheme().iconScheme
  );
}

export function getCursorSchemeId() {
  return (
    getItem(LOCAL_STORAGE_KEYS.CURSOR_SCHEME) || getActiveThemeId()
  );
}

// Deprecated: for components that still use it. Should be phased out.
export function getCurrentTheme() {
  return getActiveThemeId();
}

function applyStylesheet(themeId, cssContent) {
  const styleId = `${themeId}-theme-styles`;
  let styleEl = document.getElementById(styleId);
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = cssContent;
}

function removeStylesheet(themeId) {
  const styleId = `${themeId}-theme-styles`;
  const styleEl = document.getElementById(styleId);
  if (styleEl) {
    styleEl.remove();
  }
}

export async function applyTheme() {
  const allThemes = getThemes();
  const allColorSchemes = getColorSchemes();
  const colorSchemeId = getColorSchemeId();
  const cursorSchemeId = getCursorSchemeId();
  const colorScheme = allColorSchemes[colorSchemeId];
  const customThemeForColors = allThemes[colorSchemeId];

  // --- Cleanup Phase ---
  // Remove all previously injected style tags
  Object.keys(allColorSchemes).forEach(removeStylesheet);
  const customThemes = getCustomThemes();
  Object.keys(customThemes).forEach(removeStylesheet);
  removeStylesheet("custom"); // For temporary themes

  // --- Application Phase ---
  await applyCursorTheme(cursorSchemeId);

  // Handle built-in color schemes
  if (colorScheme && colorScheme.loader) {
    try {
      const cssModule = await colorScheme.loader();
      applyStylesheet(colorSchemeId, cssModule.default);
    } catch (error) {
      console.error(`Failed to load color scheme "${colorSchemeId}":`, error);
      // Fallback to default if loading fails
      const defaultScheme = allColorSchemes["default"];
      if (defaultScheme && defaultScheme.loader) {
        const cssModule = await defaultScheme.loader();
        applyStylesheet("default", cssModule.default);
      }
    }
  } else if (customThemeForColors) {
    // It's a custom, temporary, or ZenFS theme.
    if (customThemeForColors.isZenFS && !customThemeForColors.colors) {
      await parseZenFSTheme(customThemeForColors);
    }

    if (customThemeForColors.colors) {
      await loadThemeParser();
      if (window.makeThemeCSSFile) {
        const cssContent = window.makeThemeCSSFile(customThemeForColors.colors);
        const styleId = customThemeForColors.id === "custom" ? "custom" : customThemeForColors.id;
        applyStylesheet(styleId, cssContent);
      }
    }
  } else {
    // Fallback for default or if nothing is found
    const defaultScheme = allColorSchemes["default"];
    if (defaultScheme && defaultScheme.loader) {
      try {
        const cssModule = await defaultScheme.loader();
        applyStylesheet("default", cssModule.default);
      } catch (error) {
        console.error("Failed to load default color scheme:", error);
      }
    }
  }
}

export async function setColorScheme(schemeId) {
  const setColorSchemeId = `set-color-scheme-${Date.now()}`;
  requestBusyState(setColorSchemeId, document.body);
  try {
    const allSchemes = getColorSchemes();
    const allThemes = getThemes(); // For custom themes
    if (!allSchemes[schemeId] && !allThemes[schemeId]?.colors) {
      console.error(`Color scheme with key "${schemeId}" not found.`);
      releaseBusyState(setColorSchemeId, document.body);
      return;
    }
    setItem(LOCAL_STORAGE_KEYS.COLOR_SCHEME, schemeId);
    await applyTheme();
    document.dispatchEvent(new CustomEvent("theme-changed"));
  } finally {
    releaseBusyState(setColorSchemeId, document.body);
  }
}

export async function setCursorScheme(schemeId) {
  setItem(LOCAL_STORAGE_KEYS.CURSOR_SCHEME, schemeId);
  await applyTheme();
  document.dispatchEvent(new CustomEvent("theme-changed"));
}

export function setSoundScheme(schemeName) {
  setItem(LOCAL_STORAGE_KEYS.SOUND_SCHEME, schemeName);
  document.dispatchEvent(new CustomEvent("theme-changed"));
}

export async function applyCustomColorScheme(colorObject) {
  if (!colorObject) {
    console.error("applyCustomColorScheme received an invalid color object.");
    return;
  }

  const applyCustomId = `apply-custom-color-scheme-${Date.now()}`;
  requestBusyState(applyCustomId, document.body);
  try {
    await loadThemeParser();
    if (window.makeThemeCSSFile) {
      const cssContent = window.makeThemeCSSFile(colorObject);
      applyStylesheet("custom", cssContent);
    }

    // Update the 'custom' theme object with the new colors
    const allThemes = getThemes();
    const currentCustom = allThemes["custom"] || allThemes["default"];
    saveCustomTheme("custom", {
      ...currentCustom,
      id: "custom",
      colors: colorObject,
      isCustom: true,
    });

    // Set a temporary key in localStorage so other parts of the system
    // know that a custom, non-saved theme is active.
    setItem(LOCAL_STORAGE_KEYS.COLOR_SCHEME, "custom");
    document.dispatchEvent(new CustomEvent("theme-changed"));
  } finally {
    releaseBusyState(applyCustomId, document.body);
  }
}

export async function parseZenFSTheme(theme) {
  if (!theme.isZenFS || theme.colors) return theme;

  const content = await fs.promises.readFile(theme.path, "utf8");
  const themeDir = theme.path.substring(0, theme.path.lastIndexOf("/"));
  await loadThemeParser();

  const colorsRaw = window.getColorsFromThemeFile(content) || {};
  const colors = window.generateThemePropertiesFromColors(colorsRaw);
  const icons = await window.getIconsFromThemeFile(content, themeDir);
  const cursors = await window.getCursorsFromThemeFile(content, themeDir);
  const desktop = await window.getDesktopConfigFromThemeFile(content, themeDir);
  const sounds = await window.getSoundsFromThemeFile(content, themeDir);

  const parsedTheme = {
    ...theme,
    colors,
    icons,
    cursors,
    wallpaper: desktop?.wallpaper,
    desktopConfig: desktop,
    sounds,
    iconScheme: theme.id,
    soundScheme: theme.id,
  };

  // Update cache
  if (theme.id && zenFSThemes[theme.id]) {
    zenFSThemes[theme.id] = parsedTheme;
  }

  return parsedTheme;
}

export async function setTheme(themeKey, themeData = null) {
  const setThemeId = `set-theme-${Date.now()}`;
  requestBusyState(setThemeId, document.body);
  try {
    const allThemes = getThemes();
    let newTheme = themeData || allThemes[themeKey];

    if (!newTheme) {
      console.error(`Theme with key "${themeKey}" not found.`);
      return;
    }

    if (themeKey === "custom" && themeData) {
      // Persist the custom theme so it survives reload
      saveCustomTheme("custom", {
        ...themeData,
        id: "custom",
        isCustom: true
      });
    }

    if (newTheme.isZenFS) {
      newTheme = await parseZenFSTheme(newTheme);
    }

    // Set the master theme key
    setItem(LOCAL_STORAGE_KEYS.ACTIVE_THEME, themeKey);

    // Set individual components, clearing any previous overrides
    setItem(LOCAL_STORAGE_KEYS.COLOR_SCHEME, themeKey);
    setItem(LOCAL_STORAGE_KEYS.SOUND_SCHEME, newTheme.soundScheme || (newTheme.isZenFS ? themeKey : "Default"));
    setItem(LOCAL_STORAGE_KEYS.ICON_SCHEME, newTheme.iconScheme || (newTheme.isZenFS ? themeKey : "default"));
    setItem(LOCAL_STORAGE_KEYS.CURSOR_SCHEME, themeKey);

    if (newTheme.wallpaper) {
      setItem(LOCAL_STORAGE_KEYS.WALLPAPER, newTheme.wallpaper);
    } else {
      removeItem(LOCAL_STORAGE_KEYS.WALLPAPER);
    }

    if (newTheme.desktopConfig) {
      const { tileWallpaper, wallpaperStyle } = newTheme.desktopConfig;
      let mode = "tile";
      if (tileWallpaper === "0") {
        mode = wallpaperStyle === "2" ? "stretch" : "center";
      }
      setItem(LOCAL_STORAGE_KEYS.WALLPAPER_MODE, mode);
    }

    if (newTheme.screensaver || newTheme.desktopConfig?.screenSaveActive) {
      screensaverManager.setCurrentScreensaver(newTheme.screensaver || "default");
    }

    await preloadThemeAssets(themeKey);
    await applyTheme();

    // Notify components to update
    document.dispatchEvent(new CustomEvent("wallpaper-changed"));
    document.dispatchEvent(new CustomEvent("theme-changed"));
  } finally {
    releaseBusyState(setThemeId, document.body);
  }
}
