<p align="center"><img src="icons/icon-128.png" width="96" alt="Cookie Manager Pro logo"></p>

<h1 align="center">Cookie Manager Pro</h1>

<p align="center">
  View, edit, protect, clean and back up your cookies in Firefox - with full container support.<br>
  <b>100% offline. Zero data collection. Zero dependencies.</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Firefox-140%2B-orange?logo=firefox" alt="Firefox 140+">
  <img src="https://img.shields.io/badge/version-3.1.0-blue" alt="Version 3.1.0">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="MIT">
</p>

---

## Screenshots

<p align="center">
  <img src="docs/screenshots/cookies-light.png" width="260" alt="Cookie list with current site card and container tags">
  <img src="docs/screenshots/overview-dark.png" width="260" alt="Overview with privacy score and container breakdown">
  <img src="docs/screenshots/live-dark.png" width="260" alt="Live monitor of cookie changes">
</p>
<p align="center">
  <img src="docs/screenshots/editor-light.png" width="260" alt="Cookie editor">
  <img src="docs/screenshots/backup-light.png" width="260" alt="Backup tab with export options">
</p>

## Features

| Tab | What you can do |
|-----|-----------------|
| **Cookies** | Search (text or regex), filter by container / site / type, sort, multi-select, edit, create, duplicate, protect, copy, delete with undo |
| **Overview** | Privacy score, cookies by type, by container, top sites (click to filter) |
| **Live** | Real-time feed of cookies created, updated and deleted by websites |
| **Backup** | Export (JSON, Netscape cookies.txt, CSV, HAR, optional AES-256 password), import with preview, profiles (snapshots), automatic backup |
| **Rules** | Automatic rules: delete or protect cookies by domain, name or regex, optional delay, per container |
| **History** | Log of every action, undo last deletion |

**Protected cookies** are restored automatically if a website or rule deletes them.

**Languages**: English, Francais, Espanol, Deutsch, Portugues, Italiano, Japanese, Chinese, Arabic (RTL).

## Keyboard shortcuts

| Keys | Action |
|------|--------|
| `Alt+Shift+C` | Open / close the sidebar |
| `/` | Search |
| `Del` | Delete selected cookies |
| `Ctrl+A` | Select all shown cookies |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+E` | Quick export |
| `Esc` | Close dialog |

## Install

**From Firefox Add-ons** (recommended): [**Get Cookie Manager Pro**](https://addons.mozilla.org/firefox/addon/cookie_manager/)

**Manual install** (temporary, until Firefox restarts):
1. Download this repository (green **Code** button > **Download ZIP**) and unzip it.
2. Open `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on** and pick the `manifest.json` file from the unzipped folder.

## Permissions

| Permission | Why |
|------------|-----|
| `cookies` | Read and write cookies |
| `<all_urls>` | Access cookies of every website |
| `contextualIdentities` | List Firefox containers |
| `tabs` | Know the current site |
| `storage` | Save rules, profiles and protected cookies |
| `clipboardWrite` | Copy cookie values |

## Privacy

Everything stays on your device. The extension makes **no network request**, has **no analytics** and uses **no third-party code**. Password-protected exports are encrypted with AES-256.

## License

[MIT](LICENSE) - made by [0XLUC4](https://github.com/0XLUC4)
