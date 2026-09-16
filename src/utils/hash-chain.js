// Hash-chaining logic for tamper-evident attendance records.
//
// The idea: each attendance record includes a hash of the previous record's
// content. If anyone tries to silently edit an old record after the fact,
// its hash changes — which no longer matches what the *next* record expected
// as its "previous hash," breaking the chain. Anyone auditing the log can
// detect tampering just by re-computing the hashes and checking they still
// link up. This mirrors chain-of-custody principles in digital forensics.
//
// Uses the browser's built-in Web Crypto API (SubtleCrypto) — no external
// crypto library needed.

/** Computes a SHA-256 hash of a string, returned as a hex string. */
export async function sha256Hex(input) {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Computes the hash for a new attendance record, chained to the previous one.
 * Every field that matters for integrity is included in the hash input —
 * if any of these were changed after the fact, the hash would no longer match.
 */
export async function computeRecordHash({
  prevHash,
  userId,
  sessionId,
  timestampMillis,
  withinGeofence,
}) {
  const payload = [prevHash, userId, sessionId, timestampMillis, withinGeofence].join("|");
  return sha256Hex(payload);
}

/** The starting point of a team's chain, before any records exist. */
export const GENESIS_HASH = "GENESIS";
