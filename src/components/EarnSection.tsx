import React, { useState } from "react";
import { REGIONS } from "../data";
import { EcoActivity } from "../types";
import { Sparkles, Calendar, Trash, AlertCircle, RefreshCw, Layers, MapPin, Check } from "lucide-react";

interface EarnSectionProps {
  onEarnCoins: (amount: number, description: string, details: string) => void;
  activities: EcoActivity[];
}

export default function EarnSection({ onEarnCoins, activities }: EarnSectionProps) {
  // Activity state
  const [region, setRegion] = useState("thailand");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [bagsCollected, setBagsCollected] = useState(1);
  const [isSubmitSuccess, setIsSubmitSuccess] = useState(false);

  // Recycling counter state
  const [plasticCount, setPlasticCount] = useState(0);
  const [metalCount, setMetalCount] = useState(0);
  const [glassCount, setGlassCount] = useState(0);
  const [isRecycleSuccess, setIsRecycleSuccess] = useState(false);

  // Constants
  const CLEANUP_COIN_RATE = 50; // Flat reward for verified beach cleanups

  const handleCleanupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    const coinsToEarn = CLEANUP_COIN_RATE + (bagsCollected * 5); // Base 50 AND + 5 AND per extra bag
    const selectedRegionObj = REGIONS.find(r => r.id === region);
    
    onEarnCoins(
      coinsToEarn,
      `กิจกรรมเก็บขยะชายหาด ณ ${selectedRegionObj?.name || region}`,
      `${description} (${bagsCollected} ถุงขยะใหญ่)`
    );

    setIsSubmitSuccess(true);
    setDescription("");
    setBagsCollected(1);

    setTimeout(() => {
      setIsSubmitSuccess(false);
    }, 3000);
  };

  const handleRecycleSubmit = () => {
    const totalEarned = (plasticCount * 2) + (metalCount * 2) + (glassCount * 5);
    if (totalEarned === 0) return;

    onEarnCoins(
      totalEarned,
      "ส่งขวดพลาสติก/กระป๋อง/ขวดแก้วเข้าระบบรีไซเคิลอัตโนมัติ (RVM)",
      `ขวดพลาสติก ${plasticCount} ใบ, กระป๋อง ${metalCount} ใบ, ขวดแก้ว ${glassCount} ใบ`
    );

    setIsRecycleSuccess(true);
    setPlasticCount(0);
    setMetalCount(0);
    setGlassCount(0);

    setTimeout(() => {
      setIsRecycleSuccess(false);
    }, 3000);
  };

  return (
    <div id="earn-section" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* LEFT: Action Forms */}
      <div className="lg:col-span-7 space-y-6">
        
        {/* Method 1: Beach Cleanup Logger */}
        <div className="glass-panel rounded-3xl p-6 relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl"></div>
          
          <h3 className="font-display font-bold text-lg text-white flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            <span>1. บันทึกรายงานเก็บขยะชายหาด (Log Beach Cleanup)</span>
          </h3>
          <p className="text-xs text-gray-400 mb-4">รับขั้นต่ำ 50 AND โบนัสพิเศษเพิ่มตามปริมาณจำนวนถุงขยะที่กู้ชีพได้</p>

          <form onSubmit={handleCleanupSubmit} className="space-y-4 text-xs">
            {/* Region & Date row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-400 font-mono mb-1.5 font-medium">พื้นที่ประสานงาน (Region)</label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full bg-slate-900 text-white rounded-xl px-3 py-2 border border-white/10 focus:border-cyan-400 focus:outline-none"
                >
                  {REGIONS.map(r => (
                    <option key={r.id} value={r.id}>{r.name} ({r.country})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-400 font-mono mb-1.5 font-medium">วันที่ปฏิบัติงาน (Date)</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-slate-900 text-white rounded-xl pl-9 pr-3 py-2 border border-white/10 focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-gray-400 font-mono mb-1.5 font-medium">รายละเอียดกิจกรรม (Activity details)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="ระบุสถานที่ ชื่อกลุ่ม เช่น เก็บขยะขวดและเศษอวนน้ำหนักรวม 15 กิโลกรัม บริเวณแหลมพรหมเทพ จ.ภูเก็ต..."
                rows={3}
                required
                className="w-full bg-slate-900 text-white rounded-xl p-3 border border-white/10 focus:border-cyan-400 focus:outline-none placeholder:text-gray-600 leading-relaxed"
              />
            </div>

            {/* Bags count slider */}
            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-white/5 flex items-center justify-between">
              <div>
                <div className="font-sans font-bold text-white text-xs">จำนวนถุงขยะขนาดใหญ่ (Large Trash Bags)</div>
                <div className="text-[10px] text-gray-400 font-mono mt-0.5">ได้รับเพิ่มโบนัส +5 AND ต่อถุง</div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setBagsCollected(Math.max(1, bagsCollected - 1))}
                  className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 text-white border border-white/10 flex items-center justify-center font-bold"
                >
                  -
                </button>
                <span className="font-display font-black text-sm text-yellow-400 w-6 text-center">{bagsCollected}</span>
                <button
                  type="button"
                  onClick={() => setBagsCollected(bagsCollected + 1)}
                  className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 text-white border border-white/10 flex items-center justify-center font-bold"
                >
                  +
                </button>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              className="w-full h-11 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-bold transition flex items-center justify-center gap-2 shadow shadow-cyan-900/30"
            >
              {isSubmitSuccess ? (
                <>
                  <Check className="w-5 h-5 text-yellow-300" />
                  <span>บันทึกสำเร็จ! ได้รับเหรียญ AND เข้าระบบจำลอง</span>
                </>
              ) : (
                <>
                  <Trash className="w-4 h-4" />
                  <span>ส่งรายงานและรับสิทธิ์ {CLEANUP_COIN_RATE + (bagsCollected * 5)} AND</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Method 2: Reverse Vending Machine (Recycling Counter) */}
        <div className="glass-panel rounded-3xl p-6 relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl"></div>

          <h3 className="font-display font-bold text-lg text-white flex items-center gap-2 mb-2">
            <RefreshCw className="w-5 h-5 text-emerald-400" />
            <span>2. ตู้หยอดเหรียญรีไซเคิลอัจฉริยะ (Smart Vending Machine)</span>
          </h3>
          <p className="text-xs text-gray-400 mb-4">สแกนส่งขยะเข้าศูนย์แยกขวดพลาสติก ขวดแก้ว และกระป๋องอลูมิเนียมทั่วไป</p>

          <div className="grid grid-cols-3 gap-3 mb-5">
            {/* Plastic bottles counter */}
            <div className="bg-slate-900/60 p-4 rounded-2xl border border-white/5 flex flex-col items-center text-center">
              <span className="text-2xl mb-1">🥤</span>
              <div className="text-[10px] text-gray-400 font-mono">ขวดพลาสติก PET</div>
              <div className="text-xs text-emerald-400 font-bold font-mono mt-0.5">2 AND / ใบ</div>
              <div className="flex items-center gap-3 mt-3">
                <button
                  onClick={() => setPlasticCount(Math.max(0, plasticCount - 1))}
                  className="w-7 h-7 bg-slate-950 text-white border border-white/10 rounded flex items-center justify-center text-xs"
                >
                  -
                </button>
                <span className="text-xs font-bold text-white font-mono w-4">{plasticCount}</span>
                <button
                  onClick={() => setPlasticCount(plasticCount + 1)}
                  className="w-7 h-7 bg-slate-950 text-white border border-white/10 rounded flex items-center justify-center text-xs"
                >
                  +
                </button>
              </div>
            </div>

            {/* Aluminum cans counter */}
            <div className="bg-slate-900/60 p-4 rounded-2xl border border-white/5 flex flex-col items-center text-center">
              <span className="text-2xl mb-1">🥫</span>
              <div className="text-[10px] text-gray-400 font-mono">กระป๋องอลูมิเนียม</div>
              <div className="text-xs text-emerald-400 font-bold font-mono mt-0.5">2 AND / ใบ</div>
              <div className="flex items-center gap-3 mt-3">
                <button
                  onClick={() => setMetalCount(Math.max(0, metalCount - 1))}
                  className="w-7 h-7 bg-slate-950 text-white border border-white/10 rounded flex items-center justify-center text-xs"
                >
                  -
                </button>
                <span className="text-xs font-bold text-white font-mono w-4">{metalCount}</span>
                <button
                  onClick={() => setMetalCount(metalCount + 1)}
                  className="w-7 h-7 bg-slate-950 text-white border border-white/10 rounded flex items-center justify-center text-xs"
                >
                  +
                </button>
              </div>
            </div>

            {/* Glass bottles counter */}
            <div className="bg-slate-900/60 p-4 rounded-2xl border border-white/5 flex flex-col items-center text-center">
              <span className="text-2xl mb-1">🍾</span>
              <div className="text-[10px] text-gray-400 font-mono">ขวดแก้วเปล่า</div>
              <div className="text-xs text-emerald-400 font-bold font-mono mt-0.5">5 AND / ใบ</div>
              <div className="flex items-center gap-3 mt-3">
                <button
                  onClick={() => setGlassCount(Math.max(0, glassCount - 1))}
                  className="w-7 h-7 bg-slate-950 text-white border border-white/10 rounded flex items-center justify-center text-xs"
                >
                  -
                </button>
                <span className="text-xs font-bold text-white font-mono w-4">{glassCount}</span>
                <button
                  onClick={() => setGlassCount(glassCount + 1)}
                  className="w-7 h-7 bg-slate-950 text-white border border-white/10 rounded flex items-center justify-center text-xs"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Submit button */}
          <button
            onClick={handleRecycleSubmit}
            disabled={plasticCount + metalCount + glassCount === 0}
            className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow shadow-emerald-950"
          >
            {isRecycleSuccess ? (
              <>
                <Check className="w-5 h-5 text-yellow-300" />
                <span>จำลองการรับขยะเสร็จสมบูรณ์! เคลมเหรียญสำเร็จ</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>หยอดเข้าระบบและรับ {(plasticCount * 2) + (metalCount * 2) + (glassCount * 5)} AND</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* RIGHT: Live Activities Feed */}
      <div className="lg:col-span-5">
        <div className="glass-panel rounded-3xl p-6 h-full flex flex-col justify-between">
          <div>
            <h3 className="font-display font-bold text-lg text-white flex items-center gap-2 mb-2">
              <Layers className="w-5 h-5 text-cyan-400" />
              <span>ประวัติกิจกรรมล่าสุด (My Eco Logs)</span>
            </h3>
            <p className="text-xs text-gray-400 mb-4">บันทึกธุรกรรมการประเมินสิ่งแวดล้อมที่ได้รับการสแตมป์ในสัญญากลาง</p>

            <div className="space-y-3.5 max-h-[360px] overflow-y-auto pr-1">
              {activities.map((act) => (
                <div key={act.id} className="bg-slate-950/60 p-3.5 rounded-2xl border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full ${
                      act.type === "cleanup"
                        ? "bg-blue-950/80 border border-blue-900 text-blue-300"
                        : "bg-emerald-950/80 border border-emerald-900 text-emerald-300"
                    }`}>
                      {act.type === "cleanup" ? "เก็บขยะชายหาด" : "หยอดเครื่องตู้ RVM"}
                    </span>
                    <span className="text-[10px] font-mono text-gray-400">{act.date}</span>
                  </div>
                  <p className="text-xs text-gray-200 leading-relaxed font-sans">{act.description}</p>
                  
                  <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px] font-mono">
                    <span className="text-gray-400 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="capitalize">{act.region}</span>
                    </span>
                    <span className="text-yellow-400 font-bold">+{act.coinEarned} AND</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 text-[10px] text-gray-500 flex items-start gap-1.5 bg-slate-900/30 p-2.5 rounded-xl border border-white/5">
            <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>ทุกรายงานจะถูกบันทึกบนฐานระบบจำลอง และประมวลผลเพื่อตรวจสอบความปลอดภัย</span>
          </div>
        </div>
      </div>
    </div>
  );
}
