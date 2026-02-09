export async function runSetupTUI(term, onExit) {
    let timeLeft = 30;
    const selectedOption = "1";

    const draw = () => {
        // Clear screen and reset cursor
        term.write("\x1b[2J\x1b[H");
        term.write("\x1b[0;37;40m"); // Light gray on black

        term.write("Microsoft Windows 98 Startup Menu\r\n");
        term.write("=================================\r\n\r\n");

        // Option 1 - Highlighted (Inverted)
        term.write("   \x1b[7m1. Reboot\x1b[0m\r\n\r\n");

        // Choice and Time remaining
        term.write(`Enter a choice: ${selectedOption}`);

        // Move cursor to column 30 on the same line (row 6)
        term.write(`\x1b[6;30HTime remaining: ${timeLeft.toString().padStart(2, ' ')}`);

        // Footer at the bottom of 80x25 terminal
        term.write("\x1b[25;1HF5=Safe mode   Shift+F5=Command prompt   Shift+F8=Step-by-step confirmation [N]");

        // Move cursor to just after the choice for effect
        term.write("\x1b[6;17H");
    };

    draw();

    const reboot = () => {
        clearInterval(timer);
        disposable.dispose();
        onExit();
        window.location.reload();
    };

    const timer = setInterval(() => {
        timeLeft--;
        if (timeLeft <= 0) {
            reboot();
        } else {
            draw();
        }
    }, 1000);

    const onKey = ({ key }) => {
        // Accept '1' or Enter
        if (key === "1" || key === "\r") {
            reboot();
        }
    };

    const disposable = term.onKey(onKey);
}
