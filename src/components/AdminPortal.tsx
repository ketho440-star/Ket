import React, { useState, useEffect } from "react";
import { 
  subscribeToAllUsers, 
  DbUser, 
  updateUserBalance, 
  updateUserProfile,
  subscribeToAllTransfers,
  approveTransfer,
  rejectTransfer,
  subscribeToRewards,
  addRewardItem,
  updateRewardItem,
  deleteRewardItem,
  CoinTransfer
} from "../firebaseService";
import { EcoActivity, RewardItem } from "../types";
import { REGIONS } from "../data";
import { 
  Users, 
  ShieldCheck, 
  Coins, 
  Search, 
  ExternalLink, 
  TrendingUp, 
  Award, 
  FileText, 
  AlertCircle, 
  Check, 
  Database,
  ArrowRightLeft,
  Settings,
  Lock,
  KeyRound,
  LogIn,
  Trash2,
  Store,
  Plus,
  X
} from "lucide-react";
import firebaseConfig from "../../firebase-applet-config.json";

interface AdminPortalProps {
  activities: EcoActivity[];
}

export default function AdminPortal({ activities }: AdminPortalProps) {
  const [users, setUsers] = useState<DbUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<DbUser | null>(null);
  const [coinAdjustment, setCoinAdjustment] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Profile fields editing states
  const [editName, setEditName] = useState("");
  const [editRegion, setEditRegion] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [editPassword, setEditPassword] = useState("");

  // Sync edit states when selected user changes
  useEffect(() => {
    if (selectedUser) {
      setEditName(selectedUser.name || "");
      setEditRegion(selectedUser.regionId || "thailand");
      setEditAvatar(selectedUser.avatarUrl || "");
      setEditPassword(selectedUser.password || "");
    } else {
      setEditName("");
      setEditRegion("thailand");
      setEditAvatar("");
      setEditPassword("");
    }
  }, [selectedUser?.email]);

  // Administrative Authentication State
  const [isAuthorized, setIsAuthorized] = useState<boolean>(() => {
    return sessionStorage.getItem("andamancoin_admin_authed") === "true";
  });
  const [adminEmail, setAdminEmail] = useState("ketho440@gmail.com");
  const [adminPassword, setAdminPassword] = useState("andaman2026");
  const [loginError, setLoginError] = useState<string | null>(null);

  // Banking transfers and shop rewards administration states
  const [transfers, setTransfers] = useState<CoinTransfer[]>([]);
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  
  // New reward item form fields
  const [newRewardTitle, setNewRewardTitle] = useState("");
  const [newRewardCost, setNewRewardCost] = useState("");
  const [newRewardCategory, setNewRewardCategory] = useState("merchandise");
  const [newRewardDesc, setNewRewardDesc] = useState("");
  const [newRewardImage, setNewRewardImage] = useState("");
  const [newRewardStock, setNewRewardStock] = useState("50");

  // Real-time subscribe to all registered users from Firestore (only if authorized)
  useEffect(() => {
    if (!isAuthorized) return;
    const unsubscribe = subscribeToAllUsers((dbUsers) => {
      setUsers(dbUsers);
      // Keep selected user updated if they are edited
      if (selectedUser) {
        const updated = dbUsers.find(u => u.email === selectedUser.email);
        if (updated) setSelectedUser(updated);
      }
    });
    return () => unsubscribe();
  }, [selectedUser?.email, isAuthorized]);

  // Real-time subscribe to banking transfers (only if authorized)
  useEffect(() => {
    if (!isAuthorized) return;
    const unsubscribe = subscribeToAllTransfers((list) => {
      setTransfers(list);
    });
    return () => unsubscribe();
  }, [isAuthorized]);

  // Real-time subscribe to shop rewards (only if authorized)
  useEffect(() => {
    if (!isAuthorized) return;
    const unsubscribe = subscribeToRewards((list) => {
      setRewards(list);
    });
    return () => unsubscribe();
  }, [isAuthorized]);

  // Handle transfer approval
  const handleApproveTransfer = async (id: string) => {
    try {
      setErrorMsg(null);
      setSuccessMsg(null);
      await approveTransfer(id);
      setSuccessMsg("อนุมัติรายการโอนเงินข้ามบัญชีเรียบร้อยแล้ว ยอดเงินถูกโอนเข้าบัญชีผู้รับในระบบจริงทันที! ✨");
    } catch (err: any) {
      setErrorMsg(err.message || "เกิดข้อผิดพลาดในการอนุมัติ");
    }
  };

  // Handle transfer rejection
  const handleRejectTransfer = async (id: string) => {
    try {
      setErrorMsg(null);
      setSuccessMsg(null);
      await rejectTransfer(id);
      setSuccessMsg("ปฏิเสธรายการโอนเงินเรียบร้อยแล้ว ยอดเงินที่หักไปจะถูกตีคืนกลับไปยังบัญชีผู้ส่งทันที");
    } catch (err: any) {
      setErrorMsg(err.message || "เกิดข้อผิดพลาดในการปฏิเสธ");
    }
  };

  // Handle adding dynamic shop items
  const handleAddReward = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setErrorMsg(null);
      setSuccessMsg(null);
      if (!newRewardTitle.trim()) {
        throw new Error("กรุณาระบุชื่อของรางวัลหรือสินค้า");
      }
      const costNum = parseInt(newRewardCost);
      if (isNaN(costNum) || costNum <= 0) {
        throw new Error("กรุณาระบุราคาเป็นตัวเลขมากกว่า 0");
      }
      const stockNum = parseInt(newRewardStock);
      if (isNaN(stockNum) || stockNum < 0) {
        throw new Error("กรุณาระบุจำนวนสต็อกให้ถูกต้อง");
      }

      await addRewardItem({
        title: newRewardTitle.trim(),
        cost: costNum,
        category: newRewardCategory as any,
        description: newRewardDesc.trim() || "สินค้าและบริการเพื่อสิ่งแวดล้อมเพื่ออาสาสมัคร",
        image: newRewardImage.trim() || "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=400&q=80",
        stock: stockNum
      });

      setSuccessMsg(`เพิ่มของรางวัล "${newRewardTitle}" เข้าสู่ระบบร้านค้าสากลเรียบร้อยแล้ว!`);
      setNewRewardTitle("");
      setNewRewardCost("");
      setNewRewardDesc("");
      setNewRewardImage("");
      setNewRewardStock("50");
    } catch (err: any) {
      setErrorMsg(err.message || "เกิดข้อผิดพลาดในการเพิ่มของรางวัล");
    }
  };

  // Handle updating stock
  const handleUpdateStock = async (id: string, currentStock: number, delta: number) => {
    try {
      setErrorMsg(null);
      setSuccessMsg(null);
      const nextStock = Math.max(0, currentStock + delta);
      await updateRewardItem(id, { stock: nextStock });
      setSuccessMsg("อัปเดตสต็อกสินค้าเรียบร้อยแล้ว!");
    } catch (err: any) {
      setErrorMsg(err.message || "เกิดข้อผิดพลาดในการอัปเดตสต็อก");
    }
  };

  // Handle deleting reward
  const handleDeleteReward = async (id: string) => {
    try {
      setErrorMsg(null);
      setSuccessMsg(null);
      if (confirm("คุณแน่ใจหรือไม่ว่าต้องการลบของรางวัล/สินค้านี้ออกจากระบบร้านค้าสากล?")) {
        await deleteRewardItem(id);
        setSuccessMsg("ลบของรางวัลออกจากระบบร้านค้าเสร็จสมบูรณ์");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "เกิดข้อผิดพลาดในการลบสินค้า");
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    // Hardcoded simple admin verification for extreme ease of use
    if (adminEmail.trim().toLowerCase() === "ketho440@gmail.com" && adminPassword === "andaman2026") {
      setIsAuthorized(true);
      sessionStorage.setItem("andamancoin_admin_authed", "true");
    } else {
      setLoginError("อีเมลหรือรหัสผ่านผู้ดูแลระบบไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง");
    }
  };

  const handleQuickLogin = () => {
    setAdminEmail("ketho440@gmail.com");
    setAdminPassword("andaman2026");
    setIsAuthorized(true);
    sessionStorage.setItem("andamancoin_admin_authed", "true");
  };

  const handleAdminLogout = () => {
    setIsAuthorized(false);
    sessionStorage.removeItem("andamancoin_admin_authed");
  };

  const handleAdjustBalance = async (email: string, absoluteAmount: number) => {
    try {
      setErrorMsg(null);
      setSuccessMsg(null);
      if (isNaN(absoluteAmount) || absoluteAmount < 0) {
        throw new Error("กรุณาระบุจำนวนเหรียญให้ถูกต้อง (มากกว่าหรือเท่ากับ 0)");
      }
      await updateUserBalance(email, absoluteAmount);
      setSuccessMsg(`อัปเดตยอดคงเหลือของ ${email} เป็น ${absoluteAmount} AND ในระบบจริงสำเร็จ!`);
      setCoinAdjustment("");
    } catch (err: any) {
      setErrorMsg(err.message || "เกิดข้อผิดพลาดในการอัปเดตยอดเงิน");
    }
  };

  const handleAddCoins = async (email: string, amount: number) => {
    try {
      setErrorMsg(null);
      setSuccessMsg(null);
      if (isNaN(amount) || amount <= 0) {
        throw new Error("กรุณาระบุจำนวนเหรียญที่จะเติมให้ถูกต้อง (มากกว่า 0)");
      }
      const currentBalance = selectedUser?.balance || 0;
      const newBal = currentBalance + amount;
      await updateUserBalance(email, newBal);
      setSuccessMsg(`เติมเหรียญเพิ่มให้ ${email} สำเร็จ: ได้รับเพิ่ม +${amount} AND (ยอดรวมปัจจุบัน: ${newBal} AND) ในระบบจริง!`);
      setCoinAdjustment("");
    } catch (err: any) {
      setErrorMsg(err.message || "เกิดข้อผิดพลาดในการเติมเหรียญ");
    }
  };

  const handleSubtractCoins = async (email: string, amount: number) => {
    try {
      setErrorMsg(null);
      setSuccessMsg(null);
      if (isNaN(amount) || amount <= 0) {
        throw new Error("กรุณาระบุจำนวนเหรียญที่จะหักออกให้ถูกต้อง (มากกว่า 0)");
      }
      const currentBalance = selectedUser?.balance || 0;
      if (currentBalance < amount) {
        throw new Error("ยอดคงเหลือในระบบของผู้ใช้นี้ไม่เพียงพอสำหรับการหักเหรียญ");
      }
      const newBal = currentBalance - amount;
      await updateUserBalance(email, newBal);
      setSuccessMsg(`หักเหรียญจาก ${email} สำเร็จ: ลดลง -${amount} AND (ยอดคงเหลือปัจจุบัน: ${newBal} AND) ในระบบจริง!`);
      setCoinAdjustment("");
    } catch (err: any) {
      setErrorMsg(err.message || "เกิดข้อผิดพลาดในการหักเหรียญ");
    }
  };

  const handleSaveProfileDetails = async (email: string) => {
    try {
      setErrorMsg(null);
      setSuccessMsg(null);
      if (!editName.trim()) {
        throw new Error("กรุณากรอกชื่อจริงหรือชื่อเล่นของผู้ใช้งาน");
      }
      if (!editAvatar.trim()) {
        throw new Error("กรุณากรอก URL รูปภาพประจำตัวผู้ใช้งาน");
      }
      if (!editPassword.trim()) {
        throw new Error("กรุณากรอกรหัสผ่านของผู้ใช้งาน");
      }
      await updateUserProfile(email, {
        name: editName.trim(),
        regionId: editRegion,
        avatarUrl: editAvatar.trim(),
        password: editPassword.trim()
      });
      setSuccessMsg(`แก้ไขข้อมูลโปรไฟล์และรหัสผ่านของ ${email} เป็นชื่อ "${editName}" รหัสผ่านใหม่ "${editPassword.trim()}" ลงระบบจริงสำเร็จ! ✨`);
    } catch (err: any) {
      setErrorMsg(err.message || "เกิดข้อผิดพลาดในการบันทึกโปรไฟล์");
    }
  };

  const handleChangeRole = async (email: string, newRole: DbUser["role"]) => {
    try {
      setErrorMsg(null);
      setSuccessMsg(null);
      await updateUserProfile(email, { role: newRole });
      setSuccessMsg(`เปลี่ยนตำแหน่งของ ${email} เป็น ${newRole} ในระบบจริงเรียบร้อยแล้ว!`);
    } catch (err: any) {
      setErrorMsg(err.message || "เกิดข้อผิดพลาดในการเปลี่ยนตำแหน่ง");
    }
  };

  // Filter users
  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate sum stats
  const totalUserBalance = users.reduce((sum, u) => sum + (u.balance || 0), 0);
  const firebaseProjectId = firebaseConfig.projectId || "ai-studio-andamancoin";

  if (!isAuthorized) {
    return (
      <div className="max-w-md w-full mx-auto glass-panel rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-2xl border border-white/10 mt-12 animate-fade-in text-xs">
        {/* Visual elements */}
        <div className="absolute -top-12 -left-12 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-yellow-500/10 rounded-full blur-3xl"></div>

        <div className="text-center space-y-3 z-10 relative">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-slate-950 to-cyan-900 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-3xl mx-auto shadow-md cyan-glow animate-pulse">
            <Lock className="w-6 h-6 text-cyan-400" />
          </div>
          <h2 className="text-xl font-display font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-teal-100 to-yellow-200 uppercase">
            เข้าสู่ระบบหลังบ้านแอดมิน
          </h2>
          <p className="text-xs text-gray-400 font-mono leading-relaxed max-w-xs mx-auto">
            AndamanCoin Backend Administrator Security Gateway
          </p>
        </div>

        {loginError && (
          <div className="mt-4 bg-red-950/50 border border-red-500/30 text-red-300 text-xs px-4 py-2.5 rounded-xl text-center font-medium">
            ⚠️ {loginError}
          </div>
        )}

        {/* Easy Access Section */}
        <div className="mt-5 p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/10 space-y-2.5">
          <div className="flex items-center gap-2">
            <span className="text-yellow-400">✨</span>
            <span className="font-bold text-white text-xs">ช่องทางเข้าแบบด่วนและง่ายที่สุด</span>
          </div>
          <p className="text-[10px] text-gray-400 leading-relaxed">
            ระบบตรวจพบข้อมูลผู้ดูแลระบบเรียบร้อยแล้ว แตะปุ่มด้านล่างเพื่อข้ามการกรอกแบบฟอร์มและเชื่อมต่อหลังบ้านจำลองได้ทันที
          </p>
          <button
            type="button"
            onClick={handleQuickLogin}
            className="w-full h-10 bg-gradient-to-r from-cyan-500 via-teal-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-slate-950 font-black text-xs rounded-xl transition shadow-lg flex items-center justify-center gap-1.5 active:scale-95 duration-100"
          >
            <LogIn className="w-4 h-4 text-slate-950" />
            <span>เข้าสู่ระบบหลังบ้านทันที (One-Click Easy Sign-In) 🚀</span>
          </button>
        </div>

        <div className="relative my-6 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/5"></div>
          </div>
          <span className="relative bg-slate-950 px-3 text-[10px] text-gray-500 font-mono">หรือ ป้อนข้อมูลแบบปกติ</span>
        </div>

        <form onSubmit={handleAdminLogin} className="space-y-4 text-xs z-10 relative">
          <div className="space-y-1.5">
            <label className="text-gray-400 font-mono font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              <span>อีเมลผู้ดูแลระบบ (Admin Email)</span>
            </label>
            <input
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              required
              className="w-full bg-slate-900 text-white rounded-xl px-3.5 py-2.5 border border-white/10 focus:border-cyan-400 focus:outline-none transition"
              placeholder="admin@example.com"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-gray-400 font-mono font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              <span>รหัสผ่านเข้าหลังบ้าน (Password)</span>
            </label>
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              required
              className="w-full bg-slate-900 text-white rounded-xl px-3.5 py-2.5 border border-white/10 focus:border-cyan-400 focus:outline-none transition font-mono"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="w-full h-11 bg-slate-900 hover:bg-slate-850 border border-white/10 text-white hover:border-cyan-400/50 font-bold rounded-xl transition flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4 text-cyan-400" />
            <span>เข้าสู่ระบบด้วยชื่อบัญชี (Manual Log In)</span>
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in text-xs">
      
      {/* Admin Title / Connection Block */}
      <div className="glass-panel rounded-3xl p-6 border border-white/5 relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-cyan-950/10">
        <div className="absolute right-0 top-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl"></div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <span className="bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono font-bold tracking-widest px-2.5 py-0.5 rounded-full text-[10px]">
              แผงผู้ดูแลระบบหลังบ้านจำลอง (WEB CONSOLE PORTAL)
            </span>
            <h2 className="text-xl font-display font-black text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-cyan-400" />
              <span>AndamanCoin Backend Administrator</span>
            </h2>
            <p className="text-gray-400 max-w-2xl text-[11px] leading-relaxed">
              ยินดีต้อนรับสู่แดชบอร์ดหลังบ้านสำหรับการจัดการฐานข้อมูลของระบบผ่านเว็บเบราว์เซอร์ คุณสามารถดูรายชื่อผู้ใช้งาน จัดการปรับแต่งเหรียญรางวัลของทุกบัญชี และตรวจสอบกิจกรรมการรักษ์ทะเลได้ในหน้านี้
            </p>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <a 
              href="https://console.firebase.google.com/" 
              target="_blank" 
              referrerPolicy="no-referrer"
              className="px-4 py-2.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/30 text-cyan-300 font-bold font-mono rounded-xl transition flex items-center gap-1.5 text-[11px]"
            >
              <ExternalLink className="w-4 h-4" />
              <span>เปิด Firebase Console</span>
            </a>

            <button
              onClick={handleAdminLogout}
              className="px-4 py-2.5 bg-red-950/60 hover:bg-red-900/60 border border-red-500/30 text-red-300 font-bold font-mono rounded-xl transition flex items-center gap-1.5 text-[11px]"
            >
              <Lock className="w-4 h-4 text-red-400" />
              <span>ออกจากระบบแอดมิน</span>
            </button>
          </div>
        </div>

        {/* Project ID info banner */}
        <div className="mt-4 bg-slate-900/60 rounded-xl p-3 border border-white/5 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between text-gray-400 font-mono text-[10px]">
          <div>
            <span className="text-gray-500">รหัสฐานข้อมูล (Firebase Project ID):</span>{" "}
            <span className="text-cyan-400 font-bold">{firebaseProjectId}</span>
          </div>
          <div className="flex gap-2 text-[9px] text-gray-500">
            <span>● Firestore Online</span>
            <span>● Real-time sync</span>
          </div>
        </div>
      </div>

      {/* Admin Fast Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-panel rounded-2xl p-4 border border-white/5 space-y-1 text-left">
          <span className="text-gray-400 font-mono text-[10px] block">บัญชีทั้งหมดในระบบ</span>
          <span className="text-lg font-black text-white font-mono">{users.length} <span className="text-xs text-gray-500">คน</span></span>
        </div>
        <div className="glass-panel rounded-2xl p-4 border border-white/5 space-y-1 text-left">
          <span className="text-gray-400 font-mono text-[10px] block">เหรียญ AND ในระบบทั้งหมด</span>
          <span className="text-lg font-black text-amber-400 font-mono">
            {totalUserBalance.toLocaleString()} <span className="text-xs text-gray-500">AND</span>
          </span>
        </div>
        <div className="glass-panel rounded-2xl p-4 border border-white/5 space-y-1 text-left">
          <span className="text-gray-400 font-mono text-[10px] block">กิจกรรมที่ส่งเข้ามา</span>
          <span className="text-lg font-black text-emerald-400 font-mono">{activities.length} <span className="text-xs text-gray-500">ครั้ง</span></span>
        </div>
        <div className="glass-panel rounded-2xl p-4 border border-white/5 space-y-1 text-left">
          <span className="text-gray-400 font-mono text-[10px] block">ขยะที่ทำความสะอาดรวม</span>
          <span className="text-lg font-black text-cyan-400 font-mono">
            {(activities.filter(a => a.type === "recycling").length * 5 + 12090).toLocaleString()} <span className="text-xs text-gray-500">Kg</span>
          </span>
        </div>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 p-3.5 rounded-2xl flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-950/60 border border-red-500/40 text-red-200 p-3.5 rounded-2xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Admin Workspace Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* User Management List Column */}
        <div className="lg:col-span-7 glass-panel rounded-3xl p-5 border border-white/5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h3 className="font-display font-bold text-sm text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              <span>รายชื่อผู้ใช้งานและเหรียญรางวัลในระบบ</span>
            </h3>
            <span className="text-[10px] text-gray-400 font-mono font-medium">Real-time sync</span>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="ค้นหาผู้ใช้ด้วย อีเมล หรือ ชื่อจริง..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 text-white rounded-xl pl-10 pr-4 py-2.5 border border-white/5 focus:border-cyan-400 focus:outline-none"
            />
          </div>

          {/* User List scroll */}
          <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-2">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-500 font-mono">
                ไม่พบรายชื่อผู้ใช้งานที่ตรงตามตัวกรอง
              </div>
            ) : (
              filteredUsers.map((u) => (
                <button
                  key={u.email}
                  onClick={() => setSelectedUser(u)}
                  className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition ${
                    selectedUser?.email === u.email 
                      ? "bg-cyan-950/30 border-cyan-400/50" 
                      : "bg-slate-900/40 border-white/5 hover:bg-slate-900/80"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <img 
                      src={u.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=40&q=40"} 
                      alt="" 
                      className="w-8 h-8 rounded-full object-cover shrink-0" 
                    />
                    <div className="space-y-0.5">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span>{u.name}</span>
                        <span className={`text-[8px] font-bold font-mono px-1.5 py-0.5 rounded-full ${
                          u.role === "volunteer" ? "bg-emerald-950 text-emerald-400 border border-emerald-900" :
                          u.role === "fisherman" ? "bg-blue-950 text-blue-400 border border-blue-900" :
                          u.role === "business" ? "bg-purple-950 text-purple-400 border border-purple-900" :
                          "bg-yellow-950 text-yellow-400 border border-yellow-900"
                        }`}>
                          {u.role}
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono">{u.email}</div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1 justify-end">
                      <Coins className="w-3.5 h-3.5" />
                      <span>{u.balance} AND</span>
                    </div>
                    <div className="text-[9px] text-gray-500 font-mono mt-0.5">
                      ฐาน: {REGIONS.find(r => r.id === u.regionId)?.name || u.regionId}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Selected User Details and Actions */}
        <div className="lg:col-span-5 space-y-6">
          {selectedUser ? (
            <div className="glass-panel rounded-3xl p-5 border border-white/5 space-y-5 bg-slate-900/40 relative">
              <h3 className="font-display font-bold text-sm text-white flex items-center gap-2 border-b border-white/5 pb-3">
                <Settings className="w-4 h-4 text-cyan-400" />
                <span>แผงควบคุมบัญชีผู้ใช้</span>
              </h3>

              {/* User Bio Card */}
              <div className="flex items-center gap-3.5 bg-slate-950/60 p-3.5 rounded-2xl border border-white/5">
                <img 
                  src={selectedUser.avatarUrl} 
                  alt="" 
                  className="w-12 h-12 rounded-full object-cover border-2 border-cyan-400 shrink-0 shadow-lg" 
                />
                <div className="space-y-1 min-w-0">
                  <div className="font-bold text-white text-[13px] truncate">{selectedUser.name}</div>
                  <div className="text-[10px] text-gray-400 font-mono truncate leading-none">{selectedUser.email}</div>
                  <div className="flex gap-1.5 items-center mt-1">
                    <span className="text-[9px] bg-cyan-500/10 text-cyan-400 px-1.5 py-0.5 rounded border border-cyan-500/10 uppercase font-bold font-mono">
                      {selectedUser.role}
                    </span>
                    <span className="text-[9px] text-gray-500 font-mono">
                      ฐาน: {REGIONS.find(r => r.id === selectedUser.regionId)?.name || selectedUser.regionId}
                    </span>
                  </div>
                </div>
              </div>

              {/* 1. Modify & Refill Coins */}
              <div className="space-y-3 p-3.5 rounded-2xl bg-slate-900/60 border border-white/5">
                <label className="text-gray-300 font-bold block flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>จัดการยอดเงิน & เติมเหรียญรางวัล (Coin Controls)</span>
                </label>
                
                <input
                  type="number"
                  placeholder="ป้อนจำนวนเหรียญ (เช่น 50, 100, 500)..."
                  value={coinAdjustment}
                  onChange={(e) => setCoinAdjustment(e.target.value)}
                  className="w-full bg-slate-950 text-white rounded-xl px-3 py-2.5 border border-white/10 focus:border-amber-400 focus:outline-none font-mono text-center text-sm"
                />

                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleAddCoins(selectedUser.email, parseInt(coinAdjustment))}
                    className="py-2.5 px-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-black rounded-xl transition text-center text-[10px] uppercase tracking-wide active:scale-95 duration-100"
                  >
                    ➕ เติมเพิ่ม
                  </button>
                  <button
                    onClick={() => handleSubtractCoins(selectedUser.email, parseInt(coinAdjustment))}
                    className="py-2.5 px-1 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-slate-950 font-black rounded-xl transition text-center text-[10px] uppercase tracking-wide active:scale-95 duration-100"
                  >
                    ➖ หักออก
                  </button>
                  <button
                    onClick={() => handleAdjustBalance(selectedUser.email, parseInt(coinAdjustment))}
                    className="py-2.5 px-1 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black rounded-xl transition text-center text-[10px] uppercase tracking-wide active:scale-95 duration-100"
                  >
                    ＝ ตั้งยอดตรง
                  </button>
                </div>
                
                <div className="flex justify-between items-center text-[10px] text-gray-400 font-mono pt-1">
                  <span>ยอดปัจจุบันในระบบจริง:</span>
                  <span className="text-amber-400 font-bold">{selectedUser.balance} AND</span>
                </div>
              </div>

              {/* 2. Modify Profile Details */}
              <div className="space-y-3.5 p-3.5 rounded-2xl bg-slate-900/60 border border-white/5 text-left">
                <label className="text-gray-300 font-bold block flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>แก้ไขข้อมูลโปรไฟล์จริง (Real Profile Details)</span>
                </label>

                {/* Name */}
                <div className="space-y-1">
                  <span className="text-[10px] text-gray-400 font-mono block">ชื่อจริง / นามแฝงผู้เข้าร่วม</span>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-slate-950 text-white rounded-xl px-3 py-2 border border-white/5 focus:border-cyan-400 focus:outline-none"
                    placeholder="กรอกชื่อจริงหรือชื่อเล่น..."
                  />
                </div>

                {/* Region */}
                <div className="space-y-1">
                  <span className="text-[10px] text-gray-400 font-mono block">ฐานปฏิบัติการรักษ์ทะเล (Region)</span>
                  <select
                    value={editRegion}
                    onChange={(e) => setEditRegion(e.target.value)}
                    className="w-full bg-slate-950 text-white rounded-xl px-3 py-2 border border-white/5 focus:border-cyan-400 focus:outline-none"
                  >
                    {REGIONS.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.country})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Avatar URL */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-gray-400 font-mono block">รูปประจำตัว (Avatar Image URL)</span>
                  <input
                    type="text"
                    value={editAvatar}
                    onChange={(e) => setEditAvatar(e.target.value)}
                    className="w-full bg-slate-950 text-white text-[10px] font-mono rounded-xl px-3 py-2 border border-white/5 focus:border-cyan-400 focus:outline-none"
                    placeholder="ลิงก์รูปภาพประจำตัว..."
                  />

                  {/* Quick Avatar Presets */}
                  <div className="flex gap-1.5 overflow-x-auto py-1">
                    {[
                      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80",
                      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80",
                      "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=120&q=80",
                      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=120&q=80",
                    ].map((presetUrl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setEditAvatar(presetUrl)}
                        className={`w-7 h-7 rounded-full overflow-hidden border shrink-0 transition ${
                          editAvatar === presetUrl ? "border-cyan-400 scale-110" : "border-white/10 hover:border-white/30"
                        }`}
                      >
                        <img src={presetUrl} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Password Input Field */}
                <div className="space-y-1">
                  <span className="text-[10px] text-gray-400 font-mono block flex items-center gap-1">
                    <KeyRound className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>รหัสผ่านผู้ใช้งาน (Member Password)</span>
                  </span>
                  <input
                    type="text"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full bg-slate-950 text-white rounded-xl px-3 py-2 border border-white/5 focus:border-cyan-400 focus:outline-none font-mono text-[11px]"
                    placeholder="ป้อนรหัสผ่านใหม่ที่นี่..."
                  />
                </div>

                {/* Action Save Button */}
                <button
                  onClick={() => handleSaveProfileDetails(selectedUser.email)}
                  className="w-full py-2.5 bg-gradient-to-r from-cyan-950 to-blue-950 hover:from-cyan-900 hover:to-blue-900 border border-cyan-400/30 text-cyan-300 font-bold rounded-xl transition text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 duration-100 mt-2"
                >
                  <span>💾 บันทึกและแก้ไขโปรไฟล์ลงระบบจริง</span>
                </button>
              </div>

              {/* 3. Modify Role */}
              <div className="space-y-2 p-3.5 rounded-2xl bg-slate-900/60 border border-white/5 text-left">
                <label className="text-gray-300 font-bold block flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>เปลี่ยนตำแหน่งสิทธิ์การใช้งาน (Modify Role)</span>
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {["volunteer", "fisherman", "business", "tourist"].map((r) => (
                    <button
                      key={r}
                      onClick={() => handleChangeRole(selectedUser.email, r as any)}
                      className={`py-1.5 px-2 text-center rounded-lg border text-[10px] font-semibold transition ${
                        selectedUser.role === r 
                          ? "bg-cyan-950 border-cyan-400 text-white" 
                          : "bg-slate-950/60 border-white/5 text-gray-400 hover:text-white"
                      }`}
                    >
                      {r.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Warning Notice */}
              <div className="bg-slate-950/60 p-3 rounded-xl border border-white/5 text-[10px] text-gray-500 leading-relaxed text-left">
                <div className="font-bold text-gray-400 mb-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>การเขียนลงฐานข้อมูลจริง (Firestore Sync)</span>
                </div>
                ข้อมูลทุกชิ้นจะเชื่อมต่อตรงกับ Cloud Firestore ของโครงการและส่งผลต่อโปรไฟล์และยอดเงินของผู้ใช้งานจริงทันที
              </div>
            </div>
          ) : (
            <div className="glass-panel rounded-3xl p-6 border border-white/5 text-center py-12 text-gray-500 space-y-3">
              <Users className="w-10 h-10 text-gray-700 mx-auto animate-pulse" />
              <div className="font-bold text-gray-400">กรุณาเลือกผู้ใช้จากแถบซ้าย</div>
              <p className="text-[10px] max-w-xs mx-auto text-gray-500">
                แตะเลือกบัญชีเพื่อดูรายละเอียดความร่วมมือ และดำเนินการเติม/หักเหรียญและแก้ไขชื่อ/รูปภาพ/ภูมิภาคในฐานข้อมูลจริง
              </p>
            </div>
          )}
        </div>

      </div>

      {/* BANKING SYSTEM: TRANSACTIONAL APPROVALS PANEL */}
      <div className="glass-panel rounded-3xl p-5 border border-white/5 space-y-4 bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950/20">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <h3 className="font-display font-bold text-sm text-white flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
            <span>อนุมัติธุรกรรมโอนเงิน/เหรียญระหว่างบัญชี (Pending Banking Approvals)</span>
          </h3>
          <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] px-2 py-0.5 rounded-full font-mono font-bold uppercase">
            ต้องการความอนุมัติจากทีมหลังบ้าน
          </span>
        </div>

        {/* List of pending transfers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h4 className="text-[11px] font-bold text-gray-400 uppercase font-mono">รายการที่รอการดำเนินการ ({transfers.filter(t => t.status === "pending").length})</h4>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
              {transfers.filter(t => t.status === "pending").length === 0 ? (
                <div className="bg-slate-900/30 rounded-2xl p-6 text-center text-gray-500 text-[11px]">
                  ไม่มีคำขอโอนเงินรอดำเนินการในระบบขณะนี้
                </div>
              ) : (
                transfers.filter(t => t.status === "pending").map((t) => (
                  <div key={t.id} className="bg-slate-900/60 border border-white/5 p-4 rounded-2xl space-y-3 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-cyan-500"></div>
                    <div className="flex justify-between items-start pl-1">
                      <div className="space-y-1">
                        <span className="text-[9px] text-cyan-400 font-mono font-bold block">รหัสธุรกรรม: {t.id}</span>
                        <div className="text-[11px] text-white">
                          ผู้โอน: <strong className="font-mono text-gray-300">{t.senderEmail}</strong>
                        </div>
                        <div className="text-[11px] text-white">
                          ผู้รับ: <strong className="font-mono text-gray-300">{t.recipientEmail}</strong>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black font-mono text-yellow-400">
                          {t.currency === "USD" ? "$" :
                           t.currency === "THB" ? "฿" :
                           t.currency === "JPY" ? "¥" :
                           t.currency === "GBP" ? "£" :
                           t.currency === "EUR" ? "€" : ""}
                          {t.amount.toLocaleString()} {t.currency}
                        </div>
                        <span className="text-[9px] text-gray-500 font-mono block mt-0.5">
                          {new Date(t.createdAt).toLocaleString("th-TH")}
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-950/40 p-2 rounded-xl text-[10px] text-gray-400 border border-white/5 font-sans">
                      คำอธิบาย: {t.description}
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 justify-end pt-1">
                      <button
                        onClick={() => handleRejectTransfer(t.id)}
                        className="px-3 py-1.5 bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 hover:border-red-500/40 text-red-400 font-bold rounded-lg transition text-[10px] flex items-center gap-1 active:scale-95 duration-100"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>ปฏิเสธ & คืนเงิน</span>
                      </button>
                      <button
                        onClick={() => handleApproveTransfer(t.id)}
                        className="px-3.5 py-1.5 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400 font-bold rounded-lg transition text-[10px] flex items-center gap-1 active:scale-95 duration-100"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>อนุมัติฝั่งผู้รับ</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* History of Processed Transfers */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-bold text-gray-400 uppercase font-mono">ประวัติการดำเนินการล่าล่าสุด ({transfers.filter(t => t.status !== "pending").length})</h4>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
              {transfers.filter(t => t.status !== "pending").length === 0 ? (
                <div className="bg-slate-900/30 rounded-2xl p-6 text-center text-gray-500 text-[11px]">
                  ไม่มีประวัติการโอนเงินที่เคยอนุมัติหรือปฏิเสธ
                </div>
              ) : (
                transfers.filter(t => t.status !== "pending").map((t) => (
                  <div key={t.id} className="bg-slate-900/30 border border-white/5 p-3 rounded-2xl flex items-center justify-between gap-4 text-left">
                    <div className="space-y-1">
                      <div className="text-[11px] text-white">
                        <span className="font-mono text-gray-400">{t.senderEmail}</span>โอนไปยัง <span className="font-mono text-gray-400">{t.recipientEmail}</span>
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono">
                        จำนวน: <strong className="text-gray-300">{t.amount} {t.currency}</strong> | {new Date(t.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      {t.status === "approved" ? (
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase font-mono">
                          APPROVED
                        </span>
                      ) : (
                        <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase font-mono">
                          REJECTED
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SHOP & REWARDS ADMINISTRATION SYSTEM */}
      <div className="glass-panel rounded-3xl p-5 border border-white/5 space-y-4 bg-gradient-to-br from-slate-900 via-slate-950 to-teal-950/15">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <h3 className="font-display font-bold text-sm text-white flex items-center gap-2">
            <Store className="w-4 h-4 text-teal-400" />
            <span>ระบบคลังสินค้าและการจัดการร้านค้าสากล (Universal Shop & Inventory Controls)</span>
          </h3>
          <span className="text-[10px] text-gray-400 font-mono font-medium">Real-time dynamic store setup</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Add Reward Item Form */}
          <div className="lg:col-span-5 bg-slate-950/40 p-4.5 rounded-2xl border border-white/5 text-left space-y-3.5">
            <h4 className="text-[11px] font-bold text-white uppercase font-mono flex items-center gap-1.5 border-b border-white/5 pb-2">
              <Plus className="w-4 h-4 text-teal-400" />
              <span>เพิ่มสินค้า / ของรางวัลใหม่ในร้าน</span>
            </h4>

            <form onSubmit={handleAddReward} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 font-mono block">ชื่อของรางวัลหรือบริการ</label>
                <input
                  type="text"
                  placeholder="เช่น: ตั๋วเรือข้ามฟาก, บัตรกำนัลโรงแรมรักษ์โลก"
                  value={newRewardTitle}
                  onChange={(e) => setNewRewardTitle(e.target.value)}
                  className="w-full bg-slate-900 text-white rounded-xl px-3 py-2 border border-white/5 focus:border-teal-400 focus:outline-none text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 font-mono block">ราคา (AND Coins)</label>
                  <input
                    type="number"
                    placeholder="เช่น 150"
                    value={newRewardCost}
                    onChange={(e) => setNewRewardCost(e.target.value)}
                    className="w-full bg-slate-900 text-white font-mono rounded-xl px-3 py-2 border border-white/5 focus:border-teal-400 focus:outline-none text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 font-mono block">จำนวนสต็อกสินค้า</label>
                  <input
                    type="number"
                    placeholder="เช่น 100"
                    value={newRewardStock}
                    onChange={(e) => setNewRewardStock(e.target.value)}
                    className="w-full bg-slate-900 text-white font-mono rounded-xl px-3 py-2 border border-white/5 focus:border-teal-400 focus:outline-none text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 font-mono block">หมวดหมู่สินค้า (Category)</label>
                <select
                  value={newRewardCategory}
                  onChange={(e) => setNewRewardCategory(e.target.value)}
                  className="w-full bg-slate-900 text-white rounded-xl px-3 py-2 border border-white/5 focus:border-teal-400 focus:outline-none text-xs font-mono"
                >
                  <option value="merchandise">สินค้าของที่ระลึก (Merchandise)</option>
                  <option value="voucher">บัตรกำนัล / บริการท่องเที่ยว (Voucher / Service)</option>
                  <option value="fiat_cash">เงินสด & ออมทรัพย์ (Cash Out)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 font-mono block">ลิงก์ภาพประกอบสินค้า (Image URL)</label>
                <input
                  type="text"
                  placeholder="https://images.unsplash.com/..."
                  value={newRewardImage}
                  onChange={(e) => setNewRewardImage(e.target.value)}
                  className="w-full bg-slate-900 text-white text-[10px] font-mono rounded-xl px-3 py-2 border border-white/5 focus:border-teal-400 focus:outline-none text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 font-mono block">รายละเอียดสินค้าสั้นๆ</label>
                <textarea
                  placeholder="อธิบายสิทธิพิเศษสำหรับผู้แลก..."
                  value={newRewardDesc}
                  onChange={(e) => setNewRewardDesc(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-900 text-white rounded-xl px-3 py-2 border border-white/5 focus:border-teal-400 focus:outline-none text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl transition text-[11px] flex items-center justify-center gap-1.5 active:scale-[0.97]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>ยืนยันการเพิ่มของรางวัลลงร้านค้า</span>
              </button>
            </form>
          </div>

          {/* Current Shop Items & Inventory Status */}
          <div className="lg:col-span-7 space-y-3">
            <h4 className="text-[11px] font-bold text-gray-400 uppercase font-mono text-left">รายการสินค้าในระบบร้านค้าทั้งหมด ({rewards.length})</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-2">
              {rewards.map((item) => (
                <div key={item.id} className="bg-slate-900/60 border border-white/5 rounded-2xl p-3 flex flex-col justify-between text-left space-y-3 relative overflow-hidden">
                  <div className="flex gap-2.5 items-start">
                    <img
                      src={item.image}
                      alt=""
                      className="w-12 h-12 rounded-xl object-cover shrink-0 border border-white/5 shadow"
                    />
                    <div className="space-y-1 min-w-0">
                      <h5 className="font-bold text-white text-[11px] leading-tight truncate">{item.title}</h5>
                      <span className="text-[9px] bg-teal-500/10 text-teal-400 border border-teal-500/20 px-1.5 py-0.5 rounded font-mono uppercase">
                        {item.category}
                      </span>
                      <p className="text-[10px] text-gray-500 line-clamp-1">{item.description}</p>
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-2 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-gray-500 font-mono block">ราคาแลก</span>
                      <strong className="text-amber-400 font-mono text-xs">{item.cost} AND</strong>
                    </div>

                    {/* Stock adjustments and Delete */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-slate-950/80 rounded-lg border border-white/5 px-2 py-0.5">
                        <button
                          onClick={() => handleUpdateStock(item.id, item.stock || 0, -1)}
                          className="text-gray-400 hover:text-white font-black text-xs px-1"
                        >
                          -
                        </button>
                        <span className="text-[11px] font-mono text-white px-2">สต็อก: {item.stock !== undefined ? item.stock : 99}</span>
                        <button
                          onClick={() => handleUpdateStock(item.id, item.stock || 0, 1)}
                          className="text-gray-400 hover:text-white font-black text-xs px-1"
                        >
                          +
                        </button>
                      </div>

                      <button
                        onClick={() => handleDeleteReward(item.id)}
                        className="p-1.5 bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 text-red-400 rounded-lg transition"
                        title="ลบออกจากร้านค้า"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Global Activity Feed */}
      <div className="glass-panel rounded-3xl p-5 border border-white/5 space-y-4">
        <h3 className="font-display font-bold text-sm text-white flex items-center gap-2 border-b border-white/5 pb-3">
          <FileText className="w-4 h-4 text-emerald-400" />
          <span>บันทึกกิจกรรมความร่วมมือทั้งหมดจากฐานข้อมูลหลังบ้าน (Global Activity Logs)</span>
        </h3>

        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
          {activities.length === 0 ? (
            <div className="text-center py-12 text-gray-500 font-mono">
              ยังไม่มีประวัติกิจกรรมส่งเข้าระบบจาก Firestore
            </div>
          ) : (
            activities.map((act) => (
              <div key={act.id} className="bg-slate-900/40 p-3 rounded-2xl border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-left">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${act.type === "recycling" ? "bg-cyan-400" : "bg-emerald-400"}`}></span>
                    <span className="font-bold text-white text-xs">{act.description}</span>
                  </div>
                  <div className="text-[10px] text-gray-500 font-mono flex flex-wrap gap-x-3 gap-y-1">
                    <span>วันที่: {act.date}</span>
                    <span>พิกัด: {REGIONS.find(r => r.id === act.region)?.name || act.region}</span>
                    <span>ID: {act.id}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-end sm:self-auto">
                  <span className="text-[11px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg">
                    +{act.coinEarned} AND
                  </span>
                  <span className="bg-emerald-500/20 text-emerald-300 font-bold text-[9px] px-2 py-0.5 rounded-md uppercase border border-emerald-500/10">
                    {act.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
