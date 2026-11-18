"""Render five unframed, synthetic Tally screens for the Shipframe Signal theme."""

import base64
import tempfile
from pathlib import Path

import generate_screenshots as source


ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "docs" / "screenshots" / "shipframe"

SCREENS = [
    ("01_dashboard", source.build_screen_dashboard),
    ("02_transactions", source.build_screen_feed),
    ("03_insights", source.build_screen_insights),
    ("04_budgets", source.build_screen_budgets),
    ("05_pro", source.build_screen_pro),
]

FONTS = [
    ("Bricolage Grotesque", 800, ROOT / "node_modules/@expo-google-fonts/bricolage-grotesque/800ExtraBold/BricolageGrotesque_800ExtraBold.ttf"),
    ("Space Grotesk", 400, ROOT / "node_modules/@expo-google-fonts/space-grotesk/400Regular/SpaceGrotesk_400Regular.ttf"),
    ("Space Grotesk", 700, ROOT / "node_modules/@expo-google-fonts/space-grotesk/700Bold/SpaceGrotesk_700Bold.ttf"),
    ("Space Mono", 400, ROOT / "node_modules/@expo-google-fonts/space-mono/400Regular/SpaceMono_400Regular.ttf"),
    ("Space Mono", 700, ROOT / "node_modules/@expo-google-fonts/space-mono/700Bold/SpaceMono_700Bold.ttf"),
]


def embedded_fonts():
    declarations = []
    for family, weight, path in FONTS:
        encoded = base64.b64encode(path.read_bytes()).decode("ascii")
        declarations.append(
            f"@font-face{{font-family:'{family}';font-weight:{weight};"
            f"src:url(data:font/ttf;base64,{encoded}) format('truetype')}}"
        )
    return "\n".join(declarations)


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    fonts = embedded_fonts()
    with tempfile.TemporaryDirectory(prefix="tally-shipframe-") as temporary:
        for name, builder in SCREENS:
            html = builder()
            if name == "01_dashboard":
                extra_transactions = """
      <div class="tx-item">
        <div>
          <div class="tx-title">Uber Auto</div>
          <div class="tx-sub">ride home · TRANSPORT</div>
        </div>
        <div class="tx-amount">−₹186</div>
      </div>
      <div class="tx-item">
        <div>
          <div class="tx-title">Blue Tokai</div>
          <div class="tx-sub">afternoon coffee · FOOD</div>
        </div>
        <div class="tx-amount">−₹340</div>
      </div>
      <div class="tx-item">
        <div>
          <div class="tx-title">Amazon</div>
          <div class="tx-sub">desk essentials · SHOPPING</div>
        </div>
        <div class="tx-amount">−₹1,249</div>
      </div>
"""
                closing_row = """          <div class="tx-title">Zepto</div>
          <div class="tx-sub">"1 maggi, 1 redbull" · FOOD</div>
        </div>
        <div class="tx-amount">−₹312</div>
      </div>"""
                if closing_row not in html:
                    raise RuntimeError("Dashboard transaction markup changed")
                html = html.replace(closing_row, closing_row + extra_transactions, 1)
            if name == "05_pro":
                html = html.replace("tally pro.", "see the whole carnage.")
                html = html.replace("you know it's bad. Make it official.", "free shows you the last 30 days. The damage goes back further.")
                html = html.replace("every transaction forever, not just 30 days. Remember every mistake.", "every transaction, forever · not just 30 days")
                html = html.replace("AI++ ROASTS", "PURCHASE PLANS")
                html = html.replace("unlimited unhinged verdicts + weekly spending debriefs.", "turn a purchase into a monthly savings plan")
                html = html.replace("BROKE STREAK", "RECEIPTS")
                html = html.replace("live home-screen widget to keep you perpetually humble.", "share your monthly damage receipt")
                html = html.replace("AUTO-CAPTURE", "BANK LABELS")
                html = html.replace("reads bank &amp; UPI notifications in background. Zero manual logging.", "group more than one bank or card from captured alerts")
                html = html.replace("cancel anytime in Google Play · restore purchases", "cancel anytime · restore purchases")
            # The verdict stamp is a brief app animation, not a persistent
            # overlay. Keep the financial figures readable in a still image.
            chrome_free_css = ".stamp-feral,.status-bar,.home-indicator{visibility:hidden!important}\n"
            html = html.replace("</style>", chrome_free_css + fonts + "\n</style>", 1)
            html = html.replace("sat, nov 14", "tue, nov 17")
            html_path = Path(temporary) / f"{name}.html"
            html_path.write_text(html, encoding="utf-8")
            source.capture_screenshot(html_path, OUTPUT / f"{name}.png", 1080, 2400)


if __name__ == "__main__":
    main()
