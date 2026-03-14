import { Application } from '../../system/application.js';
import { launchAgentApp, getAgentMenuItems } from './agent.js';
import { appManager } from '../../system/app-manager.js';
import { ICONS } from '../../config/icons.js';

export class AgentApp extends Application {
    static config = {
        id: "agent",
        title: "Agent",
        description: "A modern assistant powered by MSAgentJS.",
        icon: ICONS.agent,
        category: "Accessories",
        hasTray: true,
        isSingleton: true,
        tray: {
          contextMenu: getAgentMenuItems,
        },
        tips: [
          "Try the new modern Agent!",
        ],
    };

    constructor(config) {
        super(config);
    }

    _createWindow() {
        return null;
    }

    _onLaunch() {
        launchAgentApp(this);
    }

    _cleanup() {
        if (window.msAgentInstance) {
            window.msAgentInstance.hide();
            // MSAgentJS might need specific cleanup if it adds elements to DOM
            window.msAgentInstance = null;
        }
    }
}
