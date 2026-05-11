const LIMIT_MS = 2 * 60 * 1000;
// const LIMIT_MS = 5 * 1000; // For testing purposes! 

try { importScripts("config.local.js"); } catch {}
try { importScripts("supabase_client.js"); } catch {}

function getLocalDateKey(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function getIsEnabled() {
  const data = await chrome.storage.local.get('isEnabled');
  return data.isEnabled !== false;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggleChanged") {
    handleTabChange();
  } else if (request.action === "forceSupabaseSync") {
    syncStatsToSupabase()
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }
});

async function syncStatsToSupabase() {
  try {
    if (!globalThis.FocusShieldSupabase?.getSupabaseConfig) return;
    const { enabled } = globalThis.FocusShieldSupabase.getSupabaseConfig();
    if (!enabled) return;

    const result = await chrome.storage.local.get(["stats", "displayName"]);
    const stats = result.stats;
    if (!stats || !stats.date) return;

    const displayName = (result.displayName || "").trim() || "Anonymous";
    const profileRes = await globalThis.FocusShieldSupabase.upsertProfile({ displayName });
    const statsRes = await globalThis.FocusShieldSupabase.upsertDailyStats({
      date: stats.date,
      instaTimeMs: stats.instaTimeMs,
      readTimeMs: stats.readTimeMs,
      blocksCount: stats.blocksCount
    });
    const ok = (profileRes?.ok !== false) && (statsRes?.ok !== false);
    await chrome.storage.local.set({
      sbLastSyncAt: new Date().toISOString(),
      sbLastSyncOk: ok,
      sbLastSyncError: ok ? "" : (profileRes?.error || statsRes?.error || "Unknown sync error")
    });
  } catch (e) {
    await chrome.storage.local.set({
      sbLastSyncAt: new Date().toISOString(),
      sbLastSyncOk: false,
      sbLastSyncError: e?.message || "Sync threw an error"
    });
  }
}

async function getStats() {
  const result = await chrome.storage.local.get(['stats']);
  const today = getLocalDateKey();
  let stats = result.stats;
  if (!stats || stats.date !== today) {
    stats = {
      date: today,
      instaTimeMs: 0,
      readTimeMs: 0,
      blocksCount: 0,
      allowanceMs: LIMIT_MS, // Start with 2 mins allowance
      lastInstaFocusTime: null
    };
    await chrome.storage.local.set({ stats });
  }
  
  // Migration for older clients
  if (stats.allowanceMs === undefined) {
    stats.allowanceMs = LIMIT_MS;
    await chrome.storage.local.set({ stats });
  }
  
  return stats;
}

async function saveStats(stats) {
  const result = await chrome.storage.local.get(['history']);
  let history = result.history || {};
  
  history[stats.date] = {
    instaTimeMs: stats.instaTimeMs,
    readTimeMs: stats.readTimeMs,
    blocksCount: stats.blocksCount
  };
  
  await chrome.storage.local.set({ stats, history });
  await syncStatsToSupabase();
}

async function flushTime() {
  let stats = await getStats();
  if (stats.lastInstaFocusTime) {
    const elapsed = Date.now() - stats.lastInstaFocusTime;
    stats.instaTimeMs += elapsed;
    stats.lastInstaFocusTime = Date.now();
    await saveStats(stats);
  }
  return stats;
}

async function checkBlock() {
  let stats = await flushTime();

  const isEnabled = await getIsEnabled();
  if (!isEnabled) {
    if (stats.lastInstaFocusTime) {
      stats.lastInstaFocusTime = null;
      await saveStats(stats);
    }
    chrome.alarms.clear("blockInsta");
    return;
  }

  if (stats.instaTimeMs >= stats.allowanceMs) {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0] && tabs[0].url && tabs[0].url.includes("instagram.com")) {
      stats.blocksCount++;
      stats.lastInstaFocusTime = null;
      await saveStats(stats);
      chrome.tabs.update(tabs[0].id, { url: chrome.runtime.getURL("block.html") });
    }
  } else if (stats.lastInstaFocusTime) {
    const remaining = stats.allowanceMs - stats.instaTimeMs;
    chrome.alarms.create("blockInsta", { when: Date.now() + remaining });
  }
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "blockInsta") {
    checkBlock();
  } else if (alarm.name === "sbSync") {
    syncStatsToSupabase();
  }
});

function isInstagramUrl(url) {
  return typeof url === "string" && url.includes("instagram.com");
}

async function getFocusedActiveTab(isWindowFocused) {
  // If Chrome itself is not focused, treat as "not on Instagram" so time pauses.
  if (isWindowFocused === false) return null;

  const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return tabs && tabs.length > 0 ? tabs[0] : null;
}

async function handleTabChange(event) {
  // `event` may come from different listeners:
  // - tabs.onActivated: { tabId, windowId }
  // - windows.onFocusChanged: windowId (number)
  // - tabs.onUpdated: (tabId, changeInfo, tab) -> we pass nothing
  const isWindowFocused =
    typeof event === "number"
      ? event !== chrome.windows.WINDOW_ID_NONE
      : event && typeof event.windowId === "number"
        ? event.windowId !== chrome.windows.WINDOW_ID_NONE
        : true;

  const activeTab = await getFocusedActiveTab(isWindowFocused);
  let stats = await flushTime();
  
  const isEnabled = await getIsEnabled();
  if (!isEnabled) {
    if (stats.lastInstaFocusTime) {
      stats.lastInstaFocusTime = null;
      await saveStats(stats);
      chrome.alarms.clear("blockInsta");
    }
    return;
  }

  // If there's no focused active tab, we are effectively "off Instagram".
  const isOnInstagram = !!(activeTab && isInstagramUrl(activeTab.url));

  if (isOnInstagram && stats.instaTimeMs >= stats.allowanceMs) {
    stats.blocksCount++;
    stats.lastInstaFocusTime = null;
    await saveStats(stats);
    chrome.tabs.update(activeTab.id, { url: chrome.runtime.getURL("block.html") });
    return;
  }

  if (isOnInstagram && stats.instaTimeMs < stats.allowanceMs) {
    if (!stats.lastInstaFocusTime) {
      stats.lastInstaFocusTime = Date.now();
      await saveStats(stats);
      checkBlock();
    }
  } else if (!isOnInstagram && stats.lastInstaFocusTime) {
    stats.lastInstaFocusTime = null;
    await saveStats(stats);
    chrome.alarms.clear("blockInsta");
  }
}

chrome.tabs.onActivated.addListener(handleTabChange);
chrome.tabs.onUpdated.addListener(() => handleTabChange());
chrome.tabs.onRemoved.addListener(() => handleTabChange());
chrome.windows.onFocusChanged.addListener(handleTabChange);

chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId === 0 && details.url.includes("instagram.com")) {
    const isEnabled = await getIsEnabled();
    if (!isEnabled) return;

    let stats = await getStats();
    if (stats.instaTimeMs >= stats.allowanceMs) {
      // Direct redirect
      stats.blocksCount++;
      await saveStats(stats);
      chrome.tabs.update(details.tabId, { url: chrome.runtime.getURL("block.html") });
    }
  }
});

chrome.runtime.onStartup?.addListener(() => {
  chrome.alarms.create("sbSync", { periodInMinutes: 10 });
  syncStatsToSupabase();
});

chrome.runtime.onInstalled?.addListener(() => {
  chrome.alarms.create("sbSync", { periodInMinutes: 10 });
  syncStatsToSupabase();
});
