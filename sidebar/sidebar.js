/**
 * Cookie Manager Pro v3.0
 * Complete cookie management with monitor, rules, protection, dashboard, containers, and more.
 * 100% offline - zero external dependencies.
 */

const DEFAULT_TRACKERS = [
  'google-analytics.com', 'doubleclick.net', 'facebook.com', 'facebook.net',
  'googlesyndication.com', 'googleadservices.com', 'amazon-adsystem.com',
  'scorecardresearch.com', 'quantserve.com', 'criteo.com', 'outbrain.com',
  'taboola.com', 'adnxs.com', 'rubiconproject.com', 'pubmatic.com',
  'hotjar.com', 'mixpanel.com', 'segment.com', 'optimizely.com'
];

const PIE_COLORS = ['#4f8cff', '#00c853', '#ff5252', '#ffc107', '#29b6f6', '#ab47bc', '#ff7043', '#66bb6a'];

class CookieManager {
  constructor() {
    this.allCookies = [];
    this.filteredCookies = [];
    this.selectedCookieKeys = new Set();
    this.currentDomainValue = '';
    this.trackers = [];
    this.profiles = [];
    this.containers = [];
    this.protectedKeys = new Set();
    this.pendingImportCookies = null;
    this.editingCookie = null;
    this.isCreatingCookie = false;
    this.regexMode = false;
    this.compactView = false;
    this.sortField = 'name';
    this.sortAsc = true;
    this.activeFilters = new Set();
    this.monitorPaused = false;
    this.monitorEntries = [];
    this.monitorFilter = 'all';
    this.monitorStats = { created: 0, deleted: 0, updated: 0 };
    this.history = [];
    this.undoStack = [];
    this.rules = [];

    this.initElements();
    this.loadSettings();
    this.initEventListeners();
    this.loadTheme();
    this.loadProfiles();
    this.loadProtected();
    this.loadRules();
    this.loadHistory();
    this.loadContainers();
    this.refreshCookieList();
    this.loadStats();
    this.getCurrentTab();
    this.initAutoBackup();
    this.initMonitor();
    this.populateLanguageSelect();
  }

  // ============ INIT ============
  initElements() {
    this.themeToggle = document.getElementById('themeToggle');
    this.settingsBtn = document.getElementById('settingsBtn');
    this.settingsModal = document.getElementById('settingsModal');
    this.closeSettings = document.getElementById('closeSettings');
    this.languageSelect = document.getElementById('languageSelect');
    this.trackerList = document.getElementById('trackerList');
    this.tabs = document.querySelectorAll('.tab');
    this.tabContents = document.querySelectorAll('.tab-content');
    this.message = document.getElementById('message');
    // Cookies tab
    this.cookieSearch = document.getElementById('cookieSearch');
    this.regexToggle = document.getElementById('regexToggle');
    this.domainFilter = document.getElementById('domainFilter');
    this.containerFilter = document.getElementById('containerFilter');
    this.sortBy = document.getElementById('sortBy');
    this.sortDirection = document.getElementById('sortDirection');
    this.compactViewBtn = document.getElementById('compactViewBtn');
    this.detailedViewBtn = document.getElementById('detailedViewBtn');
    this.selectAllCheckbox = document.getElementById('selectAllCheckbox');
    this.cookieCountDisplay = document.getElementById('cookieCountDisplay');
    this.addCookieBtn = document.getElementById('addCookieBtn');
    this.deleteSelected = document.getElementById('deleteSelected');
    this.exportSelectedBtn = document.getElementById('exportSelectedBtn');
    this.deleteAllVisible = document.getElementById('deleteAllVisible');
    this.cookieList = document.getElementById('cookieList');
    this.refreshCookiesBtn = document.getElementById('refreshCookies');
    this.cleanTrackersBtn = document.getElementById('cleanTrackersBtn');
    this.cleanExpiredBtn = document.getElementById('cleanExpiredBtn');
    // Cookie modal
    this.cookieEditModal = document.getElementById('cookieEditModal');
    this.cookieModalTitle = document.getElementById('cookieModalTitle');
    this.closeCookieEdit = document.getElementById('closeCookieEdit');
    this.editCookieName = document.getElementById('editCookieName');
    this.editCookieValue = document.getElementById('editCookieValue');
    this.editCookieDomain = document.getElementById('editCookieDomain');
    this.editCookiePath = document.getElementById('editCookiePath');
    this.editCookieExpiry = document.getElementById('editCookieExpiry');
    this.editCookieSameSite = document.getElementById('editCookieSameSite');
    this.editCookieSecure = document.getElementById('editCookieSecure');
    this.editCookieHttpOnly = document.getElementById('editCookieHttpOnly');
    this.copyEditValue = document.getElementById('copyEditValue');
    this.cloneCookieBtn = document.getElementById('cloneCookieBtn');
    this.deleteCookieBtn = document.getElementById('deleteCookieBtn');
    this.saveCookieBtn = document.getElementById('saveCookieBtn');
    // Export
    this.encryptExport = document.getElementById('encryptExport');
    this.exportPassword = document.getElementById('exportPassword');
    this.filterCurrentSite = document.getElementById('filterCurrentSite');
    this.filterCustomDomain = document.getElementById('filterCustomDomain');
    this.currentDomain = document.getElementById('currentDomain');
    this.customDomain = document.getElementById('customDomain');
    this.excludeTrackers = document.getElementById('excludeTrackers');
    this.totalCookies = document.getElementById('totalCookies');
    this.selectedCookies = document.getElementById('selectedCookies');
    this.exportBtn = document.getElementById('exportBtn');
    this.copyClipboardBtn = document.getElementById('copyClipboardBtn');
    // Import
    this.encryptImport = document.getElementById('encryptImport');
    this.importPassword = document.getElementById('importPassword');
    this.overwriteExisting = document.getElementById('overwriteExisting');
    this.previewBeforeImport = document.getElementById('previewBeforeImport');
    this.dropzone = document.getElementById('dropzone');
    this.fileInput = document.getElementById('fileInput');
    this.previewPanel = document.getElementById('previewPanel');
    this.previewCount = document.getElementById('previewCount');
    this.previewDomains = document.getElementById('previewDomains');
    this.previewList = document.getElementById('previewList');
    this.cancelImport = document.getElementById('cancelImport');
    this.confirmImport = document.getElementById('confirmImport');
    this.loading = document.getElementById('loading');
    this.importStats = document.getElementById('importStats');
    this.importedCount = document.getElementById('importedCount');
    this.failedCount = document.getElementById('failedCount');
    // Profiles
    this.profileName = document.getElementById('profileName');
    this.saveProfileBtn = document.getElementById('saveProfileBtn');
    this.profileList = document.getElementById('profileList');
    this.compareProfile1 = document.getElementById('compareProfile1');
    this.compareProfile2 = document.getElementById('compareProfile2');
    this.compareBtn = document.getElementById('compareBtn');
    this.diffResults = document.getElementById('diffResults');
    this.autoBackupEnabled = document.getElementById('autoBackupEnabled');
    this.autoBackupOptions = document.getElementById('autoBackupOptions');
    this.backupInterval = document.getElementById('backupInterval');
    this.lastBackupTime = document.getElementById('lastBackupTime');
    // Monitor
    this.monitorLiveBadge = document.getElementById('monitorLiveBadge');
    this.monitorPauseBtn = document.getElementById('monitorPauseBtn');
    this.monitorClearBtn = document.getElementById('monitorClearBtn');
    this.monitorLog = document.getElementById('monitorLog');
    this.monitorCreated = document.getElementById('monitorCreated');
    this.monitorDeleted = document.getElementById('monitorDeleted');
    this.monitorUpdated = document.getElementById('monitorUpdated');
    // Rules
    this.ruleMatchType = document.getElementById('ruleMatchType');
    this.ruleMatchValue = document.getElementById('ruleMatchValue');
    this.ruleAction = document.getElementById('ruleAction');
    this.ruleDelay = document.getElementById('ruleDelay');
    this.addRuleBtn = document.getElementById('addRuleBtn');
    this.ruleList = document.getElementById('ruleList');
    this.importRulesBtn = document.getElementById('importRulesBtn');
    this.exportRulesBtn = document.getElementById('exportRulesBtn');
    this.ruleFileInput = document.getElementById('ruleFileInput');
    // History
    this.historyList = document.getElementById('historyList');
    this.undoBtn = document.getElementById('undoBtn');
  }

  initEventListeners() {
    // Theme & Settings
    this.themeToggle.addEventListener('click', () => this.toggleTheme());
    this.settingsBtn.addEventListener('click', () => this.settingsModal.classList.add('show'));
    this.closeSettings.addEventListener('click', () => this.settingsModal.classList.remove('show'));
    this.settingsModal.addEventListener('click', (e) => { if (e.target === this.settingsModal) this.settingsModal.classList.remove('show'); });
    this.languageSelect.addEventListener('change', (e) => { setLanguage(e.target.value); location.reload(); });
    this.trackerList.addEventListener('change', () => this.saveTrackerList());

    // Tabs
    this.tabs.forEach(tab => tab.addEventListener('click', () => this.switchTab(tab.dataset.tab)));

    // Cookies tab
    this.cookieSearch.addEventListener('input', () => this.filterCookieList());
    this.regexToggle.addEventListener('click', () => { this.regexMode = !this.regexMode; this.regexToggle.classList.toggle('active', this.regexMode); this.filterCookieList(); });
    this.domainFilter.addEventListener('change', () => this.filterCookieList());
    this.containerFilter.addEventListener('change', () => this.filterCookieList());
    this.sortBy.addEventListener('change', () => { this.sortField = this.sortBy.value; this.filterCookieList(); });
    this.sortDirection.addEventListener('click', () => { this.sortAsc = !this.sortAsc; this.sortDirection.querySelector('svg').style.transform = this.sortAsc ? '' : 'rotate(180deg)'; this.filterCookieList(); });
    this.compactViewBtn.addEventListener('click', () => { this.compactView = true; this.compactViewBtn.classList.add('active'); this.detailedViewBtn.classList.remove('active'); this.renderCookieList(); });
    this.detailedViewBtn.addEventListener('click', () => { this.compactView = false; this.detailedViewBtn.classList.add('active'); this.compactViewBtn.classList.remove('active'); this.renderCookieList(); });
    this.selectAllCheckbox.addEventListener('change', () => this.toggleSelectAll());
    this.addCookieBtn.addEventListener('click', () => this.openCreateCookie());
    this.deleteSelected.addEventListener('click', () => this.deleteSelectedCookies());
    this.exportSelectedBtn.addEventListener('click', () => this.exportSelectedCookies());
    this.deleteAllVisible.addEventListener('click', () => this.deleteAllVisibleCookies());
    this.refreshCookiesBtn.addEventListener('click', () => this.refreshCookieList());
    this.cleanTrackersBtn.addEventListener('click', () => this.cleanTrackers());
    this.cleanExpiredBtn.addEventListener('click', () => this.cleanExpired());

    // Badge filters
    document.querySelectorAll('.badge-filter[data-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        const f = btn.dataset.filter;
        if (this.activeFilters.has(f)) { this.activeFilters.delete(f); btn.classList.remove('active'); }
        else { this.activeFilters.add(f); btn.classList.add('active'); }
        this.filterCookieList();
      });
    });

    // Cookie modal
    this.closeCookieEdit.addEventListener('click', () => this.closeCookieEditModal());
    this.cookieEditModal.addEventListener('click', (e) => { if (e.target === this.cookieEditModal) this.closeCookieEditModal(); });
    this.deleteCookieBtn.addEventListener('click', () => this.deleteEditingCookie());
    this.saveCookieBtn.addEventListener('click', () => this.saveEditingCookie());
    this.cloneCookieBtn.addEventListener('click', () => this.cloneEditingCookie());
    this.copyEditValue.addEventListener('click', () => this.copyToClipboard(this.editCookieValue.value));

    // Export
    this.encryptExport.addEventListener('change', () => { this.exportPassword.style.display = this.encryptExport.checked ? 'block' : 'none'; });
    this.filterCurrentSite.addEventListener('change', () => { this.currentDomain.style.display = this.filterCurrentSite.checked ? 'block' : 'none'; if (this.filterCurrentSite.checked) { this.filterCustomDomain.checked = false; this.customDomain.style.display = 'none'; } this.updateSelectedCount(); });
    this.filterCustomDomain.addEventListener('change', () => { this.customDomain.style.display = this.filterCustomDomain.checked ? 'block' : 'none'; if (this.filterCustomDomain.checked) { this.filterCurrentSite.checked = false; this.currentDomain.style.display = 'none'; } this.updateSelectedCount(); });
    this.customDomain.addEventListener('input', () => this.updateSelectedCount());
    this.excludeTrackers.addEventListener('change', () => this.updateSelectedCount());
    this.exportBtn.addEventListener('click', () => this.exportCookies());
    this.copyClipboardBtn.addEventListener('click', () => this.copyExportToClipboard());

    // Import
    this.encryptImport.addEventListener('change', () => { this.importPassword.style.display = this.encryptImport.checked ? 'block' : 'none'; });
    this.dropzone.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', (e) => { if (e.target.files[0]) this.handleImportFile(e.target.files[0]); });
    this.dropzone.addEventListener('dragover', (e) => { e.preventDefault(); this.dropzone.classList.add('dragover'); });
    this.dropzone.addEventListener('dragleave', () => this.dropzone.classList.remove('dragover'));
    this.dropzone.addEventListener('drop', (e) => { e.preventDefault(); this.dropzone.classList.remove('dragover'); if (e.dataTransfer.files[0]) this.handleImportFile(e.dataTransfer.files[0]); });
    this.cancelImport.addEventListener('click', () => this.cancelPreview());
    this.confirmImport.addEventListener('click', () => this.confirmImportCookies());

    // Profiles
    this.saveProfileBtn.addEventListener('click', () => this.saveProfile());
    this.compareBtn.addEventListener('click', () => this.compareProfiles());
    this.autoBackupEnabled.addEventListener('change', () => { this.autoBackupOptions.style.display = this.autoBackupEnabled.checked ? 'block' : 'none'; this.saveAutoBackupSettings(); });
    this.backupInterval.addEventListener('change', () => this.saveAutoBackupSettings());

    // Rules
    this.addRuleBtn.addEventListener('click', () => this.addRule());
    this.importRulesBtn.addEventListener('click', () => this.ruleFileInput.click());
    this.ruleFileInput.addEventListener('change', (e) => { if (e.target.files[0]) this.importRulesFromFile(e.target.files[0]); });
    this.exportRulesBtn.addEventListener('click', () => this.exportRulesToFile());

    // History
    this.undoBtn.addEventListener('click', () => this.undoLastAction());

    // Monitor
    this.monitorPauseBtn.addEventListener('click', () => this.toggleMonitorPause());
    this.monitorClearBtn.addEventListener('click', () => this.clearMonitor());
    document.querySelectorAll('[data-monitor-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-monitor-filter]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.monitorFilter = btn.dataset.monitorFilter;
        this.renderMonitorLog();
      });
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'E') { e.preventDefault(); this.exportCookies(); }
      if (e.ctrlKey && e.shiftKey && e.key === 'I') { e.preventDefault(); this.switchTab('import'); }
      if (e.key === 'Delete' && this.selectedCookieKeys.size > 0) { e.preventDefault(); this.deleteSelectedCookies(); }
      if (e.ctrlKey && e.key === 'a' && document.activeElement === this.cookieList) { e.preventDefault(); this.selectAllVisible(); }
      if (e.ctrlKey && e.key === 'z') { e.preventDefault(); this.undoLastAction(); }
      if (e.key === 'Escape') { this.closeCookieEditModal(); this.settingsModal.classList.remove('show'); }
    });
  }

  populateLanguageSelect() {
    this.languageSelect.innerHTML = '';
    for (const [code, name] of Object.entries(languageNames)) {
      const opt = document.createElement('option');
      opt.value = code;
      opt.textContent = name;
      this.languageSelect.appendChild(opt);
    }
    this.languageSelect.value = currentLang;
  }

  // ============ SETTINGS ============
  loadSettings() {
    const saved = localStorage.getItem('cookieManagerTrackers');
    this.trackers = saved ? JSON.parse(saved) : DEFAULT_TRACKERS;
    this.trackerList.value = this.trackers.join('\n');
  }

  saveTrackerList() {
    this.trackers = this.trackerList.value.split('\n').map(d => d.trim()).filter(d => d);
    localStorage.setItem('cookieManagerTrackers', JSON.stringify(this.trackers));
  }

  // ============ THEME ============
  loadTheme() {
    const theme = localStorage.getItem('cookieManagerTheme') || 'dark';
    document.body.className = theme;
  }

  toggleTheme() {
    const newTheme = document.body.classList.contains('dark') ? 'light' : 'dark';
    document.body.className = newTheme;
    localStorage.setItem('cookieManagerTheme', newTheme);
  }

  // ============ TABS ============
  switchTab(tabName) {
    this.tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
    this.tabContents.forEach(c => c.classList.toggle('active', c.id === `${tabName}-tab`));
    this.hideMessage();
    if (tabName === 'dashboard') this.refreshDashboard();
    if (tabName === 'monitor') this.loadMonitorLog();
  }

  // ============ MESSAGE ============
  showMessage(text, type) {
    this.message.textContent = text;
    this.message.className = `message show ${type}`;
    setTimeout(() => this.hideMessage(), 5000);
  }

  hideMessage() { this.message.classList.remove('show'); }

  // ============ CURRENT TAB ============
  async getCurrentTab() {
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]?.url) { this.currentDomainValue = new URL(tabs[0].url).hostname; this.currentDomain.value = this.currentDomainValue; }
    } catch (e) {}
  }

  // ============ CONTAINERS ============
  async loadContainers() {
    try {
      const result = await browser.runtime.sendMessage({ action: 'getContainers' });
      this.containers = result.containers || [];
      this.buildContainerFilter();
    } catch (e) { this.containers = []; }
  }

  buildContainerFilter() {
    this.containerFilter.innerHTML = `<option value="">${t('allContainers')}</option>`;
    this.containers.forEach(c => {
      this.containerFilter.innerHTML += `<option value="${c.cookieStoreId}">${this.escapeHtml(c.name)}</option>`;
    });
  }

  getContainerForCookie(cookie) {
    if (!cookie.storeId || cookie.storeId === 'firefox-default') return null;
    return this.containers.find(c => c.cookieStoreId === cookie.storeId);
  }

  // ============ PROTECTED COOKIES ============
  async loadProtected() {
    try {
      const data = await browser.storage.local.get('protectedCookies');
      const list = data.protectedCookies || [];
      this.protectedKeys = new Set(list.map(p => p.key));
    } catch (e) {}
  }

  isProtected(cookie) {
    return this.protectedKeys.has(`${cookie.name}|||${cookie.domain}`);
  }

  async toggleProtection(cookie) {
    const key = `${cookie.name}|||${cookie.domain}`;
    if (this.protectedKeys.has(key)) {
      await browser.runtime.sendMessage({ action: 'unprotectCookie', name: cookie.name, domain: cookie.domain });
      this.protectedKeys.delete(key);
      this.showMessage(t('protectionDisabled'), 'success');
      this.addHistoryEntry('unprotect', `${cookie.name} (${cookie.domain})`);
    } else {
      await browser.runtime.sendMessage({ action: 'protectCookie', cookie });
      this.protectedKeys.add(key);
      this.showMessage(t('protectionEnabled'), 'success');
      this.addHistoryEntry('protect', `${cookie.name} (${cookie.domain})`);
    }
    this.renderCookieList();
  }

  // ============ COOKIE LIST ============
  async refreshCookieList() {
    this.cookieList.innerHTML = '<div class="loading-inline">Loading...</div>';
    try {
      this.allCookies = await browser.cookies.getAll({});
      this.buildDomainFilter();
      this.filterCookieList();
      this.loadStats();
    } catch (e) {
      this.cookieList.innerHTML = '<div class="empty-state">Error loading cookies</div>';
    }
  }

  buildDomainFilter() {
    const domains = [...new Set(this.allCookies.map(c => c.domain.replace(/^\./, '')))].sort();
    this.domainFilter.innerHTML = `<option value="">${t('allDomains')} (${domains.length})</option>`;
    domains.forEach(d => {
      const count = this.allCookies.filter(c => c.domain.includes(d)).length;
      this.domainFilter.innerHTML += `<option value="${d}">${d} (${count})</option>`;
    });
  }

  filterCookieList() {
    const search = this.cookieSearch.value;
    const domain = this.domainFilter.value;
    const container = this.containerFilter.value;

    this.filteredCookies = this.allCookies.filter(c => {
      // Search
      if (search) {
        if (this.regexMode) {
          try {
            const re = new RegExp(search, 'i');
            if (!re.test(c.name) && !re.test(c.domain) && !re.test(c.value)) return false;
          } catch (e) { return false; }
        } else {
          const s = search.toLowerCase();
          if (!c.name.toLowerCase().includes(s) && !c.domain.toLowerCase().includes(s) && !c.value.toLowerCase().includes(s)) return false;
        }
      }
      // Domain
      if (domain && !c.domain.includes(domain)) return false;
      // Container
      if (container && c.storeId !== container) return false;
      // Badge filters
      if (this.activeFilters.has('secure') && !c.secure) return false;
      if (this.activeFilters.has('httpOnly') && !c.httpOnly) return false;
      if (this.activeFilters.has('session') && !c.session) return false;
      if (this.activeFilters.has('tracker') && !this.isTracker(c.domain)) return false;
      if (this.activeFilters.has('protected') && !this.isProtected(c)) return false;
      return true;
    });

    // Sort
    this.filteredCookies.sort((a, b) => {
      let cmp = 0;
      if (this.sortField === 'name') cmp = a.name.localeCompare(b.name);
      else if (this.sortField === 'domain') cmp = a.domain.localeCompare(b.domain);
      else if (this.sortField === 'expiry') cmp = (a.expirationDate || Infinity) - (b.expirationDate || Infinity);
      else if (this.sortField === 'size') cmp = (a.value?.length || 0) - (b.value?.length || 0);
      return this.sortAsc ? cmp : -cmp;
    });

    this.renderCookieList();
  }

  renderCookieList() {
    const cookies = this.filteredCookies;
    if (cookies.length === 0) {
      this.cookieList.innerHTML = `<div class="empty-state">${t('noCookiesFound')}</div>`;
      this.cookieCountDisplay.textContent = `0 ${t('cookies')}`;
      this.updateSelectionUI();
      return;
    }
    this.cookieCountDisplay.textContent = `${cookies.length} ${t('cookies')}`;

    // Render up to 200 cookies (virtual scroll for perf)
    const max = Math.min(cookies.length, 200);
    let html = '';
    for (let i = 0; i < max; i++) {
      const c = cookies[i];
      const key = `${c.name}|||${c.domain}`;
      const isSelected = this.selectedCookieKeys.has(key);
      const isProt = this.isProtected(c);
      const isTrack = this.isTracker(c.domain);
      const container = this.getContainerForCookie(c);
      const compact = this.compactView ? ' compact' : '';

      const badges = [];
      if (c.secure) badges.push('<span class="badge secure">S</span>');
      if (c.httpOnly) badges.push('<span class="badge httponly">H</span>');
      if (c.session) badges.push('<span class="badge session-badge">Sess</span>');
      if (isTrack) badges.push('<span class="badge tracker">T</span>');
      if (isProt) badges.push('<span class="badge protected-badge">P</span>');

      const containerDot = container ? `<span class="container-dot" style="background:${container.color}" title="${this.escapeHtml(container.name)}"></span>` : '';
      const valuePreview = !this.compactView ? `<div class="cookie-value-preview">${this.escapeHtml((c.value || '').substring(0, 60))}</div>` : '';

      html += `<div class="cookie-item${compact}${isSelected ? ' selected' : ''}${isProt ? ' protected' : ''}" data-index="${i}" data-key="${this.escapeHtml(key)}" role="option" tabindex="-1">
        <input type="checkbox" class="cookie-checkbox" ${isSelected ? 'checked' : ''} aria-label="Select ${this.escapeHtml(c.name)}">
        ${containerDot}
        <div class="cookie-info">
          <div class="cookie-name">${this.escapeHtml(c.name)}</div>
          <div class="cookie-domain">${c.domain}</div>
          ${valuePreview}
        </div>
        <div class="cookie-badges">${badges.join('')}</div>
        <div class="cookie-item-actions">
          <button class="icon-btn tiny copy-btn" title="${t('copyCookieValue')}" aria-label="Copy value">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
          <button class="icon-btn tiny protect-btn ${isProt ? 'active' : ''}" title="${isProt ? t('unprotectCookie') : t('protectCookie')}" aria-label="Toggle protection">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </button>
        </div>
      </div>`;
    }

    if (cookies.length > max) {
      html += `<div class="empty-state">... and ${cookies.length - max} more (use search to narrow down)</div>`;
    }

    this.cookieList.innerHTML = html;

    // Event delegation
    this.cookieList.addEventListener('click', (e) => {
      const item = e.target.closest('.cookie-item');
      if (!item) return;
      const idx = parseInt(item.dataset.index);
      const cookie = this.filteredCookies[idx];
      if (!cookie) return;

      if (e.target.closest('.cookie-checkbox')) {
        this.toggleCookieSelection(cookie);
        return;
      }
      if (e.target.closest('.copy-btn')) {
        this.copyToClipboard(cookie.value || '');
        return;
      }
      if (e.target.closest('.protect-btn')) {
        this.toggleProtection(cookie);
        return;
      }
      this.openCookieEditor(cookie);
    }, { once: true });

    // Re-attach delegation (needed because innerHTML replaces content)
    this.cookieList.onclick = (e) => {
      const item = e.target.closest('.cookie-item');
      if (!item) return;
      const idx = parseInt(item.dataset.index);
      const cookie = this.filteredCookies[idx];
      if (!cookie) return;

      if (e.target.closest('.cookie-checkbox')) {
        this.toggleCookieSelection(cookie);
        return;
      }
      if (e.target.closest('.copy-btn')) {
        this.copyToClipboard(cookie.value || '');
        return;
      }
      if (e.target.closest('.protect-btn')) {
        this.toggleProtection(cookie);
        return;
      }
      this.openCookieEditor(cookie);
    };

    this.updateSelectionUI();
  }

  // ============ SELECTION ============
  toggleCookieSelection(cookie) {
    const key = `${cookie.name}|||${cookie.domain}`;
    if (this.selectedCookieKeys.has(key)) this.selectedCookieKeys.delete(key);
    else this.selectedCookieKeys.add(key);
    this.renderCookieList();
  }

  toggleSelectAll() {
    if (this.selectAllCheckbox.checked) this.selectAllVisible();
    else { this.selectedCookieKeys.clear(); this.renderCookieList(); }
  }

  selectAllVisible() {
    this.filteredCookies.forEach(c => this.selectedCookieKeys.add(`${c.name}|||${c.domain}`));
    this.selectAllCheckbox.checked = true;
    this.renderCookieList();
  }

  updateSelectionUI() {
    const hasSelection = this.selectedCookieKeys.size > 0;
    this.deleteSelected.style.display = hasSelection ? 'inline-block' : 'none';
    this.exportSelectedBtn.style.display = hasSelection ? 'inline-block' : 'none';
  }

  // ============ COOKIE EDITOR ============
  openCookieEditor(cookie) {
    this.editingCookie = cookie;
    this.isCreatingCookie = false;
    this.cookieModalTitle.textContent = t('editCookie');
    this.editCookieName.value = cookie.name;
    this.editCookieName.readOnly = true;
    this.editCookieValue.value = cookie.value;
    this.editCookieDomain.value = cookie.domain;
    this.editCookieDomain.readOnly = true;
    this.editCookiePath.value = cookie.path;
    this.editCookieSameSite.value = cookie.sameSite || 'no_restriction';
    if (cookie.expirationDate) {
      this.editCookieExpiry.value = new Date(cookie.expirationDate * 1000).toISOString().slice(0, 16);
    } else { this.editCookieExpiry.value = ''; }
    this.editCookieSecure.checked = cookie.secure;
    this.editCookieHttpOnly.checked = cookie.httpOnly;
    this.cloneCookieBtn.style.display = 'inline-flex';
    this.deleteCookieBtn.style.display = 'inline-flex';
    this.saveCookieBtn.textContent = t('save');
    this.cookieEditModal.classList.add('show');
  }

  openCreateCookie() {
    this.editingCookie = null;
    this.isCreatingCookie = true;
    this.cookieModalTitle.textContent = t('createCookie');
    this.editCookieName.value = '';
    this.editCookieName.readOnly = false;
    this.editCookieValue.value = '';
    this.editCookieDomain.value = this.currentDomainValue || '';
    this.editCookieDomain.readOnly = false;
    this.editCookiePath.value = '/';
    this.editCookieSameSite.value = 'lax';
    this.editCookieExpiry.value = '';
    this.editCookieSecure.checked = true;
    this.editCookieHttpOnly.checked = false;
    this.cloneCookieBtn.style.display = 'none';
    this.deleteCookieBtn.style.display = 'none';
    this.saveCookieBtn.textContent = t('create');
    this.cookieEditModal.classList.add('show');
  }

  closeCookieEditModal() {
    this.cookieEditModal.classList.remove('show');
    this.editingCookie = null;
    this.isCreatingCookie = false;
  }

  async deleteEditingCookie() {
    if (!this.editingCookie) return;
    try {
      const c = this.editingCookie;
      // Save for undo
      this.undoStack.push({ type: 'delete', cookie: { ...c } });
      const url = `http${c.secure ? 's' : ''}://${c.domain.replace(/^\./, '')}${c.path}`;
      await browser.cookies.remove({ url, name: c.name });
      this.showMessage(t('cookieDeleted'), 'success');
      this.addHistoryEntry('delete', `${c.name} (${c.domain})`);
      this.closeCookieEditModal();
      this.refreshCookieList();
    } catch (e) { this.showMessage('Error: ' + e.message, 'error'); }
  }

  async saveEditingCookie() {
    try {
      const domain = this.editCookieDomain.value.replace(/^\./, '');
      const secure = this.editCookieSecure.checked;
      const url = `http${secure ? 's' : ''}://${domain}${this.editCookiePath.value || '/'}`;

      let sameSite = this.editCookieSameSite.value;
      if (sameSite === 'no_restriction' && !secure) sameSite = 'lax';

      const cookieData = {
        url,
        name: this.editCookieName.value,
        value: this.editCookieValue.value,
        path: this.editCookiePath.value || '/',
        secure,
        httpOnly: this.editCookieHttpOnly.checked,
        sameSite
      };

      if (this.editCookieExpiry.value) {
        cookieData.expirationDate = new Date(this.editCookieExpiry.value).getTime() / 1000;
      }

      if (this.editCookieDomain.value.startsWith('.')) {
        cookieData.domain = this.editCookieDomain.value;
      }

      await browser.cookies.set(cookieData);

      if (this.isCreatingCookie) {
        this.showMessage(t('cookieCreated'), 'success');
        this.addHistoryEntry('edit', `Created: ${cookieData.name}`);
      } else {
        this.showMessage(t('cookieSaved'), 'success');
        this.addHistoryEntry('edit', `${cookieData.name} (${domain})`);
      }
      this.closeCookieEditModal();
      this.refreshCookieList();
    } catch (e) { this.showMessage('Error: ' + e.message, 'error'); }
  }

  cloneEditingCookie() {
    if (!this.editingCookie) return;
    this.isCreatingCookie = true;
    this.cookieModalTitle.textContent = t('createCookie') + ' (Clone)';
    this.editCookieName.readOnly = false;
    this.editCookieDomain.readOnly = false;
    this.cloneCookieBtn.style.display = 'none';
    this.deleteCookieBtn.style.display = 'none';
    this.saveCookieBtn.textContent = t('create');
    this.editingCookie = null;
  }

  // ============ BULK ACTIONS ============
  async deleteSelectedCookies() {
    if (this.selectedCookieKeys.size === 0) return;
    if (!confirm(`Delete ${this.selectedCookieKeys.size} cookies?`)) return;

    const toDelete = this.allCookies.filter(c => this.selectedCookieKeys.has(`${c.name}|||${c.domain}`) && !this.isProtected(c));
    this.undoStack.push({ type: 'bulkDelete', cookies: toDelete.map(c => ({ ...c })) });

    for (const c of toDelete) {
      try {
        const url = `http${c.secure ? 's' : ''}://${c.domain.replace(/^\./, '')}${c.path}`;
        await browser.cookies.remove({ url, name: c.name });
      } catch (e) {}
    }

    this.addHistoryEntry('delete', `Bulk: ${toDelete.length} cookies`);
    this.showMessage(`${toDelete.length} cookies deleted`, 'success');
    this.selectedCookieKeys.clear();
    this.selectAllCheckbox.checked = false;
    this.refreshCookieList();
  }

  async exportSelectedCookies() {
    const selected = this.allCookies.filter(c => this.selectedCookieKeys.has(`${c.name}|||${c.domain}`));
    if (selected.length === 0) return;
    const exportData = { version: '3.0', exportDate: new Date().toISOString(), browser: 'Firefox', encrypted: false, cookies: selected.map(c => this.cookieToExport(c)) };
    this.downloadFile(JSON.stringify(exportData, null, 2), `cookies_selected_${this.formatDate()}.json`);
    this.showMessage(`${selected.length} ${t('exportSuccess')}`, 'success');
    this.addHistoryEntry('export', `Selected: ${selected.length} cookies`);
  }

  async deleteAllVisibleCookies() {
    if (!confirm(`Delete ${this.filteredCookies.length} cookies?`)) return;
    const toDelete = this.filteredCookies.filter(c => !this.isProtected(c));
    this.undoStack.push({ type: 'bulkDelete', cookies: toDelete.map(c => ({ ...c })) });

    for (const c of toDelete) {
      try {
        const url = `http${c.secure ? 's' : ''}://${c.domain.replace(/^\./, '')}${c.path}`;
        await browser.cookies.remove({ url, name: c.name });
      } catch (e) {}
    }

    this.addHistoryEntry('delete', `All visible: ${toDelete.length} cookies`);
    this.showMessage(`${toDelete.length} cookies deleted`, 'success');
    this.refreshCookieList();
  }

  // ============ CLEANING ============
  async cleanTrackers() {
    try {
      const result = await browser.runtime.sendMessage({ action: 'cleanTrackers', trackers: this.trackers });
      this.showMessage(`${result.deleted} ${t('trackersDeleted')}`, 'success');
      this.addHistoryEntry('clean', `Trackers: ${result.deleted}`);
      this.refreshCookieList();
    } catch (e) { this.showMessage('Error: ' + e.message, 'error'); }
  }

  async cleanExpired() {
    try {
      const result = await browser.runtime.sendMessage({ action: 'cleanExpired' });
      this.showMessage(`${result.deleted} ${t('expiredDeleted')}`, 'success');
      this.addHistoryEntry('clean', `Expired: ${result.deleted}`);
      this.refreshCookieList();
    } catch (e) { this.showMessage('Error: ' + e.message, 'error'); }
  }

  // ============ TRACKER CHECK ============
  isTracker(domain) { return this.trackers.some(t => domain.includes(t)); }

  // ============ STATS ============
  async loadStats() {
    try {
      const cookies = await browser.cookies.getAll({});
      this.totalCookies.textContent = cookies.length;
      this.selectedCookies.textContent = cookies.length;
    } catch (e) {}
  }

  async updateSelectedCount() {
    const cookies = await this.getFilteredExportCookies();
    this.selectedCookies.textContent = cookies.length;
  }

  async getFilteredExportCookies() {
    let cookies = await browser.cookies.getAll({});
    if (this.filterCurrentSite.checked && this.currentDomainValue) {
      cookies = cookies.filter(c => c.domain.includes(this.currentDomainValue) || this.currentDomainValue.includes(c.domain.replace(/^\./, '')));
    } else if (this.filterCustomDomain.checked && this.customDomain.value) {
      const d = this.customDomain.value.toLowerCase();
      cookies = cookies.filter(c => c.domain.toLowerCase().includes(d) || d.includes(c.domain.replace(/^\./, '').toLowerCase()));
    }
    if (this.excludeTrackers.checked) cookies = cookies.filter(c => !this.isTracker(c.domain));
    return cookies;
  }

  // ============ DASHBOARD ============
  async refreshDashboard() {
    const cookies = await browser.cookies.getAll({});
    const total = cookies.length;
    const trackers = cookies.filter(c => this.isTracker(c.domain)).length;
    const secure = cookies.filter(c => c.secure).length;
    const httpOnly = cookies.filter(c => c.httpOnly).length;
    const session = cookies.filter(c => c.session).length;
    const persistent = total - session;

    document.getElementById('dashTotalCookies').textContent = total;
    document.getElementById('dashTrackerCount').textContent = trackers;
    document.getElementById('dashSecureCount').textContent = secure;
    document.getElementById('dashSessionCount').textContent = session;

    // Privacy score: higher is better (more secure, less trackers)
    const securePct = total ? Math.round(secure / total * 100) : 0;
    const httpOnlyPct = total ? Math.round(httpOnly / total * 100) : 0;
    const trackerPct = total ? Math.round(trackers / total * 100) : 0;
    const privacyScore = total ? Math.round((securePct + httpOnlyPct + (100 - trackerPct)) / 3) : 100;

    document.getElementById('dashSecurePct').textContent = securePct + '%';
    document.getElementById('dashHttpOnlyPct').textContent = httpOnlyPct + '%';
    document.getElementById('dashTrackerPct').textContent = trackerPct + '%';
    document.getElementById('privacyScoreText').textContent = privacyScore + '%';

    // Animate privacy ring
    const ring = document.getElementById('privacyRing');
    const circumference = 2 * Math.PI * 52;
    ring.style.strokeDashoffset = circumference - (circumference * privacyScore / 100);
    ring.style.stroke = privacyScore > 70 ? 'var(--success)' : privacyScore > 40 ? 'var(--warning)' : 'var(--danger)';

    // Size estimate
    const totalSize = cookies.reduce((sum, c) => sum + (c.name.length + (c.value?.length || 0) + (c.domain?.length || 0) + (c.path?.length || 0)), 0);
    const sizeKB = (totalSize / 1024).toFixed(1);
    document.getElementById('sizeText').textContent = `${sizeKB} KB (${total} cookies)`;
    const maxSize = 4096 * total; // theoretical max
    const pct = maxSize ? Math.min(100, (totalSize / maxSize) * 100) : 0;
    document.getElementById('sizeBar').style.width = Math.max(2, pct) + '%';

    // Top domains bar chart
    const domainCounts = {};
    cookies.forEach(c => { const d = c.domain.replace(/^\./, ''); domainCounts[d] = (domainCounts[d] || 0) + 1; });
    const topDomains = Object.entries(domainCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const maxCount = topDomains[0]?.[1] || 1;

    document.getElementById('topDomainsChart').innerHTML = topDomains.map(([domain, count]) =>
      `<div class="bar-chart-item">
        <div class="bar-chart-label" title="${domain}">${domain}</div>
        <div class="bar-chart-bar-wrapper"><div class="bar-chart-bar" style="width:${(count / maxCount) * 100}%"></div></div>
        <div class="bar-chart-count">${count}</div>
      </div>`
    ).join('');

    // Pie chart
    this.drawPieChart([
      { label: 'Secure', value: secure, color: PIE_COLORS[0] },
      { label: 'HttpOnly', value: httpOnly, color: PIE_COLORS[1] },
      { label: 'Trackers', value: trackers, color: PIE_COLORS[2] },
      { label: 'Session', value: session, color: PIE_COLORS[3] },
      { label: 'Persistent', value: persistent, color: PIE_COLORS[4] }
    ]);
  }

  drawPieChart(data) {
    const svg = document.getElementById('typePieChart');
    const legend = document.getElementById('typePieLegend');
    const total = data.reduce((s, d) => s + d.value, 0);
    if (total === 0) { svg.innerHTML = ''; legend.innerHTML = '<div class="empty-state">No data</div>'; return; }

    let cumulative = 0;
    let paths = '';
    data.forEach(d => {
      if (d.value === 0) return;
      const pct = d.value / total;
      const startAngle = cumulative * 2 * Math.PI;
      cumulative += pct;
      const endAngle = cumulative * 2 * Math.PI;

      if (pct >= 0.999) {
        paths += `<circle cx="100" cy="100" r="80" fill="${d.color}"/>`;
      } else {
        const x1 = 100 + 80 * Math.sin(startAngle);
        const y1 = 100 - 80 * Math.cos(startAngle);
        const x2 = 100 + 80 * Math.sin(endAngle);
        const y2 = 100 - 80 * Math.cos(endAngle);
        const largeArc = pct > 0.5 ? 1 : 0;
        paths += `<path d="M100,100 L${x1},${y1} A80,80 0 ${largeArc},1 ${x2},${y2} Z" fill="${d.color}"/>`;
      }
    });

    svg.innerHTML = paths;
    legend.innerHTML = data.filter(d => d.value > 0).map(d =>
      `<div class="pie-legend-item"><span class="pie-legend-dot" style="background:${d.color}"></span>${d.label}: ${d.value} (${Math.round(d.value / total * 100)}%)</div>`
    ).join('');
  }

  // ============ MONITOR ============
  initMonitor() {
    browser.runtime.onMessage.addListener((message) => {
      if (message.action === 'cookieChanged' && !this.monitorPaused) {
        this.addMonitorEntry(message.entry);
      }
    });
  }

  addMonitorEntry(entry) {
    this.monitorEntries.unshift(entry);
    if (this.monitorEntries.length > 500) this.monitorEntries.length = 500;

    if (entry.removed) this.monitorStats.deleted++;
    else if (entry.cause === 'overwrite') this.monitorStats.updated++;
    else this.monitorStats.created++;

    this.updateMonitorStats();
    this.renderMonitorLog();
  }

  updateMonitorStats() {
    this.monitorCreated.textContent = this.monitorStats.created;
    this.monitorDeleted.textContent = this.monitorStats.deleted;
    this.monitorUpdated.textContent = this.monitorStats.updated;
  }

  async loadMonitorLog() {
    try {
      const result = await browser.runtime.sendMessage({ action: 'getMonitorLog' });
      if (result.log && result.log.length > this.monitorEntries.length) {
        this.monitorEntries = result.log;
        this.renderMonitorLog();
      }
    } catch (e) {}
  }

  renderMonitorLog() {
    let entries = this.monitorEntries;
    if (this.monitorFilter === 'created') entries = entries.filter(e => !e.removed && e.cause !== 'overwrite');
    else if (this.monitorFilter === 'deleted') entries = entries.filter(e => e.removed);

    if (entries.length === 0) {
      this.monitorLog.innerHTML = '<div class="empty-state">Waiting for cookie changes...</div>';
      return;
    }

    this.monitorLog.innerHTML = entries.slice(0, 100).map(e => {
      const time = new Date(e.timestamp).toLocaleTimeString();
      let eventType, eventClass;
      if (e.removed) { eventType = 'DEL'; eventClass = 'deleted'; }
      else if (e.cause === 'overwrite') { eventType = 'UPD'; eventClass = 'updated'; }
      else { eventType = 'NEW'; eventClass = 'created'; }

      return `<div class="monitor-entry ${eventClass}">
        <span class="monitor-time">${time}</span>
        <span class="monitor-event ${eventClass}">${eventType}</span>
        <div class="monitor-cookie-info">
          <div class="monitor-cookie-name">${this.escapeHtml(e.cookie.name)}</div>
          <div class="monitor-cookie-domain">${e.cookie.domain}</div>
        </div>
      </div>`;
    }).join('');
  }

  toggleMonitorPause() {
    this.monitorPaused = !this.monitorPaused;
    this.monitorPauseBtn.textContent = this.monitorPaused ? t('monitorResume') : t('monitorPause');
    this.monitorLiveBadge.classList.toggle('paused', this.monitorPaused);
  }

  clearMonitor() {
    this.monitorEntries = [];
    this.monitorStats = { created: 0, deleted: 0, updated: 0 };
    this.updateMonitorStats();
    this.renderMonitorLog();
    browser.runtime.sendMessage({ action: 'clearMonitorLog' }).catch(() => {});
  }

  // ============ EXPORT ============
  cookieToExport(c) {
    return { domain: c.domain, expirationDate: c.expirationDate, hostOnly: c.hostOnly, httpOnly: c.httpOnly, name: c.name, path: c.path, sameSite: c.sameSite, secure: c.secure, session: c.session, value: c.value };
  }

  async exportCookies() {
    try {
      const cookies = await this.getFilteredExportCookies();
      if (!cookies.length) { this.showMessage(t('noCookiesToExport'), 'warning'); return; }

      const format = document.querySelector('input[name="exportFormat"]:checked').value;
      let fileName, fileContent;

      if (format === 'netscape') {
        fileContent = this.toNetscapeFormat(cookies);
        fileName = `cookies_${this.formatDate()}.txt`;
      } else if (format === 'csv') {
        fileContent = this.toCSVFormat(cookies);
        fileName = `cookies_${this.formatDate()}.csv`;
      } else if (format === 'har') {
        fileContent = this.toHARFormat(cookies);
        fileName = `cookies_${this.formatDate()}.har`;
      } else {
        const exportData = { version: '3.0', exportDate: new Date().toISOString(), browser: 'Firefox', encrypted: this.encryptExport.checked, cookies: cookies.map(c => this.cookieToExport(c)) };
        if (this.encryptExport.checked) {
          const pwd = this.exportPassword.value;
          if (!pwd || pwd.length < 4) { this.showMessage(t('passwordTooShort'), 'error'); return; }
          exportData.cookies = await this.encrypt(exportData.cookies, pwd);
          fileName = `cookies_encrypted_${this.formatDate()}.cookiejar`;
        } else {
          fileName = `cookies_${this.formatDate()}.json`;
        }
        fileContent = JSON.stringify(exportData, null, 2);
      }

      this.downloadFile(fileContent, fileName);
      this.showMessage(`${cookies.length} ${t('exportSuccess')}`, 'success');
      this.addHistoryEntry('export', `${format.toUpperCase()}: ${cookies.length} cookies`);
    } catch (e) { this.showMessage('Export error: ' + e.message, 'error'); }
  }

  async copyExportToClipboard() {
    try {
      const cookies = await this.getFilteredExportCookies();
      if (!cookies.length) { this.showMessage(t('noCookiesToExport'), 'warning'); return; }
      const data = JSON.stringify(cookies.map(c => this.cookieToExport(c)), null, 2);
      await navigator.clipboard.writeText(data);
      this.showMessage(t('copiedToClipboard'), 'success');
    } catch (e) { this.showMessage('Error: ' + e.message, 'error'); }
  }

  toNetscapeFormat(cookies) {
    const lines = ['# Netscape HTTP Cookie File', '# Cookie Manager Pro v3.0', ''];
    for (const c of cookies) {
      const domain = c.domain.startsWith('.') ? c.domain : '.' + c.domain;
      const sub = c.domain.startsWith('.') ? 'TRUE' : 'FALSE';
      const secure = c.secure ? 'TRUE' : 'FALSE';
      const expiry = c.expirationDate ? Math.floor(c.expirationDate) : '0';
      lines.push(`${domain}\t${sub}\t${c.path}\t${secure}\t${expiry}\t${c.name}\t${c.value}`);
    }
    return lines.join('\n');
  }

  toCSVFormat(cookies) {
    const headers = ['name', 'value', 'domain', 'path', 'secure', 'httpOnly', 'sameSite', 'expirationDate', 'session'];
    const rows = [headers.join(',')];
    for (const c of cookies) {
      rows.push([
        this.csvEscape(c.name), this.csvEscape(c.value), this.csvEscape(c.domain),
        this.csvEscape(c.path), c.secure, c.httpOnly, c.sameSite || '',
        c.expirationDate || '', c.session
      ].join(','));
    }
    return rows.join('\n');
  }

  csvEscape(str) {
    if (!str) return '""';
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  toHARFormat(cookies) {
    const har = {
      log: {
        version: '1.2',
        creator: { name: 'Cookie Manager Pro', version: '3.0' },
        entries: [],
        cookies: cookies.map(c => ({
          name: c.name, value: c.value, path: c.path, domain: c.domain,
          expires: c.expirationDate ? new Date(c.expirationDate * 1000).toISOString() : undefined,
          httpOnly: c.httpOnly, secure: c.secure, sameSite: c.sameSite
        }))
      }
    };
    return JSON.stringify(har, null, 2);
  }

  // ============ IMPORT ============
  async handleImportFile(file) {
    this.hideMessage();
    try {
      const content = await file.text();
      let cookies;

      if (content.startsWith('# Netscape') || content.startsWith('# HTTP Cookie')) {
        cookies = this.parseNetscapeFormat(content);
      } else if (file.name.endsWith('.csv')) {
        cookies = this.parseCSVFormat(content);
      } else if (file.name.endsWith('.har')) {
        cookies = this.parseHARFormat(content);
      } else {
        const data = JSON.parse(content);
        if (!data.cookies) throw new Error(t('invalidFile'));
        if (data.encrypted) {
          const pwd = this.importPassword.value;
          if (!pwd) { this.showMessage(t('passwordRequired'), 'error'); this.encryptImport.checked = true; this.importPassword.style.display = 'block'; return; }
          try { cookies = await this.decrypt(data.cookies, pwd); } catch (e) { this.showMessage(t('wrongPassword'), 'error'); return; }
        } else { cookies = data.cookies; }
      }

      if (this.previewBeforeImport.checked) this.showImportPreview(cookies);
      else this.importCookies(cookies);
    } catch (e) { this.showMessage('Error: ' + e.message, 'error'); }
    this.fileInput.value = '';
  }

  parseNetscapeFormat(content) {
    const cookies = [];
    for (const line of content.split('\n')) {
      if (line.startsWith('#') || !line.trim()) continue;
      const parts = line.split('\t');
      if (parts.length >= 7) {
        cookies.push({ domain: parts[0], hostOnly: parts[1] !== 'TRUE', path: parts[2], secure: parts[3] === 'TRUE', expirationDate: parseInt(parts[4]) || undefined, name: parts[5], value: parts[6], httpOnly: false, sameSite: 'no_restriction' });
      }
    }
    return cookies;
  }

  parseCSVFormat(content) {
    const lines = content.split('\n');
    if (lines.length < 2) return [];
    const cookies = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = this.parseCSVLine(lines[i]);
      if (parts.length >= 4) {
        cookies.push({ name: parts[0], value: parts[1], domain: parts[2], path: parts[3] || '/', secure: parts[4] === 'true', httpOnly: parts[5] === 'true', sameSite: parts[6] || 'no_restriction', expirationDate: parts[7] ? parseFloat(parts[7]) : undefined, session: parts[8] === 'true' });
      }
    }
    return cookies;
  }

  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (line[i] === ',' && !inQuotes) { result.push(current); current = ''; }
      else current += line[i];
    }
    result.push(current);
    return result;
  }

  parseHARFormat(content) {
    const har = JSON.parse(content);
    const harCookies = har?.log?.cookies || [];
    return harCookies.map(c => ({
      name: c.name, value: c.value, domain: c.domain, path: c.path || '/',
      secure: c.secure || false, httpOnly: c.httpOnly || false,
      sameSite: c.sameSite || 'no_restriction',
      expirationDate: c.expires ? new Date(c.expires).getTime() / 1000 : undefined
    }));
  }

  showImportPreview(cookies) {
    this.pendingImportCookies = cookies;
    this.dropzone.style.display = 'none';
    this.previewPanel.style.display = 'block';
    const domains = [...new Set(cookies.map(c => (c.domain || '').replace(/^\./, '')))];
    this.previewCount.textContent = `${cookies.length} ${t('cookies')}`;
    this.previewDomains.textContent = `${domains.length} ${t('domains')}`;
    this.previewList.innerHTML = cookies.slice(0, 50).map(c => `<div class="preview-item"><strong>${this.escapeHtml(c.name)}</strong> - ${c.domain}</div>`).join('');
    if (cookies.length > 50) this.previewList.innerHTML += `<div class="preview-item">... and ${cookies.length - 50} more</div>`;
  }

  cancelPreview() { this.pendingImportCookies = null; this.previewPanel.style.display = 'none'; this.dropzone.style.display = 'block'; }

  confirmImportCookies() {
    if (this.pendingImportCookies) { this.previewPanel.style.display = 'none'; this.importCookies(this.pendingImportCookies); this.pendingImportCookies = null; }
  }

  async importCookies(cookies) {
    this.dropzone.style.display = 'none';
    this.importStats.style.display = 'none';
    this.loading.classList.add('show');
    try {
      const result = await browser.runtime.sendMessage({ action: 'importCookies', cookies });
      this.loading.classList.remove('show');
      this.dropzone.style.display = 'block';
      this.importedCount.textContent = result.imported;
      this.failedCount.textContent = result.failed;
      this.importStats.style.display = 'flex';
      this.loadStats();
      this.refreshCookieList();
      this.addHistoryEntry('import', `${result.imported} imported, ${result.failed} failed`);
      this.showMessage(result.failed > 0 ? t('importPartial') : t('importSuccess'), result.failed > 0 ? 'warning' : 'success');
    } catch (e) {
      this.loading.classList.remove('show');
      this.dropzone.style.display = 'block';
      this.showMessage('Error: ' + e.message, 'error');
    }
  }

  // ============ PROFILES ============
  loadProfiles() {
    const saved = localStorage.getItem('cookieManagerProfiles');
    this.profiles = saved ? JSON.parse(saved) : [];
    this.renderProfiles();
    this.updateCompareSelects();
  }

  renderProfiles() {
    if (this.profiles.length === 0) { this.profileList.innerHTML = `<p class="empty-state">${t('noProfiles')}</p>`; return; }
    this.profileList.innerHTML = this.profiles.map((p, i) => `
      <div class="profile-item">
        <div class="profile-item-info">
          <div class="profile-item-name">${this.escapeHtml(p.name)}</div>
          <div class="profile-item-meta">${p.cookieCount} cookies - ${new Date(p.date).toLocaleDateString()}</div>
        </div>
        <div class="profile-item-actions">
          <button class="icon-btn small" data-action="load" data-index="${i}" title="Load"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></button>
          <button class="icon-btn small" data-action="download" data-index="${i}" title="Download"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button>
          <button class="icon-btn small" data-action="delete" data-index="${i}" title="Delete"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
        </div>
      </div>`).join('');

    this.profileList.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        const index = parseInt(btn.dataset.index);
        if (action === 'load') this.loadProfile(index);
        if (action === 'download') this.downloadProfile(index);
        if (action === 'delete') this.deleteProfile(index);
      });
    });
  }

  updateCompareSelects() {
    const options = '<option value="">--</option>' + this.profiles.map((p, i) => `<option value="${i}">${this.escapeHtml(p.name)}</option>`).join('');
    this.compareProfile1.innerHTML = options;
    this.compareProfile2.innerHTML = options;
  }

  async saveProfile() {
    const name = this.profileName.value.trim();
    if (!name) return;
    const cookies = await browser.cookies.getAll({});
    this.profiles.push({ name, date: new Date().toISOString(), cookieCount: cookies.length, cookies: cookies.map(c => this.cookieToExport(c)) });
    localStorage.setItem('cookieManagerProfiles', JSON.stringify(this.profiles));
    this.profileName.value = '';
    this.renderProfiles();
    this.updateCompareSelects();
    this.showMessage(t('profileSaved'), 'success');
  }

  async loadProfile(index) {
    const profile = this.profiles[index];
    if (!profile) return;
    await this.importCookies(profile.cookies);
    this.showMessage(t('profileLoaded'), 'success');
  }

  downloadProfile(index) {
    const profile = this.profiles[index];
    if (!profile) return;
    const exportData = { version: '3.0', exportDate: profile.date, browser: 'Firefox', encrypted: false, cookies: profile.cookies };
    this.downloadFile(JSON.stringify(exportData, null, 2), `profile_${profile.name}_${this.formatDate()}.json`);
  }

  deleteProfile(index) {
    this.profiles.splice(index, 1);
    localStorage.setItem('cookieManagerProfiles', JSON.stringify(this.profiles));
    this.renderProfiles();
    this.updateCompareSelects();
    this.showMessage(t('profileDeleted'), 'success');
  }

  // ============ PROFILE COMPARISON ============
  compareProfiles() {
    const i1 = parseInt(this.compareProfile1.value);
    const i2 = parseInt(this.compareProfile2.value);
    if (isNaN(i1) || isNaN(i2) || i1 === i2) return;

    const p1 = this.profiles[i1];
    const p2 = this.profiles[i2];
    if (!p1 || !p2) return;

    const map1 = new Map(p1.cookies.map(c => [`${c.name}|||${c.domain}`, c]));
    const map2 = new Map(p2.cookies.map(c => [`${c.name}|||${c.domain}`, c]));

    const added = [], removed = [], modified = [];

    map2.forEach((c, key) => {
      if (!map1.has(key)) added.push(c);
      else if (map1.get(key).value !== c.value) modified.push(c);
    });
    map1.forEach((c, key) => { if (!map2.has(key)) removed.push(c); });

    this.diffResults.style.display = 'block';
    if (added.length === 0 && removed.length === 0 && modified.length === 0) {
      this.diffResults.innerHTML = '<div class="empty-state">Profiles are identical</div>';
      return;
    }

    let html = `<div style="font-size:11px;margin-bottom:8px;color:var(--text-muted)">+${added.length} added, -${removed.length} removed, ~${modified.length} modified</div>`;
    added.forEach(c => { html += `<div class="diff-item diff-added">+ ${this.escapeHtml(c.name)} <span style="color:var(--text-muted)">${c.domain}</span></div>`; });
    removed.forEach(c => { html += `<div class="diff-item diff-removed">- ${this.escapeHtml(c.name)} <span style="color:var(--text-muted)">${c.domain}</span></div>`; });
    modified.forEach(c => { html += `<div class="diff-item diff-modified">~ ${this.escapeHtml(c.name)} <span style="color:var(--text-muted)">${c.domain}</span></div>`; });

    this.diffResults.innerHTML = html;
  }

  // ============ AUTO BACKUP ============
  initAutoBackup() {
    const settings = localStorage.getItem('cookieManagerAutoBackup');
    if (settings) {
      const { enabled, interval, lastBackup } = JSON.parse(settings);
      this.autoBackupEnabled.checked = enabled;
      this.backupInterval.value = interval;
      this.autoBackupOptions.style.display = enabled ? 'block' : 'none';
      if (lastBackup) this.lastBackupTime.textContent = `${t('lastBackup')} ${new Date(lastBackup).toLocaleString()}`;
      if (enabled) this.checkAutoBackup();
    }
  }

  saveAutoBackupSettings() {
    const settings = { enabled: this.autoBackupEnabled.checked, interval: parseInt(this.backupInterval.value), lastBackup: localStorage.getItem('cookieManagerLastBackup') || null };
    localStorage.setItem('cookieManagerAutoBackup', JSON.stringify(settings));
  }

  async checkAutoBackup() {
    const settings = JSON.parse(localStorage.getItem('cookieManagerAutoBackup') || '{}');
    if (!settings.enabled) return;
    const lastBackup = localStorage.getItem('cookieManagerLastBackup');
    const now = Date.now();
    const intervalMs = settings.interval * 60 * 60 * 1000;
    if (!lastBackup || (now - parseInt(lastBackup)) > intervalMs) await this.performAutoBackup();
  }

  async performAutoBackup() {
    const cookies = await browser.cookies.getAll({});
    const exportData = { version: '3.0', exportDate: new Date().toISOString(), browser: 'Firefox', encrypted: false, autoBackup: true, cookies: cookies.map(c => this.cookieToExport(c)) };
    this.downloadFile(JSON.stringify(exportData, null, 2), `auto_backup_${this.formatDate()}.json`);
    const now = Date.now();
    localStorage.setItem('cookieManagerLastBackup', now.toString());
    this.lastBackupTime.textContent = `${t('lastBackup')} ${new Date(now).toLocaleString()}`;
  }

  // ============ RULES ============
  async loadRules() {
    try {
      const data = await browser.storage.local.get('cookieRules');
      this.rules = data.cookieRules || [];
      this.renderRules();
    } catch (e) { this.rules = []; }
  }

  async saveRules() {
    await browser.storage.local.set({ cookieRules: this.rules });
    this.renderRules();
  }

  async addRule() {
    const matchType = this.ruleMatchType.value;
    const matchValue = this.ruleMatchValue.value.trim();
    if (!matchValue) return;

    this.rules.push({
      id: Date.now(),
      matchType,
      matchValue,
      action: this.ruleAction.value,
      delay: parseInt(this.ruleDelay.value) || 0,
      enabled: true
    });

    await this.saveRules();
    this.ruleMatchValue.value = '';
    this.ruleDelay.value = '0';
    this.showMessage(t('ruleAdded'), 'success');
  }

  renderRules() {
    if (this.rules.length === 0) { this.ruleList.innerHTML = `<p class="empty-state">${t('noRules')}</p>`; return; }
    this.ruleList.innerHTML = this.rules.map((r, i) => `
      <div class="rule-item">
        <div class="rule-item-info">
          <div class="rule-item-match">${r.matchType}: "${this.escapeHtml(r.matchValue)}"</div>
          <div class="rule-item-action">Action: ${r.action}${r.delay ? ` (${r.delay}min delay)` : ''}</div>
        </div>
        <div class="rule-item-actions">
          <input type="checkbox" class="rule-toggle" ${r.enabled ? 'checked' : ''} data-rule-toggle="${i}">
          <button class="icon-btn tiny" data-rule-delete="${i}" title="Delete">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>`).join('');

    this.ruleList.querySelectorAll('[data-rule-toggle]').forEach(input => {
      input.addEventListener('change', async () => {
        this.rules[parseInt(input.dataset.ruleToggle)].enabled = input.checked;
        await this.saveRules();
      });
    });
    this.ruleList.querySelectorAll('[data-rule-delete]').forEach(btn => {
      btn.addEventListener('click', async () => {
        this.rules.splice(parseInt(btn.dataset.ruleDelete), 1);
        await this.saveRules();
        this.showMessage(t('ruleDeleted'), 'success');
      });
    });
  }

  async importRulesFromFile(file) {
    try {
      const content = await file.text();
      const imported = JSON.parse(content);
      if (Array.isArray(imported)) {
        this.rules = this.rules.concat(imported);
        await this.saveRules();
        this.showMessage(`${imported.length} rules imported`, 'success');
      }
    } catch (e) { this.showMessage('Error: ' + e.message, 'error'); }
    this.ruleFileInput.value = '';
  }

  exportRulesToFile() {
    if (this.rules.length === 0) return;
    this.downloadFile(JSON.stringify(this.rules, null, 2), `cookie_rules_${this.formatDate()}.json`);
  }

  // ============ HISTORY ============
  loadHistory() {
    const saved = localStorage.getItem('cookieManagerHistory');
    this.history = saved ? JSON.parse(saved) : [];
    this.renderHistory();
  }

  addHistoryEntry(action, detail) {
    this.history.unshift({ timestamp: Date.now(), action, detail });
    if (this.history.length > 200) this.history.length = 200;
    localStorage.setItem('cookieManagerHistory', JSON.stringify(this.history));
    this.renderHistory();
  }

  renderHistory() {
    if (this.history.length === 0) { this.historyList.innerHTML = `<p class="empty-state">${t('noHistory')}</p>`; return; }
    this.historyList.innerHTML = this.history.slice(0, 50).map(h => {
      const time = new Date(h.timestamp).toLocaleString();
      return `<div class="history-item">
        <span class="history-time">${time}</span>
        <span class="history-action-badge ${h.action}">${h.action}</span>
        <span class="history-detail">${this.escapeHtml(h.detail)}</span>
      </div>`;
    }).join('');
  }

  // ============ UNDO ============
  async undoLastAction() {
    if (this.undoStack.length === 0) { this.showMessage(t('noUndoAvailable'), 'warning'); return; }
    const action = this.undoStack.pop();

    if (action.type === 'delete' && action.cookie) {
      await browser.runtime.sendMessage({ action: 'importCookies', cookies: [action.cookie] });
    } else if (action.type === 'bulkDelete' && action.cookies) {
      await browser.runtime.sendMessage({ action: 'importCookies', cookies: action.cookies });
    }

    this.showMessage(t('undoSuccess'), 'success');
    this.refreshCookieList();
  }

  // ============ ENCRYPTION ============
  async encrypt(data, password) {
    const enc = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(data)));
    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);
    return btoa(String.fromCharCode(...combined));
  }

  async decrypt(encryptedData, password) {
    const enc = new TextEncoder();
    const dec = new TextDecoder();
    const combined = new Uint8Array(atob(encryptedData).split('').map(c => c.charCodeAt(0)));
    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const data = combined.slice(28);
    const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
    return JSON.parse(dec.decode(decrypted));
  }

  // ============ UTILITIES ============
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }

  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.showMessage(t('copiedToClipboard'), 'success');
    } catch (e) {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      this.showMessage(t('copiedToClipboard'), 'success');
    }
  }

  downloadFile(content, fileName) {
    const blob = new Blob([content], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  formatDate() {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}_${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
  }
}

document.addEventListener('DOMContentLoaded', () => new CookieManager());
