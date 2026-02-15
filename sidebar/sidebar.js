/**
 * Cookie Manager Pro v2.0
 * Full-featured cookie manager
 */

// Known tracker domains
const DEFAULT_TRACKERS = [
  'google-analytics.com', 'doubleclick.net', 'facebook.com', 'facebook.net',
  'googlesyndication.com', 'googleadservices.com', 'amazon-adsystem.com',
  'scorecardresearch.com', 'quantserve.com', 'criteo.com', 'outbrain.com',
  'taboola.com', 'adnxs.com', 'rubiconproject.com', 'pubmatic.com'
];

class CookieManager {
  constructor() {
    this.allCookies = [];
    this.filteredCookies = [];
    this.currentDomainValue = '';
    this.trackers = [];
    this.profiles = [];
    this.pendingImportCookies = null;
    this.editingCookie = null;
    
    this.initElements();
    this.loadSettings();
    this.initEventListeners();
    this.loadTheme();
    this.loadProfiles();
    this.refreshCookieList();
    this.loadStats();
    this.getCurrentTab();
    this.initAutoBackup();
  }

  initElements() {
    // Theme & Settings
    this.themeToggle = document.getElementById('themeToggle');
    this.settingsBtn = document.getElementById('settingsBtn');
    this.settingsModal = document.getElementById('settingsModal');
    this.closeSettings = document.getElementById('closeSettings');
    this.languageSelect = document.getElementById('languageSelect');
    this.trackerList = document.getElementById('trackerList');
    
    // Tabs
    this.tabs = document.querySelectorAll('.tab');
    this.tabContents = document.querySelectorAll('.tab-content');
    
    // Message
    this.message = document.getElementById('message');
    
    // Cookies Tab
    this.cookieSearch = document.getElementById('cookieSearch');
    this.domainFilter = document.getElementById('domainFilter');
    this.refreshCookiesBtn = document.getElementById('refreshCookies');
    this.cookieList = document.getElementById('cookieList');
    this.cookieCountDisplay = document.getElementById('cookieCountDisplay');
    this.deleteAllVisible = document.getElementById('deleteAllVisible');
    
    // Cookie Edit Modal
    this.cookieEditModal = document.getElementById('cookieEditModal');
    this.closeCookieEdit = document.getElementById('closeCookieEdit');
    this.editCookieName = document.getElementById('editCookieName');
    this.editCookieValue = document.getElementById('editCookieValue');
    this.editCookieDomain = document.getElementById('editCookieDomain');
    this.editCookiePath = document.getElementById('editCookiePath');
    this.editCookieExpiry = document.getElementById('editCookieExpiry');
    this.editCookieSecure = document.getElementById('editCookieSecure');
    this.editCookieHttpOnly = document.getElementById('editCookieHttpOnly');
    this.deleteCookieBtn = document.getElementById('deleteCookieBtn');
    this.saveCookieBtn = document.getElementById('saveCookieBtn');
    
    // Export Tab
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
    
    // Import Tab
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
    
    // Profiles Tab
    this.profileName = document.getElementById('profileName');
    this.saveProfileBtn = document.getElementById('saveProfileBtn');
    this.profileList = document.getElementById('profileList');
    this.autoBackupEnabled = document.getElementById('autoBackupEnabled');
    this.autoBackupOptions = document.getElementById('autoBackupOptions');
    this.backupInterval = document.getElementById('backupInterval');
    this.lastBackupTime = document.getElementById('lastBackupTime');
  }

  initEventListeners() {
    // Theme
    this.themeToggle.addEventListener('click', () => this.toggleTheme());
    
    // Settings
    this.settingsBtn.addEventListener('click', () => this.openSettings());
    this.closeSettings.addEventListener('click', () => this.closeSettingsModal());
    this.settingsModal.addEventListener('click', (e) => {
      if (e.target === this.settingsModal) this.closeSettingsModal();
    });
    this.languageSelect.addEventListener('change', (e) => this.changeLanguage(e.target.value));
    this.trackerList.addEventListener('change', () => this.saveTrackerList());
    
    // Tabs
    this.tabs.forEach(tab => {
      tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
    });
    
    // Cookies Tab
    this.cookieSearch.addEventListener('input', () => this.filterCookieList());
    this.domainFilter.addEventListener('change', () => this.filterCookieList());
    this.refreshCookiesBtn.addEventListener('click', () => this.refreshCookieList());
    this.deleteAllVisible.addEventListener('click', () => this.deleteAllVisibleCookies());
    
    // Cookie Edit Modal
    this.closeCookieEdit.addEventListener('click', () => this.closeCookieEditModal());
    this.cookieEditModal.addEventListener('click', (e) => {
      if (e.target === this.cookieEditModal) this.closeCookieEditModal();
    });
    this.deleteCookieBtn.addEventListener('click', () => this.deleteEditingCookie());
    this.saveCookieBtn.addEventListener('click', () => this.saveEditingCookie());
    
    // Export
    this.encryptExport.addEventListener('change', () => {
      this.exportPassword.style.display = this.encryptExport.checked ? 'block' : 'none';
    });
    
    this.filterCurrentSite.addEventListener('change', () => {
      this.currentDomain.style.display = this.filterCurrentSite.checked ? 'block' : 'none';
      if (this.filterCurrentSite.checked) {
        this.filterCustomDomain.checked = false;
        this.customDomain.style.display = 'none';
      }
      this.updateSelectedCount();
    });
    
    this.filterCustomDomain.addEventListener('change', () => {
      this.customDomain.style.display = this.filterCustomDomain.checked ? 'block' : 'none';
      if (this.filterCustomDomain.checked) {
        this.filterCurrentSite.checked = false;
        this.currentDomain.style.display = 'none';
      }
      this.updateSelectedCount();
    });
    
    this.customDomain.addEventListener('input', () => this.updateSelectedCount());
    this.excludeTrackers.addEventListener('change', () => this.updateSelectedCount());
    this.exportBtn.addEventListener('click', () => this.exportCookies());
    
    // Import
    this.encryptImport.addEventListener('change', () => {
      this.importPassword.style.display = this.encryptImport.checked ? 'block' : 'none';
    });
    
    this.dropzone.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', (e) => {
      if (e.target.files[0]) this.handleImportFile(e.target.files[0]);
    });
    
    this.dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.dropzone.classList.add('dragover');
    });
    
    this.dropzone.addEventListener('dragleave', () => {
      this.dropzone.classList.remove('dragover');
    });
    
    this.dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.dropzone.classList.remove('dragover');
      if (e.dataTransfer.files[0]) this.handleImportFile(e.dataTransfer.files[0]);
    });
    
    this.cancelImport.addEventListener('click', () => this.cancelPreview());
    this.confirmImport.addEventListener('click', () => this.confirmImportCookies());
    
    // Profiles
    this.saveProfileBtn.addEventListener('click', () => this.saveProfile());
    this.autoBackupEnabled.addEventListener('change', () => {
      this.autoBackupOptions.style.display = this.autoBackupEnabled.checked ? 'block' : 'none';
      this.saveAutoBackupSettings();
    });
    this.backupInterval.addEventListener('change', () => this.saveAutoBackupSettings());
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'E') {
        e.preventDefault();
        this.exportCookies();
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        this.switchTab('import');
      }
    });
  }

  // Settings
  loadSettings() {
    const savedTrackers = localStorage.getItem('cookieManagerTrackers');
    this.trackers = savedTrackers ? JSON.parse(savedTrackers) : DEFAULT_TRACKERS;
    this.trackerList.value = this.trackers.join('\n');
    this.languageSelect.value = currentLang;
  }

  openSettings() {
    this.settingsModal.classList.add('show');
  }

  closeSettingsModal() {
    this.settingsModal.classList.remove('show');
  }

  changeLanguage(lang) {
    setLanguage(lang);
    location.reload();
  }

  saveTrackerList() {
    this.trackers = this.trackerList.value.split('\n').map(d => d.trim()).filter(d => d);
    localStorage.setItem('cookieManagerTrackers', JSON.stringify(this.trackers));
  }

  // Theme
  loadTheme() {
    const theme = localStorage.getItem('cookieManagerTheme') || 'dark';
    document.body.className = theme;
  }

  toggleTheme() {
    const newTheme = document.body.classList.contains('dark') ? 'light' : 'dark';
    document.body.className = newTheme;
    localStorage.setItem('cookieManagerTheme', newTheme);
  }

  // Tabs
  switchTab(tabName) {
    this.tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
    this.tabContents.forEach(c => c.classList.toggle('active', c.id === `${tabName}-tab`));
    this.hideMessage();
  }

  // Message
  showMessage(text, type) {
    this.message.textContent = text;
    this.message.className = `message show ${type}`;
    setTimeout(() => this.hideMessage(), 5000);
  }

  hideMessage() {
    this.message.classList.remove('show');
  }

  // Get current tab
  async getCurrentTab() {
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]?.url) {
        this.currentDomainValue = new URL(tabs[0].url).hostname;
        this.currentDomain.value = this.currentDomainValue;
      }
    } catch (e) {}
  }

  // Cookie List
  async refreshCookieList() {
    this.cookieList.innerHTML = '<div class="loading-inline">Loading...</div>';
    
    try {
      this.allCookies = await browser.cookies.getAll({});
      this.buildDomainFilter();
      this.filterCookieList();
    } catch (e) {
      this.cookieList.innerHTML = `<div class="empty-state">Error loading cookies</div>`;
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
    const search = this.cookieSearch.value.toLowerCase();
    const domain = this.domainFilter.value;
    
    this.filteredCookies = this.allCookies.filter(c => {
      const matchSearch = !search || 
        c.name.toLowerCase().includes(search) || 
        c.domain.toLowerCase().includes(search) ||
        c.value.toLowerCase().includes(search);
      const matchDomain = !domain || c.domain.includes(domain);
      return matchSearch && matchDomain;
    });
    
    this.renderCookieList();
  }

  renderCookieList() {
    if (this.filteredCookies.length === 0) {
      this.cookieList.innerHTML = `<div class="empty-state">${t('noCookiesFound')}</div>`;
      this.cookieCountDisplay.textContent = `0 ${t('cookies')}`;
      return;
    }
    
    this.cookieCountDisplay.textContent = `${this.filteredCookies.length} ${t('cookies')}`;
    
    this.cookieList.innerHTML = this.filteredCookies.slice(0, 100).map(c => {
      const isTracker = this.isTracker(c.domain);
      const badges = [];
      if (c.secure) badges.push('<span class="badge secure">Secure</span>');
      if (c.httpOnly) badges.push('<span class="badge httponly">HttpOnly</span>');
      if (isTracker) badges.push('<span class="badge tracker">Tracker</span>');
      
      return `
        <div class="cookie-item" data-name="${c.name}" data-domain="${c.domain}">
          <div class="cookie-info">
            <div class="cookie-name">${this.escapeHtml(c.name)}</div>
            <div class="cookie-domain">${c.domain}</div>
          </div>
          <div class="cookie-badges">${badges.join('')}</div>
        </div>
      `;
    }).join('');
    
    // Add click listeners
    this.cookieList.querySelectorAll('.cookie-item').forEach(item => {
      item.addEventListener('click', () => {
        const cookie = this.allCookies.find(c => 
          c.name === item.dataset.name && c.domain === item.dataset.domain
        );
        if (cookie) this.openCookieEditor(cookie);
      });
    });
  }

  isTracker(domain) {
    return this.trackers.some(t => domain.includes(t));
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Cookie Editor
  openCookieEditor(cookie) {
    this.editingCookie = cookie;
    this.editCookieName.value = cookie.name;
    this.editCookieValue.value = cookie.value;
    this.editCookieDomain.value = cookie.domain;
    this.editCookiePath.value = cookie.path;
    
    if (cookie.expirationDate) {
      const date = new Date(cookie.expirationDate * 1000);
      this.editCookieExpiry.value = date.toISOString().slice(0, 16);
    } else {
      this.editCookieExpiry.value = '';
    }
    
    this.editCookieSecure.checked = cookie.secure;
    this.editCookieHttpOnly.checked = cookie.httpOnly;
    
    this.cookieEditModal.classList.add('show');
  }

  closeCookieEditModal() {
    this.cookieEditModal.classList.remove('show');
    this.editingCookie = null;
  }

  async deleteEditingCookie() {
    if (!this.editingCookie) return;
    
    try {
      const url = `http${this.editingCookie.secure ? 's' : ''}://${this.editingCookie.domain.replace(/^\./, '')}${this.editingCookie.path}`;
      await browser.cookies.remove({ url, name: this.editingCookie.name });
      this.showMessage(t('cookieDeleted'), 'success');
      this.closeCookieEditModal();
      this.refreshCookieList();
      this.loadStats();
    } catch (e) {
      this.showMessage('Error: ' + e.message, 'error');
    }
  }

  async saveEditingCookie() {
    if (!this.editingCookie) return;
    
    try {
      const url = `http${this.editCookieSecure.checked ? 's' : ''}://${this.editingCookie.domain.replace(/^\./, '')}${this.editCookiePath.value}`;
      
      const cookieData = {
        url,
        name: this.editCookieName.value,
        value: this.editCookieValue.value,
        path: this.editCookiePath.value,
        secure: this.editCookieSecure.checked,
        httpOnly: this.editCookieHttpOnly.checked
      };
      
      if (this.editCookieExpiry.value) {
        cookieData.expirationDate = new Date(this.editCookieExpiry.value).getTime() / 1000;
      }
      
      await browser.cookies.set(cookieData);
      this.showMessage(t('cookieSaved'), 'success');
      this.closeCookieEditModal();
      this.refreshCookieList();
    } catch (e) {
      this.showMessage('Error: ' + e.message, 'error');
    }
  }

  async deleteAllVisibleCookies() {
    if (!confirm(`Delete ${this.filteredCookies.length} cookies?`)) return;
    
    for (const c of this.filteredCookies) {
      try {
        const url = `http${c.secure ? 's' : ''}://${c.domain.replace(/^\./, '')}${c.path}`;
        await browser.cookies.remove({ url, name: c.name });
      } catch (e) {}
    }
    
    this.showMessage(`${this.filteredCookies.length} cookies deleted`, 'success');
    this.refreshCookieList();
    this.loadStats();
  }

  // Stats
  async loadStats() {
    try {
      const cookies = await browser.cookies.getAll({});
      this.totalCookies.textContent = cookies.length;
      this.selectedCookies.textContent = cookies.length;
    } catch (e) {}
  }

  async updateSelectedCount() {
    const cookies = await this.getFilteredCookies();
    this.selectedCookies.textContent = cookies.length;
  }

  async getFilteredCookies() {
    let cookies = await browser.cookies.getAll({});
    
    if (this.filterCurrentSite.checked && this.currentDomainValue) {
      cookies = cookies.filter(c => 
        c.domain.includes(this.currentDomainValue) || 
        this.currentDomainValue.includes(c.domain.replace(/^\./, ''))
      );
    } else if (this.filterCustomDomain.checked && this.customDomain.value) {
      const domain = this.customDomain.value.toLowerCase();
      cookies = cookies.filter(c => 
        c.domain.toLowerCase().includes(domain) || 
        domain.includes(c.domain.replace(/^\./, '').toLowerCase())
      );
    }
    
    if (this.excludeTrackers.checked) {
      cookies = cookies.filter(c => !this.isTracker(c.domain));
    }
    
    return cookies;
  }

  // Export
  async exportCookies() {
    try {
      const cookies = await this.getFilteredCookies();
      
      if (!cookies.length) {
        this.showMessage(t('noCookiesToExport'), 'warning');
        return;
      }
      
      const format = document.querySelector('input[name="exportFormat"]:checked').value;
      
      let fileName, fileContent;
      
      if (format === 'netscape') {
        // Netscape format
        fileContent = this.toNetscapeFormat(cookies);
        fileName = `cookies_${this.formatDate()}.txt`;
      } else {
        // JSON format
        const exportData = {
          version: '2.0',
          exportDate: new Date().toISOString(),
          browser: 'Firefox',
          encrypted: this.encryptExport.checked,
          cookies: cookies.map(c => ({
            domain: c.domain,
            expirationDate: c.expirationDate,
            hostOnly: c.hostOnly,
            httpOnly: c.httpOnly,
            name: c.name,
            path: c.path,
            sameSite: c.sameSite,
            secure: c.secure,
            session: c.session,
            value: c.value
          }))
        };
        
        if (this.encryptExport.checked) {
          const pwd = this.exportPassword.value;
          if (!pwd || pwd.length < 4) {
            this.showMessage(t('passwordTooShort'), 'error');
            return;
          }
          exportData.cookies = await this.encrypt(exportData.cookies, pwd);
          fileName = `cookies_encrypted_${this.formatDate()}.cookiejar`;
        } else {
          fileName = `cookies_${this.formatDate()}.json`;
        }
        
        fileContent = JSON.stringify(exportData, null, 2);
      }
      
      this.downloadFile(fileContent, fileName);
      this.showMessage(`${cookies.length} ${t('exportSuccess')}`, 'success');
    } catch (e) {
      this.showMessage('Export error: ' + e.message, 'error');
    }
  }

  toNetscapeFormat(cookies) {
    const lines = ['# Netscape HTTP Cookie File', '# https://github.com/0XLUC4/cookie_manager', ''];
    
    for (const c of cookies) {
      const domain = c.domain.startsWith('.') ? c.domain : '.' + c.domain;
      const includeSubdomains = c.domain.startsWith('.') ? 'TRUE' : 'FALSE';
      const secure = c.secure ? 'TRUE' : 'FALSE';
      const expiry = c.expirationDate ? Math.floor(c.expirationDate) : '0';
      
      lines.push(`${domain}\t${includeSubdomains}\t${c.path}\t${secure}\t${expiry}\t${c.name}\t${c.value}`);
    }
    
    return lines.join('\n');
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

  // Import
  async handleImportFile(file) {
    this.hideMessage();
    
    try {
      const content = await file.text();
      let cookies;
      let isNetscape = false;
      
      // Detect format
      if (content.startsWith('# Netscape') || content.startsWith('# HTTP Cookie')) {
        // Netscape format
        cookies = this.parseNetscapeFormat(content);
        isNetscape = true;
      } else {
        // JSON format
        const data = JSON.parse(content);
        
        if (!data.version || !data.cookies) {
          throw new Error(t('invalidFile'));
        }
        
        if (data.encrypted) {
          const pwd = this.importPassword.value;
          if (!pwd) {
            this.showMessage(t('passwordRequired'), 'error');
            this.encryptImport.checked = true;
            this.importPassword.style.display = 'block';
            return;
          }
          try {
            cookies = await this.decrypt(data.cookies, pwd);
          } catch (e) {
            this.showMessage(t('wrongPassword'), 'error');
            return;
          }
        } else {
          cookies = data.cookies;
        }
      }
      
      if (this.previewBeforeImport.checked) {
        this.showImportPreview(cookies);
      } else {
        this.importCookies(cookies);
      }
    } catch (e) {
      this.showMessage('Error: ' + e.message, 'error');
    }
    
    this.fileInput.value = '';
  }

  parseNetscapeFormat(content) {
    const cookies = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('#') || !line.trim()) continue;
      
      const parts = line.split('\t');
      if (parts.length >= 7) {
        cookies.push({
          domain: parts[0],
          hostOnly: parts[1] !== 'TRUE',
          path: parts[2],
          secure: parts[3] === 'TRUE',
          expirationDate: parseInt(parts[4]) || undefined,
          name: parts[5],
          value: parts[6],
          httpOnly: false,
          sameSite: 'no_restriction'
        });
      }
    }
    
    return cookies;
  }

  showImportPreview(cookies) {
    this.pendingImportCookies = cookies;
    this.dropzone.style.display = 'none';
    this.previewPanel.style.display = 'block';
    
    const domains = [...new Set(cookies.map(c => c.domain.replace(/^\./, '')))];
    this.previewCount.textContent = `${cookies.length} ${t('cookies')}`;
    this.previewDomains.textContent = `${domains.length} ${t('domains')}`;
    
    this.previewList.innerHTML = cookies.slice(0, 50).map(c => `
      <div class="preview-item">
        <strong>${this.escapeHtml(c.name)}</strong> - ${c.domain}
      </div>
    `).join('');
    
    if (cookies.length > 50) {
      this.previewList.innerHTML += `<div class="preview-item">... and ${cookies.length - 50} more</div>`;
    }
  }

  cancelPreview() {
    this.pendingImportCookies = null;
    this.previewPanel.style.display = 'none';
    this.dropzone.style.display = 'block';
  }

  confirmImportCookies() {
    if (this.pendingImportCookies) {
      this.previewPanel.style.display = 'none';
      this.importCookies(this.pendingImportCookies);
      this.pendingImportCookies = null;
    }
  }

  async importCookies(cookies) {
    this.dropzone.style.display = 'none';
    this.importStats.style.display = 'none';
    this.loading.classList.add('show');

    try {
      const result = await browser.runtime.sendMessage({
        action: 'importCookies',
        cookies: cookies
      });

      this.loading.classList.remove('show');
      this.dropzone.style.display = 'block';
      
      this.importedCount.textContent = result.imported;
      this.failedCount.textContent = result.failed;
      this.importStats.style.display = 'flex';
      
      this.loadStats();
      this.refreshCookieList();

      if (result.failed > 0) {
        this.showMessage(t('importPartial'), 'warning');
      } else {
        this.showMessage(t('importSuccess'), 'success');
      }
    } catch (e) {
      this.loading.classList.remove('show');
      this.dropzone.style.display = 'block';
      this.showMessage('Error: ' + e.message, 'error');
    }
  }

  // Profiles
  loadProfiles() {
    const saved = localStorage.getItem('cookieManagerProfiles');
    this.profiles = saved ? JSON.parse(saved) : [];
    this.renderProfiles();
  }

  renderProfiles() {
    if (this.profiles.length === 0) {
      this.profileList.innerHTML = `<p class="empty-state">${t('noProfiles')}</p>`;
      return;
    }
    
    this.profileList.innerHTML = this.profiles.map((p, i) => `
      <div class="profile-item">
        <div class="profile-item-info">
          <div class="profile-item-name">${this.escapeHtml(p.name)}</div>
          <div class="profile-item-meta">${p.cookieCount} cookies • ${new Date(p.date).toLocaleDateString()}</div>
        </div>
        <div class="profile-item-actions">
          <button class="icon-btn small" data-action="load" data-index="${i}" title="Load">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17,8 12,3 7,8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </button>
          <button class="icon-btn small" data-action="download" data-index="${i}" title="Download">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7,10 12,15 17,10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </button>
          <button class="icon-btn small" data-action="delete" data-index="${i}" title="Delete">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3,6 5,6 21,6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      </div>
    `).join('');
    
    // Add listeners
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

  async saveProfile() {
    const name = this.profileName.value.trim();
    if (!name) return;
    
    const cookies = await browser.cookies.getAll({});
    
    this.profiles.push({
      name,
      date: new Date().toISOString(),
      cookieCount: cookies.length,
      cookies: cookies.map(c => ({
        domain: c.domain,
        expirationDate: c.expirationDate,
        hostOnly: c.hostOnly,
        httpOnly: c.httpOnly,
        name: c.name,
        path: c.path,
        sameSite: c.sameSite,
        secure: c.secure,
        session: c.session,
        value: c.value
      }))
    });
    
    localStorage.setItem('cookieManagerProfiles', JSON.stringify(this.profiles));
    this.profileName.value = '';
    this.renderProfiles();
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
    
    const exportData = {
      version: '2.0',
      exportDate: profile.date,
      browser: 'Firefox',
      encrypted: false,
      cookies: profile.cookies
    };
    
    this.downloadFile(JSON.stringify(exportData, null, 2), `profile_${profile.name}_${this.formatDate()}.json`);
  }

  deleteProfile(index) {
    this.profiles.splice(index, 1);
    localStorage.setItem('cookieManagerProfiles', JSON.stringify(this.profiles));
    this.renderProfiles();
    this.showMessage(t('profileDeleted'), 'success');
  }

  // Auto Backup
  initAutoBackup() {
    const settings = localStorage.getItem('cookieManagerAutoBackup');
    if (settings) {
      const { enabled, interval, lastBackup } = JSON.parse(settings);
      this.autoBackupEnabled.checked = enabled;
      this.backupInterval.value = interval;
      this.autoBackupOptions.style.display = enabled ? 'block' : 'none';
      
      if (lastBackup) {
        this.lastBackupTime.textContent = `${t('lastBackup')} ${new Date(lastBackup).toLocaleString()}`;
      }
      
      if (enabled) {
        this.checkAutoBackup();
      }
    }
  }

  saveAutoBackupSettings() {
    const settings = {
      enabled: this.autoBackupEnabled.checked,
      interval: parseInt(this.backupInterval.value),
      lastBackup: localStorage.getItem('cookieManagerLastBackup') || null
    };
    localStorage.setItem('cookieManagerAutoBackup', JSON.stringify(settings));
  }

  async checkAutoBackup() {
    const settings = JSON.parse(localStorage.getItem('cookieManagerAutoBackup') || '{}');
    if (!settings.enabled) return;
    
    const lastBackup = localStorage.getItem('cookieManagerLastBackup');
    const now = Date.now();
    const intervalMs = settings.interval * 60 * 60 * 1000;
    
    if (!lastBackup || (now - parseInt(lastBackup)) > intervalMs) {
      await this.performAutoBackup();
    }
  }

  async performAutoBackup() {
    const cookies = await browser.cookies.getAll({});
    
    const exportData = {
      version: '2.0',
      exportDate: new Date().toISOString(),
      browser: 'Firefox',
      encrypted: false,
      autoBackup: true,
      cookies: cookies.map(c => ({
        domain: c.domain,
        expirationDate: c.expirationDate,
        hostOnly: c.hostOnly,
        httpOnly: c.httpOnly,
        name: c.name,
        path: c.path,
        sameSite: c.sameSite,
        secure: c.secure,
        session: c.session,
        value: c.value
      }))
    };
    
    this.downloadFile(JSON.stringify(exportData, null, 2), `auto_backup_${this.formatDate()}.json`);
    
    const now = Date.now();
    localStorage.setItem('cookieManagerLastBackup', now.toString());
    this.lastBackupTime.textContent = `${t('lastBackup')} ${new Date(now).toLocaleString()}`;
  }

  // Encryption
  async encrypt(data, password) {
    const enc = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );
    
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
    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
    
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
    return JSON.parse(dec.decode(decrypted));
  }

  formatDate() {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}_${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}`;
  }
}

document.addEventListener('DOMContentLoaded', () => new CookieManager());
