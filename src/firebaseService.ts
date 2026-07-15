import { db } from "./firebase";
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy,
  runTransaction,
  increment,
  addDoc
} from "firebase/firestore";
import bcrypt from "bcryptjs";
import { 
  EcoActivity, 
  UserProfile, 
  StockHolding, 
  DbUser, 
  RewardItem, 
  CoinTransfer 
} from "./types";

// Helper to sanitize emails for document IDs
const sanitizeEmail = (email: string) => email.trim().toLowerCase();

// -----------------------------------------------------------------------------
// Error Handling & Standardized Error Structuring
// -----------------------------------------------------------------------------

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: []
    }
  };
  console.error("Firestore Error Detailed Details:", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// -----------------------------------------------------------------------------
// Real-time Listeners
// -----------------------------------------------------------------------------

// Subscribe to specific user profile
export function subscribeToUser(email: string, callback: (dbUser: DbUser | null) => void) {
  const docRef = doc(db, "users", sanitizeEmail(email));
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback({ email: docSnap.id, ...docSnap.data() } as DbUser);
    } else {
      callback(null);
    }
  }, (error) => {
    console.error("Error subscribing to user:", error);
    handleFirestoreError(error, OperationType.GET, `users/${email}`);
  });
}

// Subscribe to all activities in system
export function subscribeToActivities(callback: (activities: EcoActivity[]) => void) {
  const collRef = collection(db, "activities");
  const q = query(collRef, orderBy("date", "desc"));
  
  return onSnapshot(q, (snapshot) => {
    const list: EcoActivity[] = [];
    snapshot.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() } as EcoActivity);
    });
    callback(list);
  }, (error) => {
    console.error("Error subscribing to activities:", error);
    // Fallback: list without order if indexing hasn't built yet
    onSnapshot(collRef, (snapshot) => {
      const list: EcoActivity[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as EcoActivity);
      });
      // Sort in memory
      list.sort((a, b) => b.date.localeCompare(a.date));
      callback(list);
    }, (fbError) => {
      handleFirestoreError(fbError, OperationType.LIST, "activities");
    });
  });
}

// Subscribe to all registered users (for admin panel)
export function subscribeToAllUsers(callback: (users: DbUser[]) => void) {
  const collRef = collection(db, "users");
  return onSnapshot(collRef, (snapshot) => {
    const list: DbUser[] = [];
    snapshot.forEach((docSnap) => {
      list.push({ email: docSnap.id, ...docSnap.data() } as DbUser);
    });
    callback(list);
  }, (error) => {
    console.error("Error subscribing to all users:", error);
    handleFirestoreError(error, OperationType.LIST, "users");
  });
}

// Subscribe to all transfers (for admin panel)
export function subscribeToAllTransfers(callback: (transfers: CoinTransfer[]) => void) {
  const collRef = collection(db, "transfers");
  return onSnapshot(collRef, (snapshot) => {
    const list: CoinTransfer[] = [];
    snapshot.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() } as CoinTransfer);
    });
    // Sort by createdAt desc in memory
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    callback(list);
  }, (error) => {
    console.error("Error subscribing to all transfers:", error);
    handleFirestoreError(error, OperationType.LIST, "transfers");
  });
}

// Default rewards to seed if none exist
const DEFAULT_REWARDS: Omit<RewardItem, "id">[] = [
  {
    title: "ทริปล่องเรือหางยาวไฟฟ้า (พังงา)",
    cost: 150,
    category: "travel",
    description: "คูปองทัวร์ท่องเที่ยวเชิงอนุรักษ์ ล่องเรือหางยาวระบบมอเตอร์ไฟฟ้าไร้มลพิษในอ่าวพังงา 1 วัน",
    image: "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=400&q=80",
    stock: 25
  },
  {
    title: "กระติกน้ำสแตนเลสเก็บความเย็นสูญญากาศ",
    cost: 60,
    category: "product",
    description: "กระบอกน้ำพกพารักษ์โลกสลักลายอันดามัน ลดการใช้ขวดพลาสติกแบบใช้ครั้งเดียวทิ้งอย่างยั่งยืน",
    image: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=400&q=80",
    stock: 40
  },
  {
    title: "ถุงผ้ามัดย้อมสีธรรมชาติจากเปลือกไม้เกาะพีพี",
    cost: 40,
    category: "souvenir",
    description: "ของที่ระลึกหัตถกรรมชุมชน ผลิตจากผ้าฝ้ายอินทรีย์ย้อมสีธรรมชาติที่เป็นมิตรต่อทะเลโดยกลุ่มแม่บ้านเกาะพีพี",
    image: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=400&q=80",
    stock: 50
  }
];

// Subscribe to reward shop inventory (seeds default items dynamically if empty)
export function subscribeToRewards(callback: (rewards: RewardItem[]) => void) {
  const collRef = collection(db, "rewards");
  return onSnapshot(collRef, async (snapshot) => {
    if (snapshot.empty) {
      console.log("Rewards inventory is empty. Seeding defaults...");
      for (const reward of DEFAULT_REWARDS) {
        await addDoc(collRef, reward);
      }
      return;
    }
    const list: RewardItem[] = [];
    snapshot.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() } as RewardItem);
    });
    callback(list);
  }, (error) => {
    console.error("Error subscribing to rewards:", error);
  });
}

// -----------------------------------------------------------------------------
// Authentication Lookups
// -----------------------------------------------------------------------------

export async function loginUser(email: string, passwordToVerify: string): Promise<UserProfile> {
  const sanitized = sanitizeEmail(email);
  const docRef = doc(db, "users", sanitized);
  const snap = await getDoc(docRef);

  if (!snap.exists()) {
    throw new Error("ไม่พบที่อยู่อีเมลนี้ในระบบสากล กรุณาคลิกสมัครสมาชิก");
  }

  const userData = snap.data();
  // Support both legacy plaintext password and secure bcrypt hashed password
  const isBcrypt = userData.password && (userData.password.startsWith("$2a$") || userData.password.startsWith("$2b$"));
  const isValid = isBcrypt
    ? bcrypt.compareSync(passwordToVerify, userData.password)
    : userData.password === passwordToVerify;

  if (!isValid) {
    throw new Error("รหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง");
  }

  return { email: snap.id, ...userData } as UserProfile;
}

export async function registerUser(
  email: string, 
  passwordToSave: string, 
  name: string, 
  role: string, 
  regionId: string, 
  selectedAvatar: string
): Promise<UserProfile> {
  const sanitized = sanitizeEmail(email);
  const docRef = doc(db, "users", sanitized);
  const snap = await getDoc(docRef);

  if (snap.exists()) {
    throw new Error("อีเมลนี้ถูกลงทะเบียนระบบไว้แล้ว กรุณาไปที่หน้าเข้าสู่ระบบ");
  }

  // Encrypt password before storing
  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync(passwordToSave, salt);

  const initialProfile = {
    name,
    password: hashedPassword,
    role,
    regionId,
    avatarUrl: selectedAvatar,
    balance: 250, // default start coins
    usdBalance: 1000,
    thbBalance: 30000,
    jpyBalance: 150000,
    gbpBalance: 800,
    eurBalance: 900,
    portfolio: {},
    sessionVersion: 1 // version tracking for global logouts
  };

  await setDoc(docRef, initialProfile);
  return { email: sanitized, ...initialProfile } as UserProfile;
}

// -----------------------------------------------------------------------------
// Mutation Operations
// -----------------------------------------------------------------------------

// Update user profile fields
export async function updateUserProfile(email: string, data: Partial<DbUser>): Promise<void> {
  const docRef = doc(db, "users", sanitizeEmail(email));
  await updateDoc(docRef, data);
}

// Update user coin balance directly (Administrative overrides)
export async function updateUserBalance(email: string, nextBalance: number): Promise<void> {
  const docRef = doc(db, "users", sanitizeEmail(email));
  await updateDoc(docRef, { balance: nextBalance });
}

// Update multiple fiat balances
export async function updateUserFiatBalances(
  email: string, 
  usdBalance?: number,
  thbBalance?: number,
  jpyBalance?: number,
  gbpBalance?: number,
  eurBalance?: number
): Promise<void> {
  const docRef = doc(db, "users", sanitizeEmail(email));
  await updateDoc(docRef, {
    usdBalance,
    thbBalance,
    jpyBalance,
    gbpBalance,
    eurBalance
  });
}

// Update user portfolio map + cash balance (for ADX Stock trades)
export async function updateUserPortfolioAndBalance(
  email: string,
  portfolio: { [symbol: string]: StockHolding },
  currency: "USD" | "THB",
  nextCashBalance: number
): Promise<void> {
  const docRef = doc(db, "users", sanitizeEmail(email));
  const fieldToUpdate = currency === "USD" ? "usdBalance" : "thbBalance";
  await updateDoc(docRef, {
    portfolio,
    [fieldToUpdate]: nextCashBalance
  });
}

// Add verified ecological activity log (also triggers credit/debit to balance real-time!)
export async function addUserActivity(
  email: string, 
  activityData: Omit<EcoActivity, "id"> & { userEmail?: string }
): Promise<void> {
  const sanitized = sanitizeEmail(email);
  const activitiesRef = collection(db, "activities");
  
  // 1. Add activity doc
  await addDoc(activitiesRef, {
    ...activityData,
    userEmail: sanitized
  });

  // 2. Atomically adjust the user's AND balance if they earned/spent AND coins in this action
  if (activityData.coinEarned !== 0) {
    const userRef = doc(db, "users", sanitized);
    await updateDoc(userRef, {
      balance: increment(activityData.coinEarned)
    });
  }
}

// Purchase and redeem products/services inside the shop (Deducts AND + updates stock)
export async function spendUserCoins(
  email: string, 
  amount: number, 
  description: string, 
  details: string
): Promise<void> {
  const sanitized = sanitizeEmail(email);
  
  // Log activity
  await addUserActivity(sanitized, {
    type: "spend",
    region: "thailand", // default fallback or fetch
    date: new Date().toISOString().split("T")[0],
    description,
    coinEarned: -amount,
    quantityDetails: details,
    status: "verified"
  });
}

// -----------------------------------------------------------------------------
// Peer-to-Peer Swift Remittance (Transfer approvals flow)
// -----------------------------------------------------------------------------

export async function createTransfer(
  senderEmail: string,
  recipientEmail: string,
  amount: number,
  currency: "AND" | "USD" | "THB" | "JPY" | "GBP" | "EUR",
  description: string
): Promise<void> {
  const senderSanitized = sanitizeEmail(senderEmail);
  const recipientSanitized = sanitizeEmail(recipientEmail);

  if (senderSanitized === recipientSanitized) {
    throw new Error("ไม่สามารถโอนเงินให้ตัวเองได้");
  }

  // Use Firestore transaction to verify sender balance and record transfer safely
  await runTransaction(db, async (transaction) => {
    const senderRef = doc(db, "users", senderSanitized);
    const senderSnap = await transaction.get(senderRef);

    if (!senderSnap.exists()) {
      throw new Error("ไม่พบข้อมูลผู้ส่งในระบบคลาวด์");
    }

    const senderData = senderSnap.data();

    // Check balances based on currency
    let field = "balance";
    if (currency === "USD") field = "usdBalance";
    else if (currency === "THB") field = "thbBalance";
    else if (currency === "JPY") field = "jpyBalance";
    else if (currency === "GBP") field = "gbpBalance";
    else if (currency === "EUR") field = "eurBalance";

    const currentBal = senderData[field] !== undefined ? senderData[field] : (currency === "AND" ? 250 : 0);

    if (currentBal < amount) {
      throw new Error(`ยอดเงิน ${currency} คงเหลือของคุณไม่เพียงพอสำหรับการโอน`);
    }

    // 1. Deduct from sender immediately (Held in safe escrow/pending transit state)
    transaction.update(senderRef, {
      [field]: currentBal - amount
    });

    // 2. Create pending transfer ledger entry
    const transfersRef = doc(collection(db, "transfers"));
    transaction.set(transfersRef, {
      senderEmail: senderSanitized,
      recipientEmail: recipientSanitized,
      amount,
      currency,
      description,
      status: "pending",
      createdAt: new Date().toISOString()
    });
  });
}

// Approve pending bank transfer (Releases funds from transit to recipient)
export async function approveTransfer(id: string): Promise<void> {
  const docRef = doc(db, "transfers", id);
  
  await runTransaction(db, async (transaction) => {
    const txSnap = await transaction.get(docRef);
    if (!txSnap.exists()) throw new Error("ไม่พบรหัสธุรกรรมการโอนที่ระบุ");

    const txData = txSnap.data();
    if (txData.status !== "pending") throw new Error("ธุรกรรมนี้ได้รับการดำเนินการแล้ว");

    const recipientRef = doc(db, "users", txData.recipientEmail);
    const recipientSnap = await transaction.get(recipientRef);

    // Check balance field to increment
    let field = "balance";
    if (txData.currency === "USD") field = "usdBalance";
    else if (txData.currency === "THB") field = "thbBalance";
    else if (txData.currency === "JPY") field = "jpyBalance";
    else if (txData.currency === "GBP") field = "gbpBalance";
    else if (txData.currency === "EUR") field = "eurBalance";

    if (!recipientSnap.exists()) {
      // If recipient doesn't exist in Firestore, create basic profile so they can receive it
      transaction.set(recipientRef, {
        name: "ผู้ใช้นอกระบบสากล",
        role: "tourist",
        regionId: "thailand",
        avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80",
        balance: txData.currency === "AND" ? txData.amount : 0,
        usdBalance: txData.currency === "USD" ? txData.amount : 0,
        thbBalance: txData.currency === "THB" ? txData.amount : 0,
        jpyBalance: txData.currency === "JPY" ? txData.amount : 0,
        gbpBalance: txData.currency === "GBP" ? txData.amount : 0,
        eurBalance: txData.currency === "EUR" ? txData.amount : 0,
        portfolio: {}
      });
    } else {
      // Recipient exists, increment their balance
      const currentRecipVal = recipientSnap.data()[field] || 0;
      transaction.update(recipientRef, {
        [field]: currentRecipVal + txData.amount
      });
    }

    // Update status to approved
    transaction.update(docRef, { status: "approved" });

    // Log credit activity for recipient
    const recipientActivityRef = doc(collection(db, "activities"));
    transaction.set(recipientActivityRef, {
      type: "refill",
      region: "thailand",
      date: new Date().toISOString().split("T")[0],
      description: `ได้รับโอนเงินสดข้ามพรมแดนจาก ${txData.senderEmail}`,
      coinEarned: txData.currency === "AND" ? txData.amount : 0,
      quantityDetails: `ยอดรับโอน: +${txData.amount} ${txData.currency}`,
      status: "verified",
      userEmail: txData.recipientEmail
    });
  });
}

// Reject pending bank transfer (Returns held escrow funds back to sender)
export async function rejectTransfer(id: string): Promise<void> {
  const docRef = doc(db, "transfers", id);

  await runTransaction(db, async (transaction) => {
    const txSnap = await transaction.get(docRef);
    if (!txSnap.exists()) throw new Error("ไม่พบรหัสธุรกรรมการโอนที่ระบุ");

    const txData = txSnap.data();
    if (txData.status !== "pending") throw new Error("ธุรกรรมนี้ได้รับการดำเนินการแล้ว");

    const senderRef = doc(db, "users", txData.senderEmail);
    const senderSnap = await transaction.get(senderRef);

    let field = "balance";
    if (txData.currency === "USD") field = "usdBalance";
    else if (txData.currency === "THB") field = "thbBalance";
    else if (txData.currency === "JPY") field = "jpyBalance";
    else if (txData.currency === "GBP") field = "gbpBalance";
    else if (txData.currency === "EUR") field = "eurBalance";

    if (senderSnap.exists()) {
      const senderVal = senderSnap.data()[field] || 0;
      transaction.update(senderRef, {
        [field]: senderVal + txData.amount
      });
    }

    // Update status to rejected
    transaction.update(docRef, { status: "rejected" });
  });
}

// -----------------------------------------------------------------------------
// Rewards Store Management
// -----------------------------------------------------------------------------

export async function addRewardItem(reward: Omit<RewardItem, "id">): Promise<void> {
  const collRef = collection(db, "rewards");
  await addDoc(collRef, reward);
}

export async function updateRewardItem(id: string, reward: Partial<RewardItem>): Promise<void> {
  const docRef = doc(db, "rewards", id);
  await updateDoc(docRef, reward);
}

export async function deleteRewardItem(id: string): Promise<void> {
  const docRef = doc(db, "rewards", id);
  await deleteDoc(docRef);
}

export type { DbUser, CoinTransfer };
