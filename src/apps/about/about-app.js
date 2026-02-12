import { Application } from '../../system/application.js';
import { aboutContent } from './about.js';
import './about.css';
import { ICONS } from '../../config/icons.js';
import { renderHTML } from '../../shared/utils/dom-utils.js';

import readmeMarkdown from '../../../README.md?raw';
import changelogMarkdown from '../../../CHANGELOG.md?raw';

export class AboutApp extends Application {
    static config = {
        id: "about",
        title: "About",
        description: "Displays information about this application.",
        summary: "<b>azOS Second Edition</b><br>Copyright © 2024",
        icon: ICONS.windowsUpdate,
        width: 400,
        height: 280,
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

        win.$content.find('#about-readme').on('click', () => this.openFile(readmeMarkdown, 'README'));
        win.$content.find('#about-changelog').on('click', () => this.openFile(changelogMarkdown, 'Changelog'));

        return win;
    }

    async openFile(markdown, title) {
        const html = marked.parse(markdown);
        const win = new $Window({
            title: title,
            width: 600,
            height: 400,
            resizable: true,
            maximizeButton: true,
            icons: ICONS.help,
        });

        const contentArea = document.createElement('div');
        contentArea.className = 'about-file-content';
        contentArea.style.height = '100%';
        contentArea.style.padding = '8px';
        contentArea.style.display = 'flex';
        contentArea.style.flexDirection = 'column';

        win.$content.append(contentArea);
        renderHTML(contentArea, html, 'sunken-panel');

        const sunkenPanel = contentArea.querySelector('.sunken-panel');
        if (sunkenPanel) {
            sunkenPanel.style.flexGrow = '1';
            sunkenPanel.style.overflowY = 'auto';
            sunkenPanel.style.padding = '16px';
            sunkenPanel.style.backgroundColor = 'white';
        }

        win.center();
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