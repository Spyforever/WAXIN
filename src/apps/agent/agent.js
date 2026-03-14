import { getItem, setItem } from '../../system/local-storage.js';
import { appManager } from '../../system/app-manager.js';
import { AGENT_NAMES } from '../../config/agents.js';
import { requestBusyState, releaseBusyState } from '../../system/busy-state-manager.js';

let currentAgentName = getItem('msAgentName') || "Clippy";

function setCurrentAgentName(name) {
  currentAgentName = name;
  setItem('msAgentName', name);
}

export function getAgentMenuItems(app) {
  const agent = window.msAgentInstance;
  if (!agent) {
    return [{ label: "Agent not available", enabled: false }];
  }

  const ttsEnabled = getItem('msAgentTTSEnabled') ?? true;

  return [
    {
      label: "&Animate",
      action: () => {
        const animations = agent.animations();
        if (animations && animations.length > 0) {
            const randomAnim = animations[Math.floor(Math.random() * animations.length)];
            agent.play(randomAnim);
        }
      },
    },
    {
        label: "&Ask Agent",
        default: true,
        action: () => showAgentInputBalloon(),
    },
    {
        label: "&Tutorial",
        action: () => {
          startTutorial(agent);
        },
    },
    {
        label: "Enable &TTS",
        checkbox: {
          check: () => getItem('msAgentTTSEnabled') ?? true,
          toggle: () => {
            const currentState = getItem('msAgentTTSEnabled') ?? true;
            const newState = !currentState;
            setItem('msAgentTTSEnabled', newState);
            if (agent) agent.balloon.setTTSEnabled(newState);
          },
        },
    },
    "MENU_DIVIDER",
    {
      label: "A&gent",
      submenu: [
        {
          radioItems: AGENT_NAMES.map((name) => ({ label: name, value: name })),
          getValue: () => currentAgentName,
          setValue: (value) => {
            if (currentAgentName !== value) {
              setCurrentAgentName(value);
              launchAgentApp(app, value);
            }
          },
        },
      ],
    },
    "MENU_DIVIDER",
    {
      label: "&Close",
      action: () => {
        const speakReq = agent.speak("Goodbye! Just open me again if you need any help!", { useTTS: ttsEnabled });
        speakReq.promise.then(() => {
            agent.play('Goodbye').promise.then(() => {
                appManager.closeApp(app.id);
            });
        });
      },
    },
  ];
}

async function showAgentInputBalloon() {
    const agent = window.msAgentInstance;
    if (!agent) return;

    // MSAgentJS has a built-in ask method that returns a promise
    const question = await agent.ask({
        title: "What would you like to do?",
        placeholder: "Ask me anything..."
    });

    if (question) {
        askAgent(agent, question);
    }
}

async function askAgent(agent, question) {
    if (!question || question.trim().length === 0) return;

    const ttsEnabled = getItem('msAgentTTSEnabled') ?? true;
    await agent.speak("Let me think about it...", { useTTS: ttsEnabled, animation: "Thinking" });

    try {
        const encodedQuestion = encodeURIComponent(question.trim());
        const response = await fetch(
          `https://resume-chat-api-nine.vercel.app/api/clippy-helper?query=${encodedQuestion}`,
        );
        const data = await response.json();

        for (const fragment of data) {
          const cleanAnswer = fragment.answer.replace(/\*\*/g, "");
          await agent.speak(cleanAnswer, { useTTS: ttsEnabled, animation: fragment.animation });
        }
      } catch (error) {
        await agent.speak("Sorry, I couldn't get an answer for that at this time!", { useTTS: ttsEnabled, animation: "Wave" });
        console.error("API Error:", error);
      }
}

export function showAgentContextMenu(event, app) {
    const menuItems = getAgentMenuItems(app);
    new window.ContextMenu(menuItems, event);
}

export async function launchAgentApp(app, agentName = currentAgentName) {
    if (window.msAgentInstance) {
        window.msAgentInstance.destroy();
    }

    let container = document.getElementById('ms-agent-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'ms-agent-container';
        container.style.position = 'absolute';
        container.style.top = '0';
        container.style.left = '0';
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.pointerEvents = 'none';
        container.style.zIndex = '999999';
        document.getElementById('screen').appendChild(container);
    }

    const ttsUserPref = getItem('msAgentTTSEnabled') ?? true;

    // Normalize agent name for CDN paths
    const nameMap = {
        'CLIPPY': 'Clippit',
        'GENIUS': 'Genius',
        'ROCKY': 'Rocky',
        'F1': 'F1'
    };
    const internalName = nameMap[agentName.toUpperCase()] || agentName;

    const agent = await window.MSAgentJS.Agent.load(internalName, {
        baseUrl: `https://unpkg.com/ms-agent-js@0.3.0/dist/agents/${internalName}/`
    });
    window.msAgentInstance = agent;

    agent.balloon.setTTSEnabled(ttsUserPref);

    await agent.show();

    // Set recommended voice for TTS
    if (ttsUserPref) {
        const setDefaultVoice = () => {
          agent.setRecommendedVoice();
        };
        if (window.speechSynthesis.getVoices().length) {
          setDefaultVoice();
        } else {
          window.speechSynthesis.addEventListener(
            "voiceschanged",
            setDefaultVoice,
            { once: true },
          );
        }
    }

    // Wrap speak for busy state management
    const originalSpeak = agent.speak;
    agent.speak = function (text, options) {
        const speakId = `speak-${Date.now()}`;
        const hostEl = agent.container;
        requestBusyState(speakId, hostEl);

        const request = originalSpeak.call(this, text, options);
        request.promise.then(() => {
            releaseBusyState(speakId, hostEl);
        });
        return request;
    };

    await agent.speak("Hey, there. Want quick answers to your questions? Just click me.", {
        useTTS: ttsUserPref,
        animation: "Explain"
    });

    agent.on('click', () => {
        // Only if not already speaking or menu open
        if (document.querySelector(".menu-popup")) return;
        showAgentInputBalloon();
    });

    agent.on('contextmenu', (e) => {
        e.preventDefault();
        showAgentContextMenu(e, app);
    });
}

function startTutorial(agent) {
    const ttsEnabled = getItem('msAgentTTSEnabled') ?? true;

    const getElementCenter = (selector) => {
      const el = document.querySelector(selector);
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    };

    const startButton = getElementCenter(".start-button");

    const sequence = async () => {
        // 1. Welcome
        await agent.speak("Hi! I'm your new modern assistant. Let me give you a quick tour of Windows 98.", { useTTS: ttsEnabled, animation: "Explain" });

        // 2. Start Menu
        if (startButton) {
            await agent.moveTo(startButton.x + 80, startButton.y - 80);
            await agent.gestureAt(startButton.x, startButton.y);
            const startButtonEl = document.querySelector(".start-button");
            if (startButtonEl) {
                startButtonEl.classList.add("active");
                startButtonEl.click();
            }
            await agent.speak("The Start button gives you access to all your programs.", { useTTS: ttsEnabled, animation: "Explain" });
            if (startButtonEl) {
                startButtonEl.click();
                startButtonEl.classList.remove("active");
            }
        }

        // 3. Desktop Icons
        await agent.moveTo(140, 100);
        await agent.gestureAt(40, 100);
        await agent.speak("On the left, you'll find desktop icons. Double-click them to launch any program.", { useTTS: ttsEnabled, animation: "Explain" });

        await agent.speak("That's the tour! Feel free to play around. Just click me if you need anything!", { useTTS: ttsEnabled, animation: "Wave" });
    };

    sequence();
}
