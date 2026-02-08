from playwright.sync_api import sync_playwright

def check():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.on("console", lambda msg: print(f"console: {msg.text}"))
        page.on("pageerror", lambda exc: print(f"uncaught exception: {exc}"))
        page.goto("http://localhost:5173/win98-web/")
        try:
            page.wait_for_selector("#boot-terminal", state="visible", timeout=10000)
            print("#boot-terminal is visible")
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="visibility_fail.png")
        browser.close()

if __name__ == "__main__":
    check()
