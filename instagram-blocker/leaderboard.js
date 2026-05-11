let currentTab = "daily";
let dailyRows = [];
let weeklyRows = [];

function formatMs(ms) {
  const totalSec = Math.floor((ms || 0) / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

function safeText(v) {
  return (v || "").toString().slice(0, 60);
}

function setStatus(msg) {
  document.getElementById("status").textContent = msg || "";
}

function renderList() {
  const rows = currentTab === "weekly" ? weeklyRows : dailyRows;
  const list = document.getElementById("list");

  if (!rows || rows.length === 0) {
    list.innerHTML = `<div class="hint">No data yet. Make sure Supabase is configured and sync is enabled.</div>`;
    return;
  }

  list.innerHTML = rows
    .map((r, idx) => {
      const name = safeText(r.display_name || "Anonymous");
      const insta = formatMs(r.insta_time_ms);
      const read = formatMs(r.read_time_ms);
      const blocks = Number(r.blocks_count || 0);

      return `
        <div class="item">
          <div class="left">
            <div class="rank">${idx + 1}</div>
            <div>
              <div class="name">${name}</div>
              <div class="meta">Reading: ${read} • Blocks: ${blocks}</div>
            </div>
          </div>
          <div class="right">
            <div class="score">Instagram: ${insta}</div>
            <div class="hint">${currentTab === "weekly" ? "Last 7 days" : "Today"}</div>
          </div>
        </div>
      `;
    })
    .join("");
}

async function loadDisplayName() {
  const result = await chrome.storage.local.get(["displayName"]);
  const name = (result.displayName || "").toString();
  document.getElementById("display-name").value = name;
}

async function saveDisplayName() {
  const displayName = (document.getElementById("display-name").value || "").trim();
  await chrome.storage.local.set({ displayName });
  setStatus("Saved. Syncing profile…");
  const res = await globalThis.FocusShieldSupabase?.upsertProfile?.({ displayName });
  if (res && res.ok) setStatus("Saved.");
  else setStatus(res?.error || "Could not sync profile.");
}

async function refreshLeaderboards() {
  const cfg = globalThis.FocusShieldSupabase?.getSupabaseConfig?.();
  if (!cfg?.enabled) {
    setStatus("Supabase not configured. Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `config.local.js`.");
    dailyRows = [];
    weeklyRows = [];
    renderList();
    return;
  }

  setStatus("Loading leaderboards…");
  try {
    await chrome.runtime.sendMessage({ action: "forceSupabaseSync" });
  } catch {
    // ignore
  }
  const result = await globalThis.FocusShieldSupabase.getLeaderboards({ limit: 25 });
  if (!result.ok) {
    setStatus(result.error || "Could not load leaderboard. Check Supabase SQL setup + RLS policies.");
    dailyRows = [];
    weeklyRows = [];
    renderList();
    return;
  }

  dailyRows = result.daily;
  weeklyRows = result.weekly;
  setStatus("");
  renderList();
}

function setTab(tab) {
  currentTab = tab;
  document.getElementById("tab-daily").classList.toggle("active", tab === "daily");
  document.getElementById("tab-weekly").classList.toggle("active", tab === "weekly");
  renderList();
}

document.getElementById("tab-daily").addEventListener("click", () => setTab("daily"));
document.getElementById("tab-weekly").addEventListener("click", () => setTab("weekly"));
document.getElementById("btn-refresh").addEventListener("click", refreshLeaderboards);
document.getElementById("btn-save-name").addEventListener("click", saveDisplayName);

(async function init() {
  await loadDisplayName();
  await refreshLeaderboards();
})();
