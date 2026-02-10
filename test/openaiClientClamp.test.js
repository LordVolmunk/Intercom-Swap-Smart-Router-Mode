import test from 'node:test';
import assert from 'node:assert/strict';

import { OpenAICompatibleClient } from '../src/prompt/openaiClient.js';

test('OpenAICompatibleClient clamps max_tokens on backend budget error and retries once', async () => {
  const calls = [];
  const fetchImpl = async (_url, init) => {
    const body = JSON.parse(String(init?.body || '{}'));
    calls.push(body);

    // First call: reject with token budget error.
    if (calls.length === 1) {
      const msg =
        "'max_tokens' or 'max_completion_tokens' is too large: 8000. This model's maximum context length is 32768 tokens and your request has 25060 input tokens (8000 > 32768 - 25060).";
      return {
        ok: false,
        status: 400,
        headers: new Map([['content-type', 'application/json']]),
        text: async () => JSON.stringify({ error: { message: msg } }),
      };
    }

    // Second call: succeed.
    return {
      ok: true,
      status: 200,
      headers: new Map([['content-type', 'application/json']]),
      text: async () =>
        JSON.stringify({
          choices: [{ message: { role: 'assistant', content: 'ok' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        }),
    };
  };

  const c = new OpenAICompatibleClient({
    baseUrl: 'http://example.invalid/v1',
    apiKey: '',
    defaultModel: 'm',
    fetchImpl,
  });

  const out = await c.chatCompletions({
    model: 'm',
    messages: [{ role: 'user', content: 'hi' }],
    tools: [],
    maxTokens: 8000,
  });
  assert.equal(out.content, 'ok');
  assert.equal(calls.length, 2);
  assert.equal(calls[0].max_tokens, 8000);
  // remaining = 32768 - 25060 = 7708; clamp = remaining - 256 = 7452
  assert.equal(calls[1].max_tokens, 7452);
});

