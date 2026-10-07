/**
 * Cookie Manager Pro - shared cookie helpers (loaded by background + sidebar).
 * Every operation is container (storeId) and partition (Total Cookie Protection) aware.
 */

const DEFAULT_STORE_ID = 'firefox-default';
const PRIVATE_STORE_ID = 'firefox-private';

const SAME_SITE_MAP = { strict: 'strict', lax: 'lax', none: 'no_restriction', no_restriction: 'no_restriction' };

/** Unique identity of a cookie across containers and partitions. */
function cookieKey(cookie) {
  return [
    cookie.storeId || DEFAULT_STORE_ID,
    cookie.domain,
    cookie.path || '/',
    cookie.name,
    cookie.partitionKey?.topLevelSite || '',
    cookie.firstPartyDomain || ''
  ].join('|');
}

/** URL matching a cookie, required by cookies.set/remove. */
function cookieUrl(cookie, forceSecure = false) {
  const host = String(cookie.domain || '').replace(/^\./, '');
  const scheme = cookie.secure || forceSecure ? 'https' : 'http';
  return `${scheme}://${host}${cookie.path || '/'}`;
}

/** Fields identifying a cookie for cookies.remove (and base of cookies.set). */
function cookieTarget(cookie) {
  const target = { url: cookieUrl(cookie), name: cookie.name, storeId: cookie.storeId || DEFAULT_STORE_ID };
  if (cookie.firstPartyDomain !== undefined) target.firstPartyDomain = cookie.firstPartyDomain;
  if (cookie.partitionKey?.topLevelSite) target.partitionKey = { topLevelSite: cookie.partitionKey.topLevelSite };
  return target;
}

/**
 * Store ids to scan: default store, every container, plus stores with open tabs (private).
 * cookies.getAllCookieStores() alone only lists stores that currently have tabs.
 */
async function listStoreIds() {
  const ids = new Set([DEFAULT_STORE_ID]);
  try {
    const containers = await browser.contextualIdentities.query({});
    containers.forEach(c => ids.add(c.cookieStoreId));
  } catch (e) { /* containers disabled */ }
  try {
    const stores = await browser.cookies.getAllCookieStores();
    stores.forEach(s => ids.add(s.id));
  } catch (e) { /* ignore */ }
  return [...ids];
}

async function getStoreCookies(storeId) {
  try {
    // partitionKey: {} -> partitioned + unpartitioned, firstPartyDomain: null -> ignore FPI
    return await browser.cookies.getAll({ storeId, partitionKey: {}, firstPartyDomain: null });
  } catch (e) {
    try { return await browser.cookies.getAll({ storeId }); } catch (e2) { return []; }
  }
}

/** All cookies from every container / partition. */
async function getAllCookiesEverywhere() {
  const storeIds = await listStoreIds();
  const perStore = await Promise.all(storeIds.map(getStoreCookies));
  return perStore.flat();
}

function removeCookie(cookie) {
  return browser.cookies.remove(cookieTarget(cookie));
}

function normalizeSameSite(value, secure) {
  const sameSite = SAME_SITE_MAP[String(value || '').toLowerCase()] || 'no_restriction';
  return sameSite === 'no_restriction' && !secure ? 'lax' : sameSite;
}

/** Details object for cookies.set from a cookie-like object. */
function buildCookieDetails(cookie) {
  const secure = Boolean(cookie.secure);
  const details = {
    ...cookieTarget(cookie),
    value: String(cookie.value ?? ''),
    path: cookie.path || '/',
    secure,
    httpOnly: Boolean(cookie.httpOnly),
    sameSite: normalizeSameSite(cookie.sameSite, secure)
  };
  const hostOnly = cookie.hostOnly ?? !String(cookie.domain || '').startsWith('.');
  if (!hostOnly) details.domain = cookie.domain;
  if (cookie.expirationDate) details.expirationDate = cookie.expirationDate;
  return details;
}

/** Set a cookie, retrying without explicit domain then over https when the browser rejects it. */
async function setCookie(cookie) {
  const details = buildCookieDetails(cookie);
  const { domain, ...withoutDomain } = details;
  const variants = [details];
  if (domain) variants.push(withoutDomain);
  if (!details.secure) variants.push({ ...withoutDomain, url: cookieUrl(cookie, true), secure: true });

  let lastError;
  for (const variant of variants) {
    try { return await browser.cookies.set(variant); } catch (e) { lastError = e; }
  }
  throw lastError;
}

/** Plain serialisable copy of a cookie (export, profiles, undo). */
function serializeCookie(c) {
  const out = {
    domain: c.domain, expirationDate: c.expirationDate, hostOnly: c.hostOnly, httpOnly: c.httpOnly,
    name: c.name, path: c.path, sameSite: c.sameSite, secure: c.secure, session: c.session,
    value: c.value, storeId: c.storeId || DEFAULT_STORE_ID
  };
  if (c.firstPartyDomain) out.firstPartyDomain = c.firstPartyDomain;
  if (c.partitionKey?.topLevelSite) out.partitionKey = { topLevelSite: c.partitionKey.topLevelSite };
  return out;
}

/** True when `domain` (cookie domain) equals or is a subdomain of `site`. */
function domainMatches(domain, site) {
  const d = String(domain || '').replace(/^\./, '').toLowerCase();
  const s = String(site || '').replace(/^\./, '').toLowerCase();
  return Boolean(s) && (d === s || d.endsWith('.' + s));
}
