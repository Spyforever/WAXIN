import { Application } from '../../system/application.js';
import { aboutContent } from './about.js';
import './about.css';
import { ICONS } from '../../config/icons.js';

export class AboutApp extends Application {
    static config = {
        id: "about",
        title: "About",
        description: "Displays information about this application.",
        summary: "<b>azOS Second Edition</b><br>Copyright © 2024",
        icon: ICONS.windowsUpdate,
        width: 400,
        height: 216,
        resizable: false,
        minimizeButton: false,
        maximizeButton: false,
        isSingleton: true,
    };

    constructor(config) {
        super(config);
    }

    _createWindow() {
        const win = new $Window({
            title: this.title,
            outerWidth: this.width,
            outerHeight: this.height,
            resizable: this.resizable,
            minimizeButton: this.minimizeButton,
            maximizeButton: this.maximizeButton,
            icons: this.icon,
        });

        win.$content.html(aboutContent);

        this.checkVersion(win.$content.find('.version-status'));

        return win;
    }

    async checkVersion($status) {
        try {
            const response = await fetch('https://api.github.com/repos/azayrahmad/win98-web/releases/latest');
            if (!response.ok) throw new Error('Failed to fetch version info');
            const data = await response.json();

            // Extract version number (e.g., "0.5.0" from "v0.5.0" or "win98-web-v0.5.0")
            const versionMatch = data.tag_name.match(/(\d+\.\d+\.\d+)/);
            const latestVersion = versionMatch ? versionMatch[1] : data.tag_name.replace(/^v/, '');
            const currentVersion = import.meta.env.APP_VERSION;

            if (latestVersion === currentVersion) {
                $status.text('You are using the latest version.');
            } else {
                $status.html(`A new version is available: <b>${latestVersion}</b>`);
            }
        } catch (error) {
            console.error('Version check failed:', error);
            $status.text('Could not check for updates.');
        }
    }
}