export function normalizeLndNetwork(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) throw new Error('Missing lightning network');

  // LND uses mainnet/testnet/regtest/signet naming.
  if (raw === 'bitcoin' || raw === 'mainnet' || raw === 'main' || raw === 'btc') return 'mainnet';
  if (raw === 'testnet' || raw === 'test') return 'testnet';
  if (raw === 'regtest' || raw === 'reg') return 'regtest';
  if (raw === 'signet') return 'signet';

  throw new Error(`Unsupported LND network: ${raw} (expected mainnet|testnet|regtest|signet)`);
}

