import { Application } from '../../system/application.js';
import { ICONS } from '../../config/icons.js';

export class DXBallApp extends Application {
  static config = {
    id: "dx-ball",
    title: "DX-Ball",
    description: "The classic Breakout game.",
    icon: ICONS.dxball,
    width: 654, // Adjusted for typical window borders to avoid scrollbars at 640x480
    height: 520,
    resizable: true,
    maximizable: true,
    isSingleton: true,
  };

  constructor(config) {
    super(config);
    this.iframe = null;
  }

  async _createWindow() {
    const win = new window.$Window({
      title: this.title,
      outerWidth: this.config.width,
      outerHeight: this.config.height,
      resizable: this.config.resizable,
      maximizable: this.config.maximizable,
      icons: this.config.icon,
      id: "dx-ball",
    });

    const iframe = document.createElement("iframe");
    // Ensure the path is correct regardless of where the app is hosted
    const baseUrl = import.meta.env.BASE_URL || "/";
    iframe.src = `${baseUrl}games/dx-ball/index.html`.replace(/\/+/g, '/');
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";
    iframe.style.display = "block";

    win.$content.append(iframe);
    this.iframe = iframe;
    this.win = win;

    return win;
  }
}
