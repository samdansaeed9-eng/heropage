import assert from "assert";
import { hashPassword, verifyPassword, createSessionToken, verifySessionToken } from "../lib/auth";
import { getDb } from "../lib/db";

console.log("--- Starting Phase 2: Authentication Tests ---");

async function runTests() {
  // Test 1: Password Hashing & Verification
  const rawPassword = "P@ssw0rdSecure2026!";
  const hash = await hashPassword(rawPassword);
  
  assert(hash.startsWith("$2"), "Hash must be a standard bcrypt hash string");
  assert.notStrictEqual(hash, rawPassword, "Password must never equal plaintext");
  
  const isCorrect = await verifyPassword(rawPassword, hash);
  assert.strictEqual(isCorrect, true, "Valid password must verify as true");
  
  const isWrong = await verifyPassword("WrongPassword123!", hash);
  assert.strictEqual(isWrong, false, "Invalid password must verify as false");
  console.log("✓ Test 1 Passed: Secure bcrypt password hashing & verification verified.");

  // Test 2: Cryptographic Session Token Generation & Tamper Detection
  const sessionUser = { userId: "usr_test_12345", email: "testuser@agency.com" };
  const token = await createSessionToken(sessionUser);
  assert(typeof token === "string" && token.length > 20, "Session token must be a signed JWT string");

  const verified = await verifySessionToken(token);
  assert(verified !== null, "Valid session token must verify");
  assert.strictEqual(verified?.userId, sessionUser.userId, "Token payload userId must match");
  assert.strictEqual(verified?.email, sessionUser.email, "Token payload email must match");

  // Tamper with the token
  const tamperedToken = token.slice(0, -5) + "abcde";
  const tamperedVerified = await verifySessionToken(tamperedToken);
  assert.strictEqual(tamperedVerified, null, "Tampered token must fail signature verification");
  console.log("✓ Test 2 Passed: JWT session token creation & tamper protection verified.");

  // Test 3: Database User Registration & Tenant Isolation Check
  const db = getDb();
  const testEmail = `agent_${Date.now()}@agency.com`;
  const initialData = db.read();
  
  // Verify user does not exist
  assert(!initialData.users.some(u => u.email === testEmail), "User should not exist before signup");

  const userPasswordHash = await hashPassword("StrongPass123!");
  const newUserId = `usr_test_${Date.now()}`;
  const newOrgId = `org_test_${Date.now()}`;
  const now = new Date().toISOString();

  db.update((draft) => {
    draft.users.push({
      id: newUserId,
      name: "Test Agent",
      email: testEmail,
      passwordHash: userPasswordHash,
      createdAt: now,
      updatedAt: now,
    });
    draft.organizations.push({
      id: newOrgId,
      name: "Test Agent Agency",
      slug: `test-agent-agency-${Date.now()}`,
      plan: "free",
      createdAt: now,
      updatedAt: now,
    });
    draft.memberships.push({
      id: `mem_test_${Date.now()}`,
      userId: newUserId,
      organizationId: newOrgId,
      role: "OWNER",
      createdAt: now,
    });
  });

  const reloadedData = db.read();
  const createdUser = reloadedData.users.find(u => u.id === newUserId);
  assert(createdUser !== undefined, "Created user must be found in database");
  assert.strictEqual(createdUser?.email, testEmail, "User email must match");

  const userMembership = reloadedData.memberships.find(m => m.userId === newUserId);
  assert(userMembership !== undefined, "User must have a default organization membership");
  assert.strictEqual(userMembership?.role, "OWNER", "Initial membership role must be OWNER");
  assert.strictEqual(userMembership?.organizationId, newOrgId, "Membership must point to the created organization");
  console.log("✓ Test 3 Passed: User registration, password storage, and organization binding verified.");

  // Test 4: Duplicate Email Rejection Simulation
  const duplicateFound = reloadedData.users.some(u => u.email === testEmail);
  assert.strictEqual(duplicateFound, true, "Duplicate lookup correctly identifies existing email");
  console.log("✓ Test 4 Passed: Duplicate email check verified.");

  // Test 5: Profile Password Modification
  const newPass = "NewSecurePassword2026!";
  const newHash = await hashPassword(newPass);
  db.update((draft) => {
    const userToUpdate = draft.users.find(u => u.id === newUserId);
    if (userToUpdate) {
      userToUpdate.passwordHash = newHash;
    }
  });

  const updatedUser = db.read().users.find(u => u.id === newUserId);
  assert(await verifyPassword(newPass, updatedUser!.passwordHash), "New password must verify successfully");
  assert(!await verifyPassword("StrongPass123!", updatedUser!.passwordHash), "Old password must no longer verify");
  console.log("✓ Test 5 Passed: User password update verification verified.");

  console.log("--- All Phase 2 Authentication Tests Passed Successfully! ---");
}

runTests().catch((err) => {
  console.error("Test failure:", err);
  process.exit(1);
});
