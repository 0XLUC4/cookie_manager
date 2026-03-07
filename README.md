# Cookie Manager Pro v3.0

[![GitHub](https://img.shields.io/badge/GitHub-0XLUC4-blue?logo=github)](https://github.com/0XLUC4/cookie_manager)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Firefox](https://img.shields.io/badge/Firefox-140%2B-orange?logo=firefox)](https://addons.mozilla.org)
[![Version](https://img.shields.io/badge/Version-3.0.0-blue)]()
[![Offline](https://img.shields.io/badge/100%25-Offline-success)]()

The most complete cookie manager for Firefox. Monitor, protect, clean, export/import, manage profiles, create rules, view dashboards and much more. **100% offline, zero external dependencies, zero data collection.**

---

## Features

### Cookies Tab
- View all cookies with **search & regex filter**
- **Advanced filters**: Secure, HttpOnly, Session, Tracker, Protected (combinable)
- **Sort** by name, domain, expiration date, or value size
- **Multi-select** with checkboxes for bulk actions (delete, export)
- Edit cookie values, path, expiration, SameSite, Secure, HttpOnly
- **Create cookies** from scratch with full control
- **Clone** existing cookies to other domains
- **Protect cookies** (lock icon) to prevent accidental deletion
- Protected cookies are **auto-restored** if removed
- **Copy value** to clipboard in one click
- Compact / Detailed view toggle
- **Firefox Container** support (Multi-Account Containers)
- Container color badge on each cookie
- Filter by container
- **Tracker detection** with customizable blocklist
- **Clean all trackers** in one click
- **Clean expired cookies** in one click

### Dashboard Tab
- **Total cookies**, trackers, secure, session count
- **Privacy Score** with animated SVG ring (based on secure %, HttpOnly %, tracker %)
- **Top 10 domains** bar chart (pure CSS)
- **Cookies by type** pie chart (pure SVG, zero libraries)
- **Estimated cookie size** with visual bar

### Monitor Tab (Real-time)
- **Live monitoring** of cookie changes via `browser.cookies.onChanged`
- Events: Created, Deleted, Updated with color-coded badges
- **Session counters** for each event type
- Filter by event type (All / Created / Deleted)
- Pause / Resume monitoring
- Clear log

### Export Tab
- **4 formats**: JSON, Netscape (cookies.txt), CSV, HAR
- **AES-256-GCM encryption** with PBKDF2 key derivation (100,000 iterations)
- Filter by current site, custom domain, or exclude trackers
- **Copy to clipboard** button (JSON)
- Cookie count stats (total vs selected)
- Keyboard shortcut: `Ctrl+Shift+E`

### Import Tab
- **Drag & drop** or click to select
- Supports **JSON, Netscape, CSV, HAR** formats
- Supports encrypted `.cookiejar` files
- **Preview** cookies before importing
- Overwrite or merge options
- Import stats (imported / failed)

### Profiles Tab
- **Save** cookie snapshots as named profiles
- **Load** profiles instantly (re-import all cookies)
- **Download** profiles as JSON files
- **Delete** profiles
- **Compare profiles** side by side (diff view)
  - Shows added (green), removed (red), modified (orange) cookies
- **Auto-backup**: hourly, every 6 hours, daily, or weekly

### Rules Tab (Automatic Rule Engine)
- Create rules with conditions:
  - **Domain contains** a string
  - **Name contains** a string
  - **Regex match** on name or domain
- Actions: **Delete** or **Protect**
- Optional **delay** (in minutes) before executing action
- Enable/disable individual rules
- **Import/Export rules** as JSON
- Rules are executed automatically by the background script

### History Tab
- Full **action log**: delete, import, export, edit, protect, clean
- Timestamped entries with color-coded action badges
- **Undo** last deletion (single or bulk)

### Settings
- **9 languages**: English, Francais, Espanol, Deutsch, Portugues, Italiano, Japanese, Chinese, Arabic
- **Auto-detect** browser language
- **RTL support** for Arabic
- Customizable **tracker domain list**
- Light / Dark theme toggle
- **Keyboard shortcuts**:
  - `Ctrl+Shift+E` - Quick export
  - `Ctrl+Shift+I` - Open sidebar
  - `Del` - Delete selected cookies
  - `Ctrl+A` - Select all (when cookie list focused)
  - `Ctrl+C` - Copy cookie value
  - `Ctrl+Z` - Undo last action
  - `Escape` - Close modals

---

## Security

| Feature | Detail |
|---------|--------|
| Encryption | **AES-256-GCM** (military-grade) |
| Key derivation | **PBKDF2** with 100,000 iterations |
| Salt & IV | Random 16-byte salt + 12-byte IV per encryption |
| Data storage | 100% local (`localStorage` + `browser.storage.local`) |
| Network | **Zero** network requests, ever |
| Telemetry | **None** - zero data collection |
| Open source | Fully auditable code |

---

## Permissions

| Permission | Purpose |
|------------|---------|
| `cookies` | Read and write browser cookies |
| `storage` | Save settings, profiles, rules, and protected cookies |
| `contextualIdentities` | Access Firefox container information |
| `clipboardWrite` | Copy cookie values to clipboard |
| `tabs` | Get current tab URL for domain filtering |
| `<all_urls>` | Access cookies from all websites |

---

## Installation

### From Firefox Add-ons (Recommended)
1. Visit [addons.mozilla.org](https://addons.mozilla.org)
2. Search "Cookie Manager Pro"
3. Click "Add to Firefox"

### Manual Installation (Development)
1. Download or clone this repository
2. Go to `about:debugging#/runtime/this-firefox` in Firefox
3. Click "Load Temporary Add-on"
4. Select `manifest.json` from the `cookie-manager-extension` folder

---

## Usage

1. Click the extension icon or press `Ctrl+Shift+I` to open the sidebar
2. **Cookies**: Browse, search (regex supported), filter, edit, delete, protect
3. **Dashboard**: View privacy score, top domains, cookie analytics
4. **Monitor**: Watch cookies being created/deleted in real-time
5. **Export**: Choose format (JSON/Netscape/CSV/HAR), encrypt if needed
6. **Import**: Drop file or click to browse, preview before importing
7. **Profiles**: Save/load/compare cookie snapshots
8. **Rules**: Set up automatic cookie management rules
9. **History**: Review all actions, undo deletions

---

## Privacy Policy

This extension:
- Works **100% offline**
- Stores all data **locally** on your device
- Does **NOT** collect any data
- Does **NOT** send anything to any server
- Does **NOT** track users
- Does **NOT** include any external libraries or CDNs
- Contains **zero** third-party code

---

## Tech Stack

- Pure **JavaScript** (ES6+, no frameworks)
- Pure **CSS** (no libraries, CSS variables for theming)
- Pure **SVG** for charts and icons (no chart libraries)
- **Web Crypto API** for AES-256-GCM encryption
- Firefox **WebExtension API** (Manifest V2)

---

## Contributing

Contributions welcome!
- Star the repo
- Report bugs via [Issues](https://github.com/0XLUC4/cookie_manager/issues)
- Suggest features
- Submit pull requests

---

## Links

- **GitHub**: [github.com/0XLUC4/cookie_manager](https://github.com/0XLUC4/cookie_manager)
- **Author**: [@0XLUC4](https://github.com/0XLUC4)

## License

MIT License - Free to use, modify and distribute.

---

Made with passion by [0XLUC4](https://github.com/0XLUC4)
