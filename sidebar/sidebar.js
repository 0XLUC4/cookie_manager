/**
 * Cookie Manager Pro v3.1 - Sidebar UI
 * Depends on ../lib/cookies.js (cookie helpers) and i18n.js (t, setLanguage, applyTranslations).
 * 100% offline - zero external dependencies.
 */

const DEFAULT_TRACKERS = [
  'google-analytics.com', 'doubleclick.net', 'facebook.net', 'googlesyndication.com',
  'googleadservices.com', 'amazon-adsystem.com', 'scorecardresearch.com', 'quantserve.com',
  'criteo.com', 'criteo.net', 'outbrain.com', 'taboola.com', 'adnxs.com', 'rubiconproject.com',
  'pubmatic.com', 'hotjar.com', 'mixpanel.com', 'segment.io', 'optimizely.com', 'bing.com',
  'clarity.ms', 'tiktok.com', 'adsrvr.org', 'casalemedia.com', 'openx.net', 'yieldmo.com'
];

const PAGE_SIZE = 100;
const PBKDF2_ITERATIONS = 310000;
const LEGACY_PBKDF2_ITERATIONS = 100000;
const NEUTRAL_COLOR = '#8d95a8';

const LS = {
  trackers: 'cookieManagerTrackers', theme: 'cookieManagerTheme', history: 'cookieManagerHistory',
  autoBackup: 'cookieManagerAutoBackup', lastBackup: 'cookieManagerLastBackup',
  compact: 'cookieManagerCompact', legacyProfiles: 'cookieManagerProfiles'
};

const $ = (id) => document.getElementById(id);

function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(text ?? '').replace(/[&<>"']/g, ch => map[ch]);
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) { return fallback; }
}

function writeJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { console.warn('[CookieManager] save failed', key, e); }
}

function icon(name) { return `<svg class="ic"><use href="#i-${name}"/></svg>`; }

function normalizeDomain(domain) { return String(domain || '').replace(/^\./, '').toLowerCase(); }

/** datetime-local value (local time) from unix seconds. */
function toLocalInputValue(seconds) {
  const date = new Date(seconds * 1000);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function formatDateStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}

function bytesToBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

function base64ToBytes(base64) {
  return Uint8Array.from(atob(base64), ch => ch.charCodeAt(0));
}

function downloadFile(content, fileName, type = 'application/octet-stream') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function isTypingTarget(el) {
  if (!el) return false;
  if (el.isContentEditable || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true;
  return el.tagName === 'INPUT' && !['checkbox', 'radio', 'button'].includes(el.type);
}

class CookieManager {
  constructor() {
    this.allCookies = [];
    this.cookieByKey = new Map();
    this.filteredCookies = [];
    this.selectedKeys = new Set();
    this.protectedKeys = new Set();
    this.stores = new Map();
    this.activeFilters = new Set();
    this.trackers = [];
    this.rules = [];
    this.profiles = [];
    this.history = [];
    this.undoStack = [];
    this.monitorEntries = [];
    this.monitorFilter = 'all';
    this.monitorPaused = false;
    this.site = null; // { host, site, storeId }
    this.siteOnly = false;
    this.regexMode = false;
    this.searchRegex = null;
    this.sortField = 'domain';
    this.sortAsc = true;
    this.renderLimit = PAGE_SIZE;
    this.editingCookie = null;
    this.pendingImport = null;
    this.pendingEncrypted = null;
    this.refreshTimer = null;
    this.refreshPending = false;
    this.monitorFrame = 0;
    this.lastFocus = null;
  }

  async init() {
    this.applyTheme(localStorage.getItem(LS.theme) || 'system');
    applyTranslations();
    this.populateLanguageSelect();
    this.initTabIndicator();
    this.bindEvents();
    this.loadTrackers();
    this.setCompact(localStorage.getItem(LS.compact) === '1');
    this.renderSkeleton();

    await Promise.all([this.loadContainers(), this.loadProtected(), this.loadRules(), this.loadProfiles()]);
    this.loadHistory();
    this.initAutoBackup();
    await this.updateCurrentSite();
    await this.refreshCookieList();
    this.initMonitor();
  }

  // ============ EVENTS ============
  bindEvents() {
    const on = (id, event, handler) => $(id).addEventListener(event, handler);

    // Header & tabs
    on('themeToggle', 'click', () => this.toggleTheme());
    on('settingsBtn', 'click', () => this.openModal($('settingsModal')));
    document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => this.switchTab(tab.dataset.tab)));
    document.querySelectorAll('.seg').forEach(seg => seg.addEventListener('click', () => this.switchSubTab(seg.dataset.sub)));

    // Modals
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.closest('[data-close-modal]')) this.closeModal(modal);
      });
    });

    // Settings
    on('languageSelect', 'change', (e) => this.changeLanguage(e.target.value));
    on('themeSelect', 'change', (e) => this.applyTheme(e.target.value, true));
    on('trackerList', 'change', () => this.saveTrackers());
    on('resetTrackers', 'click', () => { $('trackerList').value = DEFAULT_TRACKERS.join('\n'); this.saveTrackers(); });

    // Site card
    on('siteOnlyBtn', 'click', () => this.setSiteOnly(!this.siteOnly));
    on('siteClearBtn', 'click', () => this.clearCurrentSite());

    // Search, filters, sort
    on('cookieSearch', 'input', () => this.filterCookieList());
    on('regexToggle', 'click', () => {
      this.regexMode = !this.regexMode;
      $('regexToggle').setAttribute('aria-pressed', String(this.regexMode));
      this.filterCookieList();
    });
    on('domainFilter', 'change', () => this.filterCookieList());
    on('containerFilter', 'change', () => this.filterCookieList());
    on('sortBy', 'change', (e) => { this.sortField = e.target.value; this.filterCookieList(); });
    on('sortDirection', 'click', () => {
      this.sortAsc = !this.sortAsc;
      $('sortDirection').classList.toggle('desc', !this.sortAsc);
      this.filterCookieList();
    });
    on('compactToggle', 'click', () => this.setCompact(!this.compact));
    on('refreshCookies', 'click', () => this.refreshCookieList({ spin: true }));
    document.querySelectorAll('[data-filter]').forEach(chip => chip.addEventListener('click', () => {
      const filter = chip.dataset.filter;
      if (this.activeFilters.has(filter)) this.activeFilters.delete(filter); else this.activeFilters.add(filter);
      chip.classList.toggle('active', this.activeFilters.has(filter));
      this.filterCookieList();
    }));

    // List & bulk actions
    on('cookieList', 'click', (e) => this.handleListClick(e));
    on('selectAllCheckbox', 'change', (e) => (e.target.checked ? this.selectAllVisible() : this.clearSelection()));
    on('deleteSelected', 'click', () => this.deleteCookies(this.getSelectedCookies(), { confirm: true }));
    on('exportSelectedBtn', 'click', () => this.exportSelectedCookies());
    on('deleteAllVisible', 'click', () => this.deleteCookies(this.filteredCookies, { confirm: true }));
    on('addCookieBtn', 'click', () => this.openCreateCookie());
    on('cleanTrackersBtn', 'click', () => this.cleanTrackers());
    on('dashCleanTrackers', 'click', () => this.cleanTrackers());

    // Editor
    on('saveCookieBtn', 'click', () => this.saveEditingCookie());
    on('deleteCookieBtn', 'click', () => this.deleteEditingCookie());
    on('cloneCookieBtn', 'click', () => this.cloneEditingCookie());
    on('copyEditValue', 'click', () => this.copyToClipboard($('editCookieValue').value));

    this.bindBackupEvents(on);
    this.bindRuleEvents(on);

    // Monitor & history
    on('monitorPauseBtn', 'click', () => this.toggleMonitorPause());
    on('monitorClearBtn', 'click', () => this.clearMonitor());
    on('monitorSearch', 'input', () => this.scheduleMonitorRender());
    document.querySelectorAll('[data-monitor-filter]').forEach(chip => chip.addEventListener('click', () => {
      document.querySelectorAll('[data-monitor-filter]').forEach(c => c.classList.toggle('active', c === chip));
      this.monitorFilter = chip.dataset.monitorFilter;
      this.scheduleMonitorRender();
    }));
    on('undoBtn', 'click', () => this.undoLastAction());
    on('clearHistoryBtn', 'click', () => this.clearHistory());

    document.addEventListener('keydown', (e) => this.handleKeydown(e));
    browser.tabs.onActivated.addListener(() => this.onActiveTabChanged());
    browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (tab.active && changeInfo.url) this.onActiveTabChanged();
    });
    browser.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      if (changes.protectedCookies) this.setProtectedList(changes.protectedCookies.newValue || []);
      if (changes.cookieRules) { this.rules = changes.cookieRules.newValue || []; this.renderRules(); }
    });
    browser.contextualIdentities?.onCreated?.addListener(() => this.loadContainers());
    browser.contextualIdentities?.onRemoved?.addListener(() => this.loadContainers());
    browser.contextualIdentities?.onUpdated?.addListener(() => this.loadContainers().then(() => this.renderCookieList()));
  }

  handleKeydown(e) {
    const openModal = [...document.querySelectorAll('.modal')].reverse().find(m => !m.hidden);
    if (e.key === 'Escape' && openModal) { e.preventDefault(); this.closeModal(openModal); return; }
    if (openModal) return;

    const typing = isTypingTarget(e.target);
    const ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && e.shiftKey && e.key.toLowerCase() === 'e') { e.preventDefault(); this.exportCookies(); return; }
    if (typing) return;

    if (e.key === '/') { e.preventDefault(); this.switchTab('cookies'); $('cookieSearch').focus(); }
    else if (e.key === 'Delete' && this.selectedKeys.size) { e.preventDefault(); this.deleteCookies(this.getSelectedCookies(), { confirm: true }); }
    else if (ctrl && e.key.toLowerCase() === 'a' && this.activeTab() === 'cookies') { e.preventDefault(); this.selectAllVisible(); }
    else if (ctrl && e.key.toLowerCase() === 'z') { e.preventDefault(); this.undoLastAction(); }
  }

  // ============ THEME & LANGUAGE ============
  applyTheme(theme, persist = false) {
    const value = ['dark', 'light', 'system'].includes(theme) ? theme : 'system';
    document.documentElement.dataset.theme = value;
    $('themeSelect').value = value;
    if (persist) localStorage.setItem(LS.theme, value);
  }

  toggleTheme() {
    const current = document.documentElement.dataset.theme;
    const prefersLight = matchMedia('(prefers-color-scheme: light)').matches;
    const isLight = current === 'light' || (current === 'system' && prefersLight);
    this.applyTheme(isLight ? 'dark' : 'light', true);
  }

  populateLanguageSelect() {
    $('languageSelect').innerHTML = Object.entries(languageNames)
      .map(([code, name]) => `<option value="${code}">${escapeHtml(name)}</option>`).join('');
    $('languageSelect').value = currentLang;
  }

  changeLanguage(lang) {
    setLanguage(lang);
    applyTranslations();
    this.buildStoreSelects();
    this.buildDomainFilter();
    this.renderAll();
    requestAnimationFrame(() => this.moveTabIndicator());
  }

  renderAll() {
    this.renderCookieList();
    this.updateSiteCard();
    this.renderRules();
    this.renderProfiles();
    this.renderHistory();
    this.renderMonitorLog();
    this.updateMonitorPauseLabel();
    if (this.activeTab() === 'dashboard') this.refreshDashboard();
  }

  // ============ TABS ============
  initTabIndicator() {
    const indicator = document.createElement('span');
    indicator.className = 'tab-indicator';
    document.querySelector('.tabs').prepend(indicator);
    this.tabIndicator = indicator;
    new ResizeObserver(() => this.moveTabIndicator()).observe(document.querySelector('.tabs'));
  }

  moveTabIndicator() {
    const active = document.querySelector('.tab.active');
    if (!active || !this.tabIndicator) return;
    this.tabIndicator.style.width = `${active.offsetWidth}px`;
    this.tabIndicator.style.transform = `translateX(${active.offsetLeft}px)`;
  }

  activeTab() { return document.querySelector('.tab.active')?.dataset.tab; }

  switchTab(name) {
    document.querySelectorAll('.tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === name);
      t.setAttribute('aria-selected', String(t.dataset.tab === name));
    });
    document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === `${name}-tab`));
    this.moveTabIndicator();
    $('cookies-tab').parentElement.scrollTop = 0;
    if (name === 'dashboard') this.refreshDashboard();
    if (name === 'backup') this.updateExportCounts();
  }

  switchSubTab(name) {
    document.querySelectorAll('.seg').forEach(s => s.classList.toggle('active', s.dataset.sub === name));
    document.querySelectorAll('.subpanel').forEach(p => p.classList.toggle('active', p.id === `sub-${name}`));
  }

  // ============ MODALS / TOASTS / CONFIRM ============
  openModal(modal) {
    this.lastFocus = document.activeElement;
    modal.hidden = false;
    const firstField = modal.querySelector('.modal-body input:not([type=checkbox]), .modal-body textarea, .modal-body select');
    requestAnimationFrame(() => (firstField || modal.querySelector('button'))?.focus());
  }

  closeModal(modal) {
    modal.hidden = true;
    if (modal.id === 'cookieEditModal') this.editingCookie = null;
    if (modal.id === 'confirmModal') this.resolveConfirm?.(false);
    this.lastFocus?.focus?.();
    if (this.refreshPending) this.scheduleRefresh();
  }

  isModalOpen() { return [...document.querySelectorAll('.modal')].some(m => !m.hidden); }

  /** @returns {Promise<boolean>} */
  confirmDialog(message, okLabel = t('confirm')) {
    $('confirmText').textContent = message;
    $('confirmOk').textContent = okLabel;
    this.openModal($('confirmModal'));
    $('confirmOk').focus();
    return new Promise(resolve => {
      const finish = (value) => {
        this.resolveConfirm = null;
        $('confirmOk').onclick = $('confirmCancel').onclick = null;
        $('confirmModal').hidden = true;
        resolve(value);
      };
      this.resolveConfirm = finish;
      $('confirmOk').onclick = () => finish(true);
      $('confirmCancel').onclick = () => finish(false);
    });
  }

  /**
   * @param {string} text
   * @param {'success'|'error'|'warning'} type
   * @param {{label: string, run: Function}} [action]
   */
  toast(text, type = 'success', action) {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.setAttribute('role', type === 'error' ? 'alert' : 'status');
    el.innerHTML = `<span class="toast-dot" aria-hidden="true"></span><span class="toast-text">${escapeHtml(text)}</span>`;
    if (action) {
      const btn = document.createElement('button');
      btn.textContent = action.label;
      btn.addEventListener('click', () => { action.run(); dismiss(); });
      el.appendChild(btn);
    }
    const region = $('toasts');
    region.appendChild(el);
    while (region.children.length > 3) region.firstElementChild.remove();
    const dismiss = () => {
      el.classList.add('leaving');
      setTimeout(() => el.remove(), 250);
    };
    setTimeout(dismiss, action ? 6000 : 3500);
  }

  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.toast(t('copiedToClipboard'));
    } catch (e) {
      this.toast(t('errorPrefix') + e.message, 'error');
    }
  }

  // ============ TRACKERS ============
  loadTrackers() {
    this.trackers = readJson(LS.trackers, DEFAULT_TRACKERS);
    $('trackerList').value = this.trackers.join('\n');
  }

  saveTrackers() {
    this.trackers = $('trackerList').value.split('\n').map(d => normalizeDomain(d.trim())).filter(Boolean);
    writeJson(LS.trackers, this.trackers);
    this.filterCookieList({ keepLimit: true });
    this.toast(t('settingsSaved'));
  }

  isTracker(domain) { return this.trackers.some(tracker => domainMatches(domain, tracker)); }

  // ============ CONTAINERS ============
  async loadContainers() {
    this.stores = new Map([[DEFAULT_STORE_ID, { name: t('defaultContainer'), color: NEUTRAL_COLOR }]]);
    try {
      const containers = await browser.contextualIdentities.query({});
      containers.forEach(c => this.stores.set(c.cookieStoreId, { name: c.name, color: c.colorCode || NEUTRAL_COLOR }));
    } catch (e) { /* containers disabled */ }
    this.buildStoreSelects();
  }

  /** Register stores seen in cookies but unknown (private browsing, removed containers). */
  registerUnknownStores() {
    let changed = false;
    for (const cookie of this.allCookies) {
      if (this.stores.has(cookie.storeId)) continue;
      const isPrivate = cookie.storeId === PRIVATE_STORE_ID;
      this.stores.set(cookie.storeId, { name: isPrivate ? t('privateContainer') : cookie.storeId, color: isPrivate ? '#a06cff' : NEUTRAL_COLOR });
      changed = true;
    }
    if (changed) this.buildStoreSelects();
  }

  storeMeta(storeId) {
    return this.stores.get(storeId || DEFAULT_STORE_ID) || { name: storeId, color: NEUTRAL_COLOR };
  }

  buildStoreSelects() {
    const storeOptions = [...this.stores].map(([id, s]) => `<option value="${escapeHtml(id)}">${escapeHtml(s.name)}</option>`).join('');
    const allOption = `<option value="">${escapeHtml(t('allContainers'))}</option>`;
    for (const id of ['containerFilter', 'exportContainer', 'ruleContainer']) {
      const select = $(id);
      const previous = select.value;
      select.innerHTML = allOption + storeOptions;
      select.value = this.stores.has(previous) ? previous : '';
    }
    const editSelect = $('editCookieStore');
    const previousEdit = editSelect.value;
    editSelect.innerHTML = storeOptions;
    editSelect.value = this.stores.has(previousEdit) ? previousEdit : DEFAULT_STORE_ID;
    // Hide container UI entirely when only the default store exists
    const single = this.stores.size <= 1;
    $('containerFilter').hidden = single;
    $('containerFilter').parentElement.style.gridTemplateColumns = single ? '1fr' : '';
  }

  // ============ PROTECTION ============
  async loadProtected() {
    try {
      const { protectedCookies = [] } = await browser.storage.local.get('protectedCookies');
      this.setProtectedList(protectedCookies);
    } catch (e) { this.protectedKeys = new Set(); }
  }

  setProtectedList(list) {
    this.protectedKeys = new Set(list.map(p => p.key));
    this.renderCookieList();
  }

  isProtected(cookie) { return this.protectedKeys.has(cookieKey(cookie)); }

  async toggleProtection(cookie) {
    const wasProtected = this.isProtected(cookie);
    try {
      await browser.runtime.sendMessage({ action: wasProtected ? 'unprotectCookie' : 'protectCookie', cookie: serializeCookie(cookie) });
      if (wasProtected) this.protectedKeys.delete(cookieKey(cookie)); else this.protectedKeys.add(cookieKey(cookie));
      this.toast(wasProtected ? t('protectionDisabled') : t('protectionEnabled'));
      this.addHistoryEntry(wasProtected ? 'unprotect' : 'protect', `${cookie.name} (${cookie.domain})`);
      this.renderCookieList();
    } catch (e) {
      this.toast(t('errorPrefix') + e.message, 'error');
    }
  }

  // ============ CURRENT SITE ============
  async updateCurrentSite() {
    this.site = null;
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      const url = new URL(tab?.url || '');
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        this.site = { host: url.hostname, site: url.hostname.replace(/^www\./, ''), storeId: tab.cookieStoreId || DEFAULT_STORE_ID };
      }
    } catch (e) { /* about:, file:, etc. */ }
    $('exportSiteName').textContent = this.site ? this.site.site : '';
    if (!this.site && this.siteOnly) this.setSiteOnly(false);
  }

  async onActiveTabChanged() {
    await this.updateCurrentSite();
    this.updateSiteCard();
    if (this.siteOnly) this.filterCookieList();
    this.updateExportCounts();
  }

  /** Cookie is sent to the current site (same domain, parent domain or subdomain). */
  appliesToSite(cookie) {
    if (!this.site) return false;
    return domainMatches(cookie.domain, this.site.site) || domainMatches(this.site.host, cookie.domain);
  }

  siteCookies() { return this.allCookies.filter(c => this.appliesToSite(c)); }

  updateSiteCard() {
    $('siteCard').hidden = !this.site;
    if (!this.site) return;
    $('siteHost').textContent = this.site.host;
    $('siteCount').textContent = this.siteCookies().length;
    $('siteOnlyBtn').textContent = this.siteOnly ? t('showAllSites') : t('showThisSite');
  }

  setSiteOnly(enabled) {
    this.siteOnly = enabled && Boolean(this.site);
    $('siteOnlyBtn').setAttribute('aria-pressed', String(this.siteOnly));
    this.updateSiteCard();
    this.filterCookieList();
  }

  async clearCurrentSite() {
    if (!this.site) return;
    await this.deleteCookies(this.siteCookies(), { confirm: true, label: this.site.site });
  }

  // ============ COOKIE LIST ============
  renderSkeleton() {
    $('cookieList').innerHTML = '<div class="skeleton"></div>'.repeat(5);
  }

  async refreshCookieList({ spin = false } = {}) {
    const refreshBtn = $('refreshCookies');
    if (spin) refreshBtn.classList.add('spin');
    try {
      this.allCookies = await getAllCookiesEverywhere();
      this.cookieByKey = new Map(this.allCookies.map(c => [cookieKey(c), c]));
      for (const key of this.selectedKeys) if (!this.cookieByKey.has(key)) this.selectedKeys.delete(key);
      this.registerUnknownStores();
      this.buildDomainFilter();
      this.updateSiteCard();
      this.filterCookieList({ keepLimit: true, animate: spin });
      this.updateExportCounts();
      if (this.activeTab() === 'dashboard') this.refreshDashboard();
    } catch (e) {
      $('cookieList').innerHTML = this.emptyHtml('x', t('errorLoading'), e.message);
    } finally {
      setTimeout(() => refreshBtn.classList.remove('spin'), 400);
    }
  }

  /** Debounced silent refresh used for live updates. Deferred while a dialog is open. */
  scheduleRefresh() {
    clearTimeout(this.refreshTimer);
    this.refreshTimer = setTimeout(() => {
      if (this.isModalOpen()) { this.refreshPending = true; return; }
      this.refreshPending = false;
      this.refreshCookieList();
    }, 600);
  }

  buildDomainFilter() {
    const counts = new Map();
    for (const c of this.allCookies) {
      const domain = normalizeDomain(c.domain);
      counts.set(domain, (counts.get(domain) || 0) + 1);
    }
    const select = $('domainFilter');
    const previous = select.value;
    const options = [...counts].sort((a, b) => a[0].localeCompare(b[0]))
      .map(([domain, count]) => `<option value="${escapeHtml(domain)}">${escapeHtml(domain)} (${count})</option>`);
    select.innerHTML = `<option value="">${escapeHtml(t('allDomains'))} (${counts.size})</option>${options.join('')}`;
    select.value = counts.has(previous) ? previous : '';
  }

  /** Builds this.searchRegex; returns false when regex is invalid. */
  compileSearch() {
    const query = $('cookieSearch').value.trim();
    this.searchRegex = null;
    if (!query) return true;
    try {
      const lowered = query.toLowerCase();
      this.searchRegex = this.regexMode ? new RegExp(query, 'i') : { test: (text) => String(text).toLowerCase().includes(lowered) };
      return true;
    } catch (e) {
      return false;
    }
  }

  filterCookieList({ keepLimit = false, animate = true } = {}) {
    const validSearch = this.compileSearch();
    $('cookieSearch').closest('.search-box').classList.toggle('invalid', !validSearch);
    const domain = $('domainFilter').value;
    const store = $('containerFilter').value;
    const filters = this.activeFilters;
    const re = this.searchRegex;

    this.filteredCookies = !validSearch ? [] : this.allCookies.filter(c => {
      if (re && !re.test(c.name) && !re.test(c.domain) && !re.test(c.value)) return false;
      if (this.siteOnly && !this.appliesToSite(c)) return false;
      if (domain && normalizeDomain(c.domain) !== domain) return false;
      if (store && c.storeId !== store) return false;
      if (filters.has('secure') && !c.secure) return false;
      if (filters.has('httpOnly') && !c.httpOnly) return false;
      if (filters.has('session') && !c.session) return false;
      if (filters.has('tracker') && !this.isTracker(c.domain)) return false;
      if (filters.has('protected') && !this.isProtected(c)) return false;
      return true;
    });

    const direction = this.sortAsc ? 1 : -1;
    const compareText = (a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' });
    const sorters = {
      name: (a, b) => compareText(a.name, b.name),
      domain: (a, b) => compareText(normalizeDomain(a.domain), normalizeDomain(b.domain)) || compareText(a.name, b.name),
      expiry: (a, b) => (a.expirationDate || Infinity) - (b.expirationDate || Infinity),
      size: (a, b) => (a.name.length + a.value.length) - (b.name.length + b.value.length)
    };
    this.filteredCookies.sort((a, b) => direction * sorters[this.sortField](a, b));

    if (!keepLimit) this.renderLimit = PAGE_SIZE;
    this.renderCookieList({ animate });
  }

  hasActiveFilters() {
    return Boolean($('cookieSearch').value || $('domainFilter').value || $('containerFilter').value || this.activeFilters.size || this.siteOnly);
  }

  resetFilters() {
    $('cookieSearch').value = '';
    $('domainFilter').value = '';
    $('containerFilter').value = '';
    this.activeFilters.clear();
    document.querySelectorAll('[data-filter]').forEach(c => c.classList.remove('active'));
    this.setSiteOnly(false);
  }

  emptyHtml(iconName, title, text = '', withReset = false) {
    return `<div class="empty">${icon(iconName)}<b>${escapeHtml(title)}</b>${text ? `<span>${escapeHtml(text)}</span>` : ''}
      ${withReset ? `<button class="btn btn-soft btn-sm reset-filters">${escapeHtml(t('resetFilters'))}</button>` : ''}</div>`;
  }

  /** Human readable expiry ("in 3 days", "Session"). */
  formatExpiry(cookie) {
    if (cookie.session || !cookie.expirationDate) return t('sessionLabel');
    const diffSec = cookie.expirationDate - Date.now() / 1000;
    const units = [['year', 31536000], ['month', 2592000], ['day', 86400], ['hour', 3600], ['minute', 60]];
    const [unit, size] = units.find(([, s]) => Math.abs(diffSec) >= s) || ['minute', 60];
    try {
      return new Intl.RelativeTimeFormat(currentLang, { numeric: 'auto' }).format(Math.round(diffSec / size), unit);
    } catch (e) {
      return new Date(cookie.expirationDate * 1000).toLocaleString();
    }
  }

  cookieRowHtml(cookie, index, animate) {
    const key = cookieKey(cookie);
    const store = this.storeMeta(cookie.storeId);
    const isDefaultStore = (cookie.storeId || DEFAULT_STORE_ID) === DEFAULT_STORE_ID;
    const isProt = this.isProtected(cookie);
    const selected = this.selectedKeys.has(key);
    const colorStyle = `--c:${escapeHtml(store.color)}`;

    const tags = [];
    if (!isDefaultStore) tags.push(`<span class="tag store" style="${colorStyle}">${escapeHtml(store.name)}</span>`);
    if (cookie.secure) tags.push(`<span class="tag secure" title="${escapeHtml(t('hintSecure'))}">${escapeHtml(t('filterSecure'))}</span>`);
    if (cookie.httpOnly) tags.push(`<span class="tag httponly" title="${escapeHtml(t('hintHttpOnly'))}">HttpOnly</span>`);
    if (cookie.session) tags.push(`<span class="tag session" title="${escapeHtml(t('hintSession'))}">${escapeHtml(t('filterSession'))}</span>`);
    if (this.isTracker(cookie.domain)) tags.push(`<span class="tag tracker" title="${escapeHtml(t('hintTracker'))}">${escapeHtml(t('filterTracker'))}</span>`);
    if (cookie.partitionKey?.topLevelSite) tags.push(`<span class="tag partition" title="${escapeHtml(t('hintPartition'))}">${escapeHtml(t('partitioned'))}: ${escapeHtml(cookie.partitionKey.topLevelSite.replace(/^https?:\/\//, ''))}</span>`);

    return `<div class="cookie-row${selected ? ' selected' : ''}" data-key="${escapeHtml(key)}" role="option" aria-selected="${selected}"
        style="${animate ? `--i:${Math.min(index, 15)}` : 'animation:none'}">
      ${isDefaultStore ? '' : `<span class="store-bar" style="${colorStyle}"></span>`}
      <input type="checkbox" class="row-check" ${selected ? 'checked' : ''} aria-label="${escapeHtml(t('selectAll'))}">
      <div class="row-main">
        <div class="row-title"><span class="row-name">${escapeHtml(cookie.name || t('noName'))}</span>${isProt ? icon('lock') : ''}</div>
        <div class="row-sub"><span>${escapeHtml(normalizeDomain(cookie.domain))}<span class="path">${escapeHtml(cookie.path)}</span></span><span>&middot; ${escapeHtml(this.formatExpiry(cookie))}</span></div>
        <div class="row-value">${escapeHtml((cookie.value || '').slice(0, 120)) || '&nbsp;'}</div>
        ${tags.length ? `<div class="row-tags">${tags.join('')}</div>` : ''}
      </div>
      <div class="row-actions">
        <button class="icon-btn act-copy" title="${escapeHtml(t('copyCookieValue'))}">${icon('copy')}</button>
        <button class="icon-btn act-protect${isProt ? ' on' : ''}" title="${escapeHtml(isProt ? t('unprotectCookie') : t('protectCookie'))}">${icon('lock')}</button>
        <button class="icon-btn act-delete del" title="${escapeHtml(t('delete'))}">${icon('trash')}</button>
      </div>
    </div>`;
  }

  renderCookieList({ animate = false } = {}) {
    const list = $('cookieList');
    const cookies = this.filteredCookies;
    $('cookieCountDisplay').textContent = t('countCookies', { n: cookies.length });

    if (!cookies.length) {
      list.innerHTML = this.allCookies.length
        ? this.emptyHtml('search', t('noCookiesFound'), t('noMatchHint'), this.hasActiveFilters())
        : this.emptyHtml('cookie', t('noCookiesYet'), t('noCookiesYetHint'));
    } else {
      const visible = cookies.slice(0, this.renderLimit);
      let html = visible.map((c, i) => this.cookieRowHtml(c, i, animate)).join('');
      if (cookies.length > visible.length) {
        html += `<button class="btn btn-soft btn-sm load-more">${escapeHtml(t('loadMore', { n: Math.min(PAGE_SIZE, cookies.length - visible.length), total: cookies.length - visible.length }))}</button>`;
      }
      list.innerHTML = html;
    }
    this.updateSelectionUI();
  }

  handleListClick(e) {
    if (e.target.closest('.load-more')) { this.renderLimit += PAGE_SIZE; this.renderCookieList(); return; }
    if (e.target.closest('.reset-filters')) { this.resetFilters(); return; }
    const row = e.target.closest('.cookie-row');
    const cookie = row && this.cookieByKey.get(row.dataset.key);
    if (!cookie) return;

    if (e.target.closest('.row-check')) this.toggleSelection(row.dataset.key, row);
    else if (e.target.closest('.act-copy')) this.copyToClipboard(cookie.value || '');
    else if (e.target.closest('.act-protect')) this.toggleProtection(cookie);
    else if (e.target.closest('.act-delete')) this.deleteCookies([cookie], { animateRow: row });
    else this.openCookieEditor(cookie);
  }

  // ============ SELECTION ============
  toggleSelection(key, row) {
    if (this.selectedKeys.has(key)) this.selectedKeys.delete(key); else this.selectedKeys.add(key);
    const selected = this.selectedKeys.has(key);
    row.classList.toggle('selected', selected);
    row.setAttribute('aria-selected', String(selected));
    row.querySelector('.row-check').checked = selected;
    this.updateSelectionUI();
  }

  selectAllVisible() {
    this.filteredCookies.forEach(c => this.selectedKeys.add(cookieKey(c)));
    this.renderCookieList();
  }

  clearSelection() {
    this.selectedKeys.clear();
    this.renderCookieList();
  }

  getSelectedCookies() {
    return [...this.selectedKeys].map(key => this.cookieByKey.get(key)).filter(Boolean);
  }

  updateSelectionUI() {
    const count = this.selectedKeys.size;
    $('selectionBar').hidden = count === 0;
    $('selectionCount').textContent = t('nSelected', { n: count });
    const visibleSelected = this.filteredCookies.filter(c => this.selectedKeys.has(cookieKey(c))).length;
    const selectAll = $('selectAllCheckbox');
    selectAll.checked = visibleSelected > 0 && visibleSelected === this.filteredCookies.length;
    selectAll.indeterminate = visibleSelected > 0 && !selectAll.checked;
  }

  setCompact(compact) {
    this.compact = compact;
    $('cookieList').classList.toggle('compact', compact);
    $('compactToggle').setAttribute('aria-pressed', String(compact));
    localStorage.setItem(LS.compact, compact ? '1' : '0');
  }

  // ============ DELETE / UNDO / CLEAN ============
  /**
   * Delete cookies (protected ones are skipped) with an Undo toast.
   * @param {object[]} cookies
   * @param {{confirm?: boolean, label?: string, animateRow?: HTMLElement}} options
   */
  async deleteCookies(cookies, { confirm = false, label = '', animateRow = null } = {}) {
    if (!cookies.length) { this.toast(t('nothingToDelete'), 'warning'); return; }
    const deletable = cookies.filter(c => !this.isProtected(c));
    const skipped = cookies.length - deletable.length;
    if (!deletable.length) { this.toast(t('allProtected'), 'warning'); return; }

    if (confirm || deletable.length > 1) {
      const message = label ? t('confirmDeleteSite', { n: deletable.length, site: label }) : t('confirmDeleteCookies', { n: deletable.length });
      if (!(await this.confirmDialog(message, t('delete')))) return;
    }

    if (animateRow) {
      animateRow.classList.add('removing');
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    const results = await Promise.allSettled(deletable.map(removeCookie));
    const deleted = deletable.filter((_, i) => results[i].status === 'fulfilled');
    deleted.forEach(c => this.selectedKeys.delete(cookieKey(c)));

    if (deleted.length) {
      this.undoStack.push(deleted.map(serializeCookie));
      if (this.undoStack.length > 20) this.undoStack.shift();
      this.addHistoryEntry('delete', deleted.length === 1 ? `${deleted[0].name} (${deleted[0].domain})` : t('countCookies', { n: deleted.length }));
    }
    let message = t('cookiesDeleted', { n: deleted.length });
    if (skipped) message += ` · ${t('protectedSkipped', { n: skipped })}`;
    const failed = deletable.length - deleted.length;
    if (failed) message += ` · ${t('failedCount', { n: failed })}`;
    this.toast(message, failed ? 'warning' : 'success', deleted.length ? { label: t('undoAction'), run: () => this.undoLastAction() } : undefined);
    await this.refreshCookieList();
  }

  async undoLastAction() {
    const cookies = this.undoStack.pop();
    if (!cookies) { this.toast(t('noUndoAvailable'), 'warning'); return; }
    try {
      const result = await browser.runtime.sendMessage({ action: 'importCookies', cookies, options: { overwrite: true } });
      this.toast(t('undoRestored', { n: result.imported }));
      this.addHistoryEntry('import', t('undoRestored', { n: result.imported }));
    } catch (e) {
      this.toast(t('errorPrefix') + e.message, 'error');
    }
    await this.refreshCookieList();
  }

  async cleanTrackers() {
    const trackers = this.allCookies.filter(c => this.isTracker(c.domain));
    if (!trackers.length) { this.toast(t('noTrackers')); return; }
    await this.deleteCookies(trackers, { confirm: true });
    this.addHistoryEntry('clean', t('trackersCleaned'));
  }

  // ============ COOKIE EDITOR ============
  fillEditor(cookie) {
    $('editCookieName').value = cookie.name || '';
    $('editCookieValue').value = cookie.value || '';
    $('editCookieDomain').value = cookie.domain || '';
    $('editCookiePath').value = cookie.path || '/';
    $('editCookieStore').value = this.stores.has(cookie.storeId) ? cookie.storeId : DEFAULT_STORE_ID;
    $('editCookieExpiry').value = cookie.expirationDate ? toLocalInputValue(cookie.expirationDate) : '';
    $('editCookieSameSite').value = ['strict', 'lax', 'no_restriction'].includes(cookie.sameSite) ? cookie.sameSite : 'no_restriction';
    $('editCookieSecure').checked = Boolean(cookie.secure);
    $('editCookieHttpOnly').checked = Boolean(cookie.httpOnly);
  }

  setEditorMode(isCreate) {
    $('cookieModalTitle').textContent = isCreate ? t('createCookie') : t('editCookie');
    $('saveCookieBtn').textContent = isCreate ? t('create') : t('save');
    $('deleteCookieBtn').hidden = isCreate;
    $('cloneCookieBtn').hidden = isCreate;
  }

  openCookieEditor(cookie) {
    this.editingCookie = cookie;
    this.fillEditor(cookie);
    this.setEditorMode(false);
    this.openModal($('cookieEditModal'));
  }

  openCreateCookie() {
    this.editingCookie = null;
    const storeId = $('containerFilter').value || this.site?.storeId || DEFAULT_STORE_ID;
    this.fillEditor({ domain: this.site?.host || '', path: '/', storeId, secure: true, sameSite: 'lax' });
    this.setEditorMode(true);
    this.openModal($('cookieEditModal'));
  }

  cloneEditingCookie() {
    this.editingCookie = null;
    this.setEditorMode(true);
    $('editCookieName').focus();
    this.toast(t('cloneHint'));
  }

  readEditor() {
    const domain = $('editCookieDomain').value.trim();
    const expiry = $('editCookieExpiry').value;
    const original = this.editingCookie;
    return {
      name: $('editCookieName').value.trim(),
      value: $('editCookieValue').value,
      domain,
      path: $('editCookiePath').value.trim() || '/',
      storeId: $('editCookieStore').value || DEFAULT_STORE_ID,
      secure: $('editCookieSecure').checked,
      httpOnly: $('editCookieHttpOnly').checked,
      sameSite: $('editCookieSameSite').value,
      expirationDate: expiry ? Math.floor(new Date(expiry).getTime() / 1000) : undefined,
      hostOnly: original && original.domain === domain ? original.hostOnly : !domain.startsWith('.'),
      partitionKey: original?.partitionKey,
      firstPartyDomain: original?.firstPartyDomain
    };
  }

  async saveEditingCookie() {
    const draft = this.readEditor();
    if (!draft.name || !normalizeDomain(draft.domain)) { this.toast(t('nameDomainRequired'), 'error'); return; }
    if (draft.expirationDate && draft.expirationDate < Date.now() / 1000) { this.toast(t('expiryInPast'), 'error'); return; }

    const original = this.editingCookie;
    try {
      await setCookie(draft);
      if (original && cookieKey(original) !== cookieKey(draft)) await removeCookie(original);
      if (original && this.isProtected(original)) {
        await browser.runtime.sendMessage({ action: 'unprotectCookie', cookie: serializeCookie(original) });
        await browser.runtime.sendMessage({ action: 'protectCookie', cookie: serializeCookie(draft) });
      }
      this.toast(original ? t('cookieSaved') : t('cookieCreated'));
      this.addHistoryEntry('edit', `${original ? '' : '+ '}${draft.name} (${draft.domain})`);
      this.closeModal($('cookieEditModal'));
      await this.refreshCookieList();
    } catch (e) {
      this.toast(t('errorPrefix') + e.message, 'error');
    }
  }

  async deleteEditingCookie() {
    const cookie = this.editingCookie;
    if (!cookie) return;
    if (this.isProtected(cookie)) { this.toast(t('cookieIsProtected'), 'warning'); return; }
    this.closeModal($('cookieEditModal'));
    await this.deleteCookies([cookie]);
  }

  // ============ DASHBOARD ============
  meterHtml({ label, value, max, color, attrs = '' }) {
    const pct = value && max ? Math.max(2, Math.round((value / max) * 100)) : 0;
    const colorVar = color ? `--c:${escapeHtml(color)};` : '';
    return `<div class="meter${attrs ? ' clickable' : ''}" ${attrs} style="${colorVar}">
      <span class="meter-label">${color ? '<span class="dot"></span>' : ''}${escapeHtml(label)}</span>
      <span class="meter-value">${value}</span>
      <div class="meter-track"><div class="meter-fill" style="--w:${pct}%"></div></div>
    </div>`;
  }

  refreshDashboard() {
    const cookies = this.allCookies;
    const total = cookies.length;
    const count = (predicate) => cookies.filter(predicate).length;
    const trackers = count(c => this.isTracker(c.domain));
    const secure = count(c => c.secure);
    const httpOnly = count(c => c.httpOnly);
    const session = count(c => c.session);
    const partitioned = count(c => c.partitionKey?.topLevelSite);
    const domainCounts = new Map();
    cookies.forEach(c => { const d = normalizeDomain(c.domain); domainCounts.set(d, (domainCounts.get(d) || 0) + 1); });

    $('dashTotalCookies').textContent = total;
    $('dashTrackerCount').textContent = trackers;
    $('dashSecureCount').textContent = secure;
    $('dashDomainCount').textContent = domainCounts.size;

    const pct = (n) => (total ? Math.round((n / total) * 100) : 0);
    const score = total ? Math.round((pct(secure) + pct(httpOnly) + (100 - pct(trackers))) / 3) : 100;
    const tone = score >= 70 ? 'success' : score >= 45 ? 'warning' : 'danger';
    const circumference = 2 * Math.PI * 52;
    const ring = $('privacyRing');
    ring.style.strokeDashoffset = String(circumference - (circumference * score) / 100);
    ring.style.stroke = `var(--${tone})`;
    $('privacyScoreText').textContent = score;
    $('privacyVerdict').textContent = t(tone === 'success' ? 'scoreGood' : tone === 'warning' ? 'scoreOk' : 'scoreBad');
    $('privacyVerdict').style.color = `var(--${tone})`;
    $('dashCleanTrackers').hidden = trackers === 0;
    $('dashCleanLabel').textContent = t('cleanNTrackers', { n: trackers });

    $('typeMeters').innerHTML = [
      { label: t('filterSecure'), value: secure, color: 'var(--info)' },
      { label: 'HttpOnly', value: httpOnly, color: 'var(--success)' },
      { label: t('filterSession'), value: session, color: 'var(--warning)' },
      { label: t('persistentCookies'), value: total - session, color: 'var(--accent)' },
      { label: t('filterTracker'), value: trackers, color: 'var(--danger)' },
      { label: t('partitioned'), value: partitioned, color: NEUTRAL_COLOR }
    ].map(m => this.meterHtml({ ...m, max: total })).join('');

    const storeCounts = new Map();
    cookies.forEach(c => storeCounts.set(c.storeId, (storeCounts.get(c.storeId) || 0) + 1));
    $('containerMeters').innerHTML = [...storeCounts].sort((a, b) => b[1] - a[1]).map(([storeId, value]) => {
      const store = this.storeMeta(storeId);
      return this.meterHtml({ label: store.name, value, max: total, color: store.color, attrs: `data-store="${escapeHtml(storeId)}"` });
    }).join('') || this.emptyHtml('cookie', t('noData'));

    const top = [...domainCounts].sort((a, b) => b[1] - a[1]).slice(0, 10);
    $('topDomainsChart').innerHTML = top.map(([domain, value]) =>
      this.meterHtml({ label: domain, value, max: top[0][1], attrs: `data-domain="${escapeHtml(domain)}"` })
    ).join('') || this.emptyHtml('cookie', t('noData'));

    const bytes = cookies.reduce((sum, c) => sum + c.name.length + (c.value?.length || 0), 0);
    $('sizeText').textContent = t('sizeSummary', { size: (bytes / 1024).toFixed(1) });

    $('dashboard-tab').onclick = (e) => {
      const meter = e.target.closest('[data-domain], [data-store]');
      if (!meter) return;
      this.resetFilters();
      if (meter.dataset.domain) $('domainFilter').value = meter.dataset.domain;
      if (meter.dataset.store) $('containerFilter').value = meter.dataset.store;
      this.filterCookieList();
      this.switchTab('cookies');
    };
  }

  // ============ LIVE MONITOR ============
  async initMonitor() {
    browser.runtime.onMessage.addListener((message) => {
      if (message?.action !== 'cookieChanged') return;
      this.scheduleRefresh();
      if (this.monitorPaused) return;
      const entry = message.entry;
      if (entry.cause === 'overwrite' && !entry.removed) return;
      this.monitorEntries.unshift(entry);
      if (this.monitorEntries.length > 500) this.monitorEntries.length = 500;
      this.scheduleMonitorRender();
    });
    await this.loadMonitorLog();
  }

  async loadMonitorLog() {
    try {
      const { log = [] } = await browser.runtime.sendMessage({ action: 'getMonitorLog' });
      this.monitorEntries = log.slice();
    } catch (e) { this.monitorEntries = []; }
    this.renderMonitorLog();
  }

  /** Legacy entries (v3.0) have no "type". */
  entryType(entry) {
    if (entry.type) return entry.type;
    if (entry.removed) return entry.cause === 'overwrite' ? 'updated' : 'deleted';
    return 'created';
  }

  scheduleMonitorRender() {
    if (this.monitorFrame) return;
    this.monitorFrame = requestAnimationFrame(() => { this.monitorFrame = 0; this.renderMonitorLog(); });
  }

  renderMonitorLog() {
    const stats = { created: 0, updated: 0, deleted: 0 };
    this.monitorEntries.forEach(e => { stats[this.entryType(e)]++; });
    $('monitorCreated').textContent = stats.created;
    $('monitorUpdated').textContent = stats.updated;
    $('monitorDeleted').textContent = stats.deleted;

    const query = $('monitorSearch').value.trim().toLowerCase();
    const entries = this.monitorEntries.filter(e =>
      (this.monitorFilter === 'all' || this.entryType(e) === this.monitorFilter) &&
      (!query || e.cookie.name.toLowerCase().includes(query) || e.cookie.domain.toLowerCase().includes(query)));

    if (!entries.length) {
      $('monitorLog').innerHTML = this.emptyHtml('pulse', t('waitingChanges'), t('waitingChangesHint'));
      return;
    }
    const labels = { created: t('eventCreated'), updated: t('eventUpdated'), deleted: t('eventDeleted') };
    $('monitorLog').innerHTML = entries.slice(0, 150).map(e => {
      const type = this.entryType(e);
      const store = (e.cookie.storeId || DEFAULT_STORE_ID) === DEFAULT_STORE_ID ? '' : ` &middot; ${escapeHtml(this.storeMeta(e.cookie.storeId).name)}`;
      return `<div class="event">
        <span class="event-time">${new Date(e.timestamp).toLocaleTimeString()}</span>
        <span class="pill ${type}">${escapeHtml(labels[type])}</span>
        <div class="event-info">
          <div class="event-name">${escapeHtml(e.cookie.name)}</div>
          <div class="event-domain">${escapeHtml(normalizeDomain(e.cookie.domain))}${store}</div>
        </div>
      </div>`;
    }).join('');
  }

  updateMonitorPauseLabel() {
    $('monitorPauseBtn').textContent = this.monitorPaused ? t('monitorResume') : t('monitorPause');
    $('monitorLiveBadge').classList.toggle('paused', this.monitorPaused);
  }

  async toggleMonitorPause() {
    this.monitorPaused = !this.monitorPaused;
    this.updateMonitorPauseLabel();
    if (!this.monitorPaused) await this.loadMonitorLog();
  }

  clearMonitor() {
    this.monitorEntries = [];
    this.renderMonitorLog();
    browser.runtime.sendMessage({ action: 'clearMonitorLog' }).catch(() => {});
  }

  // ============ BACKUP: EXPORT ============
  bindBackupEvents(on) {
    document.querySelectorAll('input[name="exportScope"]').forEach(r => r.addEventListener('change', () => {
      $('customDomain').hidden = this.exportScope() !== 'custom';
      this.updateExportCounts();
    }));
    document.querySelectorAll('input[name="exportFormat"]').forEach(r => r.addEventListener('change', () => this.updateEncryptionAvailability()));
    on('customDomain', 'input', () => this.updateExportCounts());
    on('exportContainer', 'change', () => this.updateExportCounts());
    on('excludeTrackers', 'change', () => this.updateExportCounts());
    on('encryptExport', 'change', () => { $('exportPassword').hidden = !$('encryptExport').checked; });
    on('exportBtn', 'click', () => this.exportCookies());
    on('copyClipboardBtn', 'click', () => this.copyExportToClipboard());

    // Import
    const dropzone = $('dropzone');
    dropzone.addEventListener('click', () => $('fileInput').click());
    dropzone.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('fileInput').click(); } });
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files[0]) this.handleImportFile(e.dataTransfer.files[0]);
    });
    on('fileInput', 'change', (e) => { if (e.target.files[0]) this.handleImportFile(e.target.files[0]); e.target.value = ''; });
    on('decryptBtn', 'click', () => this.decryptPendingImport());
    on('importPassword', 'keydown', (e) => { if (e.key === 'Enter') this.decryptPendingImport(); });
    on('cancelDecrypt', 'click', () => { this.pendingEncrypted = null; $('passwordPanel').hidden = true; });
    on('cancelImport', 'click', () => this.cancelPreview());
    on('confirmImport', 'click', () => this.confirmImportCookies());

    // Profiles
    on('saveProfileBtn', 'click', () => this.saveProfile());
    on('profileName', 'keydown', (e) => { if (e.key === 'Enter') this.saveProfile(); });
    on('profileList', 'click', (e) => this.handleProfileClick(e));
    on('compareBtn', 'click', () => this.compareProfiles());
    on('autoBackupEnabled', 'change', () => { $('autoBackupOptions').hidden = !$('autoBackupEnabled').checked; this.saveAutoBackupSettings(); });
    on('backupInterval', 'change', () => this.saveAutoBackupSettings());
    this.updateEncryptionAvailability();
  }

  exportScope() { return document.querySelector('input[name="exportScope"]:checked').value; }
  exportFormat() { return document.querySelector('input[name="exportFormat"]:checked').value; }

  updateEncryptionAvailability() {
    const isJson = this.exportFormat() === 'json';
    $('encryptExport').disabled = !isJson;
    $('encryptHint').hidden = isJson;
    if (!isJson) { $('encryptExport').checked = false; $('exportPassword').hidden = true; }
  }

  getExportCookies() {
    const scope = this.exportScope();
    const custom = $('customDomain').value.trim();
    const store = $('exportContainer').value;
    return this.allCookies.filter(c => {
      if (scope === 'site' && !this.appliesToSite(c)) return false;
      if (scope === 'custom' && custom && !domainMatches(c.domain, custom)) return false;
      if (store && c.storeId !== store) return false;
      if ($('excludeTrackers').checked && this.isTracker(c.domain)) return false;
      return true;
    });
  }

  updateExportCounts() {
    $('totalCookies').textContent = this.allCookies.length;
    $('selectedCookies').textContent = this.getExportCookies().length;
  }

  async exportCookies() {
    try {
      const cookies = this.getExportCookies();
      if (!cookies.length) { this.toast(t('noCookiesToExport'), 'warning'); return; }
      const format = this.exportFormat();
      const stamp = formatDateStamp();
      let content, fileName;

      if (format === 'netscape') { content = this.toNetscapeFormat(cookies); fileName = `cookies_${stamp}.txt`; }
      else if (format === 'csv') { content = this.toCSVFormat(cookies); fileName = `cookies_${stamp}.csv`; }
      else if (format === 'har') { content = this.toHARFormat(cookies); fileName = `cookies_${stamp}.har`; }
      else {
        const data = this.buildJsonExport(cookies);
        if ($('encryptExport').checked) {
          const password = $('exportPassword').value;
          if (password.length < 4) { this.toast(t('passwordTooShort'), 'error'); $('exportPassword').focus(); return; }
          data.encrypted = true;
          data.kdfIterations = PBKDF2_ITERATIONS;
          data.cookies = await this.encrypt(data.cookies, password);
          fileName = `cookies_encrypted_${stamp}.cookiejar`;
        } else {
          fileName = `cookies_${stamp}.json`;
        }
        content = JSON.stringify(data, null, 2);
      }

      downloadFile(content, fileName);
      this.toast(t('exportDone', { n: cookies.length }));
      this.addHistoryEntry('export', `${format.toUpperCase()}: ${t('countCookies', { n: cookies.length })}`);
    } catch (e) {
      this.toast(t('errorPrefix') + e.message, 'error');
    }
  }

  buildJsonExport(cookies) {
    return { version: '3.1', exportDate: new Date().toISOString(), browser: 'Firefox', encrypted: false, cookies: cookies.map(serializeCookie) };
  }

  exportSelectedCookies() {
    const cookies = this.getSelectedCookies();
    if (!cookies.length) return;
    downloadFile(JSON.stringify(this.buildJsonExport(cookies), null, 2), `cookies_selected_${formatDateStamp()}.json`);
    this.toast(t('exportDone', { n: cookies.length }));
    this.addHistoryEntry('export', `JSON: ${t('countCookies', { n: cookies.length })}`);
  }

  async copyExportToClipboard() {
    const cookies = this.getExportCookies();
    if (!cookies.length) { this.toast(t('noCookiesToExport'), 'warning'); return; }
    await this.copyToClipboard(JSON.stringify(cookies.map(serializeCookie), null, 2));
  }

  toNetscapeFormat(cookies) {
    const lines = ['# Netscape HTTP Cookie File', '# Exported by Cookie Manager Pro', ''];
    for (const c of cookies) {
      const includeSubdomains = c.domain.startsWith('.') ? 'TRUE' : 'FALSE';
      const domain = (c.httpOnly ? '#HttpOnly_' : '') + c.domain;
      const expiry = c.expirationDate ? Math.floor(c.expirationDate) : 0;
      lines.push([domain, includeSubdomains, c.path, c.secure ? 'TRUE' : 'FALSE', expiry, c.name, c.value].join('\t'));
    }
    return lines.join('\n') + '\n';
  }

  toCSVFormat(cookies) {
    const headers = ['name', 'value', 'domain', 'path', 'secure', 'httpOnly', 'sameSite', 'expirationDate', 'session', 'storeId'];
    const escape = (value) => {
      const text = String(value ?? '');
      return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    return [headers.join(','), ...cookies.map(c => headers.map(h => escape(c[h])).join(','))].join('\n');
  }

  toHARFormat(cookies) {
    return JSON.stringify({
      log: {
        version: '1.2',
        creator: { name: 'Cookie Manager Pro', version: '3.1' },
        entries: [],
        cookies: cookies.map(c => ({
          name: c.name, value: c.value, path: c.path, domain: c.domain,
          expires: c.expirationDate ? new Date(c.expirationDate * 1000).toISOString() : undefined,
          httpOnly: c.httpOnly, secure: c.secure, sameSite: c.sameSite
        }))
      }
    }, null, 2);
  }

  // ============ BACKUP: IMPORT ============
  /** Detects format (JSON / array / HAR / Netscape / CSV) and returns cookies, or null when encrypted. */
  parseImportContent(content, fileName) {
    const text = content.replace(/^﻿/, '').trim();
    if (text.startsWith('{') || text.startsWith('[')) {
      const data = JSON.parse(text);
      if (Array.isArray(data)) return data;
      if (data?.log?.cookies) return this.parseHARCookies(data.log.cookies);
      if (!data.cookies) throw new Error(t('invalidFile'));
      if (data.encrypted) { this.pendingEncrypted = data; return null; }
      return data.cookies;
    }
    if (/\t/.test(text) || text.startsWith('# Netscape') || text.startsWith('# HTTP Cookie')) return this.parseNetscapeFormat(text);
    if (fileName.toLowerCase().endsWith('.csv') || /^name,/i.test(text)) return this.parseCSVFormat(text);
    throw new Error(t('invalidFile'));
  }

  async handleImportFile(file) {
    $('importStats').hidden = true;
    try {
      const cookies = this.parseImportContent(await file.text(), file.name);
      if (cookies === null) {
        $('passwordPanel').hidden = false;
        $('importPassword').value = '';
        $('importPassword').focus();
        return;
      }
      this.proceedImport(cookies);
    } catch (e) {
      this.toast(t('errorPrefix') + e.message, 'error');
    }
  }

  async decryptPendingImport() {
    const data = this.pendingEncrypted;
    if (!data) return;
    try {
      const cookies = await this.decrypt(data.cookies, $('importPassword').value, data.kdfIterations || LEGACY_PBKDF2_ITERATIONS);
      this.pendingEncrypted = null;
      $('passwordPanel').hidden = true;
      this.proceedImport(cookies);
    } catch (e) {
      this.toast(t('wrongPassword'), 'error');
      $('importPassword').select();
    }
  }

  proceedImport(cookies) {
    const valid = cookies.filter(c => c && c.name !== undefined && c.domain);
    if (!valid.length) { this.toast(t('invalidFile'), 'error'); return; }
    if ($('previewBeforeImport').checked) this.showImportPreview(valid);
    else this.importCookies(valid);
  }

  parseNetscapeFormat(content) {
    const cookies = [];
    for (const rawLine of content.split(/\r?\n/)) {
      let line = rawLine;
      let httpOnly = false;
      if (line.startsWith('#HttpOnly_')) { line = line.slice(10); httpOnly = true; }
      if (!line.trim() || line.startsWith('#')) continue;
      const parts = line.split('\t');
      if (parts.length < 7) continue;
      const expiry = parseInt(parts[4], 10);
      cookies.push({
        domain: parts[0], hostOnly: parts[1] !== 'TRUE' && !parts[0].startsWith('.'), path: parts[2] || '/',
        secure: parts[3] === 'TRUE', expirationDate: expiry > 0 ? expiry : undefined, session: !(expiry > 0),
        name: parts[5], value: parts.slice(6).join('\t'), httpOnly
      });
    }
    return cookies;
  }

  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; } else inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) { result.push(current); current = ''; }
      else current += ch;
    }
    result.push(current);
    return result;
  }

  parseCSVFormat(content) {
    const lines = content.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return [];
    const headers = this.parseCSVLine(lines[0]).map(h => h.trim());
    const bool = (v) => String(v).toLowerCase() === 'true';
    return lines.slice(1).map(line => {
      const cells = this.parseCSVLine(line);
      const row = Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? '']));
      return {
        name: row.name, value: row.value, domain: row.domain, path: row.path || '/',
        secure: bool(row.secure), httpOnly: bool(row.httpOnly), sameSite: row.sameSite || undefined,
        expirationDate: row.expirationDate ? parseFloat(row.expirationDate) : undefined,
        session: bool(row.session), storeId: row.storeId || undefined
      };
    });
  }

  parseHARCookies(harCookies) {
    return harCookies.map(c => ({
      name: c.name, value: c.value, domain: c.domain, path: c.path || '/',
      secure: Boolean(c.secure), httpOnly: Boolean(c.httpOnly), sameSite: c.sameSite,
      expirationDate: c.expires ? new Date(c.expires).getTime() / 1000 : undefined
    }));
  }

  showImportPreview(cookies) {
    this.pendingImport = cookies;
    const domains = new Set(cookies.map(c => normalizeDomain(c.domain)));
    $('previewCount').textContent = t('countCookies', { n: cookies.length });
    $('previewDomains').textContent = t('countDomains', { n: domains.size });
    const rows = cookies.slice(0, 60).map(c => `<div class="preview-item"><b>${escapeHtml(c.name)}</b><span>${escapeHtml(normalizeDomain(c.domain))}</span></div>`);
    if (cookies.length > 60) rows.push(`<div class="preview-item"><span>${escapeHtml(t('andMore', { n: cookies.length - 60 }))}</span></div>`);
    $('previewList').innerHTML = rows.join('');
    $('previewPanel').hidden = false;
    $('dropzone').hidden = true;
  }

  cancelPreview() {
    this.pendingImport = null;
    $('previewPanel').hidden = true;
    $('dropzone').hidden = false;
  }

  confirmImportCookies() {
    const cookies = this.pendingImport;
    this.cancelPreview();
    if (cookies) this.importCookies(cookies);
  }

  async importCookies(cookies) {
    $('dropzone').hidden = true;
    $('importStats').hidden = true;
    $('loading').hidden = false;
    try {
      const result = await browser.runtime.sendMessage({ action: 'importCookies', cookies, options: { overwrite: $('overwriteExisting').checked } });
      if (!result?.success) throw new Error(result?.error || 'import failed');
      $('importedCount').textContent = result.imported;
      $('skippedCount').textContent = result.skipped;
      $('failedCount').textContent = result.failed;
      $('importStats').hidden = false;
      this.addHistoryEntry('import', t('importSummary', { imported: result.imported, failed: result.failed }));
      this.toast(result.failed ? t('importPartial') : t('importDone', { n: result.imported }), result.failed ? 'warning' : 'success');
      await this.refreshCookieList();
    } catch (e) {
      this.toast(t('errorPrefix') + e.message, 'error');
    } finally {
      $('loading').hidden = true;
      $('dropzone').hidden = false;
    }
  }

  // ============ ENCRYPTION (AES-256-GCM + PBKDF2) ============
  async deriveKey(password, salt, iterations, usage) {
    const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, [usage]);
  }

  async encrypt(data, password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await this.deriveKey(password, salt, PBKDF2_ITERATIONS, 'encrypt');
    const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(data))));
    const combined = new Uint8Array(salt.length + iv.length + encrypted.length);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(encrypted, salt.length + iv.length);
    return bytesToBase64(combined);
  }

  async decrypt(encryptedData, password, iterations) {
    const combined = base64ToBytes(encryptedData);
    const key = await this.deriveKey(password, combined.slice(0, 16), iterations, 'decrypt');
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: combined.slice(16, 28) }, key, combined.slice(28));
    return JSON.parse(new TextDecoder().decode(decrypted));
  }

  // ============ PROFILES ============
  async loadProfiles() {
    try {
      const { cookieProfiles } = await browser.storage.local.get('cookieProfiles');
      if (cookieProfiles) {
        this.profiles = cookieProfiles;
      } else {
        // v3.0 stored profiles in localStorage: migrate once
        this.profiles = readJson(LS.legacyProfiles, []);
        if (this.profiles.length) await this.saveProfiles();
      }
    } catch (e) { this.profiles = []; }
    this.renderProfiles();
  }

  async saveProfiles() {
    await browser.storage.local.set({ cookieProfiles: this.profiles });
    localStorage.removeItem(LS.legacyProfiles);
  }

  renderProfiles() {
    $('profileList').innerHTML = this.profiles.length ? this.profiles.map((p, i) => `
      <div class="item" style="--i:${i}">
        <div class="item-info">
          <div class="item-title">${escapeHtml(p.name)}</div>
          <div class="item-meta">${escapeHtml(t('countCookies', { n: p.cookieCount }))} &middot; ${escapeHtml(new Date(p.date).toLocaleString())}</div>
        </div>
        <div class="item-actions">
          <button class="btn btn-soft btn-sm" data-profile-action="load" data-index="${i}">${escapeHtml(t('load'))}</button>
          <button class="icon-btn sm" data-profile-action="download" data-index="${i}" title="${escapeHtml(t('download'))}">${icon('download')}</button>
          <button class="icon-btn sm" data-profile-action="delete" data-index="${i}" title="${escapeHtml(t('delete'))}">${icon('trash')}</button>
        </div>
      </div>`).join('') : this.emptyHtml('archive', t('noProfiles'), t('noProfilesHint'));

    const options = `<option value="">--</option>` + this.profiles.map((p, i) => `<option value="${i}">${escapeHtml(p.name)}</option>`).join('');
    $('compareProfile1').innerHTML = options;
    $('compareProfile2').innerHTML = options;
  }

  async saveProfile() {
    const name = $('profileName').value.trim();
    if (!name) { this.toast(t('profileNameRequired'), 'warning'); $('profileName').focus(); return; }
    await this.refreshCookieList();
    this.profiles.unshift({ name, date: new Date().toISOString(), cookieCount: this.allCookies.length, cookies: this.allCookies.map(serializeCookie) });
    try {
      await this.saveProfiles();
      $('profileName').value = '';
      this.renderProfiles();
      this.toast(t('profileSaved'));
    } catch (e) {
      this.profiles.shift();
      this.toast(t('errorPrefix') + e.message, 'error');
    }
  }

  async handleProfileClick(e) {
    const btn = e.target.closest('[data-profile-action]');
    if (!btn) return;
    const index = Number(btn.dataset.index);
    const profile = this.profiles[index];
    if (!profile) return;
    const action = btn.dataset.profileAction;

    if (action === 'load') {
      if (!(await this.confirmDialog(t('confirmLoadProfile', { name: profile.name, n: profile.cookieCount }), t('load')))) return;
      await this.importCookies(profile.cookies);
    } else if (action === 'download') {
      const data = { version: '3.1', exportDate: profile.date, browser: 'Firefox', encrypted: false, cookies: profile.cookies };
      downloadFile(JSON.stringify(data, null, 2), `profile_${profile.name.replace(/[^\w-]+/g, '_')}_${formatDateStamp()}.json`);
    } else if (action === 'delete') {
      if (!(await this.confirmDialog(t('confirmDeleteProfile', { name: profile.name }), t('delete')))) return;
      this.profiles.splice(index, 1);
      await this.saveProfiles();
      this.renderProfiles();
      this.toast(t('profileDeleted'));
    }
  }

  compareProfiles() {
    const first = this.profiles[Number($('compareProfile1').value)];
    const second = this.profiles[Number($('compareProfile2').value)];
    const results = $('diffResults');
    if (!$('compareProfile1').value || !$('compareProfile2').value || first === second) {
      this.toast(t('selectTwoProfiles'), 'warning');
      return;
    }
    const toMap = (profile) => new Map(profile.cookies.map(c => [cookieKey(c), c]));
    const map1 = toMap(first);
    const map2 = toMap(second);
    const added = [], removed = [], modified = [];
    map2.forEach((c, key) => {
      if (!map1.has(key)) added.push(c);
      else if (map1.get(key).value !== c.value) modified.push(c);
    });
    map1.forEach((c, key) => { if (!map2.has(key)) removed.push(c); });

    results.hidden = false;
    if (!added.length && !removed.length && !modified.length) {
      results.innerHTML = this.emptyHtml('archive', t('profilesIdentical'));
      return;
    }
    const item = (cls, sign, c) => `<div class="diff-item ${cls}">${sign} <b>${escapeHtml(c.name)}</b> <span>${escapeHtml(normalizeDomain(c.domain))}</span></div>`;
    results.innerHTML = `<div class="diff-summary">${escapeHtml(t('diffSummary', { added: added.length, removed: removed.length, modified: modified.length }))}</div>`
      + added.map(c => item('diff-added', '+', c)).join('')
      + removed.map(c => item('diff-removed', '-', c)).join('')
      + modified.map(c => item('diff-modified', '~', c)).join('');
  }

  // ============ AUTO BACKUP ============
  initAutoBackup() {
    const settings = readJson(LS.autoBackup, null);
    if (!settings) return;
    $('autoBackupEnabled').checked = Boolean(settings.enabled);
    $('backupInterval').value = String(settings.interval || 24);
    $('autoBackupOptions').hidden = !settings.enabled;
    this.updateLastBackupLabel();
    if (settings.enabled) this.checkAutoBackup();
  }

  updateLastBackupLabel() {
    const last = Number(localStorage.getItem(LS.lastBackup));
    $('lastBackupTime').textContent = last ? `${t('lastBackup')} ${new Date(last).toLocaleString()}` : t('neverBackedUp');
  }

  saveAutoBackupSettings() {
    const enabled = $('autoBackupEnabled').checked;
    writeJson(LS.autoBackup, { enabled, interval: Number($('backupInterval').value) });
    if (enabled) this.checkAutoBackup();
  }

  async checkAutoBackup() {
    const settings = readJson(LS.autoBackup, {});
    if (!settings.enabled) return;
    const last = Number(localStorage.getItem(LS.lastBackup)) || 0;
    if (Date.now() - last < settings.interval * 3600 * 1000) return;
    const cookies = this.allCookies.length ? this.allCookies : await getAllCookiesEverywhere();
    const data = { ...this.buildJsonExport(cookies), autoBackup: true };
    downloadFile(JSON.stringify(data, null, 2), `cookie_backup_${formatDateStamp()}.json`);
    localStorage.setItem(LS.lastBackup, String(Date.now()));
    this.updateLastBackupLabel();
  }

  // ============ RULES ============
  bindRuleEvents(on) {
    on('addRuleBtn', 'click', () => this.addRule());
    on('ruleMatchValue', 'keydown', (e) => { if (e.key === 'Enter') this.addRule(); });
    on('ruleList', 'click', (e) => this.handleRuleClick(e));
    on('ruleList', 'change', (e) => this.handleRuleToggle(e));
    on('importRulesBtn', 'click', () => $('ruleFileInput').click());
    on('ruleFileInput', 'change', (e) => { if (e.target.files[0]) this.importRulesFromFile(e.target.files[0]); e.target.value = ''; });
    on('exportRulesBtn', 'click', () => this.exportRulesToFile());
  }

  async loadRules() {
    try {
      const { cookieRules = [] } = await browser.storage.local.get('cookieRules');
      this.rules = cookieRules;
    } catch (e) { this.rules = []; }
    this.renderRules();
  }

  async saveRules() {
    await browser.storage.local.set({ cookieRules: this.rules });
    this.renderRules();
  }

  isValidRule(rule) {
    return rule && ['domain', 'name', 'regex'].includes(rule.matchType) && typeof rule.matchValue === 'string'
      && rule.matchValue.trim() !== '' && ['delete', 'protect'].includes(rule.action);
  }

  async addRule() {
    const rule = {
      id: Date.now(),
      matchType: $('ruleMatchType').value,
      matchValue: $('ruleMatchValue').value.trim(),
      action: $('ruleAction').value,
      delay: Math.max(0, parseInt($('ruleDelay').value, 10) || 0),
      storeId: $('ruleContainer').value || undefined,
      enabled: true
    };
    if (!rule.matchValue) { this.toast(t('ruleValueRequired'), 'warning'); $('ruleMatchValue').focus(); return; }
    if (rule.matchType === 'regex') {
      try { new RegExp(rule.matchValue); } catch (e) { this.toast(t('regexInvalid'), 'error'); return; }
    }
    this.rules.push(rule);
    await this.saveRules();
    $('ruleMatchValue').value = '';
    $('ruleDelay').value = '0';
    this.toast(t('ruleAdded'));
  }

  describeRule(rule) {
    const match = { domain: t('ruleMatchDomain'), name: t('ruleMatchName'), regex: t('ruleMatchRegex') }[rule.matchType];
    const action = rule.action === 'delete' ? t('ruleActionDelete') : t('ruleActionProtect');
    const delay = rule.delay ? ` (${t('after')} ${rule.delay} ${t('minutes')})` : '';
    const store = rule.storeId ? ` · ${this.storeMeta(rule.storeId).name}` : '';
    return { title: `${match} "${rule.matchValue}"`, meta: `→ ${action}${delay}${store}` };
  }

  renderRules() {
    $('ruleList').innerHTML = this.rules.length ? this.rules.map((r, i) => {
      const { title, meta } = this.describeRule(r);
      return `<div class="item${r.enabled ? '' : ' disabled'}">
        <div class="item-info"><div class="item-title">${escapeHtml(title)}</div><div class="item-meta">${escapeHtml(meta)}</div></div>
        <div class="item-actions">
          <label class="mini-switch" title="${escapeHtml(t('ruleEnabled'))}"><input type="checkbox" data-rule-toggle="${i}" ${r.enabled ? 'checked' : ''}><span class="switch"></span></label>
          <button class="icon-btn sm" data-rule-delete="${i}" title="${escapeHtml(t('delete'))}">${icon('trash')}</button>
        </div>
      </div>`;
    }).join('') : this.emptyHtml('rules', t('noRules'), t('noRulesHint'));
  }

  async handleRuleToggle(e) {
    const input = e.target.closest('[data-rule-toggle]');
    if (!input) return;
    this.rules[Number(input.dataset.ruleToggle)].enabled = input.checked;
    await this.saveRules();
  }

  async handleRuleClick(e) {
    const btn = e.target.closest('[data-rule-delete]');
    if (!btn) return;
    this.rules.splice(Number(btn.dataset.ruleDelete), 1);
    await this.saveRules();
    this.toast(t('ruleDeleted'));
  }

  async importRulesFromFile(file) {
    try {
      const imported = JSON.parse(await file.text());
      if (!Array.isArray(imported)) throw new Error(t('invalidFile'));
      const valid = imported.filter(r => this.isValidRule(r)).map((r, i) => ({ ...r, id: Date.now() + i, enabled: r.enabled !== false }));
      this.rules = this.rules.concat(valid);
      await this.saveRules();
      this.toast(t('rulesImported', { n: valid.length }));
    } catch (e) {
      this.toast(t('errorPrefix') + e.message, 'error');
    }
  }

  exportRulesToFile() {
    if (!this.rules.length) { this.toast(t('noRules'), 'warning'); return; }
    downloadFile(JSON.stringify(this.rules, null, 2), `cookie_rules_${formatDateStamp()}.json`, 'application/json');
  }

  // ============ HISTORY ============
  loadHistory() {
    this.history = readJson(LS.history, []);
    this.renderHistory();
  }

  addHistoryEntry(action, detail) {
    this.history.unshift({ timestamp: Date.now(), action, detail });
    if (this.history.length > 200) this.history.length = 200;
    writeJson(LS.history, this.history);
    this.renderHistory();
  }

  renderHistory() {
    const labels = {
      delete: t('historyDelete'), import: t('historyImport'), export: t('historyExport'), edit: t('historyEdit'),
      protect: t('historyProtect'), unprotect: t('historyUnprotect'), clean: t('historyClean')
    };
    $('historyList').innerHTML = this.history.length ? this.history.slice(0, 80).map(h => `
      <div class="event">
        <span class="pill ${escapeHtml(h.action)}">${escapeHtml(labels[h.action] || h.action)}</span>
        <div class="event-info"><div class="event-name">${escapeHtml(h.detail)}</div><div class="event-domain">${escapeHtml(new Date(h.timestamp).toLocaleString())}</div></div>
      </div>`).join('') : this.emptyHtml('clock', t('noHistory'), t('noHistoryHint'));
    $('undoBtn').disabled = this.undoStack.length === 0;
  }

  async clearHistory() {
    if (!this.history.length) return;
    if (!(await this.confirmDialog(t('confirmClearHistory'), t('monitorClear')))) return;
    this.history = [];
    writeJson(LS.history, this.history);
    this.renderHistory();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new CookieManager();
  app.init().catch(e => console.error('[CookieManager] init failed', e));
});
