import test from 'node:test';
import assert from 'node:assert/strict';

import { AutopostManager } from '../src/prompt/autopost.js';

test('AutopostManager starts, runs immediately, repeats, and stops', async () => {
  let calls = 0;
  const mgr = new AutopostManager({
    runTool: async ({ tool, args }) => {
      calls += 1;
      return { type: 'ok', tool, args };
    },
  });

  const started = await mgr.start({
    name: 'job1',
    tool: 'intercomswap_rfq_post',
    interval_sec: 1,
    ttl_sec: 60,
    args: { channel: 'c', trade_id: 'rfq-1', btc_sats: 1, usdt_amount: '1' },
  });
  assert.equal(started.type, 'autopost_started');
  assert.equal(calls, 1, 'runs once immediately');

  // Wait for at least one interval tick.
  await new Promise((r) => setTimeout(r, 1100));
  assert.ok(calls >= 2, `expected at least 2 calls, got ${calls}`);

  const stopped = await mgr.stop({ name: 'job1' });
  assert.equal(stopped.type, 'autopost_stopped');

  const afterStop = calls;
  await new Promise((r) => setTimeout(r, 1200));
  assert.equal(calls, afterStop, 'no further calls after stop');
});

