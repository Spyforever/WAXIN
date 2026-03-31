import { Application } from '../../system/application.js';
import { launchAgentApp, getAgentMenuItems } from './agent.js';
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
          "Need help? Try the <a href='#' class='tip-link' data-app='agent'>Agent</a> for assistance with AqualisOS features.",
          "You can ask Agent about Aziz's resume by clicking on it.",
          "Right-click on Agent to see more options, like changing the agent or making it animate.",
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
