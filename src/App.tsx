import { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Coins, Heart, Compass, HelpCircle, Anchor, Star, BarChart3, TreePine, UserCheck, ShieldCheck, Award, Flame, LogOut, Edit, Database, History, ArrowDownLeft, ArrowUpRight, Search, MapPin, Wallet, TrendingUp } from "lucide-react";
import { INITIAL_ACTIVITIES } from "./data";
import { EcoActivity, UserProfile, StockHolding } from "./types";
import CoinVisualizer from "./components/CoinVisualizer";
import EcoAssistant from "./components/EcoAssistant";
import RegionExplorer from "./components/RegionExplorer";
import EarnSection from "./components/EarnSection";
import SpendSection from "./components/SpendSection";
import AuthGate from "./components/AuthGate";
import EditProfile from "./components/EditProfile";
import AdminPortal from "./components/AdminPortal";
import { 
  subscribeToUser, 
  subscribeToActivities, 
  updateUserProfile, 
  addUserActivity, 
  spendUserCoins,
  updateUserBalance,
  updateUserFiatBalances
} from "./firebaseService";
import FiatWalletSection from "./components/FiatWalletSection";
import StockTradingSection from "./components/StockTradingSection";

// Simulated monthly plastic cleanup collection data (Kg) across the 7 partner countries
const IMPACT_DATA = [
  { month: "ม.ค.", Thailand: 400, Myanmar: 200, Malaysia: 300, India: 150, Indonesia: 180, Maldives: 120, Japan: 90 },
  { month: "ก.พ.", Thailand: 550, Myanmar: 250, Malaysia: 380, India: 180, Indonesia: 220, Maldives: 160, Japan: 110 },
  { month: "มี.ค.", Thailand: 700, Myanmar: 310, Malaysia: 450, India: 220, Indonesia: 290, Maldives: 210, Japan: 140 },
  { month: "เม.ย.", Thailand: 850, Myanmar: 400, Malaysia: 520, India: 290, Indonesia: 360, Maldives: 250, Japan: 190 },
  { month: "พ.ค.", Thailand: 1100, Myanmar: 520, Malaysia: 640, India: 350, Indonesia: 450, Maldives: 310, Japan: 250 },
  { month: "มิ.ย.", Thailand: 1300, Myanmar: 680, Malaysia: 790, India: 430, Indonesia: 580, Maldives: 380, Japan: 310 },
  { month: "ก.ค.", Thailand: 1550, Myanmar: 840, Malaysia: 980, India: 550, Indonesia: 710, Maldives: 460, Japan: 380 },
];

export default function App() {
  // Balance is persistent in LocalStorage
  const [balance, setBalance] = useState<number>(() => {
    const saved = localStorage.getItem("andaman_coin_balance");
    return saved ? parseInt(saved) : 250; // default start with 250 AND
  });

  const [activities, setActivities] = useState<EcoActivity[]>(() => {
    const saved = localStorage.getItem("andaman_coin_activities");
    return saved ? JSON.parse(saved) : INITIAL_ACTIVITIES;
  });

  // User session state
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem("andaman_user_profile");
    return saved ? JSON.parse(saved) : null;
  });

  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Standalone Route Detection (separating backoffice website)
  const [isAdminRoute, setIsAdminRoute] = useState(() => {
    return window.location.pathname === "/admin";
  });

  useEffect(() => {
    const handleLocationChange = () => {
      setIsAdminRoute(window.location.pathname === "/admin");
    };
    window.addEventListener("popstate", handleLocationChange);
    return () => window.removeEventListener("popstate", handleLocationChange);
  }, []);

  const navigateTo = (path: string) => {
    window.history.pushState({}, "", path);
    setIsAdminRoute(path === "/admin");
  };

  // Active Tab: "hub" | "earn" | "spend" | "assistant" | "auth" | "fiat" | "stock"
  const [activeTab, setActiveTab] = useState<"hub" | "earn" | "spend" | "assistant" | "auth" | "fiat" | "stock">(() => {
    const saved = localStorage.getItem("andaman_user_profile");
    return saved ? "hub" : "auth";
  });
  
  // Selected region detail (for map highlighting)
  const [selectedRegionId, setSelectedRegionId] = useState<string>("thailand");

  // Ledger / Transaction History States
  const [ledgerView, setLedgerView] = useState<"personal" | "global">("personal");
  const [txSearch, setTxSearch] = useState("");
  const [txFilter, setTxFilter] = useState<"all" | "earn" | "spend">("all");

  // Real-time Activities Sync with Firebase Firestore
  useEffect(() => {
    const unsubscribe = subscribeToActivities((dbActivities) => {
      if (dbActivities && dbActivities.length > 0) {
        setActivities(dbActivities);
      } else {
        setActivities(INITIAL_ACTIVITIES);
      }
    });
    return () => unsubscribe();
  }, []);

  // Real-time Profile and Balance Sync with Firebase Firestore
  useEffect(() => {
    if (!userProfile?.email) return;

    const unsubscribe = subscribeToUser(userProfile.email, (dbUser) => {
      if (dbUser) {
        // Enforce multi-device session logout on password reset
        if (
          userProfile.sessionVersion !== undefined &&
          dbUser.sessionVersion !== undefined &&
          dbUser.sessionVersion > userProfile.sessionVersion
        ) {
          alert("🔒 แจ้งเตือนความปลอดภัย: รหัสผ่านของคุณได้รับการรีเซ็ตหรือเปลี่ยนใหม่แล้ว เซสชันใช้งานบนอุปกรณ์นี้ถูกยกเลิกเพื่อความปลอดภัยสูงสุด กรุณาเข้าสู่ระบบใหม่อีกครั้ง");
          setUserProfile(null);
          return;
        }

        setBalance(dbUser.balance);
        setUserProfile({
          email: dbUser.email,
          name: dbUser.name,
          role: dbUser.role,
          regionId: dbUser.regionId,
          avatarUrl: dbUser.avatarUrl,
          usdBalance: dbUser.usdBalance,
          thbBalance: dbUser.thbBalance,
          jpyBalance: dbUser.jpyBalance,
          gbpBalance: dbUser.gbpBalance,
          eurBalance: dbUser.eurBalance,
          portfolio: dbUser.portfolio,
          sessionVersion: dbUser.sessionVersion
        });
      }
    });

    return () => unsubscribe();
  }, [userProfile?.email]);

  // Sync state to local storage as fallback
  useEffect(() => {
    localStorage.setItem("andaman_coin_balance", balance.toString());
  }, [balance]);

  useEffect(() => {
    localStorage.setItem("andaman_coin_activities", JSON.stringify(activities));
  }, [activities]);

  useEffect(() => {
    if (userProfile) {
      localStorage.setItem("andaman_user_profile", JSON.stringify(userProfile));
      // Update region selection to match user base region
      setSelectedRegionId(userProfile.regionId);
    } else {
      localStorage.removeItem("andaman_user_profile");
    }
  }, [userProfile]);

  const handleLogin = (profile: UserProfile) => {
    setUserProfile(profile);
    setActiveTab("hub"); // Go to dashboard after login
  };

  const handleLogout = () => {
    setUserProfile(null);
    setActiveTab("hub");
  };

  const handleEarnCoins = async (amount: number, title: string, details: string) => {
    const isRecycling = title.includes("รีไซเคิล") || title.toLowerCase().includes("recycle") || details.includes("กิโลกรัม");
    const newActivityData = {
      type: (isRecycling ? "recycling" : "cleanup") as "recycling" | "cleanup",
      region: selectedRegionId,
      date: new Date().toISOString().split("T")[0],
      description: `${title}: ${details}`,
      coinEarned: amount,
      quantityDetails: details,
      status: "verified" as const
    };

    if (userProfile?.email) {
      try {
        await addUserActivity(userProfile.email, newActivityData);
      } catch (error) {
        console.error("Error saving activity to Firestore:", error);
        // Local fallback
        setBalance(prev => prev + amount);
        const fallbackAct: EcoActivity = {
          id: `act-${Date.now()}`,
          ...newActivityData
        };
        setActivities(prev => [fallbackAct, ...prev]);
      }
    } else {
      setBalance(prev => prev + amount);
      const fallbackAct: EcoActivity = {
        id: `act-${Date.now()}`,
        ...newActivityData
      };
      setActivities(prev => [fallbackAct, ...prev]);
    }
  };

  const handleSpendCoins = (amount: number, description: string, details: string): boolean => {
    if (balance < amount) return false;
    
    const actType = description.includes("ชำระเงิน") ? ("payment" as const) : ("spend" as const);
    const newActivityData = {
      type: actType,
      region: selectedRegionId,
      date: new Date().toISOString().split("T")[0],
      description: description,
      coinEarned: -amount,
      quantityDetails: details,
      status: "verified" as const
    };

    if (userProfile?.email) {
      addUserActivity(userProfile.email, newActivityData)
        .catch((err) => {
          console.error("Error saving spend activity to Firestore:", err);
          // Local fallback in case of Firestore error
          setBalance(prev => prev - amount);
          const fallbackAct: EcoActivity = {
            id: `act-${Date.now()}`,
            ...newActivityData
          };
          setActivities(prev => [fallbackAct, ...prev]);
        });
    } else {
      setBalance(prev => prev - amount);
      const fallbackAct: EcoActivity = {
        id: `act-${Date.now()}`,
        ...newActivityData
      };
      setActivities(prev => [fallbackAct, ...prev]);
    }
    return true;
  };

  // Derive aggregated stats based on activities logged + hardcoded defaults
  const totalCleanups = 333 + activities.filter(a => a.type === "cleanup").length;
  const totalPlasticKg = 12090 + (activities.filter(a => a.type === "recycling").length * 5);
  const totalMembers = 2760;

  // Filter and compute ledger records for transaction history
  const filteredLedger = activities.filter(tx => {
    // 1. Filter by personal vs global
    if (ledgerView === "personal") {
      if (userProfile?.email) {
        // Show current user's activities (case-insensitive email matching)
        if (!tx.userEmail || tx.userEmail.toLowerCase().trim() !== userProfile.email.toLowerCase().trim()) {
          return false;
        }
      } else {
        // If not logged in, they can only see local mock/placeholder/recent activities which don't have other user's email
        if (tx.userEmail) return false;
      }
    }
    
    // 2. Filter by tx type (earn vs spend)
    if (txFilter === "earn" && tx.coinEarned <= 0) return false;
    if (txFilter === "spend" && tx.coinEarned >= 0) return false;

    // 3. Filter by search query
    if (txSearch) {
      const q = txSearch.toLowerCase();
      const matchDesc = tx.description?.toLowerCase().includes(q);
      const matchDetails = tx.quantityDetails?.toLowerCase().includes(q);
      const matchRegion = tx.region?.toLowerCase().includes(q);
      const matchHash = tx.id?.toLowerCase().includes(q);
      if (!matchDesc && !matchDetails && !matchRegion && !matchHash) return false;
    }

    return true;
  });

  // Dedicated Separate Backoffice Website Route
  if (isAdminRoute) {
    return (
      <div className="min-h-screen bg-slate-950 text-gray-100 flex flex-col justify-between font-sans">
        {/* Standalone Admin Header */}
        <header className="relative w-full border-b border-cyan-500/10 py-5 px-6 bg-slate-900 overflow-hidden shadow-lg select-none">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-950/20 via-slate-950 to-slate-950"></div>
          
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md cyan-glow select-none">
                <Database className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-display font-black tracking-wider text-white flex items-center gap-2">
                  ANDAMANCOIN <span className="bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">BACKOFFICE CONSOLE</span>
                </h1>
                <p className="text-[10px] text-gray-400 font-mono tracking-wider uppercase">
                  Central Database Management System • v1.2.0 • Real-time Cloud Sync
                </p>
              </div>
            </div>

            <button
              onClick={() => navigateTo("/")}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 hover:text-white border border-white/5 rounded-xl text-xs font-semibold transition flex items-center gap-2"
            >
              <Compass className="w-4 h-4 text-cyan-400" />
              <span>กลับสู่หน้าเว็บหลักแอปพลิเคชัน (Main App)</span>
            </button>
          </div>
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 space-y-8 relative z-10">
          <AdminPortal activities={activities} />
        </main>

        <footer className="w-full text-center py-5 border-t border-white/5 text-[10px] text-gray-600 font-mono bg-slate-900 select-none">
          <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>© 2026 ANDAMANCOIN CENTRAL DATABASE CONSOLE. ALL RIGHTS RESERVED.</div>
            <div className="flex gap-3 text-[9px]">
              <span>Security Patch: Live (AES-256)</span>
              <span>•</span>
              <span>Firestore Connection: Connected</span>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-gray-100 flex flex-col justify-between font-sans">
      
      {/* Worldcoin-Style Real-time Currency Ticker Bar */}
      <div className="w-full bg-slate-950 border-b border-white/5 py-1.5 px-4 overflow-hidden select-none">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-[10px] font-mono text-gray-400">
          <div className="flex items-center gap-4 overflow-x-auto whitespace-nowrap scrollbar-none py-0.5">
            <span className="flex items-center gap-1.5 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-bold text-white">ANDAMANCOIN INDEX:</span>
              <span className="text-yellow-400 font-bold">1 AND ≈ 5.24 THB</span>
              <span className="text-emerald-400">(+3.42% 24h)</span>
            </span>
            <span className="text-gray-700">|</span>
            <span className="shrink-0">CIRCULATING SUPPLY: <strong className="text-gray-200">1,452,980 AND</strong></span>
            <span className="text-gray-700">|</span>
            <span className="shrink-0">SEA BLOCK HEIGHT: <strong className="text-gray-200">#412,853</strong></span>
            <span className="text-gray-700">|</span>
            <span className="shrink-0">PLASTIC OFFSET RATIO: <strong className="text-emerald-400">100% COLLATERALIZED</strong></span>
            <span className="text-gray-700">|</span>
            <span className="shrink-0">TRUST INDEX: <strong className="text-cyan-400">AA+ STABLE</strong></span>
          </div>
          <div className="hidden md:flex items-center gap-3 shrink-0">
            <span className="bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 rounded text-[9px] text-cyan-400 font-bold uppercase">
              SECURE FIRESTORE SYNC
            </span>
          </div>
        </div>
      </div>

      {/* Top Beautiful Ocean Header Banner */}
      <header className="relative w-full border-b border-white/5 py-6 px-4 md:px-8 bg-gradient-to-b from-slate-900 to-slate-950 overflow-hidden">
        {/* Abstract marine bubbles & waves */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-950/30 via-slate-950 to-slate-950"></div>
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl"></div>
        
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative z-10">
          
          {/* Logo & Slogan */}
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-cyan-400 via-teal-500 to-emerald-400 flex items-center justify-center text-white shadow-lg cyan-glow select-none">
                <svg viewBox="0 0 100 100" className="w-7 h-7 fill-none stroke-white stroke-[7] stroke-linecap-round">
                  <path d="M15,55 C30,40 40,40 55,55 C70,70 80,70 95,55" />
                  <path d="M15,40 C35,20 50,60 70,40" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-display font-black tracking-wider text-white">
                  ANDAMANCOIN <span className="text-yellow-400 text-sm font-semibold ml-1">AND</span>
                </h1>
                <p className="text-xs text-cyan-400 font-mono font-medium tracking-widest uppercase">
                  Marine Conservation &amp; Global Eco-Rewards System
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Thai Campaign Quote Slogan from original Image */}
          <div className="max-w-md text-right md:text-right text-xs text-gray-400 border-l md:border-l-0 md:border-r border-cyan-500/20 pl-4 md:pl-0 md:pr-4">
            <div className="font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-teal-200 to-yellow-200 text-sm">
              ร่วมพลังร่วมรักษ์สิ่งแวดล้อมอันดามันสากล
            </div>
            <p className="mt-1 leading-relaxed text-[11px]">
              เครือข่ายอนุรักษ์ชายฝั่งและระบบรางวัลระดับโลกที่ได้รับการยืนยันสิทธิ์ในระบบคลาวด์ แลกเปลี่ยนคุณค่าเพื่อร่วมดูแลสิ่งแวดล้อมอันดามันอย่างยั่งยืน
            </p>
          </div>

        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Main Dashboard Workspace (8 Cols) */}
        <div className="lg:col-span-8 space-y-8 flex flex-col justify-start">
          
          {/* Tab Selection Row */}
          <div className="flex bg-slate-900/60 p-1.5 rounded-2xl border border-white/5 gap-1 select-none flex-wrap sm:flex-nowrap">
            <button
              onClick={() => setActiveTab("hub")}
              className={`flex-1 min-w-[100px] h-12 rounded-xl text-[11px] sm:text-xs font-semibold tracking-wider transition flex items-center justify-center gap-2 ${
                activeTab === "hub"
                  ? "bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow shadow-cyan-950"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>Eco Hub</span>
            </button>

            <button
              onClick={() => setActiveTab("earn")}
              className={`flex-1 min-w-[100px] h-12 rounded-xl text-[11px] sm:text-xs font-semibold tracking-wider transition flex items-center justify-center gap-2 ${
                activeTab === "earn"
                  ? "bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow shadow-cyan-950"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Coins className="w-4 h-4" />
              <span>Earn AND</span>
            </button>

            <button
              onClick={() => setActiveTab("spend")}
              className={`flex-1 min-w-[100px] h-12 rounded-xl text-[11px] sm:text-xs font-semibold tracking-wider transition flex items-center justify-center gap-2 ${
                activeTab === "spend"
                  ? "bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow shadow-cyan-950"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Heart className="w-4 h-4" />
              <span>Spend AND</span>
            </button>

            <button
              onClick={() => setActiveTab("assistant")}
              className={`flex-1 min-w-[100px] h-12 rounded-xl text-[11px] sm:text-xs font-semibold tracking-wider transition flex items-center justify-center gap-2 relative ${
                activeTab === "assistant"
                  ? "bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow shadow-cyan-950"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-cyan-400 absolute top-2 right-4 animate-ping"></span>
              <HelpCircle className="w-4 h-4" />
              <span>Eco Help</span>
            </button>

            <button
              onClick={() => setActiveTab("fiat")}
              className={`flex-1 min-w-[100px] h-12 rounded-xl text-[11px] sm:text-xs font-semibold tracking-wider transition flex items-center justify-center gap-2 ${
                activeTab === "fiat"
                  ? "bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow shadow-cyan-950"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Wallet className="w-4 h-4 text-cyan-400" />
              <span>Fiat Wallet</span>
            </button>

            <button
              onClick={() => setActiveTab("stock")}
              className={`flex-1 min-w-[100px] h-12 rounded-xl text-[11px] sm:text-xs font-semibold tracking-wider transition flex items-center justify-center gap-2 ${
                activeTab === "stock"
                  ? "bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow shadow-cyan-950"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <span>เทรดหุ้น ADX</span>
            </button>

            <button
              onClick={() => setActiveTab("auth")}
              className={`flex-1 min-w-[100px] h-12 rounded-xl text-[11px] sm:text-xs font-semibold tracking-wider transition flex items-center justify-center gap-2 ${
                activeTab === "auth"
                  ? "bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow shadow-cyan-950"
                  : userProfile
                    ? "text-teal-400 hover:text-teal-300 hover:bg-white/5"
                    : "text-amber-400 hover:text-amber-300 hover:bg-white/5 border border-dashed border-amber-500/20"
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>{userProfile ? "บัญชีของฉัน" : "เข้าสู่ระบบ"}</span>
            </button>

            <button
              onClick={() => navigateTo("/admin")}
              className="flex-1 min-w-[100px] h-12 rounded-xl text-[11px] sm:text-xs font-semibold tracking-wider transition flex items-center justify-center gap-2 border bg-gradient-to-r from-cyan-950 to-slate-900 text-cyan-300 hover:text-white hover:border-cyan-400 border-cyan-500/20 shadow-inner active:scale-95 duration-100"
            >
              <Database className="w-4 h-4 shrink-0 text-cyan-400 animate-pulse" />
              <span>เปิดเว็บหลังบ้าน Admin 🖥️</span>
            </button>
          </div>

          {/* Tab Contents Viewport */}
          <div className="flex-1">
            {activeTab === "hub" && (
              <div className="space-y-8">
                {/* Geographics & Countries details */}
                <RegionExplorer onSelectRegion={(id) => setSelectedRegionId(id)} />

                {/* Shared Goals Summary Box */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Shared Goals & Milestones */}
                  <div className="glass-panel rounded-3xl p-6 border border-white/5 space-y-4">
                    <h3 className="font-display font-bold text-base text-white flex items-center gap-2 border-b border-white/5 pb-2">
                      <Star className="w-5 h-5 text-yellow-400" />
                      <span>เป้าหมายร่วมกันแดนอันดามัน (Eco Goals)</span>
                    </h3>
                    <ul className="space-y-3.5 text-xs text-gray-300">
                      <li className="flex items-start gap-3">
                        <span className="w-5 h-5 rounded-full bg-blue-950 border border-blue-900 flex items-center justify-center text-[11px] shrink-0">🗑️</span>
                        <div>
                          <div className="font-bold text-white">ลดขยะพลาสติกในทะเล</div>
                          <div className="text-gray-400 text-[10px] mt-0.5">กำจัดเศษขวดและเครื่องมือทำประมงที่ชายฝั่งทะเลร่วมกัน 7 ประเทศ</div>
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="w-5 h-5 rounded-full bg-emerald-950 border border-emerald-900 flex items-center justify-center text-[11px] shrink-0">🪸</span>
                        <div>
                          <div className="font-bold text-white">อนุรักษ์แนวปะการังและความหลากหลาย</div>
                          <div className="text-gray-400 text-[10px] mt-0.5">ดูแลความเข้มบูรณ์ของแนวปะการังน้ำตื้นและเต่าทะเล</div>
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-900 flex items-center justify-center text-[11px] shrink-0">⛵</span>
                        <div>
                          <div className="font-bold text-white">ส่งเสริมการท่องเที่ยวอย่างยั่งยืน</div>
                          <div className="text-gray-400 text-[10px] mt-0.5">จัดระเบียบที่พัก โฮมสเตย์ และเรือหางยาวคาร์บอนต่ำเป็นมิตรต่อทะเล</div>
                        </div>
                      </li>
                    </ul>
                  </div>

                  {/* Ocean Value Proposition Banner */}
                  <div className="glass-panel rounded-3xl p-6 border border-white/5 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-cyan-950/20">
                    <div className="absolute right-0 bottom-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl"></div>
                    <div>
                      <h4 className="font-mono text-[10px] text-cyan-400 font-bold uppercase tracking-widest mb-1.5">หนึ่งเหรียญ หนึ่งพลัง เพื่ออันดามันของเรา</h4>
                      <h3 className="font-display font-bold text-lg text-white leading-relaxed">
                        ONE COIN, ONE POWER,<br />FOR OUR ANDAMAN SEA
                      </h3>
                      <p className="text-xs text-gray-400 mt-2.5 leading-relaxed">
                        AndamanCoin ขับเคลื่อนโดยชุมชนเพื่อสนับสนุนเครือข่ายอนุรักษ์ ทุกครั้งที่คุณจัดเก็บขยะหรือรีไซเคิล ระบบจะสร้างรางวัลที่ใช้งานได้จริงในร้านพาร์ทเนอร์
                      </p>
                    </div>
                    <div className="flex gap-4 pt-4 border-t border-white/5 mt-4 text-[10px] text-gray-400 font-mono">
                      <div className="flex items-center gap-1"><Anchor className="w-3.5 h-3.5 text-cyan-400" /> โปร่งใส</div>
                      <div className="flex items-center gap-1"><TreePine className="w-3.5 h-3.5 text-emerald-400" /> ยั่งยืน</div>
                    </div>
                  </div>
                </div>

                {/* recharts Environmental Impact Chart */}
                <div className="glass-panel rounded-3xl p-6 border border-white/5 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <div>
                      <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-emerald-400" />
                        <span>ปริมาณขยะพลาสติกสะสมที่ลดได้รายเดือน (Monthly Environmental Impact)</span>
                      </h3>
                      <p className="text-[11px] text-gray-400 font-mono">สรุปน้ำหนักขยะขวดพลาสติกคัดแยกส่งรีไซเคิล (หน่วยเป็นกิโลกรัม)</p>
                    </div>
                  </div>
                  
                  {/* Recharts Component */}
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={IMPACT_DATA}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorThai" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorMalay" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorMyanmar" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#eab308" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#eab308" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorIndo" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25}/>
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorMaldives" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorJapan" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.25}/>
                            <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="month" stroke="rgba(255,255,255,0.4)" fontSize={10} fontStyle="italic" />
                        <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: "rgba(15, 23, 42, 0.95)", 
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: "12px",
                            fontSize: "11px",
                            color: "#fff"
                          }} 
                        />
                        <Area type="monotone" name="ประเทศไทย (Kg)" dataKey="Thailand" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorThai)" />
                        <Area type="monotone" name="มาเลเซีย (Kg)" dataKey="Malaysia" stroke="#3b82f6" strokeWidth={1.5} fillOpacity={1} fill="url(#colorMalay)" />
                        <Area type="monotone" name="เมียนมา (Kg)" dataKey="Myanmar" stroke="#eab308" strokeWidth={1.5} fillOpacity={1} fill="url(#colorMyanmar)" />
                        <Area type="monotone" name="อินโดนีเซีย (Kg)" dataKey="Indonesia" stroke="#ef4444" strokeWidth={1.5} fillOpacity={1} fill="url(#colorIndo)" />
                        <Area type="monotone" name="มัลดีฟส์ (Kg)" dataKey="Maldives" stroke="#10b981" strokeWidth={1.5} fillOpacity={1} fill="url(#colorMaldives)" />
                        <Area type="monotone" name="ญี่ปุ่น (Kg)" dataKey="Japan" stroke="#a855f7" strokeWidth={1.5} fillOpacity={1} fill="url(#colorJapan)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "earn" && (
              <EarnSection onEarnCoins={handleEarnCoins} activities={activities} />
            )}

            {activeTab === "spend" && (
              <SpendSection balance={balance} onSpendCoins={handleSpendCoins} />
            )}

            {activeTab === "assistant" && (
              <EcoAssistant onEarnCoins={handleEarnCoins} />
            )}

            {activeTab === "fiat" && (
              <FiatWalletSection
                userProfile={userProfile}
                balance={balance}
                onUpdateBalances={async (usd, thb, jpy, gbp, eur) => {
                  if (userProfile) {
                    const updatedProfile = {
                      ...userProfile,
                      usdBalance: usd,
                      thbBalance: thb,
                      jpyBalance: jpy,
                      gbpBalance: gbp,
                      eurBalance: eur,
                    } as UserProfile;
                    setUserProfile(updatedProfile);
                    
                    if (userProfile.email) {
                      try {
                        await updateUserFiatBalances(userProfile.email, usd, thb, jpy, gbp, eur);
                      } catch (err) {
                        console.error("Error updating fiat balances in Firestore:", err);
                      }
                    }
                  } else {
                    // Fallback for non-logged in demo user
                    const updatedProfile = {
                      email: "demo@andamancoisea.com",
                      name: "คุณผู้รักทะเลอันดามัน (Demo)",
                      role: "volunteer" as const,
                      regionId: "thailand",
                      avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80",
                      usdBalance: usd,
                      thbBalance: thb,
                      jpyBalance: jpy,
                      gbpBalance: gbp,
                      eurBalance: eur,
                    };
                    setUserProfile(updatedProfile);
                  }
                }}
                onEarnCoins={handleEarnCoins}
                onSpendCoins={handleSpendCoins}
              />
            )}

            {activeTab === "stock" && (
              <StockTradingSection
                userProfile={userProfile}
                onUpdatePortfolio={(updatedPortfolio, nextBalance, currency) => {
                  if (userProfile) {
                    setUserProfile({
                      ...userProfile,
                      portfolio: updatedPortfolio,
                      usdBalance: currency === "USD" ? nextBalance : userProfile.usdBalance,
                      thbBalance: currency === "THB" ? nextBalance : userProfile.thbBalance,
                    });
                  }
                }}
              />
            )}

            {activeTab === "auth" && (
              <div>
                {userProfile ? (
                  isEditingProfile ? (
                    <EditProfile
                      userProfile={userProfile}
                      onSave={async (updated) => {
                        if (userProfile?.email) {
                          try {
                            await updateUserProfile(userProfile.email, {
                              name: updated.name,
                              role: updated.role,
                              regionId: updated.regionId,
                              avatarUrl: updated.avatarUrl
                            });
                          } catch (err) {
                            console.error("Error updating profile in Firestore:", err);
                          }
                        }
                        setUserProfile(updated);
                        setIsEditingProfile(false);
                      }}
                      onCancel={() => setIsEditingProfile(false)}
                    />
                  ) : (
                    <div className="glass-panel rounded-3xl p-6 md:p-8 space-y-6 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl"></div>
                      
                      <div className="flex flex-col md:flex-row items-center md:items-start gap-6 pb-6 border-b border-white/5">
                        <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-cyan-400/30 shadow-lg relative shrink-0 flex flex-col items-center">
                          <img src={userProfile.avatarUrl} alt={userProfile.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="space-y-2 text-center md:text-left flex-1">
                          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                            <h3 className="font-display font-black text-2xl text-white">{userProfile.name}</h3>
                            <span className="bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-full">
                              VERIFIED CITIZEN
                            </span>
                            <button
                              onClick={() => setIsEditingProfile(true)}
                              className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-[10px] font-bold font-mono transition flex items-center gap-1 shadow-sm"
                            >
                              <Edit className="w-3 h-3" />
                              <span>แก้ไขโปรไฟล์</span>
                            </button>
                          </div>
                          <p className="text-xs text-gray-400 font-mono">{userProfile.email}</p>
                          
                          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-1 text-xs">
                            <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-3 py-1 rounded-lg font-bold flex items-center gap-1.5">
                              <Coins className="w-3.5 h-3.5" />
                              {balance} AND
                            </span>
                            <span className="bg-teal-500/10 border border-teal-500/20 text-teal-300 px-3 py-1 rounded-lg flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5 text-yellow-400" />
                              {userProfile.role === "volunteer" ? "🌿 อาสาสมัครอนุรักษ์" : userProfile.role === "fisherman" ? "🎣 ผู้พิทักษ์เลท้องถิ่น" : userProfile.role === "business" ? "🏬 ร้านค้าพาร์ทเนอร์สีเขียว" : "✈️ นักท่องเที่ยวรักษ์โลก"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Stats & Badges Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Active Badges */}
                        <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-5 space-y-4">
                          <h4 className="font-display font-bold text-sm text-white flex items-center gap-1.5">
                            <Award className="w-4 h-4 text-yellow-400" />
                            <span>เข็มเกียรติยศของคุณ (My Achievements)</span>
                          </h4>
                          <div className="space-y-3">
                            <div className="flex items-center gap-3 bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
                              <span className="text-xl">🌴</span>
                              <div>
                                <div className="font-bold text-xs text-white">ผู้คุ้มครองอันดามันรุ่นเยาว์</div>
                                <div className="text-[10px] text-gray-400 font-mono">ลงทะเบียนเข้าร่วมสัญญารักษ์โลกครั้งแรกสำเร็จ</div>
                              </div>
                            </div>
                            {balance >= 500 && (
                              <div className="flex items-center gap-3 bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
                                <span className="text-xl">🪙</span>
                                <div>
                                  <div className="font-bold text-xs text-white">เศรษฐีเหรียญรักษ์โลก</div>
                                  <div className="text-[10px] text-gray-400 font-mono">ครอบครองเหรียญสะสมเกินกว่า 500 AND</div>
                                </div>
                              </div>
                            )}
                            {activities.length > INITIAL_ACTIVITIES.length && (
                              <div className="flex items-center gap-3 bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
                                <span className="text-xl">🗑️</span>
                                <div>
                                  <div className="font-bold text-xs text-white">ผู้ทำความสะอาดชายหาดตัวจริง</div>
                                  <div className="text-[10px] text-gray-400 font-mono">จัดเก็บและคัดแยกขยะพลาสติกจริงด้วยตนเอง</div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Info Panel / Pledge */}
                        <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-5 space-y-3.5 flex flex-col justify-between">
                          <div>
                            <h4 className="font-display font-bold text-sm text-white flex items-center gap-1.5">
                              <Flame className="w-4 h-4 text-cyan-400" />
                              <span>คำปฏิญญารักษ์อันดามัน (Pledge)</span>
                            </h4>
                            <p className="text-xs text-gray-400 leading-relaxed mt-2 italic">
                              "ข้าพเจ้าขอปฏิญาณว่าจะดูแลรักษาและปกป้องท้องทะเลอันดามัน ไม่ทิ้งขยะพลาสติกลงสู่ชายฝั่ง ทะนุถนอมแนวปะการัง และส่งเสริมความร่วมมือสีเขียวระหว่างชุมชนอย่างเต็มความสามารถ"
                            </p>
                          </div>
                          <button
                            onClick={handleLogout}
                            className="w-full h-10 bg-slate-900 hover:bg-red-950/40 border border-white/10 hover:border-red-500/20 text-gray-300 hover:text-red-400 rounded-xl transition text-xs font-mono font-bold flex items-center justify-center gap-1.5"
                          >
                            <LogOut className="w-4 h-4" />
                            <span>ออกจากระบบ (Sign Out Session)</span>
                          </button>
                        </div>
                      </div>

                      {/* Global Fiat Balances Quick View Card */}
                      <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-5 space-y-4">
                        <h4 className="font-display font-bold text-sm text-white flex items-center gap-1.5">
                          <Wallet className="w-4 h-4 text-cyan-400" />
                          <span>กระเป๋าเงินตราต่างประเทศของคุณ (My Global Fiat Balances)</span>
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                          <div className="bg-slate-900/60 border border-white/5 p-3 rounded-xl">
                            <div className="text-[10px] text-gray-500 font-mono">USD 🇺🇸</div>
                            <div className="font-mono font-bold text-xs text-white">${(userProfile.usdBalance ?? 1000).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                          </div>
                          <div className="bg-slate-900/60 border border-white/5 p-3 rounded-xl">
                            <div className="text-[10px] text-gray-500 font-mono">THB 🇹🇭</div>
                            <div className="font-mono font-bold text-xs text-white">฿{(userProfile.thbBalance ?? 30000).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                          </div>
                          <div className="bg-slate-900/60 border border-white/5 p-3 rounded-xl">
                            <div className="text-[10px] text-gray-500 font-mono">JPY 🇯🇵</div>
                            <div className="font-mono font-bold text-xs text-white">¥{(userProfile.jpyBalance ?? 150000).toLocaleString(undefined, { minimumFractionDigits: 0 })}</div>
                          </div>
                          <div className="bg-slate-900/60 border border-white/5 p-3 rounded-xl">
                            <div className="text-[10px] text-gray-500 font-mono">GBP 🇬🇧</div>
                            <div className="font-mono font-bold text-xs text-white">£{(userProfile.gbpBalance ?? 800).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                          </div>
                          <div className="bg-slate-900/60 border border-white/5 p-3 rounded-xl">
                            <div className="text-[10px] text-gray-500 font-mono">EUR 🇪🇺</div>
                            <div className="font-mono font-bold text-xs text-white">€{(userProfile.eurBalance ?? 900).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                          </div>
                        </div>
                      </div>

                      {/* Transaction History Section (Worldcoin-Style Ledger) */}
                      <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-5 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/5 pb-3">
                          <div className="flex items-center gap-2">
                            <History className="w-5 h-5 text-cyan-400" />
                            <div>
                              <h4 className="font-display font-bold text-sm text-white">ประวัติธุรกรรมย้อนหลัง (Transaction History)</h4>
                              <p className="text-[10px] text-gray-400 font-mono">ตรวจสอบธุรกรรมโปร่งใสผ่าน Andaman System Sync</p>
                            </div>
                          </div>
                          
                          {/* Ledger Type Tabs */}
                          <div className="flex gap-1 bg-slate-900 p-1 rounded-xl border border-white/10 text-[10px] font-mono">
                            <button
                              onClick={() => setLedgerView("personal")}
                              className={`px-3 py-1 rounded-lg transition ${ledgerView === "personal" ? "bg-cyan-600 text-white" : "text-gray-400 hover:text-white"}`}
                            >
                              ประวัติของฉัน
                            </button>
                            <button
                              onClick={() => setLedgerView("global")}
                              className={`px-3 py-1 rounded-lg transition ${ledgerView === "global" ? "bg-cyan-600 text-white" : "text-gray-400 hover:text-white"}`}
                            >
                              บัญชีสากล (Global Feed)
                            </button>
                          </div>
                        </div>

                        {/* Search & Filter Controls */}
                        <div className="flex flex-col sm:flex-row gap-3 text-xs">
                          <div className="flex-1 relative">
                            <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-2.5" />
                            <input
                              type="text"
                              placeholder="ค้นหาตามรายละเอียด หรือ รหัสธุรกรรม..."
                              value={txSearch}
                              onChange={(e) => setTxSearch(e.target.value)}
                              className="w-full bg-slate-900 text-white text-[11px] rounded-xl pl-8 pr-3 py-1.5 border border-white/10 focus:border-cyan-400 focus:outline-none placeholder:text-gray-600 font-mono"
                            />
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => setTxFilter("all")}
                              className={`px-2.5 py-1.5 rounded-xl font-mono text-[10px] transition ${txFilter === "all" ? "bg-white/15 text-white" : "text-gray-400 hover:bg-white/5"}`}
                            >
                              ทั้งหมด
                            </button>
                            <button
                              onClick={() => setTxFilter("earn")}
                              className={`px-2.5 py-1.5 rounded-xl font-mono text-[10px] transition ${txFilter === "earn" ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" : "text-gray-400 hover:bg-white/5"}`}
                            >
                              รายรับ (+)
                            </button>
                            <button
                              onClick={() => setTxFilter("spend")}
                              className={`px-2.5 py-1.5 rounded-xl font-mono text-[10px] transition ${txFilter === "spend" ? "bg-amber-500/10 border border-amber-500/20 text-amber-400" : "text-gray-400 hover:bg-white/5"}`}
                            >
                              รายจ่าย (-)
                            </button>
                          </div>
                        </div>

                        {/* Transaction List */}
                        <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                          {filteredLedger.length === 0 ? (
                            <div className="text-center py-10 text-gray-500 border border-dashed border-white/5 rounded-2xl font-mono text-xs">
                              <History className="w-8 h-8 mx-auto mb-2 opacity-20 text-cyan-400 animate-pulse" />
                              <p>ไม่พบรายการธุรกรรมย้อนหลัง</p>
                              <p className="text-[10px] text-gray-600 mt-1">เริ่มต้นร่วมกิจกรรมคัดแยกขยะเพื่อสะสมเหรียญได้เลย!</p>
                            </div>
                          ) : (
                            filteredLedger.map((tx, idx) => {
                              const isEarn = tx.coinEarned > 0;
                              // Generate fake consistent hash based on transaction id for extreme high fidelity
                              const txHash = `0x${Array.from(tx.id || "").map(c => String(c).charCodeAt(0).toString(16)).join("").substring(0, 8)}...${tx.id?.substring(tx.id.length - 4) || "8a1d"}`;
                              
                              return (
                                <div key={tx.id || idx} className="bg-slate-900/60 hover:bg-slate-900 border border-white/5 hover:border-white/10 p-3.5 rounded-2xl flex items-center justify-between transition duration-200">
                                  <div className="flex items-center gap-3">
                                    {/* Icon */}
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                                      isEarn 
                                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                                        : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                                    }`}>
                                      {isEarn ? <ArrowDownLeft className="w-4.5 h-4.5" /> : <ArrowUpRight className="w-4.5 h-4.5" />}
                                    </div>
                                    
                                    <div className="space-y-0.5">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-sans font-bold text-xs text-white leading-tight">{tx.description}</span>
                                        <span className="text-[8px] bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-1 py-0.5 rounded font-mono font-bold uppercase tracking-widest shrink-0">
                                          {tx.type}
                                        </span>
                                      </div>
                                      <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-gray-500">
                                        <span className="text-gray-400">{tx.date}</span>
                                        <span>•</span>
                                        <span className="text-cyan-600 font-semibold">{txHash}</span>
                                        <span>•</span>
                                        <span className="capitalize text-gray-400 flex items-center gap-0.5">
                                          <MapPin className="w-3 h-3 text-cyan-500/70" />
                                          {tx.region}
                                        </span>
                                      </div>
                                      {tx.quantityDetails && (
                                        <p className="text-[10px] text-gray-400 font-mono leading-normal bg-slate-950/40 px-2 py-1 rounded-lg border border-white/5 mt-1">{tx.quantityDetails}</p>
                                      )}
                                    </div>
                                  </div>

                                  <div className="text-right pl-3 shrink-0">
                                    <div className={`font-mono font-bold text-xs ${isEarn ? "text-emerald-400" : "text-amber-400"}`}>
                                      {isEarn ? "+" : ""}{tx.coinEarned} AND
                                    </div>
                                    <div className="text-[9px] text-emerald-500 font-mono font-semibold flex items-center gap-0.5 justify-end mt-1">
                                      <ShieldCheck className="w-3 h-3" />
                                      <span>VERIFIED</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  <AuthGate onLogin={handleLogin} suggestedEmail="ketho440@gmail.com" />
                )}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Golden Coin representation & Local Wallet Status (4 Cols) */}
        <div className="lg:col-span-4 h-full">
          <CoinVisualizer 
            balance={balance}
            totalMembers={totalMembers}
            totalPlasticKg={totalPlasticKg}
            totalCleanups={totalCleanups}
            userProfile={userProfile}
            onLogout={handleLogout}
            onOpenLogin={() => setActiveTab("auth")}
            onRefillBalance={(amount) => {
              if (userProfile?.email) {
                updateUserBalance(userProfile.email, balance + amount)
                  .catch((err) => console.error("Error refilling balance in Firestore:", err));
              } else {
                setBalance(prev => prev + amount);
              }
            }}
          />
        </div>

      </main>

      {/* Elegant minimalist footer */}
      <footer className="w-full text-center py-6 border-t border-white/5 text-[11px] text-gray-500 font-mono mt-12 bg-slate-950 select-none">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>© 2026 ANDAMANCOIN (AND). สงวนลิขสิทธิ์ทั้งหมดร่วมกันเพื่อความยั่งยืนของทะเล</div>
          <div className="flex gap-4 justify-center">
            <span className="hover:text-gray-300 transition cursor-pointer">เงื่อนไขสิทธิ์</span>
            <span className="hover:text-gray-300 transition cursor-pointer">นโยบายชุมชนสีเขียว</span>
            <a 
              href="https://lin.ee/NlmDMHU" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-[#06C755] hover:text-[#05B34C] transition font-bold flex items-center gap-1"
            >
              <span className="w-1.5 h-1.5 bg-[#06C755] rounded-full inline-block animate-pulse"></span>
              <span>ติดต่อผ่าน LINE (https://lin.ee/NlmDMHU)</span>
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
}
