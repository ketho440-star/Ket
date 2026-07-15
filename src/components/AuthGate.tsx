import React, { useState, useEffect } from "react";
import { UserProfile } from "../types";
import { REGIONS } from "../data";
import { 
  ShieldCheck, 
  ArrowRight, 
  Loader2, 
  KeyRound, 
  Mail, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Lock, 
  ShieldAlert,
  Eye,
  EyeOff
} from "lucide-react";
import { loginUser, registerUser } from "../firebaseService";

interface AuthGateProps {
  onLogin: (profile: UserProfile) => void;
  suggestedEmail?: string;
}

const AVATARS = [
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80", // Ocean volunteer male
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80", // Eco-tourist female
  "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=120&q=80", // Local leader
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=120&q=80", // Activist girl
];

type AuthMode = "login" | "register" | "forgot" | "verify" | "reset";

export default function AuthGate({ onLogin, suggestedEmail = "ketho440@gmail.com" }: AuthGateProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState(suggestedEmail);
  const [password, setPassword] = useState("andaman2026");
  const [name, setName] = useState("คุณผู้รักทะเลอันดามัน");
  const [role, setRole] = useState<UserProfile["role"]>("volunteer");
  const [regionId, setRegionId] = useState("thailand");
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  
  // Security States
  const [csrfToken, setCsrfToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // OTP States
  const [otp, setOtp] = useState("");
  const [simulatedOtpText, setSimulatedOtpText] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpExpiresLeft, setOtpExpiresLeft] = useState(0);
  
  // CAPTCHA States
  const [needCaptcha, setNeedCaptcha] = useState(false);
  const [captchaQuestion, setCaptchaQuestion] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaAnswerInput, setCaptchaAnswerInput] = useState("");
  
  // Password Reset States
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [showPass, setShowPass] = useState(false);

  // Fetch CSRF Token on component mount
  useEffect(() => {
    fetch("/api/auth/csrf-token")
      .then((res) => res.json())
      .then((data) => {
        setCsrfToken(data.csrfToken);
        sessionStorage.setItem("csrf_token", data.csrfToken);
      })
      .catch((err) => console.error("Error fetching CSRF token:", err));
  }, []);

  // Cooldown timer for OTP Resend
  useEffect(() => {
    let interval: any;
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Expiration countdown for OTP Validity
  useEffect(() => {
    let interval: any;
    if (otpExpiresLeft > 0 && mode === "verify") {
      interval = setInterval(() => {
        setOtpExpiresLeft((prev) => {
          if (prev <= 1) {
            setError("รหัส OTP หมดอายุแล้วเพื่อความปลอดภัยสูงสุด กรุณากดขอรหัสใหม่อีกครั้ง");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpExpiresLeft, mode]);

  // Fetch CAPTCHA from server
  const fetchCaptcha = async () => {
    try {
      const res = await fetch("/api/auth/captcha");
      const data = await res.json();
      setCaptchaQuestion(data.question);
      setCaptchaToken(data.captchaToken);
      setCaptchaAnswerInput("");
    } catch (err) {
      console.error("Error retrieving secure CAPTCHA:", err);
    }
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!email.trim() || !email.includes("@")) {
      setError("กรุณากรอกที่อยู่อีเมลที่ถูกต้องสอดคล้องตามมาตรฐาน");
      return;
    }

    if (mode === "login" && password.length < 6) {
      setError("รหัสผ่านต้องมีอักขระอย่างน้อย 6 ตัวอักษร");
      return;
    }

    setLoading(true);

    if (mode === "register") {
      registerUser(email, password, name, role, regionId, selectedAvatar)
        .then((profile) => {
          onLogin(profile);
          setLoading(false);
        })
        .catch((err: any) => {
          setError(err.message || "เกิดข้อผิดพลาดในการสร้างบัญชี");
          setLoading(false);
        });
    } else {
      loginUser(email, password)
        .then((profile) => {
          onLogin(profile);
          setLoading(false);
        })
        .catch((err: any) => {
          setError(err.message || "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
          setLoading(false);
        });
    }
  };

  // Submit Forgot Password (Email check & generate OTP)
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setSimulatedOtpText("");
    setLoading(true);

    try {
      const activeCsrf = csrfToken || sessionStorage.getItem("csrf_token") || "";
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": activeCsrf
        },
        body: JSON.stringify({ email, csrfToken: activeCsrf })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "ขอรหัส OTP ล้มเหลว");
      }

      setSuccessMsg(data.message);
      if (data.simulatedOtp) {
        setSimulatedOtpText(data.simulatedOtp);
      }
      setMode("verify");
      setOtp("");
      setResendCooldown(60);
      setOtpExpiresLeft(300); // 5 minutes
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Submit OTP Verification
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (otp.length !== 6) {
      setError("โปรดป้อนรหัส OTP ให้ครบ 6 หลัก");
      return;
    }

    setLoading(true);

    try {
      const activeCsrf = csrfToken || sessionStorage.getItem("csrf_token") || "";
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": activeCsrf
        },
        body: JSON.stringify({
          email,
          otp,
          csrfToken: activeCsrf,
          captchaAnswer: captchaAnswerInput,
          captchaToken,
          needCaptcha
        })
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.showCaptcha) {
          setNeedCaptcha(true);
          fetchCaptcha();
        }
        throw new Error(data.error || "รหัส OTP ยืนยันไม่ถูกต้อง");
      }

      setResetToken(data.resetToken);
      setMode("reset");
      setNewPassword("");
      setConfirmNewPassword("");
      setSuccessMsg("ยืนยันรหัส OTP สำเร็จ สิทธิ์กู้รหัสผ่านพร้อมตั้งค่าแล้ว");
      setNeedCaptcha(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Submit Password Reset
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (newPassword !== confirmNewPassword) {
      setError("รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน");
      return;
    }

    // Verify complexity
    const meetsMinLength = newPassword.length >= 8;
    const meetsUppercase = /[A-Z]/.test(newPassword);
    const meetsLowercase = /[a-z]/.test(newPassword);
    const meetsNumber = /\d/.test(newPassword);
    const meetsSpecial = /[@$!%*?&.#]/.test(newPassword);

    if (!meetsMinLength || !meetsUppercase || !meetsLowercase || !meetsNumber || !meetsSpecial) {
      setError("รหัสผ่านต้องผ่านเกณฑ์ความปลอดภัยครบถ้วน");
      return;
    }

    setLoading(true);

    try {
      const activeCsrf = csrfToken || sessionStorage.getItem("csrf_token") || "";
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": activeCsrf
        },
        body: JSON.stringify({
          email,
          newPassword,
          confirmPassword: confirmNewPassword,
          resetToken,
          csrfToken: activeCsrf
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "เปลี่ยนรหัสผ่านใหม่ล้มเหลว");
      }

      setSuccessMsg(data.message);
      setMode("login");
      setPassword(""); // Clear old password
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const autofillVIP = () => {
    setEmail(suggestedEmail);
    setPassword("andaman2026");
    setName("Ketho Eco Guardian");
    setRole("volunteer");
    setRegionId("thailand");
    setSelectedAvatar(AVATARS[1]);
  };

  const handleQuickLogin = async () => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const profile = await loginUser(suggestedEmail, "andaman2026");
      onLogin(profile);
    } catch (err: any) {
      if (err.message && err.message.includes("ไม่พบที่อยู่อีเมล")) {
        try {
          const profile = await registerUser(
            suggestedEmail,
            "andaman2026",
            "Ketho Eco Guardian (VIP)",
            "volunteer",
            "thailand",
            AVATARS[1]
          );
          onLogin(profile);
        } catch (regErr: any) {
          setError(regErr.message || "เกิดข้อผิดพลาดในการลงทะเบียนอัตโนมัติ");
        }
      } else {
        setError(err.message || "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      }
    } finally {
      setLoading(false);
    }
  };

  // Format countdown mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Live password rules checklist checks
  const meetsMinLength = newPassword.length >= 8;
  const meetsUppercase = /[A-Z]/.test(newPassword);
  const meetsLowercase = /[a-z]/.test(newPassword);
  const meetsNumber = /\d/.test(newPassword);
  const meetsSpecial = /[@$!%*?&.#]/.test(newPassword);

  const RuleRow = ({ met, label }: { met: boolean; label: string }) => (
    <div className="flex items-center gap-1.5 text-[10px] font-mono">
      <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold text-[8px] border ${
        met ? "bg-emerald-950/40 border-emerald-500 text-emerald-400" : "bg-slate-900 border-gray-700 text-gray-500"
      }`}>
        {met ? "✓" : "×"}
      </span>
      <span className={met ? "text-emerald-300" : "text-gray-400"}>{label}</span>
    </div>
  );

  return (
    <div className="max-w-md w-full mx-auto glass-panel rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-2xl border border-white/10 mt-6 animate-float">
      {/* Background visual styling */}
      <div className="absolute -top-12 -left-12 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-yellow-500/10 rounded-full blur-3xl"></div>

      {/* Top Welcome Emblem */}
      <div className="text-center space-y-3 z-10 relative">
        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-400 via-teal-500 to-emerald-400 flex items-center justify-center text-white text-3xl mx-auto shadow-md cyan-glow animate-pulse">
          🌊
        </div>
        <h2 className="text-2xl font-display font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-teal-100 to-yellow-200 uppercase">
          {mode === "login" && "เข้าสู่ระบบ AndamanCoin"}
          {mode === "register" && "ลงทะเบียนอันดามัน"}
          {mode === "forgot" && "กู้คืนรหัสผ่านสมาชิก"}
          {mode === "verify" && "ตรวจสอบรหัส OTP"}
          {mode === "reset" && "ตั้งค่ารหัสผ่านใหม่"}
        </h2>
        <p className="text-xs text-gray-400 font-mono leading-relaxed max-w-xs mx-auto">
          {mode === "login" && "เชื่อมต่อกระเป๋าเงินจำลองและตรวจสอบสิทธิ์เหรียญ AND ของคุณ"}
          {mode === "register" && "ร่วมเป็นพาร์ทเนอร์ปกป้องท้องทะเลอันดามันข้ามดินแดนพรมแดน"}
          {mode === "forgot" && "ป้อนอีเมลที่ลงทะเบียน ระบบจะจัดส่งรหัสความปลอดภัย OTP 6 หลักเพื่อคุ้มครองบัญชี"}
          {mode === "verify" && `โปรดกรอกรหัสความปลอดภัยที่ส่งไปยังอีเมล สิทธิ์รหัสผ่านใช้งานได้อีก ${formatTime(otpExpiresLeft)}`}
          {mode === "reset" && "กำหนดรหัสผ่านใหม่ที่มีความซับซ้อนตามมาตรฐานความปลอดภัยระดับสากล"}
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mt-4 bg-red-950/50 border border-red-500/30 text-red-300 text-xs px-4 py-2.5 rounded-xl text-center font-medium flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Success Alert */}
      {successMsg && (
        <div className="mt-4 bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 text-xs px-4 py-2.5 rounded-xl text-center font-medium flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Simulated Mail Server Card - Extremely helpful for test previews */}
      {mode === "verify" && simulatedOtpText && (
        <div className="mt-4 p-3.5 bg-yellow-950/40 border border-yellow-500/30 rounded-2xl space-y-1.5 text-xs text-left animate-pulse">
          <div className="flex items-center gap-2 text-yellow-400 font-bold">
            <span className="text-base animate-bounce">✉️</span>
            <span>กล่องจดหมายจำลอง (Sandbox Mail Server)</span>
          </div>
          <p className="text-[10px] text-gray-300">
            เนื่องจากรันใน Sandbox ได้จำลองเมลส่ง OTP เรียบร้อย และนำรหัสมาแสดงตรงนี้เพื่อความสะดวกสูงสุด:
          </p>
          <div className="flex items-center justify-between bg-slate-950 px-3 py-2 rounded-xl border border-yellow-500/20 font-mono text-center">
            <span className="text-gray-400 text-[9px]">OTP VERIFICATION CODE:</span>
            <span className="text-yellow-400 font-bold tracking-widest text-sm select-all">{simulatedOtpText}</span>
          </div>
          <p className="text-[9px] text-gray-400 text-right">*(ไม่ต้องต่อเซิร์ฟเวอร์เมลภายนอก คัดลอกไปวางด้านล่างได้ทันที)*</p>
        </div>
      )}

      {/* Suggested Quick Login Option */}
      {mode === "login" && (
        <div className="mt-5 p-4 rounded-2xl bg-gradient-to-br from-cyan-950/60 to-emerald-950/40 border border-emerald-500/30 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all duration-500"></div>
          <div className="flex flex-col gap-2 relative z-10 text-left">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 text-sm animate-bounce">⚡</span>
              <span className="font-bold text-xs text-emerald-300 font-mono tracking-wide uppercase">แนะนำเพื่อความสะดวก (Recommended Entry)</span>
            </div>
            <p className="text-[11px] text-gray-300 leading-relaxed">
              สำหรับผู้ดูแลระบบหรือผู้ใช้หลัก สามารถกดปุ่มนี้เพื่อผ่านเข้าใช้งานระบบทั้งหมดได้ในคลิกเดียวทันที
            </p>
            <button
              type="button"
              disabled={loading}
              onClick={handleQuickLogin}
              className="mt-2 w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold py-3 px-4 rounded-xl shadow-md transition-all duration-300 flex items-center justify-center gap-2 border border-emerald-400/30 transform active:scale-[0.98]"
            >
              <span className="text-xs sm:text-sm font-black">⚡ เข้าสู่ระบบด่วนใน 1 คลิก (One-Click Entry)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1 px-1 font-mono">
              <span>ผู้ใช้: {suggestedEmail}</span>
              <button 
                type="button" 
                onClick={autofillVIP} 
                className="text-cyan-400 hover:underline hover:text-cyan-300"
              >
                กรอกข้อมูลฟอร์มด่วน
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Forms Router */}
      
      {/* ----------------- LOGIN / REGISTER FORMS ----------------- */}
      {(mode === "login" || mode === "register") && (
        <form onSubmit={handleAuthSubmit} className="mt-6 space-y-4 text-xs z-10 relative">
          
          {/* Email Input */}
          <div className="space-y-1.5">
            <label className="text-gray-400 font-mono font-semibold flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-cyan-400" />
              <span>อีเมลผู้ใช้งาน (Email Address)</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="example@gmail.com"
              className="w-full bg-slate-900 text-white rounded-xl px-3.5 py-2.5 border border-white/10 focus:border-cyan-400 focus:outline-none text-xs transition"
            />
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-gray-400 font-mono font-semibold flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                <span>รหัสผ่านเข้าสู่ระบบ (Password)</span>
              </label>
              {mode === "login" && (
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setSuccessMsg(null);
                    setMode("forgot");
                  }}
                  className="text-yellow-400 hover:text-yellow-300 font-mono text-[10px] hover:underline"
                >
                  ลืมรหัสผ่าน? (Forgot)
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-slate-900 text-white rounded-xl pl-3.5 pr-10 py-2.5 border border-white/10 focus:border-cyan-400 focus:outline-none text-xs transition font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Extra inputs for Register */}
          {mode === "register" && (
            <>
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-gray-400 font-mono font-semibold">ชื่อ-นามสกุลจริง (Full Name)</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="สมชาย รักษ์อันดามัน"
                  className="w-full bg-slate-900 text-white rounded-xl px-3.5 py-2.5 border border-white/10 focus:border-cyan-400 focus:outline-none text-xs transition"
                />
              </div>

              {/* Role selection */}
              <div className="space-y-1.5">
                <label className="text-gray-400 font-mono font-semibold">ตำแหน่งหน้าที่ / บทบาทอนุรักษ์ (Role)</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "volunteer", icon: "🌿", label: "อาสาสมัคร", sub: "Volunteer" },
                    { id: "tourist", icon: "✈️", label: "นักท่องเที่ยว Eco", sub: "Eco-Tourist" },
                    { id: "fisherman", icon: "🎣", label: "ชาวประมง", sub: "Fisherman" },
                    { id: "business", icon: "🏬", label: "ร้านค้า/ทัวร์สีเขียว", sub: "Green Partner" }
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setRole(item.id as any)}
                      className={`p-2.5 rounded-xl border text-left transition flex flex-col gap-1 ${
                        role === item.id ? "border-cyan-400 bg-cyan-950/30 text-white" : "border-white/5 bg-slate-900 text-gray-400"
                      }`}
                    >
                      <span className="font-bold text-xs text-white">{item.icon} {item.label}</span>
                      <span className="text-[9px] text-gray-400">{item.sub}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Region selection */}
              <div className="space-y-1.5">
                <label className="text-gray-400 font-mono font-semibold">พิกัดฐานกิจกรรมหลัก (Active Region)</label>
                <select
                  value={regionId}
                  onChange={(e) => setRegionId(e.target.value)}
                  className="w-full bg-slate-900 text-white rounded-xl px-3 py-2.5 border border-white/10 focus:border-cyan-400 focus:outline-none"
                >
                  {REGIONS.map(r => (
                    <option key={r.id} value={r.id}>{r.name} ({r.country})</option>
                  ))}
                </select>
              </div>

              {/* Avatar Select */}
              <div className="space-y-1.5">
                <label className="text-gray-400 font-mono font-semibold">เลือกอวาตาร์ของคุณ (Choose Avatar)</label>
                <div className="flex gap-3 justify-center pt-1">
                  {AVATARS.map((av, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedAvatar(av)}
                      className={`w-12 h-12 rounded-full overflow-hidden border-2 transition ${
                        selectedAvatar === av ? "border-yellow-400 scale-110 shadow-lg gold-glow" : "border-transparent opacity-60"
                      }`}
                    >
                      <img src={av} alt="Avatar option" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>กำลังส่งข้อมูลระบบรักษ์อันดามัน...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-yellow-300" />
                <span>{mode === "register" ? "ลงชื่อเข้าร่วมและสร้างบัญชี" : "เข้าสู่ระบบจำลอง"}</span>
              </>
            )}
          </button>

          {/* Toggle mode */}
          <div className="text-center pt-3 border-t border-white/5">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setSuccessMsg(null);
                setMode(mode === "login" ? "register" : "login");
              }}
              className="text-cyan-400 hover:text-cyan-300 hover:underline transition font-mono text-[11px]"
            >
              {mode === "register" ? "มีบัญชีความร่วมมืออยู่แล้ว? เข้าสู่ระบบที่นี่" : "ยังไม่มีกระเป๋าและบัญชี? ลงชื่อสมัครใหม่"}
            </button>
          </div>

        </form>
      )}

      {/* ----------------- FORGOT PASSWORD SCREEN ----------------- */}
      {mode === "forgot" && (
        <form onSubmit={handleForgotPassword} className="mt-6 space-y-4 text-xs z-10 relative">
          <div className="space-y-1.5">
            <label className="text-gray-400 font-mono font-semibold flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-cyan-400" />
              <span>ป้อนอีเมลที่สมัครสมาชิก (Registered Email)</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="yourmail@gmail.com"
              className="w-full bg-slate-900 text-white rounded-xl px-3.5 py-2.5 border border-white/10 focus:border-cyan-400 focus:outline-none text-xs transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-gradient-to-r from-yellow-600 via-teal-600 to-cyan-600 hover:from-yellow-500 hover:to-cyan-500 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>กำลังดำเนินการกู้สิทธิ์...</span>
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4 text-yellow-300" />
                <span>ขอรหัส OTP ยืนยันรหัสผ่าน</span>
              </>
            )}
          </button>

          <div className="text-center pt-3 border-t border-white/5">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setSuccessMsg(null);
                setMode("login");
              }}
              className="text-gray-400 hover:text-white hover:underline transition font-mono text-[11px]"
            >
              กลับไปหน้าเข้าสู่ระบบ (Back to Login)
            </button>
          </div>
        </form>
      )}

      {/* ----------------- OTP VERIFICATION SCREEN ----------------- */}
      {mode === "verify" && (
        <form onSubmit={handleVerifyOtp} className="mt-6 space-y-4 text-xs z-10 relative">
          
          <div className="space-y-1.5">
            <label className="text-gray-400 font-mono font-semibold flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              <span>กรอกรหัสความปลอดภัย OTP 6 หลัก</span>
            </label>
            <input
              type="text"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              required
              placeholder="000000"
              className="w-full bg-slate-900 text-yellow-300 font-mono text-center text-lg tracking-widest rounded-xl py-2.5 border border-white/10 focus:border-cyan-400 focus:outline-none transition"
            />
          </div>

          {/* Secure CAPTCHA Challenge (if repeated failures block bots) */}
          {needCaptcha && (
            <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-2xl space-y-2 text-left">
              <div className="flex items-center gap-1.5 text-yellow-400 font-bold text-[11px]">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>CAPTCHA เพื่อตรวจจับบอทความถี่สูง</span>
              </div>
              <div className="bg-slate-950 text-cyan-400 font-mono text-[11px] p-2.5 rounded-xl text-center border border-white/5 font-semibold">
                {captchaQuestion || "กำลังประมวลผลคำถาม..."}
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={captchaAnswerInput}
                  onChange={(e) => setCaptchaAnswerInput(e.target.value)}
                  required
                  placeholder="คำตอบเลขจำนวนเต็ม"
                  className="flex-1 bg-slate-900 text-white rounded-xl px-3 py-2 border border-white/10 text-xs focus:outline-none focus:border-cyan-400 text-center font-mono font-bold"
                />
                <button
                  type="button"
                  onClick={fetchCaptcha}
                  className="px-3 bg-slate-800 hover:bg-slate-700 text-gray-300 rounded-xl transition flex items-center justify-center"
                  title="เปลี่ยนโจทย์คำถามใหม่"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Resend / Timer Controls */}
          <div className="flex items-center justify-between text-[11px] font-mono text-gray-400">
            <div>
              สิทธิ์หมดอายุ: <span className="text-yellow-400 font-bold">{formatTime(otpExpiresLeft)}</span>
            </div>
            {resendCooldown > 0 ? (
              <div>
                ส่งอีกครั้งใน: <span className="text-cyan-400 font-bold">{resendCooldown} วินาที</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-cyan-400 hover:text-cyan-300 font-bold hover:underline"
              >
                ขอส่งรหัสใหม่อีกครั้ง (Resend OTP)
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>กำลังดำเนินการตรวจสอบความปลอดภัย...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-yellow-300" />
                <span>ตรวจสอบและยืนยันสิทธิ์รหัส</span>
              </>
            )}
          </button>

          <div className="text-center pt-3 border-t border-white/5">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setSuccessMsg(null);
                setNeedCaptcha(false);
                setMode("forgot");
              }}
              className="text-gray-400 hover:text-white hover:underline transition font-mono text-[11px]"
            >
              ย้อนกลับหน้ากรอกอีเมล (Back)
            </button>
          </div>
        </form>
      )}

      {/* ----------------- RESET PASSWORD SCREEN ----------------- */}
      {mode === "reset" && (
        <form onSubmit={handleResetPassword} className="mt-6 space-y-4 text-xs z-10 relative">
          
          {/* New Password */}
          <div className="space-y-1.5">
            <label className="text-gray-400 font-mono font-semibold flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
              <span>ป้อนรหัสผ่านใหม่ (New Password)</span>
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              placeholder="ป้อนรหัสความปลอดภัยใหม่"
              className="w-full bg-slate-900 text-white rounded-xl px-3.5 py-2.5 border border-white/10 focus:border-cyan-400 focus:outline-none text-xs transition font-mono"
            />
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label className="text-gray-400 font-mono font-semibold flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
              <span>ยืนยันรหัสผ่านใหม่อีกครั้ง (Confirm Password)</span>
            </label>
            <input
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              required
              placeholder="ยืนยันรหัสผ่านให้ตรงกัน"
              className="w-full bg-slate-900 text-white rounded-xl px-3.5 py-2.5 border border-white/10 focus:border-cyan-400 focus:outline-none text-xs transition font-mono"
            />
          </div>

          {/* Interactive Password Rules Checklist */}
          <div className="p-3 bg-slate-950/60 border border-white/5 rounded-2xl space-y-1.5 text-left">
            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider font-mono">เกณฑ์ความมั่นคงรหัสผ่านหลัก (Complexity Checklist):</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1">
              <RuleRow met={meetsMinLength} label="ความยาวอย่างน้อย 8 ตัว" />
              <RuleRow met={meetsUppercase} label="อักษรตัวใหญ่ (A-Z) 1 ตัว" />
              <RuleRow met={meetsLowercase} label="อักษรตัวเล็ก (a-z) 1 ตัว" />
              <RuleRow met={meetsNumber} label="ตัวเลข (0-9) 1 ตัว" />
              <RuleRow met={meetsSpecial} label="อักขระพิเศษ 1 ตัว (@$!%*?&.#)" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>กำลังทำลายกุญแจเดิมและตั้งค่ารหัสใหม่...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-yellow-300" />
                <span>ยืนยันการตั้งค่ารหัสผ่านใหม่และล็อกเอาต์เครื่องอื่น</span>
              </>
            )}
          </button>

          <div className="text-center pt-3 border-t border-white/5">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setSuccessMsg(null);
                setMode("verify");
              }}
              className="text-gray-400 hover:text-white hover:underline transition font-mono text-[11px]"
            >
              ย้อนกลับหน้าป้อนรหัส OTP (Back)
            </button>
          </div>
        </form>
      )}

    </div>
  );
}
