import React, { useState, useEffect } from "react";
import { RewardItem } from "../types";
import { Coins, Check, Gift, Tag, ShoppingBag, ShieldCheck, MapPin } from "lucide-react";
import { subscribeToRewards } from "../firebaseService";

interface SpendSectionProps {
  balance: number;
  onSpendCoins: (amount: number, description: string, details: string) => boolean;
}

interface ClaimedVoucher {
  code: string;
  reward: RewardItem;
  date: string;
}

export default function SpendSection({ balance, onSpendCoins }: SpendSectionProps) {
  const [vouchers, setVouchers] = useState<ClaimedVoucher[]>([]);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<"all" | "product" | "travel" | "souvenir">("all");
  
  // Pay Merchant state
  const [merchant, setMerchant] = useState("phuket-kayak");
  const [amountToPay, setAmountToPay] = useState(50);
  const [paySuccess, setPaySuccess] = useState(false);

  // Real-time dynamic rewards collection from Firestore
  const [rewardsList, setRewardsList] = useState<RewardItem[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToRewards((list) => {
      setRewardsList(list);
    });
    return () => unsubscribe();
  }, []);

  const filteredRewards = selectedCategory === "all" 
    ? rewardsList 
    : rewardsList.filter(r => {
        if (selectedCategory === "product") {
          return r.category === "product" || r.category === "merchandise";
        }
        if (selectedCategory === "travel") {
          return r.category === "travel" || r.category === "voucher" || r.category === "fiat_cash";
        }
        return r.category === selectedCategory;
      });

  const handleRedeem = (item: RewardItem) => {
    if (balance < item.cost) {
      alert("ยอดเหรียญ AND ของคุณไม่เพียงพอสำหรับการแลกรับสิทธิ์นี้");
      return;
    }

    const catName = item.category === "travel" ? "ทัวร์สีเขียว" : item.category === "product" ? "สินค้าประหยัดพลังงาน" : "ของที่ระลึกชุมชน";
    const success = onSpendCoins(
      item.cost, 
      `แลกของรางวัล: ${item.title}`, 
      `ประเภท: ${catName}`
    );
    if (success) {
      const newVoucherCode = `AND-REDEEM-${Math.floor(100000 + Math.random() * 900000)}`;
      const newVoucher: ClaimedVoucher = {
        code: newVoucherCode,
        reward: item,
        date: new Date().toLocaleDateString()
      };

      setVouchers([newVoucher, ...vouchers]);
      setSuccessMsg(`ยินดีด้วย! คุณได้แลกรับ "${item.title}" เรียบร้อยแล้ว รหัสคูปองของคุณคือ: ${newVoucherCode}`);
      
      setTimeout(() => {
        setSuccessMsg(null);
      }, 6000);
    }
  };

  const handleMerchantPay = (e: React.FormEvent) => {
    e.preventDefault();
    if (amountToPay <= 0) return;

    if (balance < amountToPay) {
      alert("ยอดเหรียญ AND ของคุณไม่เพียงพอสำหรับการชำระเงินคราวนี้");
      return;
    }

    const selectedMerchantText = 
      merchant === "phuket-kayak" ? "ท่าเรือชุมชนคายักท่าฉัตรไชย (ภูเก็ต)" :
      merchant === "trang-eco" ? "ทริปเกาะกระดานรักษ์สิ่งแวดล้อม (ตรัง)" :
      merchant === "langkawi-cafe" ? "Langkawi Seaside Eco-Café (มาเลเซีย)" :
      "Havelock Green Reef Dive Shop (อินเดีย)";

    const success = onSpendCoins(
      amountToPay, 
      `ชำระเงินให้ร้านพาร์ทเนอร์: ${selectedMerchantText}`, 
      `ช่องทาง: ชำระผ่านระบบ QR Code`
    );
    if (success) {
      setPaySuccess(true);
      setTimeout(() => {
        setPaySuccess(false);
        setAmountToPay(50);
      }, 4000);
    }
  };

  return (
    <div id="spend-section" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* LEFT: Rewards Catalog */}
      <div className="lg:col-span-8 space-y-6">
        
        {/* Catalog Container */}
        <div className="glass-panel rounded-3xl p-6 relative">
          
          {/* Header & Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/5 pb-4 mb-4">
            <div>
              <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
                <Gift className="w-5 h-5 text-yellow-400" />
                <span>แคตตาล็อกสิทธิ์ประโยชน์รักษ์โลก (Eco-Rewards Directory)</span>
              </h3>
              <p className="text-xs text-gray-400 font-mono">ใช้เหรียญ AND แลกซื้อ คูปองส่วนลดท่องเที่ยวสีเขียว หรือผลิตภัณฑ์ประหยัดพลังงาน</p>
            </div>

            {/* Filters */}
            <div className="flex gap-1 bg-slate-950 p-1 rounded-xl border border-white/5 self-start text-[11px] font-mono">
              <button 
                onClick={() => setSelectedCategory("all")} 
                className={`px-2.5 py-1 rounded-lg transition ${selectedCategory === "all" ? "bg-cyan-600 text-white" : "text-gray-400 hover:text-white"}`}
              >
                ทั้งหมด
              </button>
              <button 
                onClick={() => setSelectedCategory("product")} 
                className={`px-2.5 py-1 rounded-lg transition ${selectedCategory === "product" ? "bg-cyan-600 text-white" : "text-gray-400 hover:text-white"}`}
              >
                ของใช้รักษ์โลก
              </button>
              <button 
                onClick={() => setSelectedCategory("travel")} 
                className={`px-2.5 py-1 rounded-lg transition ${selectedCategory === "travel" ? "bg-cyan-600 text-white" : "text-gray-400 hover:text-white"}`}
              >
                ทัวร์สีเขียว
              </button>
            </div>
          </div>

          {/* Success Banner */}
          {successMsg && (
            <div className="bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 p-4 rounded-2xl text-xs leading-relaxed mb-5 flex items-start gap-2.5 animate-bounce">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-white mb-0.5">การแลกสิทธิ์เสร็จสมบูรณ์!</p>
                <p>{successMsg}</p>
                <p className="text-[10px] text-emerald-400/80 mt-1">คูปองนี้ถูกเซฟเก็บไว้ที่แผงกระเป๋าของคุณทางด้านขวามือแล้ว</p>
              </div>
            </div>
          )}

          {/* Rewards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRewards.map((item) => {
              const isAffordable = balance >= item.cost;
              return (
                <div key={item.id} className="bg-slate-950/40 border border-white/5 rounded-2xl overflow-hidden flex flex-col justify-between hover:border-white/10 transition duration-300">
                  <div>
                    <div className="relative h-40">
                      <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                      <div className="absolute top-2.5 right-2.5 bg-slate-950/90 text-yellow-400 text-[11px] font-mono font-bold border border-yellow-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1 shadow">
                        <Coins className="w-3.5 h-3.5" />
                        <span>{item.cost} AND</span>
                      </div>
                    </div>
                    <div className="p-4 space-y-1.5 text-xs">
                      <div className="flex items-center gap-1 text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider">
                        <Tag className="w-3 h-3" />
                        <span>{item.category === "travel" ? "GREEN TOURISM" : item.category === "product" ? "ECO-PRODUCT" : "COMMUNITY SOUVENIR"}</span>
                      </div>
                      <h4 className="font-sans font-bold text-sm text-white">{item.title}</h4>
                      <p className="text-gray-400 leading-relaxed text-[11px]">{item.description}</p>
                    </div>
                  </div>

                  <div className="p-4 pt-0">
                    <button
                      onClick={() => handleRedeem(item)}
                      disabled={!isAffordable}
                      className={`w-full h-9 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 ${
                        isAffordable
                          ? "bg-amber-500 hover:bg-amber-400 text-slate-950"
                          : "bg-white/5 text-gray-500 cursor-not-allowed border border-white/5"
                      }`}
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>{isAffordable ? "แลกรับรางวัลด้วยเหรียญ AND" : "เหรียญไม่เพียงพอ"}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

      </div>

      {/* RIGHT: Wallet Vouchers & Scan to Pay */}
      <div className="lg:col-span-4 space-y-6">
        
        {/* Voucher Wallet */}
        <div className="glass-panel rounded-3xl p-6">
          <h3 className="font-display font-bold text-base text-white flex items-center gap-2 mb-1.5">
            <Gift className="w-5 h-5 text-cyan-400" />
            <span>กระเป๋าเก็บคูปอง (My Voucher Bag)</span>
          </h3>
          <p className="text-xs text-gray-400 mb-4 font-mono">คูปองส่วนลดที่ใช้งานได้จริงในทริปอันดามันของคุณ</p>

          <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
            {vouchers.length === 0 ? (
              <div className="text-center py-8 text-gray-500 border border-dashed border-white/5 rounded-2xl">
                <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-30 text-cyan-400" />
                <p className="text-xs leading-relaxed">ยังไม่มีคูปองที่แลกไว้<br />ลองสะสมเหรียญแล้วนำมาแลกได้เลยครับ!</p>
              </div>
            ) : (
              vouchers.map((v, idx) => (
                <div key={idx} className="bg-slate-900 border border-white/5 p-3 rounded-2xl flex items-center gap-3 relative overflow-hidden">
                  <div className="absolute right-0 top-0 w-8 h-8 bg-cyan-500/10 rounded-bl-2xl flex items-center justify-center border-l border-b border-white/5">
                    <Check className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <img src={v.reward.image} alt={v.reward.title} className="w-10 h-10 object-cover rounded-lg" />
                  <div className="text-xs space-y-0.5">
                    <div className="font-sans font-bold text-white truncate max-w-[160px]">{v.reward.title}</div>
                    <div className="text-[10px] font-mono text-cyan-400 font-bold">{v.code}</div>
                    <div className="text-[9px] text-gray-500 font-mono">แลกเมื่อ: {v.date}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pay Local Merchant QR Code Creator */}
        <div className="glass-panel rounded-3xl p-6 relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl"></div>

          <h3 className="font-display font-bold text-base text-white flex items-center gap-2 mb-1.5">
            <Coins className="w-5 h-5 text-yellow-400" />
            <span>ชำระผ่านพาร์ทเนอร์ (Pay Local Partner)</span>
          </h3>
          <p className="text-xs text-gray-400 mb-4 font-mono">จำลองการส่งรหัส/สแกนจ่ายค่าทริปกับธุรกิจท้องถิ่น</p>

          <form onSubmit={handleMerchantPay} className="space-y-4 text-xs">
            <div>
              <label className="block text-gray-400 font-mono mb-1.5 font-medium">เลือกธุรกิจ/ร้านค้าชุมชน (Select Merchant)</label>
              <select
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                className="w-full bg-slate-900 text-white rounded-xl px-3 py-2 border border-white/10 focus:border-cyan-400 focus:outline-none"
              >
                <option value="phuket-kayak">ท่าเรือชุมชนคายักท่าฉัตรไชย (ภูเก็ต)</option>
                <option value="trang-eco">ทริปเกาะกระดานรักษ์สิ่งแวดล้อม (ตรัง)</option>
                <option value="langkawi-cafe">Langkawi Seaside Eco-Café (มาเลเซีย)</option>
                <option value="havelock-dive">Havelock Green Reef Dive Shop (อินเดีย)</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-400 font-mono mb-1.5 font-medium">จำนวนเหรียญที่ชำระ (Payment Amount)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={amountToPay}
                  onChange={(e) => setAmountToPay(Math.max(10, parseInt(e.target.value) || 0))}
                  min={10}
                  className="flex-1 bg-slate-900 text-white rounded-xl px-3 py-2 border border-white/10 focus:border-cyan-400 focus:outline-none font-mono"
                />
                <span className="font-mono text-amber-400 font-bold">AND</span>
              </div>
            </div>

            {paySuccess ? (
              <div className="bg-emerald-950/60 border border-emerald-500/20 rounded-2xl p-3 text-center text-[11px] text-emerald-300">
                ✔️ ชำระเงินจำนวน <span className="font-mono font-bold text-white">{amountToPay} AND</span> สำเร็จแล้ว! ใบเสร็จจำลองของคุณถูกส่งเข้าบัญชีร้านค้าแล้ว
              </div>
            ) : (
              <button
                type="submit"
                disabled={balance < amountToPay}
                className="w-full h-10 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 hover:border-white/20 text-white font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>ชำระผ่าน QR Code จำลอง</span>
              </button>
            )}
          </form>
        </div>

      </div>
    </div>
  );
}
