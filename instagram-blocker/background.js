const LIMIT_MS = 2 * 60 * 1000;
// const LIMIT_MS = 5 * 1000; // For testing purposes! 

async function getStats() {
  const result = await chrome.storage.local.get(['stats']);
  const today = new Date().toISOString().split('T')[0];
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
  }
});

async function handleTabChange() {
  const tabs = await chrome.tabs.query({ active: true });
  let stats = await flushTime();
  
  if (tabs.length === 0) return;
  
  // Find if instagram is active anywhere
  let isOnInstagram = false;
  for (const tab of tabs) {
    if (tab.url && tab.url.includes("instagram.com")) {
      isOnInstagram = true;
      if (stats.instaTimeMs >= stats.allowanceMs) {
        stats.blocksCount++;
        stats.lastInstaFocusTime = null;
        await saveStats(stats);
        chrome.tabs.update(tab.id, { url: chrome.runtime.getURL("block.html") });
      }
      break;
    }
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
chrome.tabs.onUpdated.addListener(handleTabChange);
chrome.windows.onFocusChanged.addListener(handleTabChange);

chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId === 0 && details.url.includes("instagram.com")) {
    let stats = await getStats();
    if (stats.instaTimeMs >= stats.allowanceMs) {
      // Direct redirect
      stats.blocksCount++;
      await saveStats(stats);
      chrome.tabs.update(details.tabId, { url: chrome.runtime.getURL("block.html") });
    }
  }
});
