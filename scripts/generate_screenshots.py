import os
import subprocess
import time
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DOCS_DIR = BASE_DIR / "docs" / "screenshots"
RAW_DIR = DOCS_DIR / "raw"
STORE_DIR = DOCS_DIR / "store"
CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

RAW_DIR.mkdir(parents=True, exist_ok=True)
STORE_DIR.mkdir(parents=True, exist_ok=True)

# Shared CSS styles
SHARED_CSS = """
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap');

:root {
  --ink: #0E0F0C;
  --surface: #15160E;
  --card: #181A12;
  --card-el: #20221A;
  --line: rgba(233, 255, 208, 0.10);
  --line-strong: rgba(233, 255, 208, 0.18);
  --text: #F2F3EC;
  --dim: #9DA08F;
  --faint: #63655A;
  --acid: #D4FF2E;
  --acid-soft: #E9FFD0;
  --red: #FF5436;
  --chip: rgba(233, 255, 208, 0.06);
  --display: 'Bricolage Grotesque', sans-serif;
  --sans: 'Space Grotesk', sans-serif;
  --mono: 'Space Mono', monospace;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  -webkit-font-smoothing: antialiased;
}

body {
  background: var(--ink);
  color: var(--text);
  font-family: var(--sans);
  width: 1080px;
  height: 2400px;
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
}

/* Status Bar */
.status-bar {
  height: 120px;
  padding: 34px 60px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: var(--sans);
  font-weight: 600;
  font-size: 34px;
  letter-spacing: -0.02em;
  color: var(--text);
  z-index: 100;
  background: transparent;
}
.camera-cutout {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #000;
  border: 1.5px solid rgba(255, 255, 255, 0.08);
  margin-left: 20px;
}
.status-icons {
  display: flex;
  align-items: center;
  gap: 16px;
}
.status-icons svg {
  fill: var(--text);
}

/* Content Container */
.content {
  flex: 1;
  padding: 20px 48px 210px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Header */
.screen-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}
.brand-group {
  display: flex;
  align-items: center;
  gap: 16px;
}
.brand-group b {
  font-family: var(--display);
  font-weight: 800;
  font-size: 54px;
  letter-spacing: -0.01em;
}
.pill {
  font-family: var(--mono);
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #fff;
  background: var(--red);
  padding: 8px 18px;
  border-radius: 6px;
}
.pill-acid {
  background: var(--acid);
  color: var(--ink);
}
.header-meta {
  font-family: var(--sans);
  color: var(--dim);
  font-size: 28px;
}

/* UI Atoms */
.mono-label {
  font-family: var(--mono);
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 22px;
  color: var(--faint);
}
.card {
  background: var(--card);
  border: 2px solid var(--line);
  border-radius: 28px;
  padding: 34px;
}
.card-hero {
  background: var(--surface);
  border: 2.5px solid var(--line-strong);
  border-radius: 32px;
  padding: 40px;
  margin-bottom: 28px;
}

/* Tab Bar */
.tab-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 200px;
  background: rgba(14, 15, 12, 0.96);
  backdrop-filter: blur(24px);
  border-top: 2px solid var(--line);
  display: flex;
  justify-content: space-around;
  padding: 24px 40px 60px;
  z-index: 999;
}
.tab-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: var(--faint);
  font-family: var(--mono);
  font-size: 20px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
.tab-item.active {
  color: var(--text);
}
.tab-icon {
  width: 58px;
  height: 58px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.home-indicator {
  position: absolute;
  bottom: 18px;
  left: 50%;
  transform: translateX(-50%);
  width: 320px;
  height: 8px;
  background: rgba(255, 255, 255, 0.28);
  border-radius: 4px;
}
"""

STATUS_BAR_HTML = """
<div class="status-bar">
  <span>9:41</span>
  <div class="camera-cutout"></div>
  <div class="status-icons">
    <!-- Signal -->
    <svg width="34" height="26" viewBox="0 0 17 13" fill="none">
      <rect x="0" y="8" width="3" height="5" rx="1" fill="#F2F3EC"/>
      <rect x="4.5" y="5.5" width="3" height="7.5" rx="1" fill="#F2F3EC"/>
      <rect x="9" y="3" width="3" height="10" rx="1" fill="#F2F3EC"/>
      <rect x="13.5" y="0" width="3" height="13" rx="1" fill="#F2F3EC"/>
    </svg>
    <!-- Wifi -->
    <svg width="34" height="26" viewBox="0 0 16 12" fill="none">
      <path d="M8 9.5C8.82843 9.5 9.5 8.82843 9.5 8C9.5 7.17157 8.82843 6.5 8 6.5C7.17157 6.5 6.5 7.17157 6.5 8C6.5 8.82843 7.17157 9.5 8 9.5Z" fill="#F2F3EC"/>
      <path fill-rule="evenodd" clip-rule="evenodd" d="M3.8 4.2C6.1 2.2 9.9 2.2 12.2 4.2L13.6 2.8C10.5 0.1 5.5 0.1 2.4 2.8L3.8 4.2Z" fill="#F2F3EC"/>
      <path fill-rule="evenodd" clip-rule="evenodd" d="M0.5 1.5C4.6 -1.8 11.4 -1.8 15.5 1.5L14.1 2.9C10.8 -0.1 5.2 -0.1 1.9 2.9L0.5 1.5Z" fill="#F2F3EC"/>
    </svg>
    <!-- Battery -->
    <svg width="46" height="26" viewBox="0 0 24 13" fill="none">
      <rect x="0.5" y="0.5" width="20" height="12" rx="3.5" stroke="#F2F3EC" stroke-width="1.5"/>
      <rect x="2.5" y="2.5" width="16" height="8" rx="2" fill="#D4FF2E"/>
      <path d="M22 4.5V8.5" stroke="#F2F3EC" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
  </div>
</div>
"""

TALLY_MARK_SVG = """
<svg width="42" height="48" viewBox="0 0 100 116" aria-label="tally">
  <g fill="#FF5436">
    <rect x="14" y="22" width="11" height="72" rx="4"/>
    <rect x="36" y="22" width="11" height="72" rx="4"/>
    <rect x="58" y="22" width="11" height="72" rx="4"/>
    <rect x="80" y="22" width="11" height="72" rx="4"/>
    <rect x="47" y="9" width="11" height="98" rx="4" transform="rotate(56 52.5 58)"/>
  </g>
</svg>
"""

def get_tab_bar_html(active_tab):
    tabs = [
        ("Dashboard", "home", """<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5L12 3l9 7.5V20a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 20v-9.5z"/><path d="M9 21v-7h6v7"/></svg>"""),
        ("Transactions", "feed", """<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2v20l2.5-1.5L9 22l2.5-1.5L14 22l2.5-1.5L19 22l2-1.5V2l-2 1.5L16.5 2 14 3.5 11.5 2 9 3.5 6.5 2 4 3.5z"/><path d="M8 7h8"/><path d="M8 11h8"/><path d="M8 15h5"/></svg>"""),
        ("Insights", "damage", f"""<svg width="48" height="54" viewBox="0 0 100 116"><g fill="{'#FF5436' if active_tab == 'damage' else '#63655A'}"><rect x="14" y="22" width="11" height="72" rx="4"/><rect x="36" y="22" width="11" height="72" rx="4"/><rect x="58" y="22" width="11" height="72" rx="4"/><rect x="80" y="22" width="11" height="72" rx="4"/><rect x="47" y="9" width="11" height="98" rx="4" transform="rotate(56 52.5 58)"/></g></svg>"""),
        ("Budget", "budget", """<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>"""),
        ("Settings", "you", """<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>"""),
    ]
    items = []
    for name, key, icon in tabs:
        is_active = (key == active_tab)
        cls = "tab-item active" if is_active else "tab-item"
        items.append(f"""
        <div class="{cls}">
          <div class="tab-icon">{icon}</div>
          <span>{key}</span>
        </div>
        """)
    return f"""
    <div class="tab-bar">
      {''.join(items)}
      <div class="home-indicator"></div>
    </div>
    """

# ================= SCREEN 1: DASHBOARD =================
def build_screen_dashboard():
    return f"""
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
{SHARED_CSS}
.hero-amount {{
  font-family: var(--display);
  font-weight: 800;
  font-size: 112px;
  line-height: 1.0;
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;
  margin: 14px 0 18px;
}}
.hero-amount .curr {{
  font-size: 0.88em;
  margin-right: 8px;
  font-weight: 700;
}}
.ai-read {{
  font-size: 30px;
  color: var(--dim);
  font-style: italic;
  line-height: 1.45;
  margin-bottom: 28px;
  padding-left: 20px;
  border-left: 4px solid var(--red);
}}
.chart-bars {{
  display: flex;
  align-items: flex-end;
  gap: 16px;
  height: 120px;
  margin-top: 14px;
}}
.bar-col {{
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  height: 100%;
  justify-content: flex-end;
}}
.bar-rect {{
  width: 100%;
  border-radius: 6px;
  background: var(--line-strong);
}}
.bar-rect.today {{
  background: var(--red);
}}
.top-cats {{
  display: flex;
  flex-direction: column;
  gap: 20px;
}}
.cat-row {{
  display: flex;
  flex-direction: column;
  gap: 8px;
}}
.cat-meta {{
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}}
.cat-tag {{
  font-family: var(--mono);
  font-weight: 700;
  font-size: 26px;
  letter-spacing: 0.05em;
}}
.cat-val {{
  font-family: var(--mono);
  font-weight: 700;
  font-size: 28px;
}}
.cat-bar-bg {{
  height: 14px;
  background: var(--card-el);
  border-radius: 7px;
  overflow: hidden;
}}
.cat-bar-fill {{
  height: 100%;
  border-radius: 7px;
  background: var(--line-strong);
}}
.cat-bar-fill.lead {{
  background: var(--red);
}}
.tx-item {{
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 0;
  border-bottom: 2px dashed var(--line);
}}
.tx-item:last-child {{
  border-bottom: none;
  padding-bottom: 0;
}}
.tx-title {{
  font-size: 34px;
  font-weight: 700;
  letter-spacing: -0.02em;
}}
.tx-sub {{
  font-size: 26px;
  color: var(--dim);
  font-style: italic;
  margin-top: 4px;
}}
.tx-amount {{
  font-family: var(--mono);
  font-weight: 700;
  font-size: 34px;
}}
</style>
</head>
<body>
  {STATUS_BAR_HTML}
  <div class="content">
    <div class="screen-header">
      <div class="brand-group">
        {TALLY_MARK_SVG}
        <b>tally</b>
      </div>
      <span class="mono-label" style="font-size:24px; color:var(--faint);">sat, nov 14</span>
    </div>

    <!-- Hero Card -->
    <div class="card-hero">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span class="mono-label">the damage so far · nov 2026</span>
        <span style="font-family:var(--mono); font-size:24px; color:var(--red); font-weight:700;">+10% vs oct</span>
      </div>
      <div class="hero-amount"><span class="curr">₹</span>47,100</div>
      <div class="ai-read">
        "₹18,400 on food & swiggy, 39% of everything. Bold strategy."
      </div>

      <span class="mono-label" style="font-size:20px;">last 7 days</span>
      <div class="chart-bars">
        <div class="bar-col"><div class="bar-rect" style="height:35%;"></div><span class="mono-label" style="font-size:20px;">S</span></div>
        <div class="bar-col"><div class="bar-rect" style="height:55%;"></div><span class="mono-label" style="font-size:20px;">M</span></div>
        <div class="bar-col"><div class="bar-rect" style="height:40%;"></div><span class="mono-label" style="font-size:20px;">T</span></div>
        <div class="bar-col"><div class="bar-rect" style="height:80%;"></div><span class="mono-label" style="font-size:20px;">W</span></div>
        <div class="bar-col"><div class="bar-rect" style="height:60%;"></div><span class="mono-label" style="font-size:20px;">T</span></div>
        <div class="bar-col"><div class="bar-rect" style="height:90%;"></div><span class="mono-label" style="font-size:20px;">F</span></div>
        <div class="bar-col"><div class="bar-rect today" style="height:100%;"></div><span class="mono-label" style="font-size:20px; color:var(--red);">S</span></div>
      </div>
    </div>

    <!-- Top Damage -->
    <div class="card" style="margin-bottom:28px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:22px;">
        <span class="mono-label">top damage</span>
        <span class="mono-label" style="color:var(--dim);">39% on food</span>
      </div>
      <div class="top-cats">
        <div class="cat-row">
          <div class="cat-meta">
            <span class="cat-tag" style="color:var(--red);">FOOD & SWIGGY</span>
            <span class="cat-val">₹18,400 <span style="font-size:20px; color:var(--dim);">39%</span></span>
          </div>
          <div class="cat-bar-bg"><div class="cat-bar-fill lead" style="width:39%;"></div></div>
        </div>
        <div class="cat-row">
          <div class="cat-meta">
            <span class="cat-tag">RENT</span>
            <span class="cat-val">₹18,000 <span style="font-size:20px; color:var(--dim);">38%</span></span>
          </div>
          <div class="cat-bar-bg"><div class="cat-bar-fill" style="width:38%;"></div></div>
        </div>
        <div class="cat-row">
          <div class="cat-meta">
            <span class="cat-tag">CABS & AUTOS</span>
            <span class="cat-val">₹4,200 <span style="font-size:20px; color:var(--dim);">9%</span></span>
          </div>
          <div class="cat-bar-bg"><div class="cat-bar-fill" style="width:9%;"></div></div>
        </div>
      </div>
    </div>

    <!-- Recent Hits -->
    <div class="card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <span class="mono-label">recent damage</span>
        <span class="mono-label" style="color:var(--dim);">auto-logged</span>
      </div>
      <div class="tx-item">
        <div>
          <div class="tx-title">Swiggy Instamart</div>
          <div class="tx-sub">"the 3rd order today" · FOOD</div>
        </div>
        <div class="tx-amount">−₹487</div>
      </div>
      <div class="tx-item">
        <div>
          <div class="tx-title">BookMyShow</div>
          <div class="tx-sub">"F1 tickets, solo" · FUN</div>
        </div>
        <div class="tx-amount">−₹920</div>
      </div>
      <div class="tx-item">
        <div>
          <div class="tx-title">Zepto</div>
          <div class="tx-sub">"1 maggi, 1 redbull" · FOOD</div>
        </div>
        <div class="tx-amount">−₹312</div>
      </div>
    </div>

  </div>
  {get_tab_bar_html('home')}
</body>
</html>
"""

# ================= SCREEN 2: FEED =================
def build_screen_feed():
    return f"""
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
{SHARED_CSS}
.filter-tabs {{
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
}}
.filter-btn {{
  flex: 1;
  padding: 18px 0;
  text-align: center;
  border-radius: 999px;
  font-family: var(--mono);
  font-weight: 700;
  font-size: 22px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border: 2px solid var(--line-strong);
  color: var(--dim);
}}
.filter-btn.active {{
  background: var(--red);
  border-color: var(--red);
  color: #fff;
}}
.cat-chips {{
  display: flex;
  gap: 14px;
  overflow-x: hidden;
  margin-bottom: 28px;
}}
.chip {{
  padding: 12px 26px;
  border-radius: 999px;
  font-family: var(--mono);
  font-size: 20px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  border: 2px solid var(--line);
  color: var(--dim);
  white-space: nowrap;
}}
.chip.active {{
  border-color: var(--red);
  background: rgba(255, 84, 54, 0.15);
  color: var(--red);
}}
.search-bar {{
  background: var(--card);
  border: 2px solid var(--line);
  border-radius: 20px;
  padding: 22px 28px;
  display: flex;
  align-items: center;
  gap: 18px;
  font-size: 28px;
  color: var(--faint);
  margin-bottom: 24px;
}}
.feed-group-title {{
  font-family: var(--mono);
  font-size: 22px;
  letter-spacing: 0.14em;
  color: var(--faint);
  text-transform: uppercase;
  margin: 16px 0 12px;
}}
.tx-card {{
  background: var(--card);
  border: 2px solid var(--line);
  border-radius: 26px;
  padding: 28px 32px;
  margin-bottom: 16px;
}}
.tx-main {{
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}}
.tx-name {{
  font-size: 34px;
  font-weight: 700;
}}
.tx-quote {{
  font-size: 26px;
  font-style: italic;
  color: var(--dim);
  margin-top: 6px;
}}
.tx-val {{
  font-family: var(--mono);
  font-weight: 700;
  font-size: 34px;
}}
.tx-val.credit {{
  color: var(--acid);
}}
.reactions-row {{
  display: flex;
  gap: 14px;
  margin-top: 20px;
  padding-top: 18px;
  border-top: 1.5px dashed var(--line);
}}
.react-btn {{
  width: 58px;
  height: 58px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  background: var(--card-el);
  border: 2px solid transparent;
}}
.react-btn.active {{
  border-color: var(--red);
  background: rgba(255, 84, 54, 0.2);
}}
</style>
</head>
<body>
  {STATUS_BAR_HTML}
  <div class="content">
    <div class="screen-header">
      <div style="font-family:var(--display); font-weight:800; font-size:52px; letter-spacing:-0.01em;">the feed</div>
      <div style="display:flex; align-items:center; gap:14px;">
        <span class="mono-label" style="font-size:24px; color:var(--red);">18 HITS</span>
      </div>
    </div>

    <!-- Search -->
    <div class="search-bar">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <span>search merchants, notes…</span>
    </div>

    <!-- Filters -->
    <div class="filter-tabs">
      <div class="filter-btn active">ALL</div>
      <div class="filter-btn">SPENT</div>
      <div class="filter-btn">RECEIVED</div>
    </div>

    <!-- Category Chips -->
    <div class="cat-chips">
      <div class="chip active">ALL CATS</div>
      <div class="chip">FOOD</div>
      <div class="chip">MOVE</div>
      <div class="chip">SHOP</div>
      <div class="chip">FUN</div>
      <div class="chip">BILLS</div>
    </div>

    <!-- Group 1: TODAY -->
    <div class="feed-group-title">TODAY</div>
    <div class="tx-card">
      <div class="tx-main">
        <div>
          <div class="tx-name">Swiggy Instamart</div>
          <div class="tx-quote">"the 3rd order today" · FOOD · sms</div>
        </div>
        <div class="tx-val">−₹487</div>
      </div>
      <div class="reactions-row">
        <div class="react-btn active">💀</div>
        <div class="react-btn">😭</div>
        <div class="react-btn">🫡</div>
        <div class="react-btn">📉</div>
        <div class="react-btn">🔥</div>
      </div>
    </div>

    <!-- Group 2: YESTERDAY -->
    <div class="feed-group-title">YESTERDAY</div>
    <div class="tx-card">
      <div class="tx-main">
        <div>
          <div class="tx-name">BookMyShow</div>
          <div class="tx-quote">"F1 tickets, solo" · FUN · sms</div>
        </div>
        <div class="tx-val">−₹920</div>
      </div>
    </div>
    <div class="tx-card">
      <div class="tx-main">
        <div>
          <div class="tx-name">Zepto</div>
          <div class="tx-quote">"1 maggi, 1 redbull" · FOOD · sms</div>
        </div>
        <div class="tx-val">−₹312</div>
      </div>
    </div>

    <!-- Group 3: THIS WEEK -->
    <div class="feed-group-title">THIS WEEK</div>
    <div class="tx-card">
      <div class="tx-main">
        <div>
          <div class="tx-name">Myntra</div>
          <div class="tx-quote">"the cart finally won" · SHOP</div>
        </div>
        <div class="tx-val">−₹2,750</div>
      </div>
    </div>
    <div class="tx-card">
      <div class="tx-main">
        <div>
          <div class="tx-name">Salary</div>
          <div class="tx-quote">"gone by the 9th" · TRANSFER</div>
        </div>
        <div class="tx-val credit">+₹65,000</div>
      </div>
    </div>

  </div>
  {get_tab_bar_html('feed')}
</body>
</html>
"""

# ================= SCREEN 3: INSIGHTS =================
def build_screen_insights():
    return f"""
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
{SHARED_CSS}
.cope-meter {{
  display: flex;
  gap: 8px;
  margin: 20px 0 24px;
}}
.meter-block {{
  flex: 1;
  height: 16px;
  border-radius: 4px;
  background: var(--card-el);
}}
.meter-block.lit {{
  background: var(--red);
}}
.roast-card {{
  background: var(--card);
  border: 2px solid var(--line);
  border-radius: 26px;
  padding: 32px;
  margin-bottom: 20px;
}}
.roast-tag {{
  font-family: var(--mono);
  font-size: 20px;
  font-weight: 700;
  color: var(--red);
  letter-spacing: 0.1em;
  margin-bottom: 8px;
}}
.roast-line {{
  font-size: 32px;
  font-weight: 700;
  line-height: 1.35;
  letter-spacing: -0.01em;
}}
.roast-sub {{
  font-size: 24px;
  color: var(--dim);
  font-style: italic;
  margin-top: 8px;
}}
.suspect-row {{
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 0;
  border-bottom: 1.5px dashed var(--line);
}}
.suspect-row:last-child {{
  border-bottom: none;
}}
</style>
</head>
<body>
  {STATUS_BAR_HTML}
  <div class="content">
    <div class="screen-header">
      <div style="font-family:var(--display); font-weight:800; font-size:52px; letter-spacing:-0.01em;">the damage</div>
      <span class="mono-label" style="font-size:24px; color:var(--text);">&lt; NOV 2026 &gt;</span>
    </div>

    <!-- Cope Overview -->
    <div class="card-hero">
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div>
          <span class="mono-label">total damage · nov</span>
          <div style="font-family:var(--display); font-weight:800; font-size:96px; letter-spacing:0.02em; font-variant-numeric:tabular-nums; margin:6px 0;"><span style="font-size:0.88em; margin-right:6px;">₹</span>47,100</div>
        </div>
        <span class="pill" style="transform:rotate(-2deg); font-size:20px;">FINANCIALLY FERAL</span>
      </div>

      <div class="cope-meter">
        <div class="meter-block lit"></div>
        <div class="meter-block lit"></div>
        <div class="meter-block lit"></div>
        <div class="meter-block lit"></div>
        <div class="meter-block lit"></div>
        <div class="meter-block lit"></div>
        <div class="meter-block lit"></div>
        <div class="meter-block lit"></div>
        <div class="meter-block lit"></div>
        <div class="meter-block"></div>
        <div class="meter-block"></div>
        <div class="meter-block"></div>
      </div>

      <div style="font-family:var(--sans); font-size:28px; color:var(--dim); font-style:italic;">
        "you spent 72% of your income. The rest is also gone, you just don't know it yet."
      </div>
    </div>

    <!-- AI Unhinged Roast Section -->
    <span class="mono-label" style="margin-bottom:16px;">the unhinged verdict · ai analysis</span>

    <div class="roast-card">
      <div class="roast-tag">FOOD &amp; SWIGGY</div>
      <div class="roast-line">₹12,400 on food. You ate the rent, basically.</div>
      <div class="roast-sub">that's 24% of everything · 31 orders · 8 past midnight</div>
    </div>

    <div class="roast-card">
      <div class="roast-tag">SHELTER</div>
      <div class="roast-line">₹18k for a room you only sleep in. Shelter is a scam but ok king 🫡</div>
      <div class="roast-sub">28% of total income · rent hike incoming</div>
    </div>

    <div class="roast-card">
      <div class="roast-tag">GYM &amp; HEALTH</div>
      <div class="roast-line">₹1,499 to Cult.fit. 0 visits. You bought the idea of being healthy.</div>
      <div class="roast-sub">cost per workout: ∞ · the dream lives on</div>
    </div>

    <!-- Suspects -->
    <div class="card" style="margin-top:10px;">
      <span class="mono-label" style="margin-bottom:12px; display:block;">repeat suspects · 3+ times this month</span>
      <div class="suspect-row">
        <span style="font-size:30px; font-weight:700;">Swiggy</span>
        <span style="font-family:var(--mono); font-size:26px; color:var(--red);">14x · ₹8,240</span>
      </div>
      <div class="suspect-row">
        <span style="font-size:30px; font-weight:700;">Zepto</span>
        <span style="font-family:var(--mono); font-size:26px; color:var(--red);">9x · ₹3,410</span>
      </div>
      <div class="suspect-row">
        <span style="font-size:30px; font-weight:700;">Uber</span>
        <span style="font-family:var(--mono); font-size:26px; color:var(--dim);">8x · ₹1,840</span>
      </div>
    </div>

  </div>
  {get_tab_bar_html('damage')}
</body>
</html>
"""

# ================= SCREEN 4: BUDGETS =================
def build_screen_budgets():
    return f"""
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
{SHARED_CSS}
.plan-vs-real {{
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-top: 10px;
}}
.plan-num {{
  font-family: var(--display);
  font-weight: 800;
  font-size: 72px;
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;
}}
.plan-num .curr {{
  font-size: 0.88em;
  margin-right: 4px;
}}
.budget-bar-bg {{
  height: 18px;
  border-radius: 9px;
  background: var(--card-el);
  overflow: hidden;
  margin: 12px 0 8px;
}}
.budget-bar-fill {{
  height: 100%;
  border-radius: 9px;
  background: var(--line-strong);
}}
.budget-bar-fill.over {{
  background: var(--red);
}}
.budget-bar-fill.warn {{
  background: #F59E0B;
}}
.budget-item {{
  padding: 24px 0;
  border-bottom: 2px dashed var(--line);
}}
.budget-item:last-child {{
  border-bottom: none;
}}
</style>
</head>
<body>
  {STATUS_BAR_HTML}
  <div class="content">
    <div class="screen-header">
      <div>
        <div style="font-family:var(--display); font-weight:800; font-size:52px; letter-spacing:-0.01em;">delusions</div>
        <div style="font-size:26px; color:var(--dim); margin-top:4px;">the limits you set · vs reality</div>
      </div>
      <span class="pill pill-acid">6 DAYS LEFT</span>
    </div>

    <!-- Summary Card -->
    <div class="card-hero">
      <div class="plan-vs-real">
        <div>
          <span class="mono-label">the plan</span>
          <div class="plan-num" style="color:var(--text);"><span class="curr">₹</span>38,000</div>
        </div>
        <div style="text-align:right;">
          <span class="mono-label">the reality</span>
          <div class="plan-num" style="color:var(--red);"><span class="curr">₹</span>47,100</div>
        </div>
      </div>

      <div style="margin: 22px 0 16px;">
        <span class="pill" style="transform:rotate(-1deg); font-size:22px; display:inline-block;">OVER BY 24% · A BOLD STRATEGY</span>
      </div>

      <div style="font-family:var(--mono); font-size:26px; color:var(--dim); padding-top:14px; border-top:1.5px dashed var(--line-strong);">
        6 days to payday · ₹1,130 left to burn / day
      </div>
    </div>

    <!-- Budget List -->
    <div class="card">
      <span class="mono-label" style="display:block; margin-bottom:14px;">per-category delusion check</span>

      <div class="budget-item">
        <div style="display:flex; justify-content:space-between; align-items:baseline;">
          <span style="font-size:32px; font-weight:700;">Food &amp; Swiggy</span>
          <span style="font-family:var(--mono); font-size:28px; color:var(--red); font-weight:700;">₹8,400 <span style="font-size:22px; color:var(--dim);">/ ₹6,000</span></span>
        </div>
        <div class="budget-bar-bg"><div class="budget-bar-fill over" style="width:100%;"></div></div>
        <div style="display:flex; justify-content:space-between; font-family:var(--mono); font-size:20px; color:var(--red);">
          <span>140% BLOWN PAST IT</span>
          <span>+₹2,400 OVER</span>
        </div>
      </div>

      <div class="budget-item">
        <div style="display:flex; justify-content:space-between; align-items:baseline;">
          <span style="font-size:32px; font-weight:700;">Rent</span>
          <span style="font-family:var(--mono); font-size:28px; font-weight:700;">₹18,000 <span style="font-size:22px; color:var(--dim);">/ ₹18,000</span></span>
        </div>
        <div class="budget-bar-bg"><div class="budget-bar-fill" style="width:100%;"></div></div>
        <div style="display:flex; justify-content:space-between; font-family:var(--mono); font-size:20px; color:var(--faint);">
          <span>100% LOCKED IN</span>
          <span>EXACT MATCH</span>
        </div>
      </div>

      <div class="budget-item">
        <div style="display:flex; justify-content:space-between; align-items:baseline;">
          <span style="font-size:32px; font-weight:700;">Shopping</span>
          <span style="font-family:var(--mono); font-size:28px; color:#F59E0B; font-weight:700;">₹3,800 <span style="font-size:22px; color:var(--dim);">/ ₹4,000</span></span>
        </div>
        <div class="budget-bar-bg"><div class="budget-bar-fill warn" style="width:95%;"></div></div>
        <div style="display:flex; justify-content:space-between; font-family:var(--mono); font-size:20px; color:#F59E0B;">
          <span>95% CLOSE TO EDGE</span>
          <span>₹200 LEFT</span>
        </div>
      </div>

      <div class="budget-item">
        <div style="display:flex; justify-content:space-between; align-items:baseline;">
          <span style="font-size:32px; font-weight:700;">Cabs &amp; Autos</span>
          <span style="font-family:var(--mono); font-size:28px; color:var(--red); font-weight:700;">₹2,200 <span style="font-size:22px; color:var(--dim);">/ ₹2,000</span></span>
        </div>
        <div class="budget-bar-bg"><div class="budget-bar-fill over" style="width:100%;"></div></div>
        <div style="display:flex; justify-content:space-between; font-family:var(--mono); font-size:20px; color:var(--red);">
          <span>110% RAIN SURCHARGE</span>
          <span>+₹200 OVER</span>
        </div>
      </div>

    </div>

  </div>
  {get_tab_bar_html('budget')}
</body>
</html>
"""

# ================= SCREEN 5: PRO =================
def build_screen_pro():
    return f"""
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
{SHARED_CSS}
.pro-modal {{
  background: var(--surface);
  border-top: 3px solid var(--line-strong);
  border-radius: 48px 48px 0 0;
  padding: 40px 48px;
  flex: 1;
  display: flex;
  flex-direction: column;
}}
.drag-handle {{
  width: 90px;
  height: 10px;
  border-radius: 5px;
  background: var(--line-strong);
  margin: 0 auto 30px;
}}
.perk-row {{
  display: flex;
  align-items: flex-start;
  gap: 20px;
  padding: 18px 0;
  border-bottom: 1.5px dashed var(--line);
}}
.perk-tag {{
  font-family: var(--mono);
  font-weight: 700;
  font-size: 22px;
  color: var(--red);
  letter-spacing: 0.08em;
  min-width: 130px;
}}
.perk-desc {{
  font-size: 28px;
  color: var(--text);
  line-height: 1.35;
}}
.plan-card {{
  border: 2.5px solid var(--line-strong);
  background: var(--card);
  border-radius: 24px;
  padding: 28px 32px;
  margin-bottom: 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}}
.plan-card.active {{
  border-color: var(--red);
  background: rgba(255, 84, 54, 0.08);
}}
.plan-name {{
  font-size: 34px;
  font-weight: 700;
}}
.plan-price {{
  font-family: var(--display);
  font-weight: 800;
  font-size: 46px;
}}
.btn-cta {{
  background: var(--red);
  color: #fff;
  border: none;
  border-radius: 18px;
  padding: 30px;
  font-family: var(--mono);
  font-weight: 700;
  font-size: 28px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  text-align: center;
  margin-top: 24px;
}}
</style>
</head>
<body style="background: rgba(0,0,0,0.7);">
  {STATUS_BAR_HTML}
  <div style="height: 120px;"></div>
  <div class="pro-modal">
    <div class="drag-handle"></div>

    <div style="display:flex; align-items:center; gap:16px; margin-bottom:12px;">
      {TALLY_MARK_SVG}
      <span class="pill" style="font-size:22px;">PRO</span>
    </div>
    <div style="font-family:var(--display); font-weight:800; font-size:68px; letter-spacing:-0.01em;">tally pro.</div>
    <div style="font-size:30px; color:var(--dim); margin-bottom:28px;">you know it's bad. Make it official.</div>

    <!-- Perks -->
    <div style="margin-bottom:30px;">
      <div class="perk-row">
        <span class="perk-tag">FULL HISTORY</span>
        <span class="perk-desc">every transaction forever, not just 30 days. Remember every mistake.</span>
      </div>
      <div class="perk-row">
        <span class="perk-tag">AI++ ROASTS</span>
        <span class="perk-desc">unlimited unhinged verdicts + weekly spending debriefs.</span>
      </div>
      <div class="perk-row">
        <span class="perk-tag">BROKE STREAK</span>
        <span class="perk-desc">live home-screen widget to keep you perpetually humble.</span>
      </div>
      <div class="perk-row">
        <span class="perk-tag">AUTO-CAPTURE</span>
        <span class="perk-desc">reads bank &amp; UPI notifications in background. Zero manual logging.</span>
      </div>
    </div>

    <!-- Pricing selection -->
    <div class="plan-card active">
      <div>
        <div style="display:flex; align-items:center; gap:12px;">
          <span class="plan-name">Yearly</span>
          <span class="pill pill-acid" style="font-size:18px; padding:4px 12px;">SAVE 37%</span>
        </div>
        <div style="font-size:24px; color:var(--dim); margin-top:4px;">₹125 / month · billed annually</div>
      </div>
      <div class="plan-price">₹1,499<span style="font-size:24px; color:var(--dim);">/yr</span></div>
    </div>

    <div class="plan-card">
      <div>
        <span class="plan-name">Monthly</span>
        <div style="font-size:24px; color:var(--dim); margin-top:4px;">cancel anytime</div>
      </div>
      <div class="plan-price">₹199<span style="font-size:24px; color:var(--dim);">/mo</span></div>
    </div>

    <!-- CTA -->
    <div class="btn-cta">START 7-DAY FREE TRIAL</div>
    <div style="text-align:center; font-family:var(--mono); font-size:20px; color:var(--faint); margin-top:16px;">
      cancel anytime in Google Play · restore purchases
    </div>
  </div>
</body>
</html>
"""

# ================= SCREEN 6: SETTINGS =================
def build_screen_settings():
    return f"""
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
{SHARED_CSS}
.setting-row {{
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 26px 0;
  border-bottom: 2px dashed var(--line);
}}
.setting-row:last-child {{
  border-bottom: none;
}}
.setting-label {{
  font-size: 32px;
  font-weight: 600;
}}
.setting-sub {{
  font-size: 24px;
  color: var(--dim);
  margin-top: 6px;
}}
.toggle {{
  width: 90px;
  height: 52px;
  border-radius: 999px;
  background: var(--red);
  position: relative;
}}
.toggle-knob {{
  position: absolute;
  top: 5px;
  right: 5px;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: #fff;
}}
.seg-control {{
  display: flex;
  background: var(--chip);
  padding: 6px;
  border-radius: 999px;
  gap: 8px;
}}
.seg-btn {{
  padding: 10px 22px;
  border-radius: 999px;
  font-family: var(--mono);
  font-weight: 700;
  font-size: 20px;
  color: var(--dim);
  text-transform: uppercase;
}}
.seg-btn.active {{
  background: var(--red);
  color: #fff;
}}
</style>
</head>
<body>
  {STATUS_BAR_HTML}
  <div class="content">
    <div class="screen-header">
      <div>
        <div style="font-family:var(--display); font-weight:800; font-size:52px; letter-spacing:-0.01em;">settings</div>
        <div style="font-size:26px; color:var(--dim); margin-top:4px;">aditya@gmail.com</div>
      </div>
      <span class="pill">PRO ACTIVE</span>
    </div>

    <!-- Capture Section -->
    <div class="card" style="margin-bottom:28px;">
      <span class="mono-label" style="display:block; margin-bottom:8px;">capture source</span>
      <div class="setting-row">
        <div>
          <div class="setting-label">Auto-capture notifications</div>
          <div class="setting-sub">Listens to bank SMS &amp; UPI notifications in real time</div>
        </div>
        <div class="toggle"><div class="toggle-knob"></div></div>
      </div>
      <div class="setting-row">
        <div>
          <div class="setting-label">Monthly income target</div>
          <div class="setting-sub">Used for cope ratio &amp; burn rate</div>
        </div>
        <span style="font-family:var(--mono); font-size:30px; font-weight:700;">₹65,000</span>
      </div>
    </div>

    <!-- Personality Section -->
    <div class="card" style="margin-bottom:28px;">
      <span class="mono-label" style="display:block; margin-bottom:8px;">ai personality</span>
      <div class="setting-row">
        <div>
          <div class="setting-label">AI roast voice</div>
          <div class="setting-sub">How brutal the analysis gets</div>
        </div>
        <div class="seg-control">
          <div class="seg-btn">DRY</div>
          <div class="seg-btn active">UNHINGED</div>
        </div>
      </div>
      <div class="setting-row">
        <div>
          <div class="setting-label">Nihilism dial</div>
          <div class="setting-sub">Financial optimism vs doom</div>
        </div>
        <div class="seg-control">
          <div class="seg-btn">1</div>
          <div class="seg-btn">2</div>
          <div class="seg-btn active">MAX</div>
        </div>
      </div>
    </div>

    <!-- Privacy Section -->
    <div class="card">
      <span class="mono-label" style="display:block; margin-bottom:8px;">data &amp; privacy</span>
      <div class="setting-row">
        <div>
          <div class="setting-label">Raw message storage</div>
          <div class="setting-sub">Only transaction amounts &amp; merchants saved</div>
        </div>
        <span style="font-family:var(--mono); font-size:24px; color:var(--acid); font-weight:700;">ZERO STORED ✓</span>
      </div>
      <div class="setting-row">
        <div>
          <div class="setting-label">Export all data</div>
          <div class="setting-sub">Download complete CSV file of all transactions</div>
        </div>
        <span class="pill pill-acid" style="font-size:18px;">EXPORT CSV</span>
      </div>
      <div class="setting-row">
        <div>
          <div class="setting-label" style="color:var(--red);">Delete account</div>
          <div class="setting-sub">Permanently wipe all transactions from database</div>
        </div>
        <span style="font-family:var(--mono); font-size:22px; color:var(--red); font-weight:700;">WIPE DATA</span>
      </div>
    </div>

  </div>
  {get_tab_bar_html('you')}
</body>
</html>
"""

# ================= STORE SHOWCASE SLIDES (1080 x 2280) =================
def build_store_slide(kicker, title, subtitle, inner_html):
    return f"""
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap');

* {{
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  -webkit-font-smoothing: antialiased;
}}

body {{
  background: radial-gradient(circle at 50% 15%, #1c1f14 0%, #0c0d0a 100%);
  color: #F2F3EC;
  font-family: 'Space Grotesk', sans-serif;
  width: 1080px;
  height: 2280px;
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 100px 60px 0;
}}

.marketing-header {{
  text-align: center;
  margin-bottom: 70px;
  z-index: 10;
}}
.kicker {{
  font-family: 'Space Mono', monospace;
  font-weight: 700;
  font-size: 24px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: #FF5436;
  margin-bottom: 20px;
  display: inline-block;
  background: rgba(255, 84, 54, 0.12);
  padding: 8px 24px;
  border-radius: 8px;
  border: 1.5px solid rgba(255, 84, 54, 0.25);
}}
.title {{
  font-family: 'Bricolage Grotesque', sans-serif;
  font-weight: 800;
  font-size: 78px;
  line-height: 1.05;
  letter-spacing: -0.015em;
  margin-bottom: 18px;
  color: #F2F3EC;
}}
.title span {{
  color: #FF5436;
}}
.subtitle {{
  font-size: 34px;
  color: #9DA08F;
  max-width: 860px;
  line-height: 1.4;
  margin: 0 auto;
}}

/* Phone Bezel */
.phone-frame {{
  width: 880px;
  height: 1650px;
  background: #000;
  border-radius: 64px 64px 0 0;
  border: 14px solid #24261f;
  border-bottom: none;
  box-shadow: 0 40px 100px rgba(0, 0, 0, 0.9), 0 0 80px rgba(212, 255, 46, 0.08);
  overflow: hidden;
  position: relative;
}}
.phone-inner {{
  width: 1080px;
  height: 2400px;
  transform: scale(0.79);
  transform-origin: top left;
  pointer-events: none;
}}
</style>
</head>
<body>
  <div class="marketing-header">
    <div class="kicker">{kicker}</div>
    <div class="title">{title}</div>
    <div class="subtitle">{subtitle}</div>
  </div>

  <div class="phone-frame">
    <div class="phone-inner">
      <iframe srcdoc="{inner_html.replace('"', '&quot;')}" style="width:1080px; height:2400px; border:none;"></iframe>
    </div>
  </div>
</body>
</html>
"""

# ================= FEATURE GRAPHIC (1024 x 500) =================
def build_feature_graphic():
    return f"""
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap');

* {{
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}}

body {{
  width: 1024px;
  height: 500px;
  background: radial-gradient(circle at 75% 50%, #1f2316 0%, #0E0F0C 75%);
  color: #F2F3EC;
  font-family: 'Space Grotesk', sans-serif;
  overflow: hidden;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 70px;
}}

.left-panel {{
  max-width: 520px;
  z-index: 10;
}}
.brand-row {{
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 18px;
}}
.brand-name {{
  font-family: 'Bricolage Grotesque', sans-serif;
  font-weight: 800;
  font-size: 46px;
  letter-spacing: -0.01em;
}}
.kicker {{
  font-family: 'Space Mono', monospace;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #fff;
  background: #FF5436;
  padding: 6px 14px;
  border-radius: 4px;
}}
.tagline {{
  font-family: 'Bricolage Grotesque', sans-serif;
  font-weight: 800;
  font-size: 52px;
  line-height: 1.05;
  letter-spacing: -0.015em;
  margin-bottom: 16px;
}}
.tagline span {{
  color: #FF5436;
}}
.desc {{
  font-size: 19px;
  color: #9DA08F;
  line-height: 1.45;
}}
.right-panel {{
  position: relative;
  width: 400px;
  height: 500px;
  display: flex;
  align-items: center;
  justify-content: center;
}}
.floating-card {{
  position: absolute;
  background: #15160E;
  border: 2px solid rgba(233, 255, 208, 0.18);
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 30px 60px rgba(0,0,0,0.8);
  width: 320px;
}}
.card-1 {{
  top: 60px;
  right: 20px;
  transform: rotate(4deg);
}}
.card-2 {{
  bottom: 50px;
  left: 0;
  transform: rotate(-5deg);
  background: #181A12;
  border-color: #FF5436;
}}
</style>
</head>
<body>
  <div class="left-panel">
    <div class="brand-row">
      {TALLY_MARK_SVG}
      <span class="brand-name">tally</span>
      <span class="kicker">coming soon</span>
    </div>
    <div class="tagline">track the damage.<br><span>Financially feral.</span></div>
    <div class="desc">A snarky AI money manager that reads your bank SMS, logs every spend, and is deeply unbothered about your feelings.</div>
  </div>

  <div class="right-panel">
    <!-- Floating Card 1 -->
    <div class="floating-card card-1">
      <div style="font-family:'Space Mono'; font-size:11px; color:#63655A; text-transform:uppercase; letter-spacing:0.1em;">the damage so far</div>
      <div style="font-family:'Bricolage Grotesque'; font-size:44px; font-weight:800; letter-spacing:0.02em; font-variant-numeric:tabular-nums; margin:4px 0 8px;"><span style="font-size:0.88em; margin-right:4px;">₹</span>47,100</div>
      <div style="font-size:13px; color:#9DA08F; font-style:italic;">"₹18,400 on food. You ate the rent, basically."</div>
    </div>

    <!-- Floating Card 2 -->
    <div class="floating-card card-2">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
        <span style="font-family:'Space Mono'; font-size:11px; color:#FF5436; font-weight:700;">LIVE CAPTURE</span>
        <span style="font-family:'Space Mono'; font-size:12px; font-weight:700;">−₹487</span>
      </div>
      <div style="font-weight:700; font-size:17px;">Swiggy Instamart</div>
      <div style="font-size:12px; color:#9DA08F; font-style:italic;">"the 3rd order today" · FOOD</div>
    </div>
  </div>
</body>
</html>
"""

def capture_screenshot(html_path, output_png_path, width, height):
    abs_html = Path(html_path).resolve()
    abs_png = Path(output_png_path).resolve()
    cmd = [
        CHROME_PATH,
        "--headless=new",
        "--no-sandbox",
        "--disable-gpu",
        f"--screenshot={abs_png}",
        f"--window-size={width},{height}",
        "--hide-scrollbars",
        f"file:///{str(abs_html).replace(os.sep, '/')}"
    ]
    subprocess.run(cmd, check=True)
    print(f"Generated: {abs_png.name} ({width}x{height})")

def main():
    tmp_dir = BASE_DIR / "scripts" / "tmp_html"
    tmp_dir.mkdir(parents=True, exist_ok=True)

    screens = [
        ("01_dashboard", build_screen_dashboard, "DASHBOARD", "TRACK THE DAMAGE.", "Auto-logs every spend. Roasts you for it."),
        ("02_feed", build_screen_feed, "ZERO MANUAL ENTRY", "THE LIVE FEED.", "Reads bank SMS & UPI notifications in real-time."),
        ("03_insights", build_screen_insights, "AI ROAST & ANALYSIS", "UNFILTERED TRUTH.", "An AI that roasts your spending habits without mercy."),
        ("04_budgets", build_screen_budgets, "BUDGETS VS REALITY", "SET YOUR DELUSIONS.", "Delusion limits vs the cold, hard reality."),
        ("05_pro", build_screen_pro, "TALLY PRO", "GO FULL PRO.", "Unlimited history, deep roasts & the broke-streak widget."),
        ("06_settings", build_screen_settings, "PRIVACY FIRST", "YOUR DATA STAYS YOURS.", "Zero raw messages saved. Verified on-device parsing."),
    ]

    # 1. Generate Raw Screenshots (1080 x 2400)
    for name, builder, kicker, title, sub in screens:
        html = builder()
        html_file = tmp_dir / f"{name}.html"
        html_file.write_text(html, encoding="utf-8")
        out_png = RAW_DIR / f"{name}.png"
        capture_screenshot(html_file, out_png, 1080, 2400)

    # 2. Generate Store Showcase Cards (1080 x 2280)
    for name, builder, kicker, title, sub in screens:
        inner_html = builder()
        slide_html = build_store_slide(kicker, title, sub, inner_html)
        slide_file = tmp_dir / f"store_{name}.html"
        slide_file.write_text(slide_html, encoding="utf-8")
        out_png = STORE_DIR / f"store_{name}.png"
        capture_screenshot(slide_file, out_png, 1080, 2280)

    # 3. Generate Feature Graphic (1024 x 500)
    fg_html = build_feature_graphic()
    fg_file = tmp_dir / "feature_graphic.html"
    fg_file.write_text(fg_html, encoding="utf-8")
    fg_png = DOCS_DIR / "feature_graphic.png"
    capture_screenshot(fg_file, fg_png, 1024, 500)

    # Cleanup temp html files
    for f in tmp_dir.glob("*.html"):
        try:
            f.unlink()
        except:
            pass
    try:
        tmp_dir.rmdir()
    except:
        pass

    print("\nAll phone screenshots and marketing graphics created successfully!")

if __name__ == "__main__":
    main()
