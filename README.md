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

## What's new in 3.1

- **Containers fixed** ([#1](https://github.com/0XLUC4/cookie_manager/issues/1)): cookies from every Firefox container are now loaded, filtered, edited and deleted in the right container.
- **Total Cookie Protection**: partitioned cookies are shown (tagged "Partitioned") and handled correctly.
- **New design**: rounded, modern interface with light / dark / system theme and smooth animations.
- **Current site card**: see, filter or clear the cookies of the tab you are on in one click.
- **Undo everywhere**: every deletion shows an "Undo" button.
- **Clear wording**: badges spelled out with explanations, help text in every section.
- **Translations actually applied**: switching language updates the whole interface instantly.
- Many fixes: double click handler, `Del` key while typing, timezone shift in the expiry editor, "Replace existing" import option ignored, Netscape `#HttpOnly_` lines, crash on large encrypted exports, unescaped HTML, shortcut conflicting with Firefox DevTools.

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

**From Firefox Add-ons**: search "Cookie Manager Pro" on [addons.mozilla.org](https://addons.mozilla.org).

**From source** (temporary, for testing):
1. Clone this repository.
2. Open `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on** and pick `manifest.json` at the root of the repo.

## Development

Requires Node.js 20+ and [pnpm](https://pnpm.io).

```bash
pnpm install      # installs web-ext
pnpm start        # launches a Firefox with the extension loaded, auto-reload on save
pnpm lint         # validates the extension like addons.mozilla.org does
pnpm build        # creates dist/cookie_manager_pro-3.1.0.zip
```

### Publish a new version from the console

1. Bump `version` in `manifest.json` (and `package.json`).
2. Create API keys once at <https://addons.mozilla.org/developers/addon/api/key/>.
3. Run:

```bash
WEB_EXT_API_KEY=user:xxxx WEB_EXT_API_SECRET=yyyy pnpm sign
```

On Windows PowerShell:

```powershell
$env:WEB_EXT_API_KEY="user:xxxx"; $env:WEB_EXT_API_SECRET="yyyy"; pnpm sign
```

`web-ext sign --channel=listed` uploads the build to addons.mozilla.org and submits it for review.

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

Everything stays on your device. The extension makes **no network request**, has **no analytics** and uses **no third-party code**. Password-protected exports use AES-256-GCM with a PBKDF2 key (310,000 iterations).

## Project structure

```
manifest.json        extension manifest
background.js        monitor, rules engine, protection, import
lib/cookies.js       shared container-aware cookie helpers
sidebar/             user interface (HTML, CSS, JS, translations)
icons/               extension icons
```

## License

[MIT](LICENSE) - made by [0XLUC4](https://github.com/0XLUC4)
