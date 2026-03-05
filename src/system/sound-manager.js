import { soundSchemes } from '../config/sound-schemes.js';
import { getSoundSchemeName, getActiveTheme } from './theme-manager.js';
import { getItem, setItem, LOCAL_STORAGE_KEYS } from './local-storage.js';
import { isZenFSPath, getZenFSFileUrl } from './zenfs-utils.js';

let globalVolume = getItem(LOCAL_STORAGE_KEYS.VOLUME) ?? 1.0;
let globalMuted = getItem(LOCAL_STORAGE_KEYS.MUTED) ?? false;

/**
 * Gets the current system volume (0.0 to 1.0).
 */
export function getVolume() {
  return globalVolume;
}

/**
 * Sets the system volume.
 * @param {number} volume - Volume from 0.0 to 1.0.
 */
export function setVolume(volume) {
  globalVolume = Math.max(0, Math.min(1, volume));
  setItem(LOCAL_STORAGE_KEYS.VOLUME, globalVolume);
  // Dispatch event for other components to react
  document.dispatchEvent(new CustomEvent('system-volume-change', { detail: { volume: globalVolume, muted: globalMuted } }));
}

/**
 * Gets the current muted state.
 */
export function getMuted() {
  return globalMuted;
}

/**
 * Sets the muted state.
 * @param {boolean} muted
 */
export function setMuted(muted) {
  globalMuted = muted;
  setItem(LOCAL_STORAGE_KEYS.MUTED, globalMuted);
  // Dispatch event for other components to react
  document.dispatchEvent(new CustomEvent('system-volume-change', { detail: { volume: globalVolume, muted: globalMuted } }));
}

/**
 * Plays a sound based on the given event name and the current sound scheme.
 * @param {string} eventName - The name of the sound event to play.
 * @returns {Promise<void>} A promise that resolves when the sound has finished playing.
 */
export function playSound(eventName) {
  return new Promise(async (resolve) => {
    if (globalMuted) {
      resolve();
      return;
    }

    let soundUrl = null;
    const activeTheme = getActiveTheme();

    if (activeTheme?.isZenFS && activeTheme.sounds) {
      // Check .Default and Explorer apps for the event
      soundUrl = activeTheme.sounds[".Default"]?.[eventName] ||
                 activeTheme.sounds["Explorer"]?.[eventName];

      if (soundUrl && isZenFSPath(soundUrl)) {
        try {
          soundUrl = await getZenFSFileUrl(soundUrl);
        } catch (e) {
          console.error("Failed to resolve ZenFS sound path:", soundUrl, e);
          soundUrl = null;
        }
      }
    }

    if (!soundUrl) {
      const schemeName = getSoundSchemeName();
      const currentScheme = soundSchemes[schemeName];

      // Determine the sound file url using the class method which handles fallbacks
      soundUrl = currentScheme?.getSound(eventName) || soundSchemes.Default?.getSound(eventName);
    }

    // If no sound was found after all checks, resolve immediately.
    if (!soundUrl) {
      resolve();
      return;
    }

    const audio = new Audio(soundUrl);
    audio.volume = globalVolume;
    audio.addEventListener("ended", () => resolve());
    audio.addEventListener("error", (e) => {
      console.error("Error playing sound:", e);
      resolve(); // Resolve even on error to not block startup
    });
    audio.play().catch((e) => {
      console.error("Error playing sound:", e);
      resolve(); // Resolve even on error to not block startup
    });
  });
}
