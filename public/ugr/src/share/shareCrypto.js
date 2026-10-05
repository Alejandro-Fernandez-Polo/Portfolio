import { deriveKey } from "../backup/crypto.js";

const ENC = new TextEncoder();
const DEC = new TextDecoder();
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const FORMAT_VERSION = "v1";

function bytesToB64url(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlToBytes(value) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("BAD_FORMAT");
  const b64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(padded);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export function parseFragment(hash) {
  const raw = typeof hash === "string" && hash.startsWith("#") ? hash.slice(1) : hash;
  if (typeof raw !== "string" || !raw.startsWith("data=")) return null;
  const parts = raw.slice("data=".length).split(".");
  if (parts.length !== 4) return null;
  const [version, saltPart, ivPart, ctPart] = parts;
  if (version !== FORMAT_VERSION) return null;
  try {
    const salt = b64urlToBytes(saltPart);
    const iv = b64urlToBytes(ivPart);
    const data = b64urlToBytes(ctPart);
    if (salt.length !== SALT_LENGTH || iv.length !== IV_LENGTH || data.length < 17) return null;
    return { version, salt, iv, data };
  } catch (e) {
    return null;
  }
}

export async function encryptToFragment(plaintext, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveKey(passphrase, salt);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, ENC.encode(plaintext));
  return `${FORMAT_VERSION}.${bytesToB64url(salt)}.${bytesToB64url(iv)}.` +
    bytesToB64url(new Uint8Array(encrypted));
}

export async function decryptFromFragment(fragment, passphrase) {
  const parsed = parseFragment(fragment);
  if (!parsed) throw new Error("BAD_FORMAT");
  const key = await deriveKey(passphrase, parsed.salt);
  let plain;
  try {
    plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: parsed.iv }, key, parsed.data);
  } catch (e) {
    throw new Error("BAD_PASSPHRASE");
  }
  return DEC.decode(plain);
}

if (typeof window !== "undefined") {
  window.__ugrShareCrypto = { encryptToFragment, decryptFromFragment, parseFragment };
}
