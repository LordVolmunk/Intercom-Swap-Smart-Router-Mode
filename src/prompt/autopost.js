function isObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

function clampInt(n, { min, max }) {
  if (!Number.isInteger(n)) throw new Error('must be an integer');
  if (typeof min === 'number' && n < min) throw new Error(`must be >= ${min}`);
  if (typeof max === 'number' && n > max) throw new Error(`must be <= ${max}`);
  return n;
}

function safeCloneArgs(args) {
  if (!isObject(args)) return {};
  try {
    return JSON.parse(JSON.stringify(args));
  } catch (_e) {
    // As a fallback, do a shallow clone. Tool executor will re-validate anyway.
    return { ...args };
  }
}

// Simple in-process scheduler for periodic postings (offer/rfq).
// Intentionally *not* a general job runner: it only supports a small allowlist
// of tools and strictly controlled argument shaping.
export class AutopostManager {
  constructor({ runTool }) {
    if (typeof runTool !== 'function') throw new Error('AutopostManager: runTool function required');
    this.runTool = runTool;
    this.jobs = new Map(); // name -> job
  }

  status({ name = '' } = {}) {
    const filter = String(name || '').trim();
    const out = [];
    for (const j of this.jobs.values()) {
      if (filter && j.name !== filter) continue;
      out.push({
        name: j.name,
        tool: j.tool,
        interval_sec: j.intervalSec,
        ttl_sec: j.ttlSec ?? null,
        args: j.args,
        runs: j.runs,
        started_at: j.startedAt,
        last_run_at: j.lastRunAt,
        last_ok: j.lastOk,
        last_error: j.lastError,
      });
    }
    // newest first
    out.sort((a, b) => (b.started_at || 0) - (a.started_at || 0));
    return { type: 'autopost_status', jobs: out };
  }

  async start({ name, tool, interval_sec, ttl_sec, args }) {
    const n = String(name || '').trim();
    if (!n) throw new Error('autopost_start: name is required');
    if (this.jobs.has(n)) throw new Error(`autopost_start: name already exists (${n})`);

    const t = String(tool || '').trim();
    const allowed = new Set(['intercomswap_offer_post', 'intercomswap_rfq_post']);
    if (!allowed.has(t)) throw new Error('autopost_start: tool not allowed');

    const intervalSec = clampInt(interval_sec, { min: 1, max: 24 * 3600 });
    const ttlSec = ttl_sec === null || ttl_sec === undefined ? null : clampInt(ttl_sec, { min: 10, max: 7 * 24 * 3600 });
    if (!ttlSec) throw new Error('autopost_start: ttl_sec is required');

    const baseArgs = safeCloneArgs(args);
    if (!isObject(baseArgs)) throw new Error('autopost_start: args must be an object');

    const job = {
      name: n,
      tool: t,
      intervalSec,
      ttlSec,
      args: baseArgs,
      runs: 0,
      startedAt: Date.now(),
      lastRunAt: null,
      lastOk: null,
      lastError: null,
      _timer: null,
      _queue: Promise.resolve(),
    };

    const runOnce = async () => {
      const nowSec = Math.floor(Date.now() / 1000);
      const runArgs = safeCloneArgs(job.args);
      if (t === 'intercomswap_offer_post') {
        // Keep offers fresh by sending ttl_sec (offer_post rejects ttl+valid_until together).
        delete runArgs.valid_until_unix;
        runArgs.ttl_sec = job.ttlSec;
      } else if (t === 'intercomswap_rfq_post') {
        runArgs.valid_until_unix = nowSec + job.ttlSec;
      }
      job.lastRunAt = Date.now();
      try {
        const res = await this.runTool({ tool: t, args: runArgs });
        job.runs += 1;
        job.lastOk = true;
        job.lastError = null;
        return res;
      } catch (err) {
        job.runs += 1;
        job.lastOk = false;
        job.lastError = err?.message ?? String(err);
        throw err;
      }
    };

    // Run once immediately to validate + publish right away.
    let first = null;
    try {
      first = await runOnce();
    } catch (_e) {
      // Keep the job running even if the first attempt failed, so operators can fix the stack
      // and the scheduler will recover. The error is surfaced via job.last_error and UI toasts.
    }

    job._timer = setInterval(() => {
      job._queue = job._queue.then(runOnce).catch(() => {});
    }, Math.max(1000, intervalSec * 1000));

    this.jobs.set(n, job);

    return {
      type: 'autopost_started',
      name: n,
      tool: t,
      interval_sec: intervalSec,
      ttl_sec: job.ttlSec,
      first: first,
    };
  }

  async stop({ name }) {
    const n = String(name || '').trim();
    if (!n) throw new Error('autopost_stop: name is required');
    const job = this.jobs.get(n);
    if (!job) return { type: 'autopost_stopped', name: n, ok: true, reason: 'not_found' };
    try {
      if (job._timer) clearInterval(job._timer);
    } catch (_e) {}
    this.jobs.delete(n);
    return { type: 'autopost_stopped', name: n, ok: true };
  }
}
