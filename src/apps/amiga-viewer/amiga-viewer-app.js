import { Application } from '../../system/application.js';
import { ShowFilePicker } from '../../shared/utils/file-picker.js';
import { ICONS } from '../../config/icons.js';
import { isZenFSPath, getZenFSFileAsBlob } from '../../system/zenfs-utils.js';
import { loadIffImage, animateIffImage, drawIffImage, IffContainer } from './iff.js';
import "./amigaviewer.css";

export class AmigaViewerApp extends Application {
  static config = {
    id: "amiga-viewer",
    title: "Amiga Image Viewer",
    description: "View Amiga IFF/ILBM images.",
    icon: ICONS.amigaViewer,
    category: "Accessories",
    width: 640,
    height: 480,
    resizable: true,
    isSingleton: false,
  };

  constructor(config) {
    super(config);
    this.currentIff = null;
    this.isFullscreen = false;
    this.isFillScreen = false;
    this.isDebugVisible = false;
  }

  _createWindow(file) {
    const title = file ? `${file.split('/').pop()} - Amiga Image Viewer` : "Amiga Image Viewer";
    const win = new window.$Window({
      title: title,
      outerWidth: this.width || 640,
      outerHeight: this.height || 480,
      resizable: this.resizable,
      icons: this.icon,
      id: this.id,
    });

    const menuBar = this._createMenuBar();
    win.setMenuBar(menuBar);

    win.$content.append(`
      <div class="amiga-viewer-container">
        <div class="drop-zone-overlay">
          <div class="drop-message">Drag & Drop an IFF/ILBM file here</div>
        </div>
        <canvas id="amiga_canvas_${this.instanceKey}"></canvas>
        <div id="amiga_debug_${this.instanceKey}" class="amiga-viewer-debug"></div>
      </div>
    `);

    return win;
  }

  _createMenuBar() {
    return new MenuBar({
      "&File": [
        {
          label: "&Open...",
          action: () => this.openFile(),
        },
        "MENU_DIVIDER",
        {
          label: "E&xit",
          action: () => this.win.close(),
        },
      ],
      "&View": [
        {
          label: "&Scale (Fit/Fill)",
          action: () => this.toggleImageScale(),
        },
        {
          label: "&Fullscreen",
          shortcutLabel: "F11",
          action: () => this.toggleOSFullScreen(),
        },
        "MENU_DIVIDER",
        {
          label: "&Debug Output",
          checked: () => this.isDebugVisible,
          action: () => this.toggleDebugOutput(),
        },
      ],
      "&Help": [
        {
          label: "&About Amiga Image Viewer",
          action: () => alert("Amiga IFF/ILBM Image Viewer for AqualisOS.\nBased on code by Matthias Wiesmann and mrupp."),
        },
      ],
    });
  }

  async _onLaunch(data) {
    this.canvasId = `amiga_canvas_${this.instanceKey}`;
    this.debugId = `amiga_debug_${this.instanceKey}`;
    this.container = this.win.$content.find(".amiga-viewer-container")[0];
    this.canvas = this.win.$content.find("canvas")[0];
    this.debugElem = this.win.$content.find(".amiga-viewer-debug")[0];
    this.dropZone = this.win.$content.find(".drop-zone-overlay")[0];

    if (data) {
      this.loadFile(data);
    }

    this._setupDragAndDrop();
    this.win.$content.on('dblclick', () => this.toggleOSFullScreen());

    this._handleFullscreenChange = () => {
      this.isFullscreen = !!document.fullscreenElement;
    };
    document.addEventListener('fullscreenchange', this._handleFullscreenChange);
  }

  _setupDragAndDrop() {
    this.win.$content.on('dragover', (e) => {
      e.preventDefault();
      this.dropZone.classList.add('drag-active');
    });

    this.win.$content.on('dragleave', (e) => {
      e.preventDefault();
      this.dropZone.classList.remove('drag-active');
    });

    this.win.$content.on('drop', (e) => {
      e.preventDefault();
      this.dropZone.classList.remove('drag-active');
      const file = e.originalEvent.dataTransfer.files[0];
      if (!file) return;

      const objectURL = URL.createObjectURL(file);
      this.win.title(`${file.name} - Amiga Image Viewer`);
      this.loadFile(objectURL, true);
    });
  }

  async openFile() {
    const path = await ShowFilePicker({
      title: "Open Amiga Image",
      mode: "open",
      fileTypes: [
        {
          label: "Amiga Images",
          extensions: ["iff", "ilbm", "lbm", "pbm", "ham", "ham8"],
        },
        { label: "All Files", extensions: ["*"] },
      ],
    });

    if (path) {
      this.loadFile(path);
    }
  }

  async loadFile(path, isObjectURL = false) {
    if (this.currentIff && typeof this.currentIff.stopColorCycling === 'function') {
      this.currentIff.stopColorCycling();
    }
    this.debugElem.innerHTML = '';
    this.container.classList.add('has-image');

    let url = path;
    if (!isObjectURL && isZenFSPath(path)) {
        try {
            const blob = await getZenFSFileAsBlob(path);
            url = URL.createObjectURL(blob);
            isObjectURL = true;
            this.win.title(`${path.split('/').pop()} - Amiga Image Viewer`);
        } catch (e) {
            console.error("Error loading image from ZenFS:", e);
            return;
        }
    }

    loadIffImage(url, this.canvasId, true, (loadedIff) => {
      this.currentIff = loadedIff;
      if (isObjectURL) URL.revokeObjectURL(url);
      this._adjustWindowSize();
    }, true, this.debugId);
  }

  _adjustWindowSize() {
    if (!this.currentIff) return;

    const imgWidth = this.currentIff.effective_width;
    const imgHeight = this.currentIff.effective_height;

    const desktop = document.querySelector(".desktop");
    const desktopRect = desktop.getBoundingClientRect();

    const padding = 40;
    const titleBarHeight = this.win.element.querySelector(".window-titlebar").offsetHeight;
    const menuBarHeight = this.win.element.querySelector(".menus")?.offsetHeight || 0;
    const windowBordersWidth = this.win.element.offsetWidth - this.win.element.clientWidth;
    const windowBordersHeight = this.win.element.offsetHeight - this.win.element.clientHeight;

    const maxInnerWidth = desktopRect.width - padding - windowBordersWidth;
    const maxInnerHeight = desktopRect.height - padding - titleBarHeight - menuBarHeight - windowBordersHeight;

    let newInnerWidth = imgWidth;
    let newInnerHeight = imgHeight;

    const aspectRatio = imgWidth / imgHeight;

    if (newInnerWidth > maxInnerWidth) {
      newInnerWidth = maxInnerWidth;
      newInnerHeight = newInnerWidth / aspectRatio;
    }

    if (newInnerHeight > maxInnerHeight) {
      newInnerHeight = maxInnerHeight;
      newInnerWidth = newInnerHeight * aspectRatio;
    }

    this.win.setDimensions({
      innerWidth: Math.round(newInnerWidth),
      innerHeight: Math.round(newInnerHeight),
    });
    this.win.center();
  }

  toggleImageScale() {
    this.isFillScreen = !this.isFillScreen;
    this.canvas.classList.toggle('fill-screen', this.isFillScreen);
  }

  toggleOSFullScreen() {
    if (!document.fullscreenElement) {
      this.container.requestFullscreen().catch(err => {
        console.warn(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      document.exitFullscreen();
    }
  }

  toggleDebugOutput() {
    this.isDebugVisible = !this.isDebugVisible;
    this.debugElem.classList.toggle('visible', this.isDebugVisible);
  }

  _onClose() {
    if (this.currentIff && typeof this.currentIff.stopColorCycling === 'function') {
      this.currentIff.stopColorCycling();
    }
    document.removeEventListener('fullscreenchange', this._handleFullscreenChange);
  }
}
