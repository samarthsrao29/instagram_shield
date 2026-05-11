const LIMIT_MS = 2 * 60 * 1000;

function formatMsToMinutes(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
}

async function updateUI() {
    const result = await chrome.storage.local.get(['stats']);
    const stats = result.stats || { instaTimeMs: 0, readTimeMs: 0, blocksCount: 0, allowanceMs: LIMIT_MS };
    if (!stats.allowanceMs) stats.allowanceMs = LIMIT_MS;

    let displayInstaTime = stats.instaTimeMs;
    if (stats.lastInstaFocusTime) {
        displayInstaTime += (Date.now() - stats.lastInstaFocusTime);
    }

    document.getElementById('insta-time').textContent = formatMsToMinutes(displayInstaTime);
    document.getElementById('blocks-count').textContent = stats.blocksCount;
    document.getElementById('read-time').textContent = formatMsToMinutes(stats.readTimeMs);

    const progressFill = document.getElementById('progress-fill');
    const allowanceText = document.getElementById('allowance-text');

    const baseAllowance = stats.allowanceMs - LIMIT_MS;
    let currentCycleUsage = displayInstaTime - baseAllowance;
    if (currentCycleUsage < 0) currentCycleUsage = 0;
    if (currentCycleUsage > LIMIT_MS) currentCycleUsage = LIMIT_MS;

    const percentage = Math.min(100, (currentCycleUsage / LIMIT_MS) * 100);
    progressFill.style.width = `${percentage}%`;
    allowanceText.textContent = `${Math.floor(currentCycleUsage / 60000)} / 2 min`;

    if (displayInstaTime >= stats.allowanceMs) {
        progressFill.classList.add('danger');
    } else {
        progressFill.classList.remove('danger');
    }
}

document.getElementById('open-read-mode').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("block.html?mode=read") });
});

document.getElementById('open-quiz-mode').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("block.html?mode=quiz") });
});

document.getElementById('open-analytics').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("analytics.html") });
});

document.getElementById('open-leaderboard').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("leaderboard.html") });
});

updateUI();
setInterval(updateUI, 1000);

document.addEventListener('DOMContentLoaded', async () => {
    const toggleInput = document.getElementById('blocker-toggle');
    
    const data = await chrome.storage.local.get(['isEnabled']);
    
    // Default is true if not set
    const isEnabled = data.isEnabled !== false;
    toggleInput.checked = isEnabled;

    toggleInput.addEventListener('change', async (e) => {
        await chrome.storage.local.set({ isEnabled: e.target.checked });
        // Force the background script to check the current tab
        chrome.runtime.sendMessage({ action: "toggleChanged" });
    });
});
