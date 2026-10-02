const ENC = new TextEncoder();
const DEC = new TextDecoder();
const PBKDF2_ITERATIONS = 600000;
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const SALT_LENGTH = 16;

export async function sha256hex(str) {
  const buf = await crypto.subtle.digest("SHA-256", ENC.encode(str));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function deriveKey(passphrase, salt) {
  const baseKey = await crypto.subtle.importKey("raw", ENC.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encrypt(plaintext, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveKey(passphrase, salt);
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, ENC.encode(plaintext));
  return {
    v: 1,
    salt: Array.from(salt).map((b) => b.toString(16).padStart(2, "0")).join(""),
    iv: Array.from(iv).map((b) => b.toString(16).padStart(2, "0")).join(""),
    data: btoa(String.fromCharCode(...new Uint8Array(data))),
  };
}

export async function decrypt(cipherObj, passphrase) {
  if (!cipherObj || cipherObj.v !== 1) throw new Error("BAD_FORMAT");
  const salt = new Uint8Array(cipherObj.salt.match(/.{2}/g).map((b) => parseInt(b, 16)));
  const iv = new Uint8Array(cipherObj.iv.match(/.{2}/g).map((b) => parseInt(b, 16)));
  const data = new Uint8Array(atob(cipherObj.data).split("").map((c) => c.charCodeAt(0)));
  const key = await deriveKey(passphrase, salt);
  try {
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
    return DEC.decode(plain);
  } catch (err) {
    throw new Error("BAD_PASSPHRASE");
  }
}

export function randomId() {
  return crypto.randomUUID();
}

export function hexToBytes(hex) {
  return new Uint8Array(hex.match(/.{2}/g).map((b) => parseInt(b, 16)));
}

export function bytesToHex(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}