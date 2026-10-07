/**
 * Cookie Manager Pro v3.1 - Background Script
 * Cookie monitor, rule engine, protection, import. Uses helpers from lib/cookies.js.
 */

// ============ COOKIE MONITOR ============
const monitorLog = [];
const MAX_LOG = 500;

/** created | updated | deleted. Firefox reports an overwrite as removed:true + cause 'overwrite'. */
function eventType(changeInfo) {
  if (changeInfo.removed) return changeInfo.cause === 'overwrite' ? 'updated' : 'deleted';
  return 'created';
}

browser.cookies.onChanged.addListener((changeInfo) => {
  const { cookie } = changeInfo;
  const entry = {
    id: Date.now() + Math.random(),
    timestamp: Date.now(),
    type: eventType(changeInfo),
    removed: changeInfo.removed,
    cause: changeInfo.cause,
    cookie: {
      name: cookie.name, domain: cookie.domain, path: cookie.path,
      secure: cookie.secure, httpOnly: cookie.httpOnly, storeId: cookie.storeId
    }
  };

  // The "added" half of an overwrite is noise: the "updated" event already covers it.
  if (!(changeInfo.cause === 'overwrite' && !changeInfo.removed)) {
    monitorLog.unshift(entry);
    if (monitorLog.length > MAX_LOG) monitorLog.length = MAX_LOG;
  }

  browser.runtime.sendMessage({ action: 'cookieChanged', entry }).catch(() => {});

  if (!changeInfo.removed) checkRulesForCookie(cookie);
  else if (changeInfo.cause !== 'overwrite' && changeInfo.cause !== 'expired') checkProtection(cookie);
});

// ============ PROTECTION ============
async function getProtectedList() {
  const data = await browser.storage.local.get('protectedCookies');
  return data.protectedCookies || [];
}

/** v3.0 used "name|||domain" keys without container: migrate them to cookieKey(). */
async function migrateProtectedList() {
  const list = await getProtectedList();
  if (!list.some(p => p.key?.includes('|||'))) return;
  const migrated = list.map(p => {
    if (!p.key?.includes('|||')) return p;
    const entry = { ...p, storeId: p.storeId || DEFAULT_STORE_ID };
    return { ...entry, key: cookieKey(entry) };
  });
  await browser.storage.local.set({ protectedCookies: migrated });
}

async function checkProtection(cookie) {
  try {
    const entry = (await getProtectedList()).find(p => p.key === cookieKey(cookie));
    if (!entry) return;
    const isExpired = entry.expirationDate && entry.expirationDate < Date.now() / 1000;
    await setCookie({ ...cookie, value: entry.value ?? cookie.value, expirationDate: isExpired ? undefined : entry.expirationDate });
  } catch (e) {
    console.warn('[CookieManager] restore protected cookie failed', e);
  }
}

async function protectCookie(cookie) {
  const list = await getProtectedList();
  const key = cookieKey(cookie);
  if (list.some(p => p.key === key)) return;
  list.push({ key, ...serializeCookie(cookie) });
  await browser.storage.local.set({ protectedCookies: list });
}

async function unprotectCookie(cookie) {
  const key = cookieKey(cookie);
  const list = (await getProtectedList()).filter(p => p.key !== key);
  await browser.storage.local.set({ protectedCookies: list });
}

// ============ RULE ENGINE ============
function ruleMatches(rule, cookie) {
  const value = String(rule.matchValue || '');
  if (rule.storeId && rule.storeId !== cookie.storeId) return false;
  if (rule.matchType === 'domain') return cookie.domain.includes(value);
  if (rule.matchType === 'name') return cookie.name.includes(value);
  if (rule.matchType === 'regex') {
    try {
      const re = new RegExp(value, 'i');
      return re.test(cookie.name) || re.test(cookie.domain);
    } catch (e) { return false; }
  }
  return false;
}

async function checkRulesForCookie(cookie) {
  try {
    const { cookieRules = [] } = await browser.storage.local.get('cookieRules');
    for (const rule of cookieRules) {
      if (!rule.enabled || !ruleMatches(rule, cookie)) continue;
      if (rule.action === 'protect') {
        await protectCookie(cookie);
      } else if (rule.action === 'delete') {
        const isProtected = (await getProtectedList()).some(p => p.key === cookieKey(cookie));
        if (isProtected) continue;
        const delayMs = Math.max(0, Number(rule.delay) || 0) * 60 * 1000;
        setTimeout(() => removeCookie(cookie).catch(() => {}), delayMs);
      }
    }
  } catch (e) {
    console.warn('[CookieManager] rule check failed', e);
  }
}

// ============ IMPORT ============
/**
 * @param {object[]} cookies cookie-like objects (from any supported format)
 * @param {{overwrite?: boolean}} options overwrite=false skips cookies that already exist
 */
async function importCookies(cookies, { overwrite = true } = {}) {
  const validStores = new Set(await listStoreIds());
  const existingKeys = overwrite ? null : new Set((await getAllCookiesEverywhere()).map(cookieKey));
  const nowSec = Date.now() / 1000;
  let imported = 0, failed = 0, skipped = 0;

  for (const raw of cookies) {
    if (!raw || !raw.name || !raw.domain) { failed++; continue; }
    const cookie = { ...raw, storeId: validStores.has(raw.storeId) ? raw.storeId : DEFAULT_STORE_ID };
    if (!(cookie.expirationDate > nowSec)) {
      cookie.expirationDate = cookie.session ? undefined : Math.floor(nowSec) + 31536000;
    }
    if (existingKeys?.has(cookieKey(cookie))) { skipped++; continue; }
    try {
      await setCookie(cookie);
      imported++;
    } catch (e) {
      failed++;
    }
  }
  return { success: true, imported, failed, skipped };
}

// ============ UI ============
browser.browserAction.onClicked.addListener(() => browser.sidebarAction.toggle());

// ============ MESSAGES ============
const handlers = {
  importCookies: (m) => importCookies(m.cookies, m.options),
  getMonitorLog: () => ({ log: monitorLog }),
  clearMonitorLog: () => { monitorLog.length = 0; return { success: true }; },
  protectCookie: async (m) => { await protectCookie(m.cookie); return { success: true }; },
  unprotectCookie: async (m) => { await unprotectCookie(m.cookie); return { success: true }; }
};

browser.runtime.onMessage.addListener((message) => {
  const handler = handlers[message?.action];
  if (!handler) return undefined;
  return Promise.resolve()
    .then(() => handler(message))
    .catch(e => ({ success: false, error: e.message }));
});

migrateProtectedList().catch(e => console.warn('[CookieManager] migration failed', e));
