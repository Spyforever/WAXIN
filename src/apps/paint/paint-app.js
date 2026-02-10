import { Application } from '../../system/application.js';
import { ICONS } from '../../config/icons.js';
import './paint.css'; // I'll create this file to import all paint styles

export class PaintApp extends Application {
    static config = {
        id: "paint",
        title: "Paint",
        description: "Create and edit images.",
        icon: ICONS.paint, category: "Accessories",
        width: 800,
        height: 600,
        resizable: true,
        isSingleton: true,
    };

    constructor(config) {
        super(config);
        this.initialized = false;
    }

    _createWindow() {
        const win = new $Window({
            id: this.id,
            title: this.title,
            outerWidth: this.width,
            outerHeight: this.height,
            resizable: this.resizable,
            icons: this.icon,
        });

        win.element.style.display = 'flex';
        win.$content.addClass("paint-container");
        return win;
    }

    async _onLaunch(data) {
        if (window.$app) {
            this._injectHTML();
            this.win.$content.append(window.$app);
            this.initialized = true;
            $(window).trigger("resize");
            this.win.focus();
            return;
        }

        if (this.initialized) {
            this.win.focus();
            return;
        }

        // Initialize Paint
        window.paintAppContainer = this.win.$content[0];

        // We need to load dependencies that were in <script> tags in index.html
        await this._loadDependencies();

        // Inject HTML fragments that app.js expects
        this._injectHTML();

        // Load localization first as it provides the global `localize`
        await import('./src/app-localization.js');

        // Import the main app. This will execute the code.
        // We need to make sure app.js uses window.paintAppContainer
        await import('./src/app.js');

        this.initialized = true;
        this.win.focus();
    }

    async _loadDependencies() {
        const libs = [
            '/win98-web/apps/paint/lib/gif.js/gif.js',
            '/win98-web/apps/paint/lib/pako-2.0.3.min.js',
            '/win98-web/apps/paint/lib/UPNG.js',
            '/win98-web/apps/paint/lib/UTIF.js',
            '/win98-web/apps/paint/lib/bmp.js',
            '/win98-web/apps/paint/lib/anypalette-0.6.0.js',
            '/win98-web/apps/paint/lib/FileSaver.js',
            '/win98-web/apps/paint/lib/font-detective.js',
            '/win98-web/apps/paint/lib/libtess.min.js',
            '/win98-web/apps/paint/lib/imagetracer_v1.2.5.js',
        ];

        for (const lib of libs) {
            await this._loadScript(lib);
        }
    }

    _loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    _injectHTML() {
        // These are from index.html
        const aboutPaint = document.createElement('div');
        aboutPaint.id = 'about-paint';
        aboutPaint.style.display = 'none';
        aboutPaint.innerHTML = `
            <div id="about-paint-header">
                <img src="/win98-web/apps/paint/images/icons/128x128.png" width="128" height="128" id="about-paint-icon" alt="" />
                <div id="about-paint-beside-icon">
                    <h1 id="jspaint-project-name">JS Paint</h1>
                    <div id="jspaint-version">Version 1.0.0+</div>
                    <div id="jspaint-update-status-area" hidden>
                        <div id="maybe-outdated-line">
                            <div id="outdated" hidden>Outdated</div>
                            <div id="checking-for-updates" hidden>Checking for updates...</div>
                            <div id="failed-to-check-if-outdated" hidden>Failed to check</div>
                        </div>
                    </div>
                </div>
                <button id="view-project-news">What's New?</button>
            </div>
            <p>MS Paint remake by <a href="https://isaiahodhner.io/" target="_blank">Isaiah Odhner</a></p>
        `;
        this.win.$content.append(aboutPaint);

        const news = document.createElement('div');
        news.id = 'news';
        news.hidden = true;
        // Minimal news content or load it from index.html if needed
        this.win.$content.append(news);

        // SVG filters from index.html
        const svgFilters = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svgFilters.style.position = "absolute";
        svgFilters.style.pointerEvents = "none";
        svgFilters.style.bottom = "100%";
        svgFilters.innerHTML = `
            <defs>
                <filter id="disabled-inset-filter" x="0" y="0" width="1px" height="1px">
                    <feColorMatrix in="SourceGraphic" type="matrix" values="
                        1 0 0 0 0
                        0 1 0 0 0
                        0 0 1 0 0
                        -1000 -1000 -1000 1 0
                    " result="black-parts-isolated" />
                    <feFlood result="shadow-color" flood-color="var(--ButtonShadow)" />
                    <feFlood result="hilight-color" flood-color="var(--ButtonHilight)" />
                    <feOffset in="black-parts-isolated" dx="1" dy="1" result="offset" />
                    <feComposite in="hilight-color" in2="offset" operator="in" result="hilight-colored-offset" />
                    <feComposite in="shadow-color" in2="black-parts-isolated" operator="in" result="shadow-colored" />
                    <feMerge>
                        <feMergeNode in="hilight-colored-offset" />
                        <feMergeNode in="shadow-colored" />
                    </feMerge>
                </filter>
            </defs>
        `;
        this.win.$content.append(svgFilters);
    }
}
