import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";

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
    terminal.focus();

    terminal.onKey(({ domEvent }) => {
        if (!setupMode && domEvent.key === "Delete") {
            const event = new KeyboardEvent("keydown", {
                key: "Delete",
                code: "Delete",
                keyCode: 46,
                bubbles: true,
            });
            window.dispatchEvent(event);
        }
    });

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
    if (terminal && stepInfo) {
        if (status === undefined || status === null) {
            terminal.write('\r\n');
        } else {
            terminal.write(` ${status}\r\n`);
        }
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

        const cleanup = () => {
            clearInterval(timer);
            term.write("\r\n");
            window.removeEventListener("keydown", continueHandler);
            window.removeEventListener("touchstart", continueHandler);
        };

        const continueHandler = () => {
            cleanup();
            resolve();
        };

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
        term.clear();
        term.reset();
        runSetupTUI(term);
    }
}

async function runSetupTUI(term) {
    let selectedIndex = 0;
    const options = [
        "STANDARD CMOS SETUP",
        "BIOS FEATURES SETUP",
        "CHIPSET FEATURES SETUP",
        "POWER MANAGEMENT SETUP",
        "PNP/PCI CONFIGURATION",
        "LOAD BIOS DEFAULTS",
        "LOAD SETUP DEFAULTS",
        "SUPERVISOR PASSWORD",
        "USER PASSWORD",
        "IDE HDD AUTO DETECTION",
        "HDD LOW LEVEL FORMAT",
        "SAVE & EXIT SETUP",
        "EXIT WITHOUT SAVING"
    ];

    const draw = () => {
        term.write("\x1b[2J\x1b[H"); // Clear entire screen and home cursor
        // Header
        term.write("\x1b[1;37;44m"); // White on Blue
        term.write(" ROM PCI/ISA BIOS (2A59CFG1)".padEnd(80) + "\r\n");
        term.write("                              CMOS SETUP UTILITY                                \r\n");
        term.write("                         Copyright (C) 1984-1999 Award Software, Inc.           \r\n");
        term.write("\x1b[0m\r\n");

        // Options in two columns
        for (let i = 0; i < options.length; i++) {
            const opt = options[i];
            const row = Math.floor(i / 2);
            const col = i % 2;
            const x = col === 0 ? 5 : 45;
            const y = 6 + row;

            term.write(`\x1b[${y};${x}H`);
            if (i === selectedIndex) {
                term.write(`\x1b[1;33;40m > ${opt.padEnd(30)} \x1b[0m`); // Yellow on black for selection
            } else {
                term.write(`\x1b[1;37;40m   ${opt.padEnd(30)} \x1b[0m`);
            }
        }

        // Footer
        term.write("\x1b[22;1H\x1b[1;37;44m");
        term.write(" ESC : Quit".padEnd(45) + " : Select Item".padEnd(35) + "\r\n");
        term.write(" F10 : Save & Exit Setup".padEnd(45) + " (Shift)F2 : Color".padEnd(35) + "\x1b[0m");

        term.write("\x1b[24;1H\x1b[1;37;40m    Time, Date, Hard Disk Type...                                               \x1b[0m");
    };

    draw();

    const onKey = async ({ key, domEvent }) => {
        if (!setupMode) return;

        if (key === "\r") { // Enter
            if (selectedIndex >= 11) {
                if (!(await confirmExit(term, options[selectedIndex]))) {
                    draw();
                }
            }
        } else if (domEvent.keyCode === 27 || key === "\x1b") { // ESC
            if (!(await confirmExit(term, "QUIT WITHOUT SAVING"))) {
                draw();
            }
        } else if (key === "\u001b[A") { // Up
            selectedIndex = (selectedIndex - 2 + options.length) % options.length;
            draw();
        } else if (key === "\u001b[B") { // Down
            selectedIndex = (selectedIndex + 2) % options.length;
            draw();
        } else if (key === "\u001b[D") { // Left
            selectedIndex = (selectedIndex % 2 === 0) ? selectedIndex + 1 : selectedIndex - 1;
            if (selectedIndex >= options.length) selectedIndex = options.length - 1;
            draw();
        } else if (key === "\u001b[C") { // Right
            selectedIndex = (selectedIndex % 2 === 0) ? selectedIndex + 1 : selectedIndex - 1;
            if (selectedIndex >= options.length) selectedIndex = options.length - 1;
            draw();
        } else if (key === "0") {
            if (!(await confirmExit(term, "QUIT WITHOUT SAVING"))) {
                draw();
            }
        }
    };

    const disposable = term.onKey(onKey);

    // We need a way to stop setup mode and resume boot or close
    window.exitSetup = () => {
        setupMode = false;
        disposable.dispose();
        // Resume boot? The original code throws an error "Setup interrupted".
        // But the user wants "Setup screen should be interactive" and then "just exit".
        // If they exit setup, it should probably continue booting or just close setup.
        // Actually os-init.js has:
        // if (setupEntered) throw new Error("Setup interrupted");
        // So we might need to handle how to resume.

        // For now let's just reload the page or continue.
        // The user said "For now just exit. It should either be selectable with arrow keys or by pressing zero. Confirm with y or n."
        window.location.reload();
    };
}

async function confirmExit(term, action) {
    const msg = action.includes("SAVE") ? "Save to CMOS and EXIT (Y/N)? " : "Quit Without Saving (Y/N)? ";
    const x = Math.floor((80 - msg.length) / 2);
    term.write(`\x1b[15;${x}H\x1b[1;37;41m ${msg} \x1b[0m`);

    return new Promise((resolve) => {
        const handler = term.onKey(({ key }) => {
            const lowerKey = key.toLowerCase();
            if (lowerKey === 'y') {
                handler.dispose();
                window.exitSetup();
                resolve(true);
            } else if (lowerKey === 'n' || lowerKey === '\x1b' || key === '\u001b') {
                handler.dispose();
                resolve(false);
            }
        });
    });
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
