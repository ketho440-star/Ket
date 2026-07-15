import { useState } from "react";
import { Coins, Flame, Award, Globe, HelpCircle, LogOut, MapPin, User, ShieldCheck, Sparkles, Plus } from "lucide-react";
import { UserProfile } from "../types";
import { REGIONS } from "../data";

interface CoinVisualizerProps {
  balance: number;
  totalMembers: number;
  totalPlasticKg: number;
  totalCleanups: number;
  userProfile: UserProfile | null;
  onLogout: () => void;
  onOpenLogin: () => void;
  onRefillBalance?: (amount: number) => void;
}

export default function CoinVisualizer({
  balance,
  totalMembers,
  totalPlasticKg,
  totalCleanups,
  userProfile,
  onLogout,
  onOpenLogin,
  onRefillBalance,
}: CoinVisualizerProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  // Map roles to Thai translation
  const getRoleLabel = (role: UserProfile["role"]) => {
    switch (role) {
      case "volunteer": return "🌿 อาสาสมัครอนุรักษ์ (Volunteer)";
      case "fisherman": return "🎣 ผู้พิทักษ์เลท้องถิ่น (Fisherman)";
      case "business": return "🏬 ร้านค้าพาร์ทเนอร์สีเขียว (Partner)";
      case "tourist": return "✈️ นักท่องเที่ยวรักษ์โลก (Eco-Tourist)";
      default: return "🌊 สมาชิกอันดามัน";
    }
  };

  const getRegionName = (id: string) => {
    const r = REGIONS.find(reg => reg.id === id);
    return r ? `${r.name} (${r.country})` : "พรมแดนอันดามัน";
  };

  return (
    <div id="coin-visualizer" className="glass-panel rounded-3xl p-6 lg:p-8 flex flex-col items-center justify-between h-full relative overflow-hidden group space-y-6">
      {/* Absolute ambient lights */}
      <div className="absolute -top-12 -left-12 w-48 h-48 bg-yellow-500/10 rounded-full blur-3xl group-hover:bg-yellow-500/15 transition-all duration-700"></div>
      <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl group-hover:bg-cyan-500/15 transition-all duration-700"></div>

      {/* User Profile Card */}
      <div className="w-full z-10">
        {userProfile ? (
          <div className="bg-slate-900/80 border border-cyan-500/20 rounded-2xl p-4 space-y-3 relative overflow-hidden">
            <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 rounded-lg text-[9px] font-mono text-emerald-400 font-bold uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              Online
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-cyan-400/50 shrink-0">
                <img src={userProfile.avatarUrl} alt={userProfile.name} className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0">
                <div className="font-display font-bold text-sm text-white truncate">{userProfile.name}</div>
                <div className="text-[10px] text-gray-400 truncate font-mono">{userProfile.email}</div>
              </div>
            </div>

            <div className="border-t border-white/5 pt-2.5 space-y-1.5 text-[11px]">
              <div className="flex items-center gap-1.5 text-cyan-300 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                <span className="truncate">{getRoleLabel(userProfile.role)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-400">
                <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="truncate font-mono">{getRegionName(userProfile.regionId)}</span>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="w-full h-8 bg-white/5 hover:bg-red-950/30 border border-white/10 hover:border-red-950/50 text-[11px] font-mono text-gray-300 hover:text-red-400 rounded-xl transition flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>ออกจากระบบ (Logout)</span>
            </button>
          </div>
        ) : (
          <div className="bg-slate-900/60 border border-dashed border-white/10 rounded-2xl p-5 text-center space-y-3 relative">
            <div className="w-10 h-10 rounded-full bg-slate-950 flex items-center justify-center text-gray-500 mx-auto border border-white/5">
              <User className="w-5 h-5 text-gray-400" />
            </div>
            <div className="space-y-1">
              <div className="font-bold text-xs text-white">คุณยังไม่ได้เข้าสู่ระบบ</div>
              <p className="text-[10px] text-gray-400 leading-relaxed font-mono">
                เข้าสู่ระบบจำลองเพื่อบันทึกสิทธิ์สะสมเหรียญ และใช้แลกคูปองจริงสำหรับพาร์ทเนอร์อันดามัน
              </p>
            </div>
            <button
              onClick={onOpenLogin}
              className="w-full h-9 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl transition shadow flex items-center justify-center gap-1.5"
            >
              <span>เข้าสู่ระบบตอนนี้ (Sign In)</span>
            </button>
          </div>
        )}
      </div>

      {/* Golden Coin Element */}
      <div 
        className="relative cursor-pointer select-none perspective-1000 z-10 my-2"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div 
          className={`w-44 h-44 relative transition-all duration-700 transform-style-3d ${
            isFlipped ? "rotate-y-180" : ""
          }`}
        >
          {/* FRONT: Gold Coin Face */}
          <div className="absolute inset-0 backface-hidden rounded-full bg-gradient-to-br from-amber-300 via-yellow-500 to-amber-700 p-1.5 gold-glow animate-float">
            {/* Inner Ring detailing */}
            <div className="w-full h-full rounded-full bg-gradient-to-br from-amber-600 via-amber-800 to-amber-950 flex flex-col items-center justify-between p-3.5 relative overflow-hidden border border-yellow-300/30">
              
              {/* Star constellation details */}
              <div className="absolute inset-0 opacity-45">
                <svg width="100%" height="100%" className="absolute inset-0">
                  <circle cx="20" cy="30" r="1.5" fill="#fef08a" />
                  <circle cx="150" cy="40" r="2" fill="#fef08a" />
                  <circle cx="130" cy="130" r="1" fill="#fef08a" />
                  <circle cx="30" cy="120" r="1.5" fill="#fef08a" />
                </svg>
              </div>

              {/* Coin top label */}
              <div className="text-[9px] font-display font-black tracking-[0.25em] text-yellow-300 uppercase select-none z-10">
                ANDAMANCOIN
              </div>

              {/* Center Emblem: Waves */}
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400/20 to-yellow-500/10 border border-yellow-400/40 flex items-center justify-center relative shadow-inner z-10">
                <svg viewBox="0 0 100 100" className="w-12 h-12 fill-none stroke-amber-400 stroke-[5] stroke-linecap-round">
                  <path d="M10,60 C25,45 35,45 50,60 C65,75 75,75 90,60" className="opacity-80" />
                  <path d="M10,45 C30,25 45,65 65,45 C75,35 80,35 90,45" className="opacity-100" />
                </svg>
              </div>

              {/* Coin bottom label */}
              <div className="text-xs font-display font-black tracking-[0.35em] text-yellow-300 select-none z-10">
                AND
              </div>
            </div>
          </div>

          {/* BACK: Eco-Certificate representation */}
          <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-full bg-gradient-to-br from-cyan-400 via-teal-600 to-cyan-900 p-1.5 cyan-glow">
            <div className="w-full h-full rounded-full bg-slate-950 flex flex-col items-center justify-center p-4 border border-cyan-400/30 text-center">
              <Globe className="w-7 h-7 text-cyan-400 animate-spin-slow mb-1.5" />
              <div className="text-[10px] font-display font-bold text-cyan-300 tracking-wider">SECURE ECO-LEDGER</div>
              <p className="text-[8px] text-gray-400 mt-1 max-w-[125px] leading-relaxed font-mono">
                Tokens backed by real marine conservation, beach cleanup logs, and plastic waste reduction.
              </p>
              <div className="mt-1.5 text-[8px] font-mono text-cyan-400/80 bg-cyan-950/50 border border-cyan-800/30 px-1.5 py-0.5 rounded">
                VERIFIED STATUS
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Balance & Stats Panel */}
      <div className="w-full space-y-4 z-10 text-left">
        {/* Wallet Balance Display */}
        <div className="glass-panel-light rounded-2xl p-4 border border-white/10 bg-slate-900/50 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Coins className="w-4.5 h-4.5" />
              </div>
              <div>
                <div className="text-[10px] text-gray-400 font-mono">ยอดเหรียญของคุณ (My Balance)</div>
                <div className="text-xl font-display font-bold text-white flex items-baseline gap-1">
                  {balance.toLocaleString()} <span className="text-xs font-bold text-amber-400 font-mono">AND</span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setIsFlipped(!isFlipped)}
              className="text-[9px] font-mono bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 px-2 py-1 rounded-lg transition"
            >
              {isFlipped ? "หน้าเหรียญ" : "หลังเหรียญ"}
            </button>
          </div>

          {/* Currency backing conversion rate card */}
          <div className="border-t border-white/5 pt-2.5 flex items-center justify-between text-[11px]">
            <div className="text-gray-400 flex items-center gap-1 font-mono">
              <span>มูลค่าอ้างอิง:</span>
              <span className="text-emerald-400 font-bold">≈ {(balance * 5.24).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} THB</span>
            </div>
            <div className="text-right text-[10px] text-gray-400 font-mono">
              <span className="text-cyan-400 font-bold">{(balance * 0.15).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} USD</span>
            </div>
          </div>
        </div>

        {/* Global Impact Grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="glass-panel-light p-2.5 rounded-xl border border-white/5 text-center bg-slate-950/40">
            <div className="text-[10px] text-gray-400 font-mono mb-0.5">สมาชิกกลุ่ม</div>
            <div className="text-xs sm:text-sm font-display font-bold text-white">
              {totalMembers.toLocaleString()}
            </div>
            <div className="text-[8px] text-gray-500 font-mono">คนทั่วอันดามัน</div>
          </div>

          <div className="glass-panel-light p-2.5 rounded-xl border border-white/5 text-center bg-slate-950/40">
            <div className="text-[10px] text-gray-400 font-mono mb-0.5">ขยะที่ลดได้</div>
            <div className="text-xs sm:text-sm font-display font-bold text-emerald-400">
              {totalPlasticKg.toLocaleString()}
            </div>
            <div className="text-[8px] text-gray-500 font-mono">กิโลกรัม (Kg)</div>
          </div>

          <div className="glass-panel-light p-2.5 rounded-xl border border-white/5 text-center bg-slate-950/40">
            <div className="text-[10px] text-gray-400 font-mono mb-0.5">กิจกรรมฟื้นฟู</div>
            <div className="text-xs sm:text-sm font-display font-bold text-cyan-400">
              {totalCleanups.toLocaleString()}
            </div>
            <div className="text-[8px] text-gray-500 font-mono">ครั้งสำเร็จ</div>
          </div>
        </div>

        {/* Ecosystem Verified Status Indicator */}
        <div className="p-3 rounded-2xl bg-gradient-to-r from-cyan-950/20 to-teal-950/20 border border-cyan-500/10 flex items-start gap-2.5">
          <ShieldCheck className="w-4.5 h-4.5 text-cyan-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <h4 className="text-[11px] font-bold text-white uppercase tracking-wider">ECO-VERIFICATION LEVEL: L1</h4>
            <p className="text-[9px] text-gray-400 leading-relaxed font-mono">
              ข้อมูลบัญชีได้รับการยืนยันระดับสากล ผ่านระบบศูนย์กลางฐานข้อมูล และพร้อมใช้งานในการโหวตจัดสรรทุนรักษ์ทะเล
            </p>
          </div>
        </div>

        {/* LINE Contact Button */}
        <a 
          href="https://lin.ee/NlmDMHU"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full h-11 bg-[#06C755] hover:bg-[#05B34C] text-white font-sans font-extrabold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow shadow-emerald-950/40 hover:scale-[1.02] active:scale-[0.98] duration-150 py-2.5 px-4 z-10"
        >
          <svg className="w-4.5 h-4.5 fill-current shrink-0" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 5.58 2 10c0 3.97 3.44 7.3 8.2 7.8.3 0 .7.2.9.5l1.6 1.6c.3.3.6.1.6-.3l-.1-2.2c0-.3.1-.6.3-.8 4-1.1 6.5-4 6.5-7.6 0-4.42-4.48-8-10-8z" />
          </svg>
          <span>ติดต่อสอบถามผ่าน LINE (https://lin.ee/NlmDMHU)</span>
        </a>

        {/* Informative Footer */}
        <div className="text-center text-[10px] text-gray-500 flex items-center justify-center gap-1.5 font-mono">
          <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
          <span>แตะที่เหรียญเพื่อพลิกดูสมุดบัญชี Eco-Ledger</span>
        </div>
      </div>
    </div>
  );
}
