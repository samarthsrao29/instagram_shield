function getSupabaseConfig() {
  const url = (globalThis.SUPABASE_URL || "").trim();
  const anonKey = (globalThis.SUPABASE_ANON_KEY || "").trim();
  return { url, anonKey, enabled: !!(url && anonKey) };
}

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

async function getStoredAuth() {
  const result = await chrome.storage.local.get(["sbAuth"]);
  return result.sbAuth || null;
}

async function setStoredAuth(sbAuth) {
  await chrome.storage.local.set({ sbAuth });
}

async function getOrCreateDeviceCreds() {
  const result = await chrome.storage.local.get(["sbDeviceCreds"]);
  if (result.sbDeviceCreds && result.sbDeviceCreds.email && result.sbDeviceCreds.password) {
    return result.sbDeviceCreds;
  }

  const uuid = crypto.randomUUID();
  const creds = {
    email: `${uuid}@focusshield.local`,
    password: crypto.randomUUID() + crypto.randomUUID()
  };
  await chrome.storage.local.set({ sbDeviceCreds: creds });
  return creds;
}

async function supabaseFetch(path, { method = "GET", headers = {}, body } = {}, accessToken) {
  const { url, anonKey } = getSupabaseConfig();
  const fullUrl = `${url}${path}`;

  const mergedHeaders = {
    apikey: anonKey,
    "Content-Type": "application/json",
    ...headers
  };

  if (accessToken) {
    mergedHeaders.Authorization = `Bearer ${accessToken}`;
  }

  const res = await fetch(fullUrl, {
    method,
    headers: mergedHeaders,
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  return res;
}

async function readSupabaseError(res) {
  try {
    const text = await res.text();
    if (!text) return `${res.status} ${res.statusText}`;
    return `${res.status} ${res.statusText}: ${text}`;
  } catch {
    return `${res.status} ${res.statusText}`;
  }
}

async function signUpOrSignIn() {
  const { enabled } = getSupabaseConfig();
  if (!enabled) return null;

  const creds = await getOrCreateDeviceCreds();

  // Prefer sign-in first to avoid repeatedly triggering email sends on /signup.
  const signIn = await supabaseFetch(
    "/auth/v1/token?grant_type=password",
    { method: "POST", body: { email: creds.email, password: creds.password } }
  );
  if (signIn.ok) return signIn.json();

  // If sign-in fails, try sign-up once (this can trigger confirmation emails if enabled).
  const res = await supabaseFetch(
    "/auth/v1/signup",
    { method: "POST", body: { email: creds.email, password: creds.password } }
  );
  if (!res.ok) {
    const err = await readSupabaseError(res);
    return {
      ok: false,
      error:
        err.includes("over_email_send_rate_limit")
          ? "Supabase is trying to send confirmation emails and hit the rate limit. Disable email confirmations in Supabase Auth (Email provider) or wait, then clear extension auth storage and retry."
          : err
    };
  }

  const data = await res.json();
  return data;
}

async function refreshSession(refreshToken) {
  const res = await supabaseFetch(
    "/auth/v1/token?grant_type=refresh_token",
    { method: "POST", body: { refresh_token: refreshToken } }
  );
  if (!res.ok) return null;
  return res.json();
}

async function ensureSupabaseSession() {
  const { enabled } = getSupabaseConfig();
  if (!enabled) return { enabled: false, session: null };

  const stored = await getStoredAuth();
  if (stored && stored.access_token && stored.expires_at && stored.expires_at - 30 > nowSec()) {
    return { enabled: true, session: stored };
  }

  if (stored && stored.refresh_token) {
    const refreshed = await refreshSession(stored.refresh_token);
    if (refreshed && refreshed.access_token) {
      const next = {
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token || stored.refresh_token,
        expires_at: nowSec() + (refreshed.expires_in || 3600),
        user: refreshed.user || stored.user
      };
      await setStoredAuth(next);
      return { enabled: true, session: next };
    }
  }

  const created = await signUpOrSignIn();
  if (!created || !created.access_token) {
    return {
      enabled: true,
      session: null,
      error:
        created?.error ||
        "No session created. In Supabase Auth settings, disable 'Confirm email' (email confirmations) for this extension."
    };
  }

  const next = {
    access_token: created.access_token,
    refresh_token: created.refresh_token,
    expires_at: nowSec() + (created.expires_in || 3600),
    user: created.user
  };
  await setStoredAuth(next);
  return { enabled: true, session: next, error: null };
}

async function upsertProfile({ displayName }) {
  const { enabled, session, error } = await ensureSupabaseSession();
  if (!enabled || !session) return { ok: false, error };

  const payload = { display_name: displayName || "Anonymous", updated_at: new Date().toISOString() };
  const res = await supabaseFetch(
    "/rest/v1/user_profiles?on_conflict=user_id",
    {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: payload
    },
    session.access_token
  );
  if (!res.ok) return { ok: false, error: await readSupabaseError(res) };
  return { ok: true, error: null };
}

async function upsertDailyStats({ date, instaTimeMs, readTimeMs, blocksCount }) {
  const { enabled, session, error } = await ensureSupabaseSession();
  if (!enabled || !session) return { ok: false, error };

  const payload = {
    date,
    insta_time_ms: instaTimeMs || 0,
    read_time_ms: readTimeMs || 0,
    blocks_count: blocksCount || 0,
    updated_at: new Date().toISOString()
  };

  const res = await supabaseFetch(
    "/rest/v1/user_daily_stats?on_conflict=user_id,date",
    {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: payload
    },
    session.access_token
  );
  if (!res.ok) return { ok: false, error: await readSupabaseError(res) };
  return { ok: true, error: null };
}

async function callRpc(fn, args) {
  const { enabled, session, error } = await ensureSupabaseSession();
  if (!enabled || !session) return { ok: false, data: null, error };

  const res = await supabaseFetch(
    `/rest/v1/rpc/${fn}`,
    { method: "POST", body: args || {} },
    session.access_token
  );

  if (!res.ok) return { ok: false, data: null, error: await readSupabaseError(res) };
  return { ok: true, data: await res.json(), error: null };
}

async function getLeaderboards({ limit = 25 } = {}) {
  const daily = await callRpc("get_leaderboard_daily", { p_limit: limit });
  const weekly = await callRpc("get_leaderboard_weekly", { p_limit: limit });
  return {
    ok: daily.ok && weekly.ok,
    daily: daily.data || [],
    weekly: weekly.data || [],
    error: daily.error || weekly.error || null
  };
}

globalThis.FocusShieldSupabase = {
  getSupabaseConfig,
  ensureSupabaseSession,
  upsertProfile,
  upsertDailyStats,
  getLeaderboards
};
