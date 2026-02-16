import { Application } from '../../system/application.js';
import './diablo.css';
import { ICONS } from '../../config/icons.js';
import { fs } from "@zenfs/core";

export class DiabloApp extends Application {
    static config = {
        id: "diablo",
        title: "Diablo",
        description: "Play the classic game Diablo.",
        icon: ICONS.diablo, category: "",
        width: 800,
        height: 600,
        resizable: true,
        isSingleton: true,
    };

    constructor(config) {
        super(config);
        this.win = null;
        this.iframe = null;
        this.baseLocalPath = "/C:/Program Files/Diablo";
        this._boundHandleMessage = this._handleMessage.bind(this);
    }

    async _onLaunch() {
        window.addEventListener("message", this._boundHandleMessage);
        await this._ensureFileSystem();
    }

    async _onClose() {
        window.removeEventListener("message", this._boundHandleMessage);
    }

    async _ensureFileSystem() {
        if (!fs.existsSync(this.baseLocalPath)) {
            await this._mkdirRecursive(this.baseLocalPath);
        }
    }

    async _mkdirRecursive(path) {
        const parts = path.split("/").filter(Boolean);
        let current = "";
        for (const part of parts) {
            current += "/" + part;
            if (!fs.existsSync(current)) {
                try {
                    await fs.promises.mkdir(current);
                } catch (e) {}
            }
        }
    }

    async _handleMessage(event) {
        if (!event.data || typeof event.data !== 'object') return;

        const { type } = event.data;

        if (type === "DIABLO_READY") {
            await this._checkAndAutoStart();
        } else if (type === "GET_MPQ") {
            const { url } = event.data;
            const port = event.ports[0];
            if (!port) return;

            try {
                const filename = url.split('/').pop();
                const entries = await fs.promises.readdir(this.baseLocalPath);
                const match = entries.find(e => e.toLowerCase() === filename.toLowerCase());

                if (match) {
                    const data = await fs.promises.readFile(`${this.baseLocalPath}/${match}`);
                    port.postMessage(data, [data.buffer || data]);
                } else {
                    port.postMessage({ error: `File not found in ZenFS: ${filename}` });
                }
            } catch (e) {
                console.error("Error providing MPQ", e);
                port.postMessage({ error: e.message });
            }
        }
    }

    async _checkAndAutoStart() {
        if (!this.iframe || !this.iframe.contentWindow) return;

        try {
            const entries = await fs.promises.readdir(this.baseLocalPath);
            const targetFiles = ['DIABDAT.MPQ', 'spawn.mpq'];

            for (const target of targetFiles) {
                const match = entries.find(e => e.toLowerCase() === target.toLowerCase());
                if (match) {
                    console.log(`Auto-starting Diablo with ${match} from ZenFS`);
                    const data = await fs.promises.readFile(`${this.baseLocalPath}/${match}`);
                    this.iframe.contentWindow.postMessage({
                        type: 'START_WITH_FILE',
                        name: match,
                        data: data
                    }, '*', [data.buffer || data]);
                    return;
                }
            }
        } catch (e) {
            console.warn("Failed to check ZenFS for auto-start:", e);
        }
    }

    _createWindow() {
        this.win = new $Window({
            title: this.title,
            outerWidth: this.width,
            outerHeight: this.height,
            resizable: this.resizable,
            icons: this.icon,
            id: this.id,
        });

        this.iframe = document.createElement('iframe');
        this.iframe.className = 'diablo-iframe';
        this.iframe.src = 'games/diablo/index.html';

        this.win.$content.append(this.iframe);

        return this.win;
    }
}
