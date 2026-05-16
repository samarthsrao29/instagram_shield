// Shared (committed) config.
//
// Keep secrets (like GROQ_API_KEY) out of this file. Put secrets in
// `config.local.js` which is gitignored.

// Supabase (shared DB used by stats sync + leaderboard)
globalThis.SUPABASE_URL = "https://vllnfnpammmzlzzhwpol.supabase.co";
globalThis.SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsbG5mbnBhbW1temx6emh3cG9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0MzY3NTQsImV4cCI6MjA5NDAxMjc1NH0.qJ0wM8NXsCxpT04Mcbx1gKx_1dO9BHR8zO__KqIavHY";

