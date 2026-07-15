# Security Specification: AI Insurance Advisor

This security specification details the access control constraints and data validation rules for the AI Insurance Advisor's persistent collections in Firestore: `profiles`, `quotations`, and `leads`.

## 1. Data Invariants

1. **User Profiles (`profiles/{email}`)**:
   - A user profile must belong to the email that represents the document key.
   - Profile names must be non-empty strings of maximum length 100.
   - Users cannot update or tamper with other users' profiles.

2. **Insurance Quotations (`quotations/{quotationId}`)**:
   - A quotation must have a unique ID matching the document ID.
   - It must specify a valid `insuranceType` belonging to the supported types: `car`, `health`, `accident`, `travel`, `home`, `life`, `business`.
   - `coverageAmount` and `premiumAmount` must be positive integers or floats.
   - `userEmail` must match the authenticated owner's email.
   - Quotations are immutable after creation.

3. **Contact Leads (`leads/{leadId}`)**:
   - Leads represent human broker callbacks.
   - A lead must have a valid `name` (max 100 chars), a valid `phone` (max 20 chars), and a valid `insuranceType`.
   - The default `status` for new leads is `pending`. Users can only create leads; they cannot update or delete existing leads to prevent malicious modification of broker records.
   - Lead documents cannot be publicly listed or queried by arbitrary users. Only the creator (by email matching) or authorized administrators can view them.

---

## 2. The "Dirty Dozen" Malicious Payloads

The following payloads attempt to bypass identity, integrity, or temporal protections. Our Firestore rules must reject all of them:

### Profile Spoofing
1. **Payload 1: Identity Hijacking** - Attempting to write a profile document under `profiles/victim@example.com` while authenticated as `hacker@example.com`.
2. **Payload 2: Name Overrun** - Attempting to create a profile with a `displayName` exceeding 100 characters (e.g., a 1KB random string) to degrade UI rendering.
3. **Payload 3: Malicious Injection** - Attempting to insert a script tag in the `lineId` field (e.g., `<script>XSS</script>`).

### Quotation Tampering
4. **Payload 4: Fraudulent Premium** - Attempting to save a high-coverage quotation (`coverageAmount = 10000000`) with a zero or negative premium (`premiumAmount = 0` or `-100`).
5. **Payload 5: Invalid Insurance Type** - Creating a quotation for a non-existent insurance type `space_travel`.
6. **Payload 6: Ownership Theft** - Attempting to save a quotation for `victim@example.com` while signed in as `hacker@example.com`.
7. **Payload 7: State Update Gap (Immutability Bypass)** - Attempting to change the `premiumAmount` of an existing quotation from `4,500 THB` to `500 THB`.
8. **Payload 8: Temporal Deception** - Attempting to backdate the `createdAt` timestamp to a year ago rather than using the server-asserted `request.time`.

### Lead Poisoning & Scraping
9. **Payload 9: Broker Queue Poisoning** - Creating a lead with an extremely long name (e.g., 50KB string) to crash or freeze the agent dashboard.
10. **Payload 10: Privilege Escalation** - Attempting to transition a lead status directly to `completed` upon submission.
11. **Payload 11: Queue Scraping** - An authenticated user attempting to list (`allow list`) all records in the `/leads/` collection to collect phone numbers of other customers.
12. **Payload 12: Lead Deletion (Evidence Destruction)** - A user attempting to delete a lead callback request after submission to disrupt brokerage logs.

---

## 3. Security Rules Test Suite (`firestore.rules.test.ts`)

```typescript
import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs } from "firebase/firestore";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "ai-studio-insurance-advisor",
    firestore: {
      rules: `
        rules_version = '2';
        service cloud.firestore {
          match /databases/{database}/documents {
            // Include compiled rules here
          }
        }
      `,
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe("UserProfile Security", () => {
  it("rejects profile creation for another user (Payload 1)", async () => {
    const hackerDb = testEnv.authenticatedContext("hacker_uid", { email: "hacker@example.com" }).firestore();
    const ref = doc(hackerDb, "profiles", "victim@example.com");
    await assertFails(setDoc(ref, {
      email: "victim@example.com",
      displayName: "Victim",
      createdAt: new Date().toISOString()
    }));
  });

  it("rejects profile with display name exceeding 100 chars (Payload 2)", async () => {
    const userDb = testEnv.authenticatedContext("user_uid", { email: "user@example.com" }).firestore();
    const ref = doc(userDb, "profiles", "user@example.com");
    await assertFails(setDoc(ref, {
      email: "user@example.com",
      displayName: "A".repeat(101),
      createdAt: new Date().toISOString()
    }));
  });
});

describe("Quotation Security", () => {
  it("rejects fraudulent premium (Payload 4)", async () => {
    const userDb = testEnv.authenticatedContext("user_uid", { email: "user@example.com" }).firestore();
    const ref = doc(userDb, "quotations", "quote_1");
    await assertFails(setDoc(ref, {
      id: "quote_1",
      userEmail: "user@example.com",
      customerName: "John",
      insuranceType: "car",
      coverageAmount: 1000000,
      premiumAmount: -500,
      createdAt: new Date().toISOString()
    }));
  });

  it("rejects invalid insurance type (Payload 5)", async () => {
    const userDb = testEnv.authenticatedContext("user_uid", { email: "user@example.com" }).firestore();
    const ref = doc(userDb, "quotations", "quote_2");
    await assertFails(setDoc(ref, {
      id: "quote_2",
      userEmail: "user@example.com",
      customerName: "John",
      insuranceType: "space_travel",
      coverageAmount: 1000000,
      premiumAmount: 5000,
      createdAt: new Date().toISOString()
    }));
  });

  it("rejects ownership theft (Payload 6)", async () => {
    const hackerDb = testEnv.authenticatedContext("hacker_uid", { email: "hacker@example.com" }).firestore();
    const ref = doc(hackerDb, "quotations", "quote_3");
    await assertFails(setDoc(ref, {
      id: "quote_3",
      userEmail: "victim@example.com",
      customerName: "Victim",
      insuranceType: "car",
      coverageAmount: 1000000,
      premiumAmount: 5000,
      createdAt: new Date().toISOString()
    }));
  });
});

describe("Leads Security", () => {
  it("rejects general queue listing to prevent scraping (Payload 11)", async () => {
    const userDb = testEnv.authenticatedContext("user_uid", { email: "user@example.com" }).firestore();
    const ref = collection(userDb, "leads");
    await assertFails(getDocs(ref));
  });

  it("rejects lead deletion (Payload 12)", async () => {
    const userDb = testEnv.authenticatedContext("user_uid", { email: "user@example.com" }).firestore();
    const ref = doc(userDb, "leads", "lead_1");
    await assertFails(deleteDoc(ref));
  });
});
```
