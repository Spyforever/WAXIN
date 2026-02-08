from playwright.sync_api import sync_playwright

def check_errors():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.on("pageerror", lambda exc: print(f"uncaught exception: {exc}"))
        page.on("console", lambda msg: print(f"console: {msg.text}"))
        page.goto("http://localhost:5173/win98-web/")
        page.wait_for_timeout(5000)
        browser.close()

if __name__ == "__main__":
    check_errors()
