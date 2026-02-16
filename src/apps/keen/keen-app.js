import { IFrameApplication } from '../../system/iframe-application.js';
import { ICONS } from '../../config/icons.js';

export class KeenApp extends IFrameApplication {
  static config = {
    id: "keen",
    title: "Commander Keen",
    description: "Play the classic game Commander Keen.",
    icon: ICONS.keen, category: "",
    width: 640,
    height: 480,
    resizable: false,
    isSingleton: true,
  };

  constructor(config) {
    super(config);
    this._boundHandleMessage = this._handleMessage.bind(this);
  }

  _createWindow() {
    const win = new $Window({
      title: this.title,
      innerWidth: 672,
      innerHeight: 414,
      resizable: false,
      icons: this.icon,
    });

    const iframe = document.createElement("iframe");
    iframe.src = "games/keen/index.html";
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";

    win.$content.html(iframe.outerHTML);

    this.iframe = win.$content.find("iframe")[0];
    this._setupIframeForInactivity(this.iframe);

    win.on("close", () => {
      if (
        this.iframe &&
        this.iframe.contentWindow &&
        typeof this.iframe.contentWindow.saveKeenProgress === "function"
      ) {
        this.iframe.contentWindow.saveKeenProgress();
      }
    });
    return win;
  }

  _onLaunch() {
    window.addEventListener("message", this._boundHandleMessage);
    this.win.focus();
  }

  _handleMessage(event) {
    if (event.data && event.data.type === "KEEN_EXIT") {
      if (this.win) {
        this.win.close();
      }
    }
  }

  _onClose() {
    window.removeEventListener("message", this._boundHandleMessage);
  }
}
