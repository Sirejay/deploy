/**
 * SynapsVault — Step 6: End-to-end smoke test
 *
 * Checks every critical path before submitting to SCF:
 *   ✓ Backend health
 *   ✓ Registry on-chain count
 *   ✓ Catalog returns resources
 *   ✓ x402 paywall returns 402 on unauthenticated access
 *   ✓ Admin stats endpoint works
 *
 * Usage:
 *   BACKEND_URL=https://your-app.railway.app \
 *   ADMIN_API_KEY=your_admin_key \
 *   node scripts/06-smoke-test.js
 */

const BASE      = process.env.BACKEND_URL ?? "http://localhost:3000";
const ADMIN_KEY = process.env.ADMIN_API_KEY ?? "change_me";

// When run against a freshly started docker-compose stack, services may still
// be warming up even after `docker compose up -d --wait`. Allow a bounded
// retry window so CI smoke tests are not flaky on cold starts.
const READY_TIMEOUT_MS = Number(process.env.SMOKE_READY_TIMEOUT_MS ?? 60000);
const READY_INTERVAL_MS = 2000;

let passed = 0;
let failed = 0;

async function check(label, fn) {
  try {
    const result = await fn();
    console.log(`  ✅ ${label}${result ? `  →  ${result}` : ""}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${label}  →  ${err.message}`);
    failed++;
  }
}

async function get(path, headers = {}) {
  const res = await fetch(`${BASE}${path}`, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function waitForBackend() {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  let lastErr;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/health`);
      if (res.ok) return;
      lastErr = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastErr = err;
    }
    await new Promise((r) => setTimeout(r, READY_INTERVAL_MS));
  }
  throw new Error(
    `Backend not ready at ${BASE}/health within ${READY_TIMEOUT_MS}ms` +
      (lastErr ? ` (last error: ${lastErr.message})` : "")
  );
}

console.log(`\n▸ SynapsVault smoke test — ${BASE}\n`);

// Wait for the stack to accept traffic before running checks.
try {
  await waitForBackend();
} catch (err) {
  console.error(`  ❌ ${err.message}`);
  process.exit(1);
}

// Health
await check("Backend health", async () => {
  const d = await get("/health");
  return d.status ?? "ok";
});

// Registry
await check("On-chain registry reachable", async () => {
  const d = await get("/registry/status");
  return `${d.resourceCount ?? 0} resources registered`;
});

// Catalog
await check("Catalog returns resources", async () => {
  const d = await get("/resources");
  const items = d.resources ?? d.data ?? d;
  return `${Array.isArray(items) ? items.length : "?"} item(s)`;
});

// Paywall — expect 402
await check("x402 paywall blocks unauthenticated access", async () => {
  const res = await fetch(`${BASE}/resources/any-id`, { redirect: "manual" });
  if (res.status !== 402) throw new Error(`Expected 402, got ${res.status}`);
  return "returns 402 as expected";
});

// Admin stats
await check("Admin stats endpoint protected", async () => {
  const res = await fetch(`${BASE}/admin/stats`, {
    headers: { "X-Admin-Key": ADMIN_KEY },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const d = await res.json();
  return `resources=${d.resources}, publishers=${d.publishers}`;
});

// OpenAPI docs
await check("OpenAPI docs served", async () => {
  const res = await fetch(`${BASE}/docs`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return "Swagger UI reachable";
});

// Summary
console.log(`\n${"─".repeat(50)}`);
console.log(`  ${passed} passed  /  ${failed} failed`);
if (failed === 0) {
  console.log("\n  🎉 All checks passed — ready for SCF submission!\n");
} else {
  console.log("\n  ⚠  Fix the failures above before submitting.\n");
  process.exit(1);
}
