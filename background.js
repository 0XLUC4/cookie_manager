/**
 * Cookie Manager Pro v3.0 - Background Script
 * Cookie monitor, rule engine, protection, import
 */

// ============ COOKIE MONITOR ============
const monitorLog = [];
const MAX_LOG = 500;

browser.cookies.onChanged.addListener((changeInfo) => {
  const entry = {
    id: Date.now() + Math.random(),
    timestamp: Date.now(),
    removed: changeInfo.removed,
    cookie: {
      name: changeInfo.cookie.name,
      domain: changeInfo.cookie.domain,
      value: changeInfo.cookie.value,
      secure: changeInfo.cookie.secure,
      httpOnly: changeInfo.cookie.httpOnly,
      path: changeInfo.cookie.path,
      expirationDate: changeInfo.cookie.expirationDate,
      sameSite: changeInfo.cookie.sameSite,
      storeId: changeInfo.cookie.storeId
    },
    cause: changeInfo.cause
  };

  monitorLog.unshift(entry);
  if (monitorLog.length > MAX_LOG) monitorLog.length = MAX_LOG;

  // Notify sidebar
  browser.runtime.sendMessage({
    action: 'cookieChanged',
    entry
  }).catch(() => {});

  // Check rules
  checkRulesForCookie(changeInfo.cookie, changeInfo.removed);

  // Check protection (restore if protected cookie was removed)
  if (changeInfo.removed && changeInfo.cause !== 'overwrite') {
    checkProtection(changeInfo.cookie);
  }
});

// ============ COOKIE PROTECTION ============
async function checkProtection(cookie) {
  try {
    const data = await browser.storage.local.get('protectedCookies');
    const protectedList = data.protectedCookies || [];
    const key = `${cookie.name}|||${cookie.domain}`;
    const entry = protectedList.find(p => p.key === key);

    if (entry) {
      // Restore the cookie
      const domain = cookie.domain.replace(/^\./, '');
      const protocol = cookie.secure ? 'https://' : 'http://';
      const url = protocol + domain + (cookie.path || '/');

      const cookieDetails = {
        url,
        name: cookie.name,
        value: entry.value || cookie.value || '',
        path: cookie.path || '/',
        secure: Boolean(cookie.secure),
        httpOnly: Boolean(cookie.httpOnly),
        sameSite: cookie.sameSite || 'no_restriction'
      };

      if (cookie.expirationDate) {
        cookieDetails.expirationDate = cookie.expirationDate;
      }

      if (cookie.domain && cookie.domain.startsWith('.')) {
        cookieDetails.domain = cookie.domain;
      }

      try {
        await browser.cookies.set(cookieDetails);
      } catch (e) {
        // Silently fail
      }
    }
  } catch (e) {}
}

// ============ RULE ENGINE ============
async function checkRulesForCookie(cookie, removed) {
  if (removed) return;

  try {
    const data = await browser.storage.local.get('cookieRules');
    const rules = data.cookieRules || [];

    for (const rule of rules) {
      if (!rule.enabled) continue;

      let match = false;

      if (rule.matchType === 'domain' && cookie.domain.includes(rule.matchValue)) {
        match = true;
      } else if (rule.matchType === 'name' && cookie.name.includes(rule.matchValue)) {
        match = true;
      } else if (rule.matchType === 'regex') {
        try {
          const re = new RegExp(rule.matchValue, 'i');
          match = re.test(cookie.name) || re.test(cookie.domain);
        } catch (e) {}
      }

      if (match) {
        if (rule.action === 'delete') {
          if (rule.delay && rule.delay > 0) {
            setTimeout(() => deleteCookie(cookie), rule.delay * 60 * 1000);
          } else {
            await deleteCookie(cookie);
          }
        } else if (rule.action === 'protect') {
          await protectCookie(cookie);
        }
      }
    }
  } catch (e) {}
}

async function deleteCookie(cookie) {
  try {
    const domain = cookie.domain.replace(/^\./, '');
    const protocol = cookie.secure ? 'https://' : 'http://';
    const url = protocol + domain + (cookie.path || '/');
    await browser.cookies.remove({ url, name: cookie.name });
  } catch (e) {}
}

async function protectCookie(cookie) {
  try {
    const data = await browser.storage.local.get('protectedCookies');
    const protectedList = data.protectedCookies || [];
    const key = `${cookie.name}|||${cookie.domain}`;
    if (!protectedList.find(p => p.key === key)) {
      protectedList.push({
        key,
        name: cookie.name,
        domain: cookie.domain,
        value: cookie.value,
        secure: cookie.secure,
        httpOnly: cookie.httpOnly,
        path: cookie.path,
        expirationDate: cookie.expirationDate,
        sameSite: cookie.sameSite
      });
      await browser.storage.local.set({ protectedCookies: protectedList });
    }
  } catch (e) {}
}

// ============ SIDEBAR TOGGLE ============
browser.browserAction.onClicked.addListener(() => {
  browser.sidebarAction.toggle();
});

// ============ MESSAGE HANDLER ============
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'importCookies') {
    importCookies(message.cookies)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (message.action === 'getMonitorLog') {
    sendResponse({ log: monitorLog });
    return false;
  }

  if (message.action === 'clearMonitorLog') {
    monitorLog.length = 0;
    sendResponse({ success: true });
    return false;
  }

  if (message.action === 'getContainers') {
    browser.contextualIdentities.query({})
      .then(containers => sendResponse({ containers }))
      .catch(() => sendResponse({ containers: [] }));
    return true;
  }

  if (message.action === 'deleteCookie') {
    deleteCookie(message.cookie)
      .then(() => sendResponse({ success: true }))
      .catch(e => sendResponse({ success: false, error: e.message }));
    return true;
  }

  if (message.action === 'protectCookie') {
    protectCookie(message.cookie)
      .then(() => sendResponse({ success: true }))
      .catch(e => sendResponse({ success: false, error: e.message }));
    return true;
  }

  if (message.action === 'unprotectCookie') {
    unprotectCookie(message.name, message.domain)
      .then(() => sendResponse({ success: true }))
      .catch(e => sendResponse({ success: false, error: e.message }));
    return true;
  }

  if (message.action === 'cleanTrackers') {
    cleanTrackers(message.trackers)
      .then(result => sendResponse(result))
      .catch(e => sendResponse({ success: false, error: e.message }));
    return true;
  }

  if (message.action === 'cleanExpired') {
    cleanExpired()
      .then(result => sendResponse(result))
      .catch(e => sendResponse({ success: false, error: e.message }));
    return true;
  }
});

async function unprotectCookie(name, domain) {
  const data = await browser.storage.local.get('protectedCookies');
  let protectedList = data.protectedCookies || [];
  const key = `${name}|||${domain}`;
  protectedList = protectedList.filter(p => p.key !== key);
  await browser.storage.local.set({ protectedCookies: protectedList });
}

async function cleanTrackers(trackerDomains) {
  const cookies = await browser.cookies.getAll({});
  let deleted = 0;
  for (const c of cookies) {
    if (trackerDomains.some(t => c.domain.includes(t))) {
      await deleteCookie(c);
      deleted++;
    }
  }
  return { success: true, deleted };
}

async function cleanExpired() {
  const cookies = await browser.cookies.getAll({});
  const now = Date.now() / 1000;
  let deleted = 0;
  for (const c of cookies) {
    if (c.expirationDate && c.expirationDate < now) {
      await deleteCookie(c);
      deleted++;
    }
  }
  return { success: true, deleted };
}

// ============ IMPORT COOKIES ============
async function importCookies(cookies) {
  let imported = 0;
  let failed = 0;

  for (const cookie of cookies) {
    try {
      if (!cookie.name || !cookie.domain) {
        failed++;
        continue;
      }

      let domain = cookie.domain;
      if (domain.startsWith('.')) {
        domain = domain.substring(1);
      }

      const protocol = cookie.secure ? 'https://' : 'http://';
      const url = protocol + domain + (cookie.path || '/');

      let sameSite = 'no_restriction';
      if (cookie.sameSite) {
        const s = String(cookie.sameSite).toLowerCase();
        if (s === 'strict') sameSite = 'strict';
        else if (s === 'lax') sameSite = 'lax';
        else if (s === 'none' || s === 'no_restriction') sameSite = 'no_restriction';
      }

      if (sameSite === 'no_restriction' && !cookie.secure) {
        sameSite = 'lax';
      }

      const cookieDetails = {
        url,
        name: String(cookie.name),
        value: String(cookie.value || ''),
        path: cookie.path || '/',
        secure: Boolean(cookie.secure),
        httpOnly: Boolean(cookie.httpOnly),
        sameSite
      };

      if (cookie.expirationDate && cookie.expirationDate > Date.now() / 1000) {
        cookieDetails.expirationDate = cookie.expirationDate;
      } else if (!cookie.session) {
        cookieDetails.expirationDate = Math.floor(Date.now() / 1000) + 31536000;
      }

      try {
        if (cookie.domain && cookie.domain.startsWith('.')) {
          cookieDetails.domain = cookie.domain;
        }
        await browser.cookies.set(cookieDetails);
        imported++;
      } catch (e1) {
        try {
          delete cookieDetails.domain;
          await browser.cookies.set(cookieDetails);
          imported++;
        } catch (e2) {
          if (!cookie.secure) {
            try {
              cookieDetails.url = 'https://' + domain + (cookie.path || '/');
              cookieDetails.secure = true;
              await browser.cookies.set(cookieDetails);
              imported++;
            } catch (e3) {
              failed++;
            }
          } else {
            failed++;
          }
        }
      }
    } catch (e) {
      failed++;
    }
  }

  return { success: true, imported, failed };
}
