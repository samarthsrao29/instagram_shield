async function loadSettings() {
    const result = await chrome.storage.local.get(['groqApiKey', 'displayName']);
    
    if (result.groqApiKey) {
        document.getElementById('groq-key').value = result.groqApiKey;
    }
    
    if (result.displayName) {
        document.getElementById('display-name').value = result.displayName;
    }
}

async function saveSettings() {
    const groqApiKey = document.getElementById('groq-key').value.trim();
    const displayName = document.getElementById('display-name').value.trim();
    const status = document.getElementById('status-message');

    try {
        await chrome.storage.local.set({
            groqApiKey: groqApiKey,
            displayName: displayName
        });

        // Trigger a profile sync to Supabase if name changed
        if (displayName) {
            chrome.runtime.sendMessage({ action: "forceSupabaseSync" });
        }

        status.textContent = 'Settings saved successfully!';
        status.className = 'status success';
        
        setTimeout(() => {
            status.textContent = '';
        }, 3000);
    } catch (e) {
        status.textContent = 'Error saving settings.';
        status.className = 'status error';
    }
}

document.addEventListener('DOMContentLoaded', loadSettings);
document.getElementById('save-btn').addEventListener('click', saveSettings);
