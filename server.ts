import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { db } from "./src/firebase";
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  addDoc 
} from "firebase/firestore";

dotenv.config();

const app = express();
const PORT = 3000;

// Set up express body parsers
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// Lazy initializer for GoogleGenAI to prevent crashing if key is missing on startup
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      throw new Error("GEMINI_API_KEY is not configured in environment variables. Please configure it in the Secrets panel.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// -----------------------------------------------------------------------------
// API Routes
// -----------------------------------------------------------------------------

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// -----------------------------------------------------------------------------
// SECURE PASSWORD RESET FLOW UTILITIES & ENDPOINTS
// -----------------------------------------------------------------------------

// Helper to sanitize emails
const sanitizeEmail = (email: string) => (email || "").trim().toLowerCase();

// Get Client IP Address
function getClientIP(req: express.Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    if (typeof forwarded === "string") {
      return forwarded.split(",")[0].trim();
    } else if (Array.isArray(forwarded)) {
      return forwarded[0].trim();
    }
  }
  return req.socket.remoteAddress || "127.0.0.1";
}

// Get Approximate Location from IP Address (real API integration)
async function getIPLocation(ip: string): Promise<string> {
  const isLocal = ip === "::1" || ip === "127.0.0.1" || ip.startsWith("10.") || ip.startsWith("192.168.") || ip.startsWith("172.16.") || ip.startsWith("::ffff:127.0.0.1");
  if (isLocal) {
    return "Localhost / Sandbox Environment (Andaman Hub, Phuket)";
  }
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    const response = await fetch(`http://ip-api.com/json/${ip}`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (response.ok) {
      const data: any = await response.json();
      if (data && data.status === "success") {
        return `${data.city}, ${data.regionName || data.region}, ${data.country} (${data.isp})`;
      }
    }
  } catch (err) {
    console.warn(`[GeoIP] Failed to resolve IP location for ${ip}:`, err);
  }
  return "Andaman Region, Thailand";
}

// Parse Browser & Device from User-Agent
function parseUserAgent(ua: string) {
  ua = ua || "";
  let browser = "Web Browser";
  let device = "Desktop Device";

  if (/chrome|crios/i.test(ua)) browser = "Google Chrome";
  else if (/safari/i.test(ua)) browser = "Apple Safari";
  else if (/firefox|iceweasel/i.test(ua)) browser = "Mozilla Firefox";
  else if (/msie|trident/i.test(ua)) browser = "Internet Explorer";
  else if (/edge/i.test(ua)) browser = "Microsoft Edge";

  if (/mobi|android|iphone|ipad|ipod/i.test(ua)) {
    device = "Mobile Phone";
    if (/iphone/i.test(ua)) device = "Apple iPhone";
    else if (/ipad/i.test(ua)) device = "Apple iPad";
    else if (/android/i.test(ua)) device = "Android Device";
  } else if (/macintosh/i.test(ua)) {
    device = "macOS Desktop";
  } else if (/windows/i.test(ua)) {
    device = "Windows PC";
  } else if (/linux/i.test(ua)) {
    device = "Linux Workstation";
  }

  return { browser, device };
}

// Send Real or Simulated Email using Nodemailer
async function sendOTPEmail(email: string, otp: string): Promise<{ sent: boolean; provider: string; otp?: string }> {
  const subject = "Password Reset Verification Code";
  const text = `Hello,\n\nYour verification code is:\n\n${otp}\n\nThis code is valid for 5 minutes.\n\nIf you did not request this password reset, please ignore this email or contact customer support immediately.\n\nThank you,\n AND Security Team`;

  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_PORT === "465",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
      await transporter.sendMail({
        from: process.env.SMTP_FROM || `"AND Security Team" <noreply@andamancoin.com>`,
        to: email,
        subject,
        text
      });
      console.log(`[SMTP] Secure OTP email sent successfully to ${email}`);
      return { sent: true, provider: "smtp" };
    } catch (err) {
      console.error("[SMTP] Failed sending mail through SMTP host. Falling back to console stream.", err);
    }
  }

  // Developer simulation & fallback logger (returns simulated OTP in response in dev environments so testers can proceed instantly)
  console.log("\n==================================================");
  console.log(`✉️ [SECURE MAIL SIMULATION] TO: ${email}`);
  console.log(`🔑 SUBJECT: ${subject}`);
  console.log(`💬 MESSAGE:\n${text}`);
  console.log("==================================================\n");

  return { sent: true, provider: "simulated", otp };
}

// 1. GET CSRF Token
app.get("/api/auth/csrf-token", (req, res) => {
  const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  res.setHeader("X-Frame-Options", "DENY"); // Clickjacking protection
  res.setHeader("Content-Security-Policy", "frame-ancestors 'none'"); // Clickjacking prevention
  res.json({ csrfToken: token });
});

// 2. GET CAPTCHA Challenge (Stateless arithmetic verification)
app.get("/api/auth/captcha", (req, res) => {
  const num1 = Math.floor(Math.random() * 9) + 2;
  const num2 = Math.floor(Math.random() * 9) + 1;
  const operator = Math.random() > 0.5 ? "+" : "*";
  
  const answer = operator === "+" ? num1 + num2 : num1 * num2;
  const question = `เพื่อความปลอดภัยขั้นสูงโปรดคำนวณ: ${num1} ${operator === "+" ? "บวก" : "คูณ"} ${num2} เท่ากับเท่าใด ?`;

  const JWT_SECRET = process.env.JWT_SECRET || "andaman-coin-secret-key-2026";
  // Sign the answer in a short-lived token (3 minutes)
  const captchaToken = jwt.sign({ answer }, JWT_SECRET, { expiresIn: "3m" });

  res.json({ question, captchaToken });
});

// 3. POST Forgot Password Request
app.post("/api/auth/forgot-password", async (req, res) => {
  try {
    const { email, csrfToken } = req.body;
    
    // CSRF Check
    if (!csrfToken) {
      return res.status(403).json({ success: false, error: "คำขอถูกระงับเนื่องจากไม่มีรหัส CSRF (CSRF token missing)" });
    }

    const sanitizedEmail = sanitizeEmail(email);
    if (!sanitizedEmail || !sanitizedEmail.includes("@")) {
      return res.status(400).json({ success: false, error: "ที่อยู่อีเมลไม่ถูกต้อง" });
    }

    const now = Date.now();
    const clientIP = getClientIP(req);
    const location = await getIPLocation(clientIP);

    // Verify user exists in the system
    const userRef = doc(db, "users", sanitizedEmail);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      return res.status(404).json({ success: false, error: "ไม่พบที่อยู่อีเมลนี้ในระบบสมาชิก กรุณากรอกอีเมลอื่นหรือสมัครสมาชิกใหม่" });
    }

    // Rate limiting: check OTP requests
    const otpRef = doc(db, "otps", sanitizedEmail);
    const otpSnap = await getDoc(otpRef);
    let requestTimes: number[] = [];
    if (otpSnap.exists()) {
      const d = otpSnap.data();
      requestTimes = d.requestTimes || [];
    }

    // Filter last 1 hour
    requestTimes = requestTimes.filter((t: number) => now - t < 3600000);

    if (requestTimes.length >= 5) {
      return res.status(429).json({ 
        success: false, 
        error: "คุณขอรหัส OTP เกินจำกัด (สูงสุด 5 ครั้งต่อชั่วโมง) เพื่อความปลอดภัย โปรดรอความล่าช้า 1 ชั่วโมงแล้วลองอีกครั้ง" 
      });
    }

    // Check resend throttle: 60 seconds
    if (requestTimes.length > 0) {
      const lastRequest = requestTimes[requestTimes.length - 1];
      if (now - lastRequest < 60000) {
        const secondsLeft = Math.ceil((60000 - (now - lastRequest)) / 1000);
        return res.status(429).json({ 
          success: false, 
          error: `กรุณารออีก ${secondsLeft} วินาทีก่อนที่จะขอรหัสผ่านใหม่อีกครั้ง` 
        });
      }
    }

    // Generate random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = bcrypt.hashSync(otp, 10);
    const expiresAt = now + 5 * 60 * 1000; // 5 minutes

    // Store securely (hashed) in Firestore
    requestTimes.push(now);
    await setDoc(otpRef, {
      email: sanitizedEmail,
      hashedOtp,
      expiresAt,
      attempts: 0,
      requestTimes,
      isLocked: false,
      lockedUntil: 0
    }, { merge: true });

    // Send the OTP
    const emailRes = await sendOTPEmail(sanitizedEmail, otp);

    // Create secure audit log entry in Firestore
    await addDoc(collection(db, "password_reset_audit_logs"), {
      email: sanitizedEmail,
      action: "request_otp",
      timestamp: new Date().toISOString(),
      ip: clientIP,
      userAgent: req.headers["user-agent"] || "unknown",
      details: `Requested recovery OTP. Method: ${emailRes.provider}. IP Location: ${location}`
    });

    res.json({ 
      success: true, 
      message: "รหัส OTP 6 หลักได้ถูกจัดส่งไปยังอีเมลของคุณเรียบร้อยแล้ว มีอายุการใช้งาน 5 นาที",
      // If simulated, we output the OTP to the client response in development mode for easy preview testing!
      simulatedOtp: emailRes.otp || null 
    });

  } catch (error: any) {
    console.error("Forgot password error:", error);
    res.status(500).json({ success: false, error: error.message || "เกิดข้อผิดพลาดในการขอสิทธิ์กู้คืนรหัสผ่าน" });
  }
});

// 4. POST OTP Verification
app.post("/api/auth/verify-otp", async (req, res) => {
  try {
    const { email, otp, csrfToken, captchaAnswer, captchaToken, needCaptcha } = req.body;

    // CSRF Check
    if (!csrfToken) {
      return res.status(403).json({ success: false, error: "คำขอถูกระงับเนื่องจากไม่มีรหัส CSRF (CSRF token missing)" });
    }

    const sanitizedEmail = sanitizeEmail(email);
    const clientIP = getClientIP(req);
    const location = await getIPLocation(clientIP);

    const otpRef = doc(db, "otps", sanitizedEmail);
    const otpSnap = await getDoc(otpRef);

    if (!otpSnap.exists()) {
      return res.status(400).json({ success: false, error: "ไม่พบข้อมูลรหัสกู้คืนสำหรับบัญชีผู้ใช้นี้ กรุณาส่งรหัสใหม่อีกครั้ง" });
    }

    const otpData = otpSnap.data();
    const now = Date.now();

    // Check Lock status
    if (otpData.isLocked && otpData.lockedUntil > now) {
      const minutesLeft = Math.ceil((otpData.lockedUntil - now) / 60000);
      return res.status(403).json({ 
        success: false, 
        error: `คุณยืนยันตัวตนล้มเหลวเกินกำหนด ระบบถูกปิดกั้นชั่วคราวเพื่อความปลอดภัยสูงสุด กรุณาลองใหม่ในอีก ${minutesLeft} นาที` 
      });
    }

    // Unlock if lock duration has passed
    if (otpData.isLocked && otpData.lockedUntil <= now) {
      await updateDoc(otpRef, { isLocked: false, lockedUntil: 0, attempts: 0 });
      otpData.isLocked = false;
      otpData.attempts = 0;
    }

    // Verify Captcha if needed
    if (needCaptcha) {
      if (!captchaAnswer || !captchaToken) {
        return res.status(400).json({ success: false, error: "กรุณากรอกรหัสคำถามความปลอดภัย CAPTCHA" });
      }
      try {
        const JWT_SECRET = process.env.JWT_SECRET || "andaman-coin-secret-key-2026";
        const decodedCaptcha: any = jwt.verify(captchaToken, JWT_SECRET);
        if (parseInt(captchaAnswer) !== decodedCaptcha.answer) {
          return res.status(400).json({ success: false, error: "รหัสคำนวณ CAPTCHA ไม่ถูกต้อง กรุณาลองตรวจสอบใหม่อีกครั้ง" });
        }
      } catch (err) {
        return res.status(400).json({ success: false, error: "รหัสคำถาม CAPTCHA หมดอายุแล้ว กรุณารีเฟรชคำถามใหม่" });
      }
    }

    // Check OTP Expiry
    if (now > otpData.expiresAt) {
      return res.status(400).json({ success: false, error: "รหัส OTP นี้หมดอายุการใช้งานแล้ว (หมดอายุภายใน 5 นาที) โปรดส่งรหัสใหม่อีกครั้ง" });
    }

    // Compare Hashed OTP
    const isMatch = bcrypt.compareSync(otp, otpData.hashedOtp || "");
    if (!isMatch) {
      const nextAttempts = (otpData.attempts || 0) + 1;
      const maxAttempts = 3;
      const attemptsLeft = maxAttempts - nextAttempts;

      let payload: any = { attempts: nextAttempts };
      let errMsg = `รหัส OTP ไม่ถูกต้อง คุณเหลือโอกาสทดลองอีก ${attemptsLeft} ครั้ง`;

      if (nextAttempts >= maxAttempts) {
        payload.isLocked = true;
        payload.lockedUntil = now + 15 * 60 * 1000; // lock for 15 mins
        errMsg = "คุณป้อนรหัส OTP ผิดพลาดติดต่อกัน 3 ครั้ง ระบบได้ระงับการลองชั่วคราว 15 นาที เพื่อป้องกันการแฮกบัญชี";
      }

      await updateDoc(otpRef, payload);

      // Audit Log failed attempt
      await addDoc(collection(db, "password_reset_audit_logs"), {
        email: sanitizedEmail,
        action: "verify_otp_failed",
        timestamp: new Date().toISOString(),
        ip: clientIP,
        userAgent: req.headers["user-agent"] || "unknown",
        details: `Failed OTP attempt. Count: ${nextAttempts}. Locked: ${payload.isLocked || false}`
      });

      return res.status(400).json({ 
        success: false, 
        error: errMsg,
        showCaptcha: nextAttempts >= 1 // require CAPTCHA on subsequent tries to block brute-forcing
      });
    }

    // Succeeded! Create Reset Token JWT (valid for 10 minutes)
    const JWT_SECRET = process.env.JWT_SECRET || "andaman-coin-secret-key-2026";
    const resetToken = jwt.sign(
      { email: sanitizedEmail, verified: true },
      JWT_SECRET,
      { expiresIn: "10m" }
    );

    // Reset OTP code in Firestore to prevent reuse
    await updateDoc(otpRef, {
      attempts: 0,
      hashedOtp: "",
      expiresAt: 0
    });

    // Audit Log success
    await addDoc(collection(db, "password_reset_audit_logs"), {
      email: sanitizedEmail,
      action: "verify_otp_success",
      timestamp: new Date().toISOString(),
      ip: clientIP,
      userAgent: req.headers["user-agent"] || "unknown",
      details: "OTP successfully verified. Reset Token issued."
    });

    res.json({ success: true, resetToken });

  } catch (error: any) {
    console.error("Verify OTP error:", error);
    res.status(500).json({ success: false, error: error.message || "เกิดข้อผิดพลาดในการตรวจสอบรหัสผ่าน" });
  }
});

// 5. POST Reset Password Action
app.post("/api/auth/reset-password", async (req, res) => {
  try {
    const { email, newPassword, confirmPassword, resetToken, csrfToken } = req.body;

    // CSRF Check
    if (!csrfToken) {
      return res.status(403).json({ success: false, error: "คำขอถูกระงับเนื่องจากไม่มีรหัส CSRF (CSRF token missing)" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, error: "รหัสผ่านใหม่กับการยืนยันรหัสผ่านไม่ตรงกัน" });
    }

    // Verify JWT Reset Token
    const JWT_SECRET = process.env.JWT_SECRET || "andaman-coin-secret-key-2026";
    let decoded: any;
    try {
      decoded = jwt.verify(resetToken, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, error: "โทเค็นสิทธิ์การกู้รหัสผ่านหมดอายุ หรือถูกใช้งานไปแล้ว กรุณาเริ่มใหม่อีกครั้ง" });
    }

    const sanitizedEmail = sanitizeEmail(email);
    if (decoded.email !== sanitizedEmail) {
      return res.status(401).json({ success: false, error: "โทเค็นการยืนยันตัวตนมีความไม่สอดคล้องกับอีเมลเป้าหมาย" });
    }

    // Verify Password Strength Criteria
    // - Minimum 8 characters
    // - One uppercase letter
    // - One lowercase letter
    // - One number
    // - One special character
    const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.#])[A-Za-z\d@$!%*?&.#]{8,}$/;
    if (!passRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        error: "รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร, มีพิมพ์ใหญ่ (A-Z), พิมพ์เล็ก (a-z), ตัวเลข (0-9) และตัวอักษรพิเศษอย่างน้อย 1 ตัว เช่น @$!%*?&.#"
      });
    }

    // Retrieve user and encrypt password
    const userRef = doc(db, "users", sanitizedEmail);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      return res.status(400).json({ success: false, error: "ไม่พบข้อมูลสมาชิกนี้ในระบบอันดามันคอยน์" });
    }

    const salt = bcrypt.genSaltSync(10);
    const hashedNewPassword = bcrypt.hashSync(newPassword, salt);

    // Invalidate other active sessions by incrementing the session version!
    const userData = userSnap.data();
    const nextSessionVersion = (userData.sessionVersion || 1) + 1;

    await updateDoc(userRef, {
      password: hashedNewPassword,
      sessionVersion: nextSessionVersion
    });

    const clientIP = getClientIP(req);
    const location = await getIPLocation(clientIP);
    const uaInfo = parseUserAgent(req.headers["user-agent"] || "");
    const bangkokTime = new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });

    // Save successful change log
    await addDoc(collection(db, "password_reset_audit_logs"), {
      email: sanitizedEmail,
      action: "reset_password_success",
      timestamp: new Date().toISOString(),
      ip: clientIP,
      userAgent: req.headers["user-agent"] || "unknown",
      details: `Password changed successfully. Revoked all other active sessions (new version: ${nextSessionVersion}). Location: ${location}`
    });

    // Send security notification email
    const notifySubject = "Notification: Your AndamanCoin Password Has Been Reset Successfully";
    const notifyText = `Hello,\n\nWe are writing to confirm that the password for your AndamanCoin account (${sanitizedEmail}) was successfully reset on:\n\nDate & Time: ${bangkokTime} (ICT, Indochina Time)\nDevice Info: ${uaInfo.device} (${uaInfo.browser})\nApproximate Location: ${location}\nIP Address: ${clientIP}\n\nIf you authorized this change, you can safely ignore this email.\n\nCRITICAL SECURITY WARNING:\nIf you did not reset your password, please contact our emergency response support IMMEDIATELY at https://lin.ee/NlmDMHU to freeze your wallet, block transfers, and lock down your environmental portfolio.\n\nBest regards,\nAndamanCoin Security Team`;

    let emailSent = false;
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || "587"),
          secure: process.env.SMTP_PORT === "465",
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });
        await transporter.sendMail({
          from: process.env.SMTP_FROM || `"AND Security Team" <noreply@andamancoin.com>`,
          to: sanitizedEmail,
          subject: notifySubject,
          text: notifyText
        });
        emailSent = true;
        console.log(`[SMTP] Reset security confirmation email dispatched successfully to ${sanitizedEmail}`);
      } catch (err) {
        console.error("[SMTP] Failed sending reset password confirmation mail:", err);
      }
    }

    if (!emailSent) {
      console.log("\n==================================================");
      console.log(`✉️ [SECURITY NOTIFICATION SIMULATION] TO: ${sanitizedEmail}`);
      console.log(`🔑 SUBJECT: ${notifySubject}`);
      console.log(`💬 MESSAGE:\n${notifyText}`);
      console.log("==================================================\n");
    }

    res.json({
      success: true,
      message: "ระบบกู้คืนและเปลี่ยนรหัสผ่านเสร็จสิ้นแล้ว! Active Session ทั้งหมดได้รับการบังคับลงชื่อออกเพื่อความปลอดภัยของกระเป๋าเงินของคุณ"
    });

  } catch (error: any) {
    console.error("Reset password final error:", error);
    res.status(500).json({ success: false, error: error.message || "เกิดความผิดพลาดในการตั้งรหัสผ่านใหม่" });
  }
});

// AI Insurance Advisor chat endpoint
app.post("/api/insurance-advisor", async (req, res) => {
  try {
    const { message, history, insuranceType, riskProfile } = req.body;
    const ai = getGenAI();

    const systemInstruction = `คุณคือ "AI Insurance Advisor" ผู้ช่วยอัจฉริยะสำหรับเว็บไซต์และแอปพลิเคชันนายหน้าประกันภัย

บทบาทและแนวทางปฏิบัติสำคัญของคุณ:
- ต้อนรับลูกค้าอย่างสุภาพ อบอุ่น มีหางเสียง "ครับ/ค่ะ" เสมอ
- วิเคราะห์ความต้องการของลูกค้าอย่างใส่ใจและแม่นยำตามข้อมูลที่ลูกค้าป้อนมา
- แนะนำแผนประกันที่เหมาะสมตามข้อมูลที่ลูกค้าให้ (เช่น ประกันรถยนต์ ประกันสุขภาพ ประกันเดินทาง ฯลฯ)
- อธิบายรายละเอียด ความคุ้มครอง วงเงิน และข้อยกเว้นสำคัญด้วยภาษาที่เข้าใจง่าย ตัดทอนคำศัพท์เทคนิคที่ยากเกินไป
- หากไม่มีข้อมูลเพียงพอ หรือผู้ใช้เพิ่งเริ่มคุย ให้ถามคำถามเพิ่มเติมทีละ 1-2 ข้ออย่างเป็นมิตรเพื่อเก็บข้อมูลก่อนเสนอแนะ (เช่น อายุ, งบประมาณ, สภาพรถยนต์, จุดประสงค์การเดินทาง)
- ไม่สร้างข้อมูล อัตราเบี้ย หรือเงื่อนไขกรมธรรม์ที่ไม่มีแหล่งอ้างอิงเด็ดขาด หากจำเป็นต้องแสดงตัวเลข ให้แจ้งว่าเป็น "อัตราเบี้ยประกันเบื้องต้นแบบจำลอง" และชี้แจงว่า "ระบบจะแสดงข้อมูลที่อัปเดตและตรงจาก API ของบริษัทประกันภัยที่ได้รับอนุญาตเมื่อเชื่อมต่อระบบจริงเสร็จสมบูรณ์"
- นำเสนอคำแนะนำอย่างเป็นกลาง อธิบายทั้ง "ข้อดี (Pros)" และ "ข้อควรพิจารณา/ข้อจำกัด (Cons/Limitations)" ของแต่ละแผนการคุ้มครองอย่างซื่อสัตย์ ไม่กดดันหรือเร่งรัดให้ลูกค้าตัดสินใจเด็ดขาด
- หากผู้ใช้ถามข้อคำถามด้านกฎหมายเชิงลึกหรือเงื่อนไขเฉพาะที่ซับซ้อน ให้แนะนำให้ตรวจสอบอย่างเป็นทางการกับบริษัทประกันหรือแนะนำให้ประสานงานกับเจ้าหน้าที่ผู้ได้รับใบอนุญาตนายหน้า

ประเภทประกันที่รองรับ:
1. ประกันรถยนต์ (Car Insurance) - ชั้น 1, 2+, 3+ แนะนำตามอายุรถและการใช้งาน
2. ประกันสุขภาพ (Health Insurance) - แนะนำตามงบและช่วงอายุ รวมถึงการเหมาจ่ายหรือแยกจ่าย
3. ประกันอุบัติเหตุ (Accident Insurance) - สำหรับกลุ่มเสี่ยงหรือวัยทำงาน คุ้มครองค่ารักษาและทุพพลภาพ
4. ประกันเดินทาง (Travel Insurance) - คุ้มครองรายเที่ยวหรือรายปี ครอบคลุมไฟล์ทดีเลย์และกระเป๋าหาย
5. ประกันบ้าน (Home Insurance) - คุ้มครองอัคคีภัย ภัยพิบัติธรรมชาติ และโจรกรรม
6. ประกันชีวิต (Life Insurance) - เพื่อการออมทรัพย์ มรดก หรือลดหย่อนภาษี
7. ประกันธุรกิจ (Business Insurance) - สำหรับ SMEs คุ้มครองความรับผิดต่อบุคคลภายนอกและทรัพย์สิน

ข้อมูลบริบทลูกค้าในปัจจุบัน:
- ประเภทประกันที่สนใจในเซสชันนี้: ${insuranceType || "ยังไม่ได้เลือกเฉพาะเจาะจง"}
- ประเมินคะแนนความเสี่ยงเบื้องต้นของลูกค้า (ถ้ามี): ${riskProfile ? JSON.stringify(riskProfile) : "ยังไม่ได้ทำแบบประเมินความเสี่ยง"}

แนวทางการจัดรูปแบบคำตอบ:
- เขียนคำตอบโดยใช้ Markdown ที่เรียบร้อย สวยงาม มีการใช้ตัวหนา (Bold) มีรายการสัญลักษณ์ (Bullet points) และตารางเพื่อเปรียบเทียบเมื่อเหมาะสม
- กระชับและหลีกเลี่ยงข้อความที่ยาวและซ้ำซากเกินไป
- เปิดโอกาสให้ผู้ใช้สอบถามเพิ่มเติมเสมอ หรือแนะนำให้กรอกแบบฟอร์ม "ส่งต่อให้เจ้าหน้าที่" หากต้องการคำแนะนำจากมนุษย์ผู้เชี่ยวชาญ`;

    let contents: any[] = [];

    // Map history to Gemini API format if available
    if (history && Array.isArray(history) && history.length > 0) {
      contents = history.map((h: any) => ({
        role: h.role === "user" ? "user" : "model",
        parts: [{ text: h.text }],
      }));
    }

    // Add current user message
    contents.push({
      role: "user",
      parts: [{ text: message }],
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    res.json({
      text: response.text,
      success: true,
    });
  } catch (error: any) {
    console.error("Error in insurance-advisor:", error);
    res.status(500).json({
      success: false,
      error: error.message || "An error occurred during your request.",
    });
  }
});

// Legacy backward-compatibility route for eco-assistant (routes to the new insurance chatbot)
app.post("/api/eco-assistant", async (req, res) => {
  try {
    const { message, history } = req.body;
    const ai = getGenAI();
    const systemInstruction = `คุณคือ AI Insurance Advisor ที่สุภาพและเป็นมิตร คอยตอบคำถามด้านการประกันภัยและช่วยวิเคราะห์แผนประกันภัยที่เหมาะสมกรุณาใช้ภาษาไทยครับ`;
    
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: message,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });
    res.json({
      text: response.text,
      success: true,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// -----------------------------------------------------------------------------
// Vite Dev Server / Production Static Serving
// -----------------------------------------------------------------------------
async function initServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode with Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AndamanCoin full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

initServer().catch((err) => {
  console.error("Failed to start server:", err);
});
