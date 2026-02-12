import test from 'node:test';
import assert from 'node:assert/strict';

import {
  computeEscrowInitLamportsGuardrail,
  parseFeeLamports,
  parseInsufficientLamports,
} from '../src/prompt/solEscrowGuardrail.js';

test('sol escrow guardrail: parses insufficient lamports log line', () => {
  const parsed = parseInsufficientLamports([
    'Program 11111111111111111111111111111111 invoke [2]',
    'Transfer: insufficient lamports 1943865, need 2721360',
  ]);
  assert.deepEqual(parsed, {
    have_lamports: 1943865,
    need_lamports: 2721360,
    shortfall_lamports: 777495,
  });
});

test('sol escrow guardrail: computes required lamports from missing accounts', () => {
  const out = computeEscrowInitLamportsGuardrail({
    payerLamports: 1943865,
    feeLamports: 5000,
    escrowRentLamports: 677080,
    tokenAccountRentLamports: 2039280,
    hasEscrowAccount: false,
    hasVaultAccount: true,
    hasPlatformFeeVaultAccount: true,
    hasTradeFeeVaultAccount: false,
    marginLamports: 0,
  });
  assert.equal(out.ok, false);
  assert.equal(out.need_lamports, 2721360);
  assert.equal(out.have_lamports, 1943865);
  assert.equal(out.shortfall_lamports, 777495);
  assert.deepEqual(out.missing_accounts, ['escrow_pda', 'trade_fee_vault_ata']);
});

test('sol escrow guardrail: parses fee lamports from rpc response shape', () => {
  assert.equal(parseFeeLamports(5000), 5000);
  assert.equal(parseFeeLamports({ value: 7000 }), 7000);
});

