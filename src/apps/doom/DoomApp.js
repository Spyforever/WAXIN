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
    if (!document.getElementById("doom-script")) {
        const script = document.createElement("script");
        script.id = "doom-script";
        script.src = "games/doom/websockets-doom.js";
        document.body.appendChild(script);
    } else {
        // If script already exists (singleton), we might need to re-init
        if (this.module.onRuntimeInitialized) {
            this.module.onRuntimeInitialized();
        }
    }

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
        } catch(e) {}
    }

    // 1. Copy initial files from ZenFS to Emscripten MEMFS
    const filesToCopy = ["doom1.wad", "default.cfg"];
    for (const file of filesToCopy) {
      try {
        if (fs.existsSync(`${baseLocalPath}/${file}`)) {
            const data = await fs.promises.readFile(`${baseLocalPath}/${file}`);
            FS.writeFile(file, new Uint8Array(data));
        }
      } catch (e) {
        console.warn(`Failed to copy ${file} to Doom FS:`, e);
      }
    }

    // 2. Load save games from ZenFS
    try {
        const allFiles = await fs.promises.readdir(baseLocalPath);
        for (const file of allFiles) {
            if (file.toLowerCase().startsWith("doomsav") && file.toLowerCase().endsWith(".dsg")) {
                const data = await fs.promises.readFile(`${baseLocalPath}/${file}`);
                FS.writeFile(file, new Uint8Array(data));
            }
        }
    } catch (e) {
        console.warn("Failed to load save games from ZenFS:", e);
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
    if (this.isMounted) {
      const baseLocalPath = "/C:/Program Files/Doom";

      // 1. Sync files from Emscripten to memory
      const FS = this.module.FS;
      const filesToSync = FS.readdir("/").filter(f => f !== "." && f !== "..");
      const syncData = [];
      for (const file of filesToSync) {
          try {
              const stat = FS.stat(file);
              if (!FS.isDir(stat.mode)) {
                  syncData.push({ name: file, data: FS.readFile(file) });
              }
          } catch(e) {}
      }

      // 2. Unmount
      try {
        fs.umount(baseLocalPath);
        this.isMounted = false;
      } catch (e) {
        console.error("Failed to unmount Doom FS:", e);
      }

      // 3. Write back to ZenFS (IndexedDB)
      for (const item of syncData) {
          await fs.promises.writeFile(`${baseLocalPath}/${item.name}`, item.data);
      }

      document.dispatchEvent(new CustomEvent("zen-fs-change", { detail: { path: baseLocalPath } }));
    }
  }
}
