async function confirmExit(term, action, onConfirm) {
    const msg = action.includes("SAVE") ? "Save to CMOS and EXIT (Y/N)? " : "Quit Without Saving (Y/N)? ";
    const x = Math.floor((80 - msg.length) / 2);
    term.write(`\x1b[15;${x}H\x1b[1;37;41m ${msg} \x1b[0m`);

    return new Promise((resolve) => {
        const handler = term.onKey(({ key }) => {
            const lowerKey = key.toLowerCase();
            if (lowerKey === 'y') {
                handler.dispose();
                onConfirm();
                resolve(true);
            } else if (lowerKey === 'n' || lowerKey === '\x1b' || key === '\u001b') {
                handler.dispose();
                resolve(false);
            }
        });
    });
}

export async function runSetupTUI(term, onExit) {
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

    const exitSetup = () => {
        disposable.dispose();
        onExit();
        window.location.reload();
    };

    const onKey = async ({ key, domEvent }) => {
        if (key === "\r") { // Enter
            if (selectedIndex >= 11) {
                if (!(await confirmExit(term, options[selectedIndex], exitSetup))) {
                    draw();
                }
            }
        } else if (domEvent.keyCode === 27 || key === "\x1b") { // ESC
            if (!(await confirmExit(term, "QUIT WITHOUT SAVING", exitSetup))) {
                draw();
            }
        } else if (key === "\x1b[A" || key === "\u001b[A") { // Up
            selectedIndex = (selectedIndex - 2 + options.length) % options.length;
            draw();
        } else if (key === "\x1b[B" || key === "\u001b[B") { // Down
            selectedIndex = (selectedIndex + 2) % options.length;
            draw();
        } else if (key === "\x1b[D" || key === "\u001b[D") { // Left
            selectedIndex = (selectedIndex % 2 === 0) ? selectedIndex + 1 : selectedIndex - 1;
            if (selectedIndex >= options.length) selectedIndex = options.length - 1;
            draw();
        } else if (key === "\x1b[C" || key === "\u001b[C") { // Right
            selectedIndex = (selectedIndex % 2 === 0) ? selectedIndex + 1 : selectedIndex - 1;
            if (selectedIndex >= options.length) selectedIndex = options.length - 1;
            draw();
        } else if (key === "0") {
            if (!(await confirmExit(term, "QUIT WITHOUT SAVING", exitSetup))) {
                draw();
            }
        }
    };

    const disposable = term.onKey(onKey);
}
