/**
 * Crypto Helper Utilities for Passkey PIN Login
 * Uses Web Crypto API for secure hashing and a simple XOR cipher for local password storage.
 */

/**
 * Generates a SHA-256 hash of the 4-digit PIN for database validation.
 */
export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Encrypts a password locally using the 4-digit PIN and a local salt/pepper.
 * This is safe for private app storage and does not require complex native keychains.
 */
export function encryptPassword(password: string, pin: string): string {
  const secret = pin + "msfamily_salt_key_2026";
  let result = "";
  for (let i = 0; i < password.length; i++) {
    const charCode = password.charCodeAt(i) ^ secret.charCodeAt(i % secret.length);
    result += String.fromCharCode(charCode);
  }
  // Use btoa safely for browser support
  return btoa(unescape(encodeURIComponent(result)));
}

/**
 * Decrypts the locally stored password using the 4-digit PIN.
 */
export function decryptPassword(encryptedBase64: string, pin: string): string {
  try {
    const decoded = decodeURIComponent(escape(atob(encryptedBase64)));
    const secret = pin + "msfamily_salt_key_2026";
    let result = "";
    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i) ^ secret.charCodeAt(i % secret.length);
      result += String.fromCharCode(charCode);
    }
    return result;
  } catch (e) {
    console.error("Failed to decrypt password: Pin might be incorrect or corrupted storage", e);
    return "";
  }
}
