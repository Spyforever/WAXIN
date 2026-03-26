import { getItem, setItem } from "../../system/local-storage.js";
import { appManager, launchApp } from "../../system/app-manager.js";
import {
  requestBusyState,
  releaseBusyState,
} from "../../system/busy-state-manager.js";

const TUTORIAL_STEPS = [
  {
    id: "welcome",
    text: "Hi! I'm your new modern assistant. Let me give you a quick tour of Windows 98.",
    animation: "Greeting",
  },
  {
    id: "games",
    appId: "explorer",
    label: "Games",
    text: "This is your Games folder. It contains classic games like Minesweeper and Solitaire.",
    animation: "Explain",
    args: "/C:/WINDOWS/Desktop/Games",
  },
  {
    id: "desktop-themes",
    appId: "desktop-themes",
    label: "Desktop Themes",
    text: "You can customize your desktop's appearance using Desktop Themes. Try a different look!",
    animation: "Explain",
  },
  {
    id: "notepad",
    appId: "notepad",
    label: "Notepad",
    text: "Notepad is a simple text editor. Perfect for quick notes and even writing code!",
    animation: "Explain",
  },
  {
    id: "webamp",
    appId: "webamp",
    label: "Winamp",
    text: "Winamp is the ultimate media player for your music collection.",
    animation: "Explain",
  },
  {
    id: "agent",
    appId: "agent",
    label: "Agent",
    text: "And that's me! I'm here to help. You can right-click me to change my character or ask me questions.",
    animation: "Wave",
    noOpen: true,
  },
  {
    id: "conclusion",
    text: "That's the tour! Feel free to play around. Just click me if you need anything!",
    animation: "Wave",
  },
];

const SUPPORTED_AGENTS = {
  Clippy: "Clippit",
  Dot: "DOT",
  F1: "F1",
  Genius: "GENIUS",
  "Office Logo": "LOGO",
  MNATURE: "MNATURE",
  "Monkey King": "Monkey King",
  Links: "OFFCAT",
  Rocky: "ROCKY",
};

let currentAgentName = getItem("msAgentName") || "Clippy";

function setCurrentAgentName(name) {
  currentAgentName = name;
  setItem("msAgentName", name);
}

export function getAgentMenuItems(app) {
  const agent = window.msAgentInstance;
  if (!agent) {
    return [{ label: "Agent not available", enabled: false }];
  }

  const ttsEnabled = getItem("msAgentTTSEnabled") ?? true;

  return [
    {
      label: "&Animate",
      action: () => {
        const animations = agent.animations();
        if (animations && animations.length > 0) {
          const randomAnim =
            animations[Math.floor(Math.random() * animations.length)];
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
        check: () => getItem("msAgentTTSEnabled") ?? true,
        toggle: () => {
          const currentState = getItem("msAgentTTSEnabled") ?? true;
          const newState = !currentState;
          setItem("msAgentTTSEnabled", newState);
          if (agent) agent.balloon.setTTSEnabled(newState);
        },
      },
    },
    "MENU_DIVIDER",
    {
      label: "A&gent",
      submenu: [
        {
          radioItems: Object.keys(SUPPORTED_AGENTS).map((name) => ({
            label: name,
            value: name,
          })),
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
      action: async () => {
        await agent.speak("Goodbye! Just open me again if you need any help!", {
          useTTS: ttsEnabled,
        });
        await agent.hide("Goodbye");
        agent.destroy();
        appManager.closeApp(app.id);
      },
    },
  ];
}

async function showAgentInputBalloon() {
  const agent = window.msAgentInstance;
  if (!agent) return;

  // MSAgentJS has a built-in ask method that returns a promise
  // v0.5.0 uses a structured content array
  const result = await agent.ask({
    title: "What would you like to do?",
    content: [
      {
        type: "input",
        placeholder: "Ask me anything...",
        rows: 2,
      },
    ],
    buttons: ["Ask", "Cancel"],
  });

  if (result && result.text) {
    askAgent(agent, result.text);
  }
}

async function askAgent(agent, question) {
  if (!question || question.trim().length === 0) return;

  const ttsEnabled = getItem("msAgentTTSEnabled") ?? true;
  await agent.speak("Let me think about it...", {
    useTTS: ttsEnabled,
    animation: "Thinking",
  });

  try {
    const encodedQuestion = encodeURIComponent(question.trim());
    const response = await fetch(
      `https://resume-chat-api-nine.vercel.app/api/clippy-helper?query=${encodedQuestion}`,
    );
    const data = await response.json();

    for (const fragment of data) {
      const cleanAnswer = fragment.answer.replace(/\*\*/g, "");
      await agent.speak(cleanAnswer, {
        useTTS: ttsEnabled,
        animation: fragment.animation,
      });
    }
  } catch (error) {
    await agent.speak(
      "Sorry, I couldn't get an answer for that at this time!",
      { useTTS: ttsEnabled, animation: "Wave" },
    );
    console.error("API Error:", error);
  }
}

export function showAgentContextMenu(event, app) {
  const menuItems = getAgentMenuItems(app);

  // Create the context menu
  new window.ContextMenu(menuItems, event);

  // Boost z-index to appear in front of the agent (which is at 900)
  // This is handled by a global observer initialized in launchAgentApp
}

export async function launchAgentApp(app, agentName = currentAgentName) {
  const { Agent } =
    await import("https://unpkg.com/ms-agent-js@0.5.0/dist/ms-agent-js.es.js");

  if (window.msAgentInstance) {
    window.msAgentInstance.destroy();
  }

  const ttsUserPref = getItem("msAgentTTSEnabled") ?? true;

  const internalName =
    SUPPORTED_AGENTS[agentName] || SUPPORTED_AGENTS["Clippy"];

  const agent = await Agent.load(internalName, {
    fixed: false,
    baseUrl: `https://unpkg.com/ms-agent-js@0.5.0/dist/agents/${encodeURIComponent(internalName)}/`,
    initialAnimation: "Greeting",
  });
  window.msAgentInstance = agent;

  // Stay on top of windows but below menus
  // Note: the library may re-parent or create its own container.
  // We ensure it stays in a lower stacking context than the context menu.
  if (agent.container) {
    agent.container.style.setProperty("z-index", "9000", "important");
    // If it's not in the screen, move it there to ensure consistent stacking
    const screen = document.getElementById("screen");
    if (screen && agent.container.parentElement !== screen) {
      screen.appendChild(agent.container);
    }
  }

  agent.balloon.setTTSEnabled(ttsUserPref);

  // Set recommended voice for TTS
  if (ttsUserPref) {
    const setRecommendedVoice = () => {
      const voices = agent.getTTSVoices();
      if (voices.length > 0) {
        // Try to find a high-quality English voice
        const preferredVoice =
          voices.find(
            (v) =>
              v.lang.startsWith("en") &&
              (v.name.includes("David") || v.name.includes("Mark")),
          ) ||
          voices.find((v) => v.lang.startsWith("en")) ||
          voices[0];

        agent.setTTSOptions({ voice: preferredVoice });
      }
    };

    if (window.speechSynthesis.getVoices().length) {
      setRecommendedVoice();
    } else {
      window.speechSynthesis.addEventListener(
        "voiceschanged",
        setRecommendedVoice,
        { once: true },
      );
    }
  }

  // Busy state management using events
  agent.on("requestStart", () => {
    requestBusyState("agent-speaking", agent.container);
  });
  agent.on("requestComplete", () => {
    if (agent.requestQueue && agent.requestQueue.isEmpty) {
      releaseBusyState("agent-speaking", agent.container);
    }
  });

  await agent.speak(
    "Hey, there. Want quick answers to your questions? Just click me.",
    {
      useTTS: ttsUserPref,
      animation: "Explain",
    },
  );

  // v0.5.0 handles interaction natively
  agent.on("click", () => {
    // Only if a context menu is not open
    if (document.querySelector(".menu-popup-wrapper.open")) return;

    // If already speaking/busy, stop it first
    agent.stopCurrent();
    showAgentInputBalloon();
  });

  // Use the library's contextmenu event
  agent.on("contextmenu", (e) => {
    const originalEvent = e.originalEvent || e;
    if (originalEvent.preventDefault) {
      originalEvent.preventDefault();
    }
    showAgentContextMenu(originalEvent, app);
  });

  // Global Context Menu Booster to ensure Agent doesn't overlap menus
  const boostZ = "1000000";
  const boost = () => {
    const wraps = document.querySelectorAll(".menu-popup-wrapper");
    wraps.forEach((wrap) => {
      if (wrap.style.zIndex !== boostZ) {
        wrap.style.setProperty("z-index", boostZ, "important");
        const menus = wrap.querySelectorAll(".menu-popup");
        menus.forEach((menu) => {
          menu.style.setProperty("z-index", boostZ, "important");
        });
      }
    });
  };

  const observer = new MutationObserver(boost);
  const screen = document.getElementById("screen");
  if (screen) {
    observer.observe(screen, { childList: true, subtree: true });
  }

  // Cleanup observer when agent is destroyed
  const originalDestroy = agent.destroy.bind(agent);
  agent.destroy = () => {
    observer.disconnect();
    originalDestroy();
  };
}

const getElementCenter = (el) => {
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
};

const findIcon = (label) => {
  const icons = document.querySelectorAll(".explorer-icon");
  for (const icon of icons) {
    const iconLabel = icon.querySelector(".icon-label");
    if (iconLabel && iconLabel.textContent.trim() === label) {
      return icon;
    }
  }
  return null;
};

const findWindowCloseButton = (instance) => {
  if (instance && instance.win && instance.win.element) {
    return (
      instance.win.element.querySelector(".title-bar-controls .close") ||
      instance.win.element.querySelector(".close")
    );
  }
  return null;
};

async function findAndOpenFromStartMenu(agent, label, appId, args) {
  const startButton = document.querySelector(".start-button");
  if (startButton) {
    const center = getElementCenter(startButton);
    await agent.moveTo(center.x + 40, center.y - 40);
    await agent.gestureAt(center.x, center.y);
    startButton.click();
    await new Promise((r) => setTimeout(r, 500));

    const menuItems = document.querySelectorAll(".menu-popup .menu-item");
    let programsItem = Array.from(menuItems).find((i) =>
      i.textContent.includes("Programs"),
    );

    if (programsItem) {
      const pCenter = getElementCenter(programsItem);
      await agent.moveTo(pCenter.x + 40, pCenter.y);
      programsItem.dispatchEvent(
        new MouseEvent("mouseenter", { bubbles: true }),
      );
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  // Close start menu by clicking elsewhere or just launch the app
  document.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));

  return launchApp(appId, args);
}

async function startTutorial(agent) {
  const ttsEnabled = getItem("msAgentTTSEnabled") ?? true;
  let openedApps = [];

  const cleanup = async () => {
    for (const entry of openedApps) {
      appManager.closeApp(entry.instance.instanceKey);
    }
    openedApps = [];
  };

  for (let i = 0; i < TUTORIAL_STEPS.length; i++) {
    const step = TUTORIAL_STEPS[i];
    const isLast = i === TUTORIAL_STEPS.length - 1;

    let instance = null;

    // 1. Move to app and open if needed
    if (step.appId && !step.noOpen) {
      const icon = findIcon(step.label);
      if (icon) {
        const center = getElementCenter(icon);
        await agent.moveTo(center.x + 40, center.y - 40);
        await agent.gestureAt(center.x, center.y);
        instance = await launchApp(step.appId, step.args);
      } else {
        instance = await findAndOpenFromStartMenu(
          agent,
          step.label,
          step.appId,
          step.args,
        );
      }
      if (instance) openedApps.push({ appId: step.appId, instance });
      await new Promise((r) => setTimeout(r, 1000));
    } else if (step.id === "agent") {
      const center = getElementCenter(agent.container);
      if (center) {
        await agent.moveTo(center.x + 80, center.y);
        await agent.gestureAt(center.x, center.y);
      }
    }

    // 2. Ask
    if (step.animation) {
      agent.play(step.animation);
    }

    const result = await agent.ask({
      content: [{ type: "text", text: step.text }],
      buttons: [isLast ? "Finish" : "Next", "Skip Tutorial"],
    });

    const buttonLabel =
      typeof result === "string" ? result : result?.button || result?.text;

    if (buttonLabel === "Skip Tutorial" || !result) {
      await agent.speak("Feel free to restart the tutorial anytime!", {
        useTTS: ttsEnabled,
        animation: "Wave",
      });
      await cleanup();
      return;
    }

    // 3. Close app before next step
    if (instance) {
      const closeButton = findWindowCloseButton(instance);
      if (closeButton) {
        const center = getElementCenter(closeButton);
        await agent.moveTo(center.x + 40, center.y + 40);
        await agent.gestureAt(center.x, center.y);
      }
      appManager.closeApp(instance.instanceKey);
      openedApps = openedApps.filter((e) => e.instance !== instance);
      await new Promise((r) => setTimeout(r, 500));
    }
  }
}
