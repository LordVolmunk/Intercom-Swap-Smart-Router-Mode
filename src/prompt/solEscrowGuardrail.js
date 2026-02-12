const ESCROW_STATE_V3_SPACE = 263;
const SPL_TOKEN_ACCOUNT_SPACE = 165;
const SOL_ESCROW_INIT_MARGIN_LAMPORTS = 25_000;

function toSafeLamports(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.trunc(n);
}

export function parseFeeLamports(feeResult) {
  if (typeof feeResult === 'number') return toSafeLamports(feeResult);
  if (!feeResult || typeof feeResult !== 'object') return null;
  if (typeof feeResult.value === 'number') return toSafeLamports(feeResult.value);
  if (feeResult.value && typeof feeResult.value === 'object' && typeof feeResult.value.feeCalculator?.lamportsPerSignature === 'number') {
    return toSafeLamports(feeResult.value.feeCalculator.lamportsPerSignature);
  }
  return null;
}

export function parseInsufficientLamports(input) {
  const re = /insufficient lamports\s+([0-9]+)\s*,\s*need\s+([0-9]+)/i;
  const tryParse = (raw) => {
    const s = String(raw || '');
    const m = s.match(re);
    if (!m) return null;
    const have = Number.parseInt(m[1], 10);
    const need = Number.parseInt(m[2], 10);
    if (!Number.isFinite(have) || !Number.isFinite(need)) return null;
    if (have < 0 || need < 0) return null;
    return {
      have_lamports: have,
      need_lamports: need,
      shortfall_lamports: Math.max(0, need - have),
    };
  };

  if (Array.isArray(input)) {
    for (const row of input) {
      const parsed = tryParse(row);
      if (parsed) return parsed;
    }
    return null;
  }
  return tryParse(input);
}

export function computeEscrowInitLamportsGuardrail({
  payerLamports = 0,
  feeLamports = 0,
  escrowRentLamports = 0,
  tokenAccountRentLamports = 0,
  hasEscrowAccount = false,
  hasVaultAccount = false,
  hasPlatformFeeVaultAccount = false,
  hasTradeFeeVaultAccount = false,
  marginLamports = SOL_ESCROW_INIT_MARGIN_LAMPORTS,
} = {}) {
  const have = toSafeLamports(payerLamports);
  const fee = toSafeLamports(feeLamports);
  const escrowRent = toSafeLamports(escrowRentLamports);
  const tokenRent = toSafeLamports(tokenAccountRentLamports);
  const margin = toSafeLamports(marginLamports);
  const missing_accounts = [];

  let required = fee + margin;
  if (!hasEscrowAccount) {
    required += escrowRent;
    missing_accounts.push('escrow_pda');
  }
  if (!hasVaultAccount) {
    required += tokenRent;
    missing_accounts.push('vault_ata');
  }
  if (!hasPlatformFeeVaultAccount) {
    required += tokenRent;
    missing_accounts.push('platform_fee_vault_ata');
  }
  if (!hasTradeFeeVaultAccount) {
    required += tokenRent;
    missing_accounts.push('trade_fee_vault_ata');
  }

  return {
    ok: have >= required,
    have_lamports: have,
    need_lamports: required,
    shortfall_lamports: Math.max(0, required - have),
    fee_lamports: fee,
    escrow_rent_lamports: escrowRent,
    token_account_rent_lamports: tokenRent,
    margin_lamports: margin,
    missing_accounts,
  };
}

export const SOL_ESCROW_GUARDRAIL_CONSTANTS = {
  ESCROW_STATE_V3_SPACE,
  SPL_TOKEN_ACCOUNT_SPACE,
  SOL_ESCROW_INIT_MARGIN_LAMPORTS,
};

