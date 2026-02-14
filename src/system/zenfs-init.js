import { resolveMountConfig, InMemory, fs } from "@zenfs/core";
import { IndexedDB, WebAccess } from "@zenfs/dom";
import {
  migrateToZenFS,
  refreshPrograms,
  PINNED_PATH,
  START_MENU_PATH,
  FAVORITES_PATH,
} from "../shell/start-menu/start-menu-utils.js";
import { migrateShortcuts } from "./migrate-shortcuts.js";
import startMenuConfig from "../config/start-menu.js";
import { getStartupApps } from "./startup-manager.js";
import { apps } from "../config/apps.js";
import { existsAsync } from "./zenfs-utils.js";
import { wallpapers } from "../config/wallpapers.js";
import { getAllDiskHandles, removeDiskHandle } from "./removable-disk-persistence.js";
import { RemovableDiskManager } from "../shell/explorer/drives/removable-disk-manager.js";
import { DriveService } from "./drive-service.js";

let isInitialized = false;

export async function initFileSystem(onProgress) {
  if (isInitialized) return;

  try {
    if (onProgress) onProgress("Mounting root...");
    // / is mounted by default, but we can re-mount it if needed or just skip
    // For now, let's just ensure we have our mounts.
    // If / is already mounted, we might need to unmount it first to use manual mount.
    try {
      fs.umount("/");
    } catch (e) {
      // Root might not be unmountable or not mounted
    }
    const rootFs = await resolveMountConfig(InMemory);
    fs.mount("/", rootFs);

    if (onProgress) onProgress("Mounting C: drive...");
    const cDriveFs = await resolveMountConfig({
      backend: IndexedDB,
      name: "win98-c-drive",
    });
    // Ensure C: mount point exists in root
    if (!(await existsAsync("/C:"))) {
      await fs.promises.mkdir("/C:");
    }
    fs.mount("/C:", cDriveFs);

    if (onProgress) onProgress("Checking system folders...");
    // Ensure A: and E: drive directory exists in the root
    if (!(await existsAsync("/A:"))) {
      await fs.promises.mkdir("/A:");
    }
    if (!(await existsAsync("/E:"))) {
      await fs.promises.mkdir("/E:");
    }

    // Ensure WINDOWS directory exists on C: for persistence
    if (!(await existsAsync("/C:/WINDOWS"))) {
      await fs.promises.mkdir("/C:/WINDOWS");
    }

    const wallpaperDir = "/C:/WINDOWS";
    let wallpapersNeeded = false;
    for (const w of wallpapers.default) {
      if (!(await existsAsync(`${wallpaperDir}/${w.filename}`))) {
        wallpapersNeeded = true;
        break;
      }
    }

    if (wallpapersNeeded) {
      for (const w of wallpapers.default) {
        const path = `${wallpaperDir}/${w.filename}`;
        if (!(await existsAsync(path))) {
          if (onProgress) onProgress(`Loading wallpaper: ${w.filename}...`);
          try {
            const response = await fetch(w.src);
            const buffer = await response.arrayBuffer();
            await fs.promises.writeFile(path, new Uint8Array(buffer));
          } catch (e) {
            console.error(`Failed to load wallpaper ${w.filename}:`, e);
          }
        }
      }
    }

    // Ensure Program Files/Doom exists
    if (!(await existsAsync("/C:/Program Files"))) {
      await fs.promises.mkdir("/C:/Program Files");
    }
    if (!(await existsAsync("/C:/Program Files/Doom"))) {
      await fs.promises.mkdir("/C:/Program Files/Doom");
    }

    const doomFiles = ["doom1.wad", "default.cfg"];
    const doomRemotePath = "games/doom/";
    const doomLocalPath = "/C:/Program Files/Doom/";

    let doomNeeded = false;
    for (const file of doomFiles) {
      if (!(await existsAsync(doomLocalPath + file))) {
        doomNeeded = true;
        break;
      }
    }

    if (doomNeeded) {
      for (const file of doomFiles) {
        if (!(await existsAsync(doomLocalPath + file))) {
          if (onProgress) onProgress(`Loading Doom game data: ${file}...`);
          try {
            const response = await fetch(doomRemotePath + file);
            const buffer = await response.arrayBuffer();
            await fs.promises.writeFile(
              doomLocalPath + file,
              new Uint8Array(buffer),
            );
          } catch (e) {
            console.error(`Failed to load Doom game data ${file}:`, e);
          }
        }
      }
    }
    // Ensure WINDOWS/Desktop directory exists for the Desktop shell extension
    if (!(await existsAsync("/C:/WINDOWS/Desktop"))) {
      await fs.promises.mkdir("/C:/WINDOWS/Desktop");
    }

    // Add default shortcuts to Desktop
    const defaultShortcuts = [
      { name: "buggyprogram.exe.lnk.json", appId: "buggy-program" },
      { name: "sheep.lnk.json", appId: "esheep" },
      { name: "Winamp.lnk.json", appId: "webamp" },
    ];

    for (const shortcut of defaultShortcuts) {
      const lnkPath = `/C:/WINDOWS/Desktop/${shortcut.name}`;
      if (!(await existsAsync(lnkPath))) {
        await fs.promises.writeFile(
          lnkPath,
          JSON.stringify(
            {
              type: "shortcut",
              appId: shortcut.appId,
            },
            null,
            2,
          ),
        );
      }
    }

    // Add Games folder to Desktop
    const gamesPath = "/C:/WINDOWS/Desktop/Games";
    if (!(await existsAsync(gamesPath))) {
      await fs.promises.mkdir(gamesPath);
    }

    const games = [
      { name: "Space Cadet Pinball.lnk.json", appId: "pinball" },
      { name: "Minesweeper.lnk.json", appId: "minesweeper" },
      { name: "Solitaire.lnk.json", appId: "solitaire" },
      { name: "Spider Solitaire.lnk.json", appId: "spider-solitaire" },
      { name: "FreeCell.lnk.json", appId: "freecell" },
      { name: "Commander Keen.lnk.json", appId: "keen" },
      { name: "Doom.lnk.json", appId: "doom" },
      { name: "SimCity 2000.lnk.json", appId: "sim-city-2000" },
      { name: "Diablo.lnk.json", appId: "diablo" },
      { name: "Quake.lnk.json", appId: "quake" },
      { name: "Prince of Persia.lnk.json", appId: "prince-of-persia" },
      { name: "Wolfenstein 3D.lnk.json", appId: "wolf3d" },
      { name: "Beneath a Steel Sky.lnk.json", appId: "sky" },
    ];

    for (const game of games) {
      const lnkPath = `${gamesPath}/${game.name}`;
      if (!(await existsAsync(lnkPath))) {
        await fs.promises.writeFile(
          lnkPath,
          JSON.stringify(
            {
              type: "shortcut",
              appId: game.appId,
            },
            null,
            2,
          ),
        );
      }
    }

    // Ensure My Documents directory exists
    if (!(await existsAsync("/C:/My Documents"))) {
      await fs.promises.mkdir("/C:/My Documents");
    }

    // Ensure Games directory exists on C:
    if (!(await existsAsync("/C:/Games"))) {
      await fs.promises.mkdir("/C:/Games");
    }

    // Install Wolfenstein 3D to C:\Games\WOLF3D if it doesn't exist
    if (!(await existsAsync("/C:/Games/WOLF3D"))) {
      if (onProgress) onProgress("Installing Wolfenstein 3D...");
      await fs.promises.mkdir("/C:/Games/WOLF3D", { recursive: true });
      const wolfFiles = [
        "AUDIOHED.WL6", "AUDIOT.WL6", "CONFIG.WL6", "GAMEMAPS.WL6",
        "MAPHEAD.WL6", "VGADICT.WL6", "VGAGRAPH.WL6", "VGAHEAD.WL6",
        "VSWAP.WL6", "WOLF3D.EXE"
      ];
      for (const file of wolfFiles) {
        try {
          const response = await fetch(`games/dos/wolf3d/${file}`);
          const buffer = await response.arrayBuffer();
          await fs.promises.writeFile(`/C:/Games/WOLF3D/${file}`, new Uint8Array(buffer));
        } catch (e) {
          console.error(`Failed to install ${file}:`, e);
        }
      }
    }

    // Install Beneath a Steel Sky to C:\Games\SKY if it doesn't exist
    if (!(await existsAsync("/C:/Games/SKY"))) {
      if (onProgress) onProgress("Installing Beneath a Steel Sky...");
      await fs.promises.mkdir("/C:/Games/SKY", { recursive: true });
      const skyFiles = ["SKY.DNR", "SKY.DSK", "SKY.EXE", "SKY.RST"];
      for (const file of skyFiles) {
        try {
          const response = await fetch(`games/dos/sky/${file}`);
          const buffer = await response.arrayBuffer();
          await fs.promises.writeFile(
            `/C:/Games/SKY/${file}`,
            new Uint8Array(buffer),
          );
        } catch (e) {
          console.error(`Failed to install ${file}:`, e);
        }
      }
    }

    // Install SimCity 2000 Demo to C:\Games\SC2000 if it doesn't exist
    if (!(await existsAsync("/C:/Games/SC2000"))) {
      if (onProgress) onProgress("Installing SimCity 2000 Demo...");
      await fs.promises.mkdir("/C:/Games/SC2000", { recursive: true });
      const sc2kFiles = [
        "DEMOCITY.SC2", "INFO.EXE", "INSTALL.EXE", "INSTALL.MXS",
        "MAXIS.CIM", "MW_ATIUP.EXE", "POSTCARD.CIM", "README.TXT",
        "SC2000.CFG", "SC2000.DAT", "SC2000.EXE", "START.COM",
        "VDETECT.EXE",
        "VESA/ATI/READ.ME", "VESA/ATI/VVESA1.COM", "VESA/ATI/VVESA2.COM",
        "VESA/CIRRUS/CLVESA.COM", "VESA/CIRRUS/CRUSVESA.COM", "VESA/CIRRUS/README.DOC",
        "VESA/COMPAQ/CPQVESA.EXE", "VESA/COMPAQ/README.VSA",
        "VESA/DIAMOND/24XVESA.EXE", "VESA/DIAMOND/READ.ME", "VESA/DIAMOND/VESA.EXE",
        "VESA/HEADLAND/HTVESA.COM", "VESA/HEADLAND/READ.ME",
        "VESA/IBM/READ.ME", "VESA/IBM/VESA.EXE", "VESA/IBM/XGAVESA.EXE",
        "VESA/OAK/67VESA.COM", "VESA/OAK/OAK-37.COM", "VESA/OAK/OAK-77.COM",
        "VESA/OAK/OTIVBE.COM", "VESA/OAK/OTIVESA.COM", "VESA/OAK/README.DOC",
        "VESA/PARADISE/PARADISE.EXE", "VESA/PARADISE/READ.ME", "VESA/PARADISE/VESA.EXE",
        "VESA/PARADISE/VESA1A1B.EXE", "VESA/PARADISE/VESA1C.EXE", "VESA/PARADISE/VESA1D.EXE", "VESA/PARADISE/VESAX.EXE",
        "VESA/TRIDENT/READ.ME", "VESA/TRIDENT/VESA.EXE",
        "VESA/TSENG/TLIVESA.COM", "VESA/TSENG/TLIVESA.DOC", "VESA/TSENG/TLIVESA1.COM",
        "VESA/UNIVESA/COPYRIGH", "VESA/UNIVESA/UNIVESA.DOC", "VESA/UNIVESA/UNIVESA.EXE",
        "VESA/VIDEO7/READ.ME", "VESA/VIDEO7/V7VESA.COM", "VESA/VIDEO7/V7WVGA.COM"
      ];
      for (const file of sc2kFiles) {
        try {
          const response = await fetch(`games/dos/simcity2000/${file}`);
          const buffer = await response.arrayBuffer();
          const targetPath = `/C:/Games/SC2000/${file}`;
          const targetDir = targetPath.substring(0, targetPath.lastIndexOf("/"));
          if (!(await existsAsync(targetDir))) {
            await fs.promises.mkdir(targetDir, { recursive: true });
          }
          await fs.promises.writeFile(targetPath, new Uint8Array(buffer));
        } catch (e) {
          console.error(`Failed to install ${file}:`, e);
        }
      }
    }

    if (onProgress) onProgress("Initializing Start Menu...");
    // Ensure PINNED_PATH exists (C:/WINDOWS/Start Menu)
    if (!(await existsAsync(PINNED_PATH))) {
      await fs.promises.mkdir(PINNED_PATH, { recursive: true });
    }

    // Ensure Windows Update shortcut exists in PINNED_PATH
    const updateLnkPath = `${PINNED_PATH}/Windows Update.lnk.json`;
    if (!(await existsAsync(updateLnkPath))) {
      await fs.promises.writeFile(
        updateLnkPath,
        JSON.stringify(
          {
            type: "shortcut",
            appId: "windows-update",
          },
          null,
          2,
        ),
      );
    }

    // Cleanup old About shortcut
    const aboutLnkPath = `${PINNED_PATH}/About.lnk.json`;
    if (await existsAsync(aboutLnkPath)) {
      try {
        await fs.promises.unlink(aboutLnkPath);
      } catch (e) {
        console.warn("Failed to remove old About shortcut:", e);
      }
    }

    if (!(await existsAsync(START_MENU_PATH))) {
      if (onProgress) onProgress("Populating Programs menu...");
      await refreshPrograms();

      // Migrate startup apps from localStorage to ZenFS
      const startupApps = await getStartupApps();
      if (startupApps.length > 0) {
        const startupPath = `${START_MENU_PATH}/StartUp`;
        if (!(await existsAsync(startupPath))) {
          await fs.promises.mkdir(startupPath, { recursive: true });
        }
        for (const appId of startupApps) {
          const app = apps.find((a) => a.id === appId);
          const label = app ? app.title : appId;
          const lnkPath = `${startupPath}/${label}.lnk.json`;
          if (!(await existsAsync(lnkPath))) {
            await fs.promises.writeFile(
              lnkPath,
              JSON.stringify(
                {
                  type: "shortcut",
                  appId: appId,
                },
                null,
                2,
              ),
            );
          }
        }
      }
    }

    if (!(await existsAsync("/C:/.shortcuts_migrated"))) {
      if (onProgress) onProgress("Migrating shortcuts...");
      await migrateShortcuts("/C:");
      await fs.promises.writeFile("/C:/.shortcuts_migrated", "done");
    }

    if (onProgress) onProgress("Initializing Favorites...");
    if (!(await existsAsync(FAVORITES_PATH))) {
      const favoritesConfig = startMenuConfig.find(
        (item) => item.label === "Favorites",
      );
      if (favoritesConfig && favoritesConfig.submenu) {
        await migrateToZenFS(favoritesConfig.submenu, FAVORITES_PATH);
      }
    }

    if (onProgress) onProgress("Restoring removable disks...");
    try {
      const savedHandles = await getAllDiskHandles();
      for (const [letter, handle] of Object.entries(savedHandles)) {
        const mountPoint = `/${letter}:`;
        try {
          if (!(await existsAsync(mountPoint))) {
            await fs.promises.mkdir(mountPoint);
          }
          const diskFs = await WebAccess.create({ handle });
          fs.mount(mountPoint, diskFs);

          // Accessibility check
          await fs.promises.readdir(mountPoint);

          RemovableDiskManager.mount(letter, handle.name);
          console.log(`Restored removable disk ${letter}: (${handle.name})`);
        } catch (e) {
          console.warn(`Failed to restore removable disk ${letter}:`, e);
          // Clean up if it failed to mount or is inaccessible
          try {
            if (mounts.has(mountPoint)) {
              fs.umount(mountPoint);
            }
          } catch (umountErr) {}

          try {
            if (await existsAsync(mountPoint)) {
              await fs.promises.rmdir(mountPoint);
            }
          } catch (rmdirErr) {}

          await removeDiskHandle(letter);
          RemovableDiskManager.unmount(letter);
        }
      }
    } catch (e) {
      console.error("Failed to load persisted removable disks:", e);
    }

    isInitialized = true;
    window.fs = fs; // Expose for debugging
    console.log("ZenFS initialized successfully.");
  } catch (error) {
    console.error("Failed to initialize ZenFS:", error);
    throw error;
  }
}
