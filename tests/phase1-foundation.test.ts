import assert from "assert";
import { encryptToken, decryptToken, verifyMetaSignature } from "../lib/crypto";
import crypto from "crypto";

console.log("--- Starting Phase 1 Foundation Tests ---");

// Test 1: AES-256-GCM Token Encryption & Decryption
const secretToken = "EAAGm0PX4ZB1sBAO7...mock_facebook_page_access_token_xyz";
const encrypted = encryptToken(secretToken);
console.log("Encrypted token format:", encrypted);
assert(encrypted.includes(":"), "Encrypted token must contain IV and AuthTag delimiters");
assert.notStrictEqual(encrypted, secretToken, "Ciphertext must not equal plaintext");

const decrypted = decryptToken(encrypted);
assert.strictEqual(decrypted, secretToken, "Decrypted token must exactly match original plaintext");
console.log("✓ Test 1 Passed: AES-256-GCM encryption & decryption at rest verified.");

// Test 2: Meta Webhook HMAC-SHA256 Signature Verification
const appSecret = "meta_test_secret_key_12345";
const payload = JSON.stringify({ object: "page", entry: [{ id: "123456789", time: 1700000000 }] });
const hmac = crypto.createHmac("sha256", appSecret);
hmac.update(payload);
const validSignature = `sha256=${hmac.digest("hex")}`;

assert(verifyMetaSignature(payload, validSignature, appSecret) === true, "Valid signature must verify as true");
assert(verifyMetaSignature(payload, "sha256=invalidhash123", appSecret) === false, "Invalid signature must fail verification");
assert(verifyMetaSignature(payload, null, appSecret) === false, "Missing signature must fail verification");
console.log("✓ Test 2 Passed: Meta X-Hub-Signature-256 HMAC verification verified.");

console.log("--- All Phase 1 Tests Passed Successfully! ---");
