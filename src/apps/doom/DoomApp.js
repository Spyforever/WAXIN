import { Application } from "../Application.js";
import { ICONS } from "../../config/icons.js";
import { fs } from "@zenfs/core";
import { Emscripten } from "@zenfs/emscripten";

export class DoomApp extends Application {
  static config = {
    id: "doom",
    title: "Doom",
    description: "Play the classic game Doom.",
    icon: ICONS.doom,
    width: 640,
    height: 400,
    resizable: true,
    maximizable: true,
    isSingleton: true,
  };

  constructor(config) {
    super(config);
    this.module = null;
    this.isMounted = false;
  }

  async _createWindow() {
    const win = new window.$Window({
      title: this.title,
      outerWidth: this.width,
      outerHeight: this.height,
      resizable: this.resizable,
      maximizable: this.maximizable,
      icons: this.icon,
    });

    const canvas = document.createElement("canvas");
    canvas.id = "canvas";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.backgroundColor = "black";
    canvas.style.display = "block";
    // Prevent context menu on canvas
    canvas.oncontextmenu = (e) => e.preventDefault();
    // Allow focus for keyboard input
    canvas.tabIndex = -1;

    win.$content.append(canvas);

    this.win = win;
    return win;
  }

  async _onLaunch() {
    const canvas = this.win.$content.find("canvas")[0];

    // Clean up any existing script/module before fresh launch
    this._cleanupModule();

    // Ensure we don't have multiple canvases with same ID causing trouble
    // although we just created a unique one, some engines might hardcode searches

    // Prepare Emscripten Module
    window.Module = {
      canvas: canvas,
      noInitialRun: true,
      print: (text) => console.log(text),
      printErr: (text) => console.error(text),
      locateFile: (path) => {
        if (path.endsWith(".wasm")) return "games/doom/websockets-doom.wasm";
        return path;
      },
      onRuntimeInitialized: async () => {
        await this._setupFileSystem();
        this._startGame();
      },
    };

    this.module = window.Module;

    // Load Doom script
    const script = document.createElement("script");
    script.id = "doom-script";
    // Use cache buster to ensure re-execution
    script.src = `games/doom/websockets-doom.js?v=${Date.now()}`;
    document.body.appendChild(script);

    this.win.focus();
    canvas.focus();
  }

  async _setupFileSystem() {
    const FS = this.module.FS;
    const baseLocalPath = "/C:/Program Files/Doom";

    if (this.isMounted) {
      try {
        fs.umount(baseLocalPath);
        this.isMounted = false;
      } catch (e) {}
    }

    // 1. Load all persistent files from ZenFS back into Emscripten MEMFS
    try {
      const loadRecursive = async (localPath, emPath) => {
        const entries = await fs.promises.readdir(localPath);
        for (const entry of entries) {
          const fullLocalPath = `${localPath}/${entry}`;
          const fullEmPath = emPath === "/" ? `/${entry}` : `${emPath}/${entry}`;
          const stat = await fs.promises.stat(fullLocalPath);
          if (stat.isDirectory()) {
            try { FS.mkdir(fullEmPath); } catch(e) {}
            await loadRecursive(fullLocalPath, fullEmPath);
          } else {
            const data = await fs.promises.readFile(fullLocalPath);
            FS.writeFile(fullEmPath, new Uint8Array(data));
          }
        }
      };
      await loadRecursive(baseLocalPath, "/");
    } catch (e) {
      console.warn("Failed to load persistent files from ZenFS:", e);
    }

    // 3. Mount Emscripten FS to ZenFS folder
    try {
      const emscriptenFS = Emscripten.create({ FS: FS });
      fs.mount(baseLocalPath, emscriptenFS);
      this.isMounted = true;
      // Dispatch event to refresh explorer
      document.dispatchEvent(new CustomEvent("zen-fs-change", { detail: { path: baseLocalPath } }));
    } catch (e) {
      console.error("Failed to mount Emscripten FS:", e);
    }
  }

  _startGame() {
    const commonArgs = [
      "-iwad", "doom1.wad",
      "-window",
      "-nogui",
      "-nomusic",
      "-config", "default.cfg",
      "-servername", "doomflare",
    ];
    if (typeof window.callMain === "function") {
      window.callMain(commonArgs);
    } else if (this.module.callMain) {
      this.module.callMain(commonArgs);
    }
  }

  async _onClose() {
    if (this.module) {
      if (this.module.pauseMainLoop) {
        this.module.pauseMainLoop();
      }
      // Try to stop audio if SDL is used
      if (window.SDL && window.SDL.audioContext) {
        window.SDL.audioContext.suspend();
      }
    }

    if (this.isMounted) {
      const baseLocalPath = "/C:/Program Files/Doom";
      const FS = this.module.FS;

      // 1. Sync files from Emscripten to memory recursively
      const syncData = [];
      const collectFiles = (path) => {
        const entries = FS.readdir(path).filter((e) => e !== "." && e !== "..");
        for (const entry of entries) {
          const fullPath = path === "/" ? `/${entry}` : `${path}/${entry}`;
          try {
            const stat = FS.stat(fullPath);
            if (FS.isDir(stat.mode)) {
              collectFiles(fullPath);
            } else {
              syncData.push({
                path: fullPath,
                data: FS.readFile(fullPath),
              });
            }
          } catch (e) {}
        }
      };
      collectFiles("/");

      // 2. Unmount
      try {
        fs.umount(baseLocalPath);
        this.isMounted = false;
      } catch (e) {
        console.error("Failed to unmount Doom FS:", e);
      }

      // 3. Write back to ZenFS (IndexedDB)
      for (const item of syncData) {
        const targetPath = `${baseLocalPath}${item.path}`;
        const targetDir = targetPath.substring(0, targetPath.lastIndexOf("/"));

        if (!fs.existsSync(targetDir)) {
          await this._mkdirRecursive(targetDir);
        }
        await fs.promises.writeFile(targetPath, item.data);
      }

      document.dispatchEvent(
        new CustomEvent("zen-fs-change", { detail: { path: baseLocalPath } }),
      );
    }

    this._cleanupModule();
  }

  _cleanupModule() {
    const script = document.getElementById("doom-script");
    if (script) script.remove();

    if (this.module && this.module.pauseMainLoop) {
      this.module.pauseMainLoop();
    }

    // Clear globals to avoid pollution and leaks
    delete window.Module;
    delete window.FS;
    delete window.callMain;
    this.module = null;
  }

  async _mkdirRecursive(path) {
    const parts = path.split("/").filter(Boolean);
    let current = "";
    for (const part of parts) {
      current += "/" + part;
      if (!fs.existsSync(current)) {
        await fs.promises.mkdir(current);
      }
    }
  }
}
