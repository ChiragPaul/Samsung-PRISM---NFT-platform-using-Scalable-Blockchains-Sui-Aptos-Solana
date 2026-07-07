/**
 * Tiny base58 encoder for memcmp filter bytes (discriminators). Avoids adding
 * a bs58 dependency just to encode 8 bytes for getProgramAccounts /
 * onProgramAccountChange filters.
 */
const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

export function bs58Encode(buf: Uint8Array): string {
  let intVal = 0n;
  for (const byte of buf) intVal = intVal * 256n + BigInt(byte);
  let out = '';
  while (intVal > 0n) {
    const rem = Number(intVal % 58n);
    intVal /= 58n;
    out = ALPHABET[rem] + out;
  }
  // Preserve leading zero bytes as leading '1's.
  for (const byte of buf) {
    if (byte === 0) out = ALPHABET[0] + out;
    else break;
  }
  return out;
}
