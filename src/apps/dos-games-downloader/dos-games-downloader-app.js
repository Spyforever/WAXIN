import { Application } from '../../system/application.js';
import { ICONS } from '../../config/icons.js';
import { fs, mount, umount } from "@zenfs/core";
import { Zip } from "@zenfs/archives";
import { addDesktopShortcut, existsAsync } from "../../system/zenfs-utils.js";
import "./dos-games-downloader.css";

export class DosGamesDownloaderApp extends Application {
  static config = {
    id: "dos-games-downloader",
    title: "DOS Games Downloader",
    description: "Search and download DOS games from Archive.org",
    icon: ICONS.msdos,
    category: "Accessories/Games",
    width: 500,
    height: 400,
    resizable: true,
  };

  constructor(config) {
    super(config);
    this.results = [];
    this.isDownloading = false;
  }

  _createWindow() {
    this.win = new window.$Window({
      title: this.title,
      outerWidth: this.width,
      outerHeight: this.height,
      resizable: this.resizable,
      icons: this.icon,
    });

    this.win.$content.html(`
      <div class="downloader-container">
        <div class="search-bar">
          <input type="text" class="search-input" placeholder="Search for DOS games...">
          <button class="search-button">Search</button>
        </div>
        <div class="results-container inset-deep">
          <div class="results-list"></div>
          <div class="status-overlay hidden">
             <div class="status-message">Downloading...</div>
             <div class="progress-bar-container">
                <div class="progress-bar"></div>
             </div>
          </div>
        </div>
      </div>
    `);

    this._setupEventListeners();
    return this.win;
  }

  _setupEventListeners() {
    const searchBtn = this.win.$content.find(".search-button");
    const searchInput = this.win.$content.find(".search-input");

    searchBtn.on("click", () => this._handleSearch());
    searchInput.on("keydown", (e) => {
      if (e.key === "Enter") this._handleSearch();
    });

    this.win.$content.on("click", ".download-btn", (e) => {
      const identifier = $(e.currentTarget).data("id");
      const title = $(e.currentTarget).data("title");
      this._downloadAndInstall(identifier, title);
    });
  }

  async _handleSearch() {
    const query = this.win.$content.find(".search-input").val().trim();
    if (!query) return;

    this.win.$content.find(".results-list").empty();
    this._setStatus("Searching...");

    try {
      // Archive.org advanced search API
      const url = `https://archive.org/advancedsearch.php?q=collection:(softwarelibrary_msdos)+AND+title:(${encodeURIComponent(query)})&fl[]=identifier,title,description&output=json`;
      const response = await fetch(url);
      const data = await response.json();

      this.results = data.response.docs;
      this._renderResults();
      this._setStatus(this.results.length ? "" : "No results found.");
    } catch (e) {
      console.error("Search failed", e);
      this._setStatus("Search failed. Please try again.");
    }
  }

  _renderResults() {
    const list = this.win.$content.find(".results-list");
    list.empty();

    this.results.forEach((item) => {
      const thumbUrl = `https://archive.org/services/img/${item.identifier}`;
      const card = $(`
        <div class="game-card">
          <img class="game-thumb" src="${thumbUrl}" alt="${item.title}" loading="lazy">
          <div class="game-info">
            <div class="game-title">${item.title}</div>
            <div class="game-id">${item.identifier}</div>
          </div>
          <button class="download-btn" data-id="${item.identifier}" data-title="${item.title}">Install</button>
        </div>
      `);
      list.append(card);
    });
  }

  _setStatus(msg) {
    const list = this.win.$content.find(".results-list");
    if (msg) {
        list.html(`<div class="status-info">${msg}</div>`);
    }
  }

  async _fetchWithProxy(url, title, statusMsg) {
    const proxies = [
      (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
      (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
      (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
    ];

    for (let i = 0; i < proxies.length; i++) {
      const proxiedUrl = proxies[i](url);
      try {
        console.log(`Attempting download with proxy ${i + 1}: ${proxiedUrl}`);
        const response = await fetch(proxiedUrl);
        if (response.ok) return response;
        console.warn(`Proxy ${i + 1} failed with status ${response.status}`);
      } catch (e) {
        console.warn(`Proxy ${i + 1} failed with error:`, e);
      }

      if (i < proxies.length - 1) {
        statusMsg.text(`Download failed with proxy ${i+1}, retrying with fallback...`);
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    throw new Error("All download proxies failed. Archive.org might be temporarily blocking access.");
  }

  async _downloadAndInstall(identifier, title) {
    if (this.isDownloading) return;
    this.isDownloading = true;

    const overlay = this.win.$content.find(".status-overlay");
    const statusMsg = this.win.$content.find(".status-message");
    overlay.removeClass("hidden");
    statusMsg.text(`Downloading ${title}...`);

    try {
      // 1. Get metadata to find the zip file
      const metaUrl = `https://archive.org/metadata/${identifier}`;
      const metaResponse = await fetch(metaUrl);
      const metaData = await metaResponse.json();

      const zipFile = metaData.files.find(f => f.name.toLowerCase().endsWith(".zip"));
      if (!zipFile) throw new Error("No ZIP file found for this game.");

      const downloadUrl = `https://archive.org/download/${identifier}/${zipFile.name}`;

      // 2. Download the ZIP
      const zipResponse = await this._fetchWithProxy(downloadUrl, title, statusMsg);
      statusMsg.text(`Downloading ${title}...`); // Restore message after fallback notification

      const buffer = await zipResponse.arrayBuffer();

      // 3. Extract to /C:/Games/[identifier]
      statusMsg.text(`Extracting ${title}...`);
      const installDir = `/C:/Games/${identifier}`;
      if (!(await existsAsync(installDir))) {
        await fs.promises.mkdir(installDir, { recursive: true });
      }

      const zipFs = await Zip.create({ data: new Uint8Array(buffer) });
      const mountPoint = `/mnt/zip-${identifier}`;
      if (!(await existsAsync("/mnt"))) await fs.promises.mkdir("/mnt");
      if (!(await existsAsync(mountPoint))) await fs.promises.mkdir(mountPoint);

      mount(mountPoint, zipFs);

      try {
        await this._copyRecursive(mountPoint, installDir);
      } finally {
        umount(mountPoint);
        try {
            await fs.promises.rmdir(mountPoint);
        } catch (e) {}
      }

      // 4. Find the first .EXE or .COM
      const files = await fs.promises.readdir(installDir);
      const executable = files.find(f => f.toLowerCase().endsWith(".exe") || f.toLowerCase().endsWith(".com"));

      // 5. Create shortcut
      if (executable) {
          await addDesktopShortcut("dos-box", title);
          // Update the shortcut content to point to the game
          const lnkPath = `/C:/WINDOWS/Desktop/${title}.lnk.json`;
          const lnkContent = JSON.parse(await fs.promises.readFile(lnkPath, "utf8"));
          lnkContent.args = `${installDir}/${executable}`;
          await fs.promises.writeFile(lnkPath, JSON.stringify(lnkContent, null, 2));
      }

      statusMsg.text(`Successfully installed ${title}!`);
      setTimeout(() => overlay.addClass("hidden"), 3000);
    } catch (e) {
      console.error("Installation failed", e);
      statusMsg.text(`Error: ${e.message}`);
      setTimeout(() => overlay.addClass("hidden"), 5000);
    } finally {
      this.isDownloading = false;
    }
  }

  async _copyRecursive(src, dest) {
    const entries = await fs.promises.readdir(src);
    for (const entry of entries) {
      const srcPath = `${src}/${entry}`;
      const destPath = `${dest}/${entry}`;
      const stats = await fs.promises.stat(srcPath);

      if (stats.isDirectory()) {
        if (!(await existsAsync(destPath))) {
          await fs.promises.mkdir(destPath);
        }
        await this._copyRecursive(srcPath, destPath);
      } else {
        const data = await fs.promises.readFile(srcPath);
        await fs.promises.writeFile(destPath, data);
      }
    }
  }
}
