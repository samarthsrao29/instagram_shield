const LIMIT_MS = 2 * 60 * 1000;

function formatMsToMinutes(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
}

async function updateUI() {
    // Force a flush of current active time
    await chrome.runtime.getBackgroundPage?.()?.flushTime?.() || await chrome.storage.local.get(['stats']); 
    
    const result = await chrome.storage.local.get(['stats']);
    const stats = result.stats || { instaTimeMs: 0, readTimeMs: 0, blocksCount: 0, allowanceMs: LIMIT_MS };
    if (!stats.allowanceMs) stats.allowanceMs = LIMIT_MS;

    // Let's add any current running time if focus is active
    let displayInstaTime = stats.instaTimeMs;
    if (stats.lastInstaFocusTime) {
        displayInstaTime += (Date.now() - stats.lastInstaFocusTime);
    }

    document.getElementById('insta-time').textContent = formatMsToMinutes(displayInstaTime);
    document.getElementById('blocks-count').textContent = stats.blocksCount;
    document.getElementById('read-time').textContent = formatMsToMinutes(stats.readTimeMs);

    const progressFill = document.getElementById('progress-fill');
    const allowanceText = document.getElementById('allowance-text');

    // Calculate usage strictly within the current 2-minute cycle
    const baseAllowance = stats.allowanceMs - LIMIT_MS; // Time allowed from prior cycles
    let currentCycleUsage = displayInstaTime - baseAllowance;
    
    // Cap it so it doesn't look weird if it overshoots slightly
    if (currentCycleUsage < 0) currentCycleUsage = 0;
    if (currentCycleUsage > LIMIT_MS) currentCycleUsage = LIMIT_MS;

    const percentage = Math.min(100, (currentCycleUsage / LIMIT_MS) * 100);
    progressFill.style.width = `${percentage}%`;
    allowanceText.textContent = `${Math.floor(currentCycleUsage / 60000)} / 2 mins`;
    
    if (displayInstaTime >= stats.allowanceMs) {
        progressFill.classList.add('danger');
    } else {
        progressFill.classList.remove('danger');
    }
}

document.getElementById('open-reading').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("block.html") });
});

document.getElementById('open-analytics').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("analytics.html") });
});

// Initial update
updateUI();

// Refresh UI every second
setInterval(updateUI, 1000);

document.addEventListener('DOMContentLoaded', async () => {
    const topicSelect = document.getElementById('topic-select');
    const data = await chrome.storage.local.get('prefTopic');
    if (data.prefTopic) {
        topicSelect.value = data.prefTopic;
    }
    
    topicSelect.addEventListener('change', async (e) => {
        await chrome.storage.local.set({ prefTopic: e.target.value });
    });
});
