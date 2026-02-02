import { fs } from "@zenfs/core";
import { apps } from "../config/apps.js";
import { launchApp } from "./appManager.js";
import { ICONS } from "../config/icons.js";
import { getAssociation } from "./directory.js";

export const START_MENU_PATH = "/C:/WINDOWS/Start Menu/Programs";
export const FAVORITES_PATH = "/C:/WINDOWS/Favorites";

/**
 * Checks if a path exists using async stat
 * @param {string} path
 * @returns {Promise<boolean>}
 */
async function existsAsync(path) {
  try {
    await fs.promises.stat(path);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Migrates a menu configuration to ZenFS as directories and .lnk files
 * @param {Array} config - The submenu config array
 * @param {string} targetPath - The ZenFS path to migrate to
 */
export async function migrateToZenFS(config, targetPath) {
  if (!(await existsAsync(targetPath))) {
    await fs.promises.mkdir(targetPath, { recursive: true });
  }

  for (const item of config) {
    if (item.submenu) {
      const dirPath = `${targetPath}/${item.label}`;
      if (!(await existsAsync(dirPath))) {
        await fs.promises.mkdir(dirPath, { recursive: true });
      }
      await migrateToZenFS(item.submenu, dirPath);
    } else if (item.appId) {
      // Create a shortcut
      const lnkPath = `${targetPath}/${item.label}.lnk`;
      const lnkData = {
        type: "shortcut",
        appId: item.appId,
        args: item.args || null,
      };
      await fs.promises.writeFile(lnkPath, JSON.stringify(lnkData, null, 2));
    } else if (item.label === "Windows Explorer") {
        // Special case for Windows Explorer which has an action but no appId in config
        const lnkPath = `${targetPath}/${item.label}.lnk`;
        const lnkData = {
          type: "shortcut",
          appId: "my-computer",
        };
        await fs.promises.writeFile(lnkPath, JSON.stringify(lnkData, null, 2));
    }
  }
}

/**
 * Reads a .lnk file and returns a menu item action
 * @param {string} path - Path to the .lnk file
 * @returns {Promise<Object>} Menu item properties
 */
export async function loadLnk(path) {
  try {
    const filename = path.split("/").pop();
    const label = filename.replace(".lnk", "");
    const content = await fs.promises.readFile(path, "utf8");
    const data = JSON.parse(content);
    const app = apps.find((a) => a.id === data.appId);

    return {
      label: label,
      icon: app ? app.icon[16] : ICONS.file[16],
      action: () => launchApp(data.appId, data.args),
    };
  } catch (error) {
    console.error(`Failed to load shortcut: ${path}`, error);
    return null;
  }
}

/**
 * Recursively builds a menu structure from a ZenFS directory
 * @param {string} path - The ZenFS directory path
 * @returns {Promise<Array>} Array of menu items
 */
export async function getMenuFromZenFS(path) {
  try {
    if (!(await existsAsync(path))) {
      return [];
    }

    const files = await fs.promises.readdir(path);
    const menuItems = [];

    for (const file of files) {
      if (file === ".zen_layout.json" || file === ".metadata.json") continue;

      const fullPath = `${path}/${file}`;
      const stat = await fs.promises.stat(fullPath);

      if (stat.isDirectory()) {
        menuItems.push({
          label: file,
          icon: ICONS.programs[16],
          submenu: await getMenuFromZenFS(fullPath),
        });
      } else if (file.endsWith(".lnk")) {
        const item = await loadLnk(fullPath);
        if (item) {
          menuItems.push(item);
        }
      } else {
        // Handle regular files as notepad associations
        const association = getAssociation(file);
        menuItems.push({
            label: file,
            icon: association.icon[16],
            action: () => launchApp(association.appId, fullPath)
        });
      }
    }

    // Sort: directories first, then alphabetically
    return menuItems.sort((a, b) => {
      const aIsDir = !!a.submenu;
      const bIsDir = !!b.submenu;
      if (aIsDir && !bIsDir) return -1;
      if (!aIsDir && bIsDir) return 1;
      return a.label.localeCompare(b.label);
    });
  } catch (error) {
    console.error(`Failed to read menu from ZenFS: ${path}`, error);
    return [];
  }
}
