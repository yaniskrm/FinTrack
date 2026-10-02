import { z } from "zod";

// Runs in the browser before the app hydrates (Next.js `instrumentation-client`).
//
// Zod 4 probes `new Function("")` when it first builds an object schema, to
// decide whether it may JIT-compile validators. Under our strict CSP (no
// 'unsafe-eval', see lib/security/csp.ts) the probe throws — Zod catches it
// and falls back — but the browser still *reports* it as a
// `script-src blocked=eval` violation, which would make every authenticated
// page look broken in Report-Only and fail the E2E CSP sweep. `jitless`
// skips the probe entirely and uses the interpreted path (same results; the
// JIT only matters for hot server-side parsing, which this does not touch).
z.config({ jitless: true });
