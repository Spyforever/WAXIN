import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import { runSetupTUI } from "./setup-utility.js";

let terminal = null;
let setupMode = false;

function initTerminal() {
    if (terminal) return terminal;

    const container = document.getElementById("boot-terminal");
    if (!container) return null;

    terminal = new Terminal({
        cursorStyle: "underline",
        cursorBlink: true,
        theme: {
            background: "black",
            foreground: "#aaaaaa", // Standard BIOS gray
        },
        fontFamily: '"IBM BIOS", Courier, monospace',
        fontSize: 13,
        rows: 25,
        cols: 80,
        allowTransparency: true,
    });

    terminal.open(container);

    // Ensure cursor is visible and blinking
    terminal.write("\x1b[?25h");

    terminal.focus();

    terminal.onKey(({ domEvent }) => {
        if (!setupMode && (domEvent.key === "F8" || domEvent.key === "Delete")) {
            const event = new KeyboardEvent("keydown", {
                key: domEvent.key,
                code: domEvent.code,
                keyCode: domEvent.keyCode,
                bubbles: true,
            });
            window.dispatchEvent(event);
        }
    });

    // Refocus terminal on click anywhere on the boot screen
    const bootScreen = document.getElementById("boot-screen");
    if (bootScreen) {
        bootScreen.addEventListener("click", () => {
            if (terminal) terminal.focus();
        });
    }

    return terminal;
}

function hideBootScreen() {
    const bootScreenEl = document.getElementById("boot-screen");
    if (bootScreenEl) {
        const contentEl = document.getElementById("boot-screen-content");
        if (contentEl) {
            contentEl.style.visibility = "hidden";
        }
        bootScreenEl.classList.add("fade-out");
        setTimeout(() => {
            if (terminal) {
                terminal.dispose();
                terminal = null;
            }
            bootScreenEl.remove();
        }, 500);
    }
}

function startBootProcessStep(message) {
    const term = initTerminal();
    if (term) {
        term.write("\x1b[?25h"); // Show cursor
        term.write(message);
        return {
            get firstChild() {
                return {
                    set nodeValue(val) {
                        term.write('\r\x1b[2K' + val);
                    }
                };
            }
        };
    }
    return null;
}

function finalizeBootProcessStep(stepInfo, status) {
    if (terminal && stepInfo && !setupMode) {
        if (status === undefined || status === null) {
            terminal.write('\r\n');
        } else {
            terminal.write(` ${status}\r\n`);
        }
        terminal.write("\x1b[?25h"); // Ensure cursor is visible
    }
}

function showBlinkingCursor() {
    const term = initTerminal();
    if (term) {
        term.options.cursorBlink = true;
    }
}

function removeLastBlinkingCursor() {
    // xterm cursor is handled by the terminal itself
}

function promptToContinue() {
    return new Promise((resolve) => {
        const term = initTerminal();
        if (!term) {
            resolve();
            return;
        }

        let countdown = 10;
        const renderPrompt = () => {
            term.write(`\r\x1b[2KPress any key to continue... ${countdown}`);
        };

        renderPrompt();

        const timer = setInterval(() => {
            countdown--;
            renderPrompt();
            if (countdown <= 0) {
                clearInterval(timer);
                cleanup();
                resolve();
            }
        }, 1000);

        let termDisposable = null;

        const cleanup = () => {
            clearInterval(timer);
            term.write("\r\n");
            window.removeEventListener("keydown", continueHandler);
            window.removeEventListener("touchstart", continueHandler);
            if (termDisposable) termDisposable.dispose();
        };

        const continueHandler = () => {
            cleanup();
            resolve();
        };

        termDisposable = term.onKey(continueHandler);
        window.addEventListener("keydown", continueHandler, { once: true });
        window.addEventListener("touchstart", continueHandler, { once: true });
    });
}

function showSetupScreen() {
    setupMode = true;
    const term = initTerminal();
    const biosInfoRow = document.getElementById("bios-info-row");
    const rightColumn = document.getElementById("boot-screen-right-column");
    const footer = document.getElementById("boot-screen-footer");

    if (biosInfoRow) biosInfoRow.style.display = "none";
    if (rightColumn) rightColumn.style.display = "none";
    if (footer) footer.style.display = "none";

    if (term) {
        term.write("\x1b[2J\x1b[H"); // Clear screen and home cursor
        runSetupTUI(term, () => {
            setupMode = false;
        });
    }
}

export {
    hideBootScreen,
    startBootProcessStep,
    finalizeBootProcessStep,
    showBlinkingCursor,
    promptToContinue,
    removeLastBlinkingCursor,
    showSetupScreen,
};
