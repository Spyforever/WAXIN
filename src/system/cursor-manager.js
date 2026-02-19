import { convertAniBinaryToCSS } from "ani-cursor";
import { cursors, getCursorThemes, CursorScheme } from '../config/cursors.js';
import { getCursorSchemeId, getActiveTheme } from './theme-manager.js';
import { isZenFSPath, getZenFSFileUrl } from './zenfs-utils.js';

const styleMap = new Map();

export async function applyAniCursorTheme(theme, cursorType) {
  // `cursorType` directly corresponds to the key in the cursors object (e.g., 'busy', 'wait')
  let cursorUrl = null;
  const activeTheme = getActiveTheme();

  if (activeTheme?.id === theme && activeTheme?.isZenFS && activeTheme.cursors) {
    // Map internal types to Windows role names
    const typeToRole = {
      busy: "Busy",
      wait: "WorkingInBackground",
    };
    const role = typeToRole[cursorType] || cursorType;
    cursorUrl = activeTheme.cursors[role];
    if (cursorUrl && isZenFSPath(cursorUrl)) {
      cursorUrl = await getZenFSFileUrl(cursorUrl);
    }
  }

  if (!cursorUrl) {
    const scheme = cursors[theme] || cursors.default;
    cursorUrl = scheme?.getCursor(cursorType);
  }

  if (!cursorUrl) {
    console.warn(
      `Animated cursor not found for theme: ${theme}, type: ${cursorType}. No default fallback.`,
    );
    return;
  }

  try {
    const response = await fetch(cursorUrl);
    if (!response.ok) throw new Error(`Failed to fetch cursor: ${response.statusText}`);
    const data = new Uint8Array(await response.arrayBuffer());

    // Use a unique ID for the style element to manage it easily
    const styleId = `ani-cursor-style-${theme}-${cursorType}`;
    let style = document.getElementById(styleId);

    if (!style) {
      style = document.createElement("style");
      style.id = styleId;
      document.head.appendChild(style);
    }

    let css = convertAniBinaryToCSS(`.cursor-${cursorType}`, data);
    // Force the animated cursor to take precedence over any other cursor declarations
    // by adding !important to all cursor properties in the generated CSS.
    css = css.replace(/cursor:[^;!]+;/g, (match) => match.replace(";", " !important;"));
    style.innerText = css;
    styleMap.set(`.cursor-${cursorType}`, style);
  } catch (error) {
    console.error("Failed to apply animated cursor:", error);
  }
}

export function clearAniCursor() {
  for (const [selector, style] of styleMap.entries()) {
    if (style && style.parentNode) {
      style.parentNode.removeChild(style);
    }
    styleMap.delete(selector);
    // Also reset the cursor property on the element
    // document.querySelector(selector).style.cursor = '';
  }
}

/**
 * Applies a busy/wait cursor to a specific element.
 * @param {HTMLElement} [element=document.body] - The element to apply the cursor to.
 */
export function applyBusyCursor(element = document.body) {
  element.classList.add("cursor-busy");
  element.style.cursor = "var(--cursor-wait, wait)";
}

/**
 * Clears the busy/wait cursor from a specific element.
 * @param {HTMLElement} [element=document.body] - The element to clear the cursor from.
 */
export function clearBusyCursor(element = document.body) {
  // Use a short timeout to prevent the cursor from reverting too quickly,
  // ensuring the browser has time to render the change.
  setTimeout(() => {
    element.classList.remove("cursor-busy");
    // Revert to the default cursor for the body, or let other elements inherit.
    if (element === document.body) {
      element.style.cursor = "var(--cursor-default, default)";
    } else {
      element.style.cursor = "";
    }
  }, 50);
}

/**
 * Applies a wait/progress cursor to a specific element.
 * @param {HTMLElement} [element=document.body] - The element to apply the cursor to.
 */
export function applyWaitCursor(element = document.body) {
  element.classList.add("cursor-wait");
  element.style.cursor = "var(--cursor-progress, progress)";
}

/**
 * Clears the wait/progress cursor from a specific element.
 * @param {HTMLElement} [element=document.body] - The element to clear the cursor from.
 */
export function clearWaitCursor(element = document.body) {
  setTimeout(() => {
    element.classList.remove("cursor-wait");
    if (element === document.body) {
      element.style.cursor = "var(--cursor-default, default)";
    } else {
      element.style.cursor = "";
    }
  }, 50);
}

export async function applyCursorTheme() {
  const themeId = getCursorSchemeId();
  const root = document.documentElement;
  const activeTheme = getActiveTheme();

  let themeConfig = null;

  if (activeTheme?.id === themeId && activeTheme?.isZenFS && activeTheme.cursors) {
    // Create a dynamic CursorScheme from ZenFS cursors
    const mappedCursors = {
      arrow: activeTheme.cursors["Arrow"],
      beam: activeTheme.cursors["IBeam"],
      busy: activeTheme.cursors["Busy"],
      wait: activeTheme.cursors["WorkingInBackground"],
      help: activeTheme.cursors["Help"],
      move: activeTheme.cursors["SizeAll"],
      no: activeTheme.cursors["No"],
      cross: activeTheme.cursors["Crosshair"],
      sizeNESW: activeTheme.cursors["SizeNESW"],
      sizeNS: activeTheme.cursors["SizeNS"],
      sizeNWSE: activeTheme.cursors["SizeNWSE"],
      sizeWE: activeTheme.cursors["SizeWE"],
      pen: activeTheme.cursors["Handwriting"],
      up: activeTheme.cursors["UpArrow"],
      hand: activeTheme.cursors["Hand"],
    };

    // Resolve ZenFS paths to URLs and preserve animation state
    for (const key in mappedCursors) {
      const originalPath = mappedCursors[key];
      if (originalPath && isZenFSPath(originalPath)) {
        const url = await getZenFSFileUrl(originalPath);
        const animated = originalPath.toLowerCase().endsWith(".ani");
        mappedCursors[key] = { path: url, animated };
      }
    }

    const scheme = new CursorScheme(themeId, mappedCursors);
    themeConfig = scheme.getCSSVariables();
  }

  if (!themeConfig) themeConfig = getCursorThemes(themeId);
  if (!themeConfig) themeConfig = getCursorThemes("default");

  if (themeConfig) {
    for (const [property, config] of Object.entries(themeConfig)) {
      if (config.animated) {
        applyAniCursorTheme(themeId, config.type);
      } else {
        root.style.setProperty(property, config.value);
      }
    }
  } else {
    clearAniCursor();
    // Assuming getCursorThemes returns an array of property names on failure, which seems unlikely.
    // This part might need adjustment based on the actual return value.
    const defaultCursorProperties = getCursorThemes("default")
      ? Object.keys(getCursorThemes("default"))
      : [];
    for (const property of defaultCursorProperties) {
      root.style.removeProperty(property);
    }
  }
}
