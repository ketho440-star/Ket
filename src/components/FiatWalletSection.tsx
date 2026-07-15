import React, { useState } from "react";
import { UserProfile } from "../types";
import { updateUserFiatBalances, addUserActivity, createTransfer } from "../firebaseService";
import { 
  Wallet, 
  ArrowRightLeft, 
  TrendingUp, 
  Send, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Coins, 
  ShieldCheck, 
  History,
  Info
} from "lucide-react";

interface FiatWalletSectionProps {
  userProfile: UserProfile | null;
  balance: number; // AND balance
  onUpdateBalances: (usd: number, thb: number, jpy: number, gbp: number, eur: number) => void;
  onEarnCoins: (amount: number, description: string, details: string) => void;
  onSpendCoins: (amount: number, description: string, details: string) => boolean;
}

const EXCHANGE_RATES: { [key: string]: number } = {
  USD: 1,
  THB: 35.0,
  JPY: 150.0,
  GBP: 0.78,
  EUR: 0.92,
};

const CURRENCY_DETAILS: { [key: string]: { name: string; symbol: string; flag: string; color: string } } = {
  USD: { name: "ดอลลาร์สหรัฐ (US Dollar)", symbol: "$", flag: "🇺🇸", color: "from-blue-600 to-cyan-500" },
  THB: { name: "บาทไทย (Thai Baht)", symbol: "฿", flag: "🇹🇭", color: "from-red-500 to-blue-600" },
  JPY: { name: "เยนญี่ปุ่น (Japanese Yen)", symbol: "¥", flag: "🇯🇵", color: "from-pink-500 to-rose-400" },
  GBP: { name: "ปอนด์อังกฤษ (British Pound)", symbol: "£", flag: "🇬🇧", color: "from-purple-600 to-indigo-500" },
  EUR: { name: "ยูโร (Euro)", symbol: "€", flag: "🇪🇺", color: "from-teal-600 to-emerald-500" },
};

export default function FiatWalletSection({
  userProfile,
  balance,
  onUpdateBalances,
  onEarnCoins,
  onSpendCoins,
}: FiatWalletSectionProps) {
  // Current values
  const usd = userProfile?.usdBalance ?? 1000;
  const thb = userProfile?.thbBalance ?? 30000;
  const jpy = userProfile?.jpyBalance ?? 150000;
  const gbp = userProfile?.gbpBalance ?? 800;
  const eur = userProfile?.eurBalance ?? 900;

  // Active sub-tab
  const [activeSubTab, setActiveSubTab] = useState<"balances" | "exchange" | "and_trade" | "transfer">("balances");

  // State for transaction forms
  const [amount, setAmount] = useState<string>("");
  const [sourceCurrency, setSourceCurrency] = useState<string>("THB");
  const [targetCurrency, setTargetCurrency] = useState<string>("USD");
  const [recipient, setRecipient] = useState<string>("");
  const [transferCurrency, setTransferCurrency] = useState<string>("AND");

  // Feedback notifications
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Helper to show success/error message for some seconds
  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setErrorMsg(null);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const triggerError = (msg: string) => {
    setErrorMsg(msg);
    setSuccessMsg(null);
    setTimeout(() => setErrorMsg(null), 4000);
  };

  // Convert amount helper
  const getExchangeAmount = (val: number, from: string, to: string) => {
    const amountInUSD = val / EXCHANGE_RATES[from];
    return amountInUSD * EXCHANGE_RATES[to];
  };

  // 1. Transaction Handle: Add Balance (Deposit)
  const handleDeposit = (currency: string, depositAmount: number) => {
    if (isNaN(depositAmount) || depositAmount <= 0) {
      triggerError("กรุณากรอกจำนวนเงินที่ต้องการฝากที่ถูกต้อง");
      return;
    }

    setLoading(true);
    let nextUsd = usd;
    let nextThb = thb;
    let nextJpy = jpy;
    let nextGbp = gbp;
    let nextEur = eur;

    if (currency === "USD") nextUsd += depositAmount;
    else if (currency === "THB") nextThb += depositAmount;
    else if (currency === "JPY") nextJpy += depositAmount;
    else if (currency === "GBP") nextGbp += depositAmount;
    else if (currency === "EUR") nextEur += depositAmount;

    onUpdateBalances(nextUsd, nextThb, nextJpy, nextGbp, nextEur);

    // Save activity log
    const detailText = `ฝากเงินสำเร็จผ่านช่องทางสากล: +${depositAmount.toLocaleString()} ${currency}`;
    const activityData = {
      type: "refill" as const,
      region: userProfile?.regionId || "thailand",
      date: new Date().toISOString().split("T")[0],
      description: `ฝากเงินสดสกุล ${currency}`,
      coinEarned: 0,
      quantityDetails: detailText,
      status: "verified" as const
    };

    if (userProfile?.email) {
      addUserActivity(userProfile.email, activityData)
        .then(() => {
          triggerSuccess(`ฝากเงินสำเร็จจำนวน ${depositAmount.toLocaleString()} ${currency} และได้รับการยืนยันธุรกรรมในระบบ!`);
          setAmount("");
          setLoading(false);
        })
        .catch((err) => {
          console.error("Firebase update failed, falling back locally:", err);
          triggerSuccess(`ฝากเงินสำเร็จจำนวน ${depositAmount.toLocaleString()} ${currency} (Local Sync)`);
          setAmount("");
          setLoading(false);
        });
    } else {
      triggerSuccess(`ฝากเงินสำเร็จจำนวน ${depositAmount.toLocaleString()} ${currency} (เซฟในเว็บบราวเซอร์ชั่วคราว)`);
      setAmount("");
      setLoading(false);
    }
  };

  // 2. Transaction Handle: Swap/Exchange Currency
  const handleSwap = () => {
    const swapVal = parseFloat(amount);
    if (isNaN(swapVal) || swapVal <= 0) {
      triggerError("กรุณากรอกจำนวนเงินที่จะแลกเปลี่ยนที่ถูกต้อง");
      return;
    }

    if (sourceCurrency === targetCurrency) {
      triggerError("กรุณาเลือกสกุลเงินต้นทางและปลายทางที่แตกต่างกัน");
      return;
    }

    // Check balance
    let currentSrcBalance = 0;
    if (sourceCurrency === "USD") currentSrcBalance = usd;
    else if (sourceCurrency === "THB") currentSrcBalance = thb;
    else if (sourceCurrency === "JPY") currentSrcBalance = jpy;
    else if (sourceCurrency === "GBP") currentSrcBalance = gbp;
    else if (sourceCurrency === "EUR") currentSrcBalance = eur;

    if (swapVal > currentSrcBalance) {
      triggerError(`ยอดเงินสกุล ${sourceCurrency} ของคุณมีไม่เพียงพอสำหรับการทำธุรกรรมนี้ (ยอดปัจจุบัน: ${currentSrcBalance.toLocaleString()} ${sourceCurrency})`);
      return;
    }

    setLoading(true);

    const receivedVal = getExchangeAmount(swapVal, sourceCurrency, targetCurrency);

    // Deduct source and Add target
    let nextUsd = usd;
    let nextThb = thb;
    let nextJpy = jpy;
    let nextGbp = gbp;
    let nextEur = eur;

    // Deduct source
    if (sourceCurrency === "USD") nextUsd -= swapVal;
    else if (sourceCurrency === "THB") nextThb -= swapVal;
    else if (sourceCurrency === "JPY") nextJpy -= swapVal;
    else if (sourceCurrency === "GBP") nextGbp -= swapVal;
    else if (sourceCurrency === "EUR") nextEur -= swapVal;

    // Add target
    if (targetCurrency === "USD") nextUsd += receivedVal;
    else if (targetCurrency === "THB") nextThb += receivedVal;
    else if (targetCurrency === "JPY") nextJpy += receivedVal;
    else if (targetCurrency === "GBP") nextGbp += receivedVal;
    else if (targetCurrency === "EUR") nextEur += receivedVal;

    onUpdateBalances(nextUsd, nextThb, nextJpy, nextGbp, nextEur);

    // Log transaction
    const detailText = `ขาย: -${swapVal.toLocaleString()} ${sourceCurrency} -> ซื้อ: +${receivedVal.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${targetCurrency}`;
    const activityData = {
      type: "spend" as const,
      region: userProfile?.regionId || "thailand",
      date: new Date().toISOString().split("T")[0],
      description: `แลกเปลี่ยนสกุลเงินต่างประเทศ`,
      coinEarned: 0,
      quantityDetails: detailText,
      status: "verified" as const
    };

    if (userProfile?.email) {
      addUserActivity(userProfile.email, activityData)
        .then(() => {
          triggerSuccess(`แลกเปลี่ยนสกุลเงิน ${sourceCurrency} เป็น ${targetCurrency} สำเร็จ!`);
          setAmount("");
          setLoading(false);
        })
        .catch(() => {
          triggerSuccess(`แลกเปลี่ยนสกุลเงิน ${sourceCurrency} เป็น ${targetCurrency} สำเร็จ (Local Mode)`);
          setAmount("");
          setLoading(false);
        });
    } else {
      triggerSuccess(`แลกเปลี่ยนสกุลเงินสำเร็จ!`);
      setAmount("");
      setLoading(false);
    }
  };

  // 3. Transaction Handle: Transfer (Andaman Bank System)
  const handleTransfer = async () => {
    const txVal = parseFloat(amount);
    if (isNaN(txVal) || txVal <= 0) {
      triggerError("กรุณากรอกจำนวนเงินที่จะโอนให้ถูกต้อง");
      return;
    }

    if (!recipient.trim()) {
      triggerError("กรุณากรอกที่อยู่อีเมลผู้รับ");
      return;
    }

    const cleanRecipient = recipient.trim().toLowerCase();
    if (userProfile && cleanRecipient === userProfile.email.toLowerCase()) {
      triggerError("ไม่สามารถโอนเหรียญหรือเงินเข้าบัญชีตัวเองได้");
      return;
    }

    let currentSrcBalance = 0;
    if (transferCurrency === "AND") currentSrcBalance = balance;
    else if (transferCurrency === "USD") currentSrcBalance = usd;
    else if (transferCurrency === "THB") currentSrcBalance = thb;
    else if (transferCurrency === "JPY") currentSrcBalance = jpy;
    else if (transferCurrency === "GBP") currentSrcBalance = gbp;
    else if (transferCurrency === "EUR") currentSrcBalance = eur;

    if (txVal > currentSrcBalance) {
      triggerError(`ยอดคงเหลือ ${transferCurrency} ในบัญชีไม่เพียงพอ (ต้องการโอน: ${txVal.toLocaleString()} ยอดที่มี: ${currentSrcBalance.toLocaleString()})`);
      return;
    }

    setLoading(true);

    if (userProfile?.email) {
      try {
        await createTransfer(userProfile.email, cleanRecipient, txVal, transferCurrency as any, `โอนเงิน/เหรียญข้ามบัญชีธนาคาร`);
        
        // Deduct balance locally for instant visual feedback
        let nextUsd = usd;
        let nextThb = thb;
        let nextJpy = jpy;
        let nextGbp = gbp;
        let nextEur = eur;

        if (transferCurrency === "USD") nextUsd -= txVal;
        else if (transferCurrency === "THB") nextThb -= txVal;
        else if (transferCurrency === "JPY") nextJpy -= txVal;
        else if (transferCurrency === "GBP") nextGbp -= txVal;
        else if (transferCurrency === "EUR") nextEur -= txVal;

        if (transferCurrency !== "AND") {
          onUpdateBalances(nextUsd, nextThb, nextJpy, nextGbp, nextEur);
        }

        triggerSuccess(`ส่งคำขอโอน ${txVal.toLocaleString()} ${transferCurrency} ไปยัง ${cleanRecipient} เรียบร้อยแล้ว! ฝั่งผู้รับจะได้รับยอดหลังแอดมินอนุมัติแผงควบคุมหลังบ้าน ✨`);
        setAmount("");
        setRecipient("");
      } catch (err: any) {
        triggerError(err.message || "เกิดข้อผิดพลาดในการโอน");
      } finally {
        setLoading(false);
      }
    } else {
      triggerError("กรุณาเข้าสู่ระบบสมาชิกก่อนดำเนินการทำธุรกรรมทางการเงิน");
      setLoading(false);
    }
  };

  // 4. Transaction Handle: Buy/Sell AndamanCoin (AND)
  // Rate: 1 AND = 0.15 USD ≈ 5.25 THB
  const handleAndTrade = (isBuy: boolean) => {
    const tradeAmount = parseFloat(amount);
    if (isNaN(tradeAmount) || tradeAmount <= 0) {
      triggerError("กรุณากรอกจำนวนเงินที่จะทำรายการให้ถูกต้อง");
      return;
    }

    // Calculation in USD
    const andPriceInUSD = 0.15;
    const rateInCurrency = EXCHANGE_RATES[sourceCurrency] * andPriceInUSD; // For 1 AND
    
    if (isBuy) {
      // Selling Fiat to buy AND
      const costInFiat = tradeAmount; // User enters how much FIAT they want to spend
      const andToReceive = Math.floor(costInFiat / rateInCurrency);

      if (andToReceive <= 0) {
        triggerError(`จำนวนเงินน้อยเกินไป ไม่พอกับการแลกซื้อเหรียญ 1 AND (ต้องการอย่างน้อย ${rateInCurrency.toFixed(2)} ${sourceCurrency})`);
        return;
      }

      // Check user balance in that currency
      let currentSrcBalance = 0;
      if (sourceCurrency === "USD") currentSrcBalance = usd;
      else if (sourceCurrency === "THB") currentSrcBalance = thb;
      else if (sourceCurrency === "JPY") currentSrcBalance = jpy;
      else if (sourceCurrency === "GBP") currentSrcBalance = gbp;
      else if (sourceCurrency === "EUR") currentSrcBalance = eur;

      if (costInFiat > currentSrcBalance) {
        triggerError(`ยอดเงินสกุล ${sourceCurrency} ของคุณไม่เพียงพอ (ต้องการจ่าย: ${costInFiat.toLocaleString()} ยอดปัจจุบัน: ${currentSrcBalance.toLocaleString()})`);
        return;
      }

      setLoading(true);

      // Deduct Fiat, Add AND
      let nextUsd = usd;
      let nextThb = thb;
      let nextJpy = jpy;
      let nextGbp = gbp;
      let nextEur = eur;

      if (sourceCurrency === "USD") nextUsd -= costInFiat;
      else if (sourceCurrency === "THB") nextThb -= costInFiat;
      else if (sourceCurrency === "JPY") nextJpy -= costInFiat;
      else if (sourceCurrency === "GBP") nextGbp -= costInFiat;
      else if (sourceCurrency === "EUR") nextEur -= costInFiat;

      onUpdateBalances(nextUsd, nextThb, nextJpy, nextGbp, nextEur);
      onEarnCoins(andToReceive, `ซื้อเหรียญ AndamanCoin (AND)`, `จ่ายผ่านระบบเงินสดสกุล ${sourceCurrency}: -${costInFiat.toLocaleString()} ${sourceCurrency}`);

      triggerSuccess(`ทำรายการซื้อสำเร็จ! ได้รับ +${andToReceive} AND`);
      setAmount("");
      setLoading(false);
    } else {
      // Selling AND to get Fiat
      const andToSell = tradeAmount; // User enters how many AND they want to sell
      if (andToSell > balance) {
        triggerError(`คุณมีเหรียญ AndamanCoin (AND) ไม่เพียงพอสำหรับการทำรายการขายนี้ (ยอดปัจจุบัน: ${balance} AND)`);
        return;
      }

      const fiatToReceive = andToSell * rateInCurrency;

      setLoading(true);

      // Deduct AND, Add Fiat
      let nextUsd = usd;
      let nextThb = thb;
      let nextJpy = jpy;
      let nextGbp = gbp;
      let nextEur = eur;

      if (sourceCurrency === "USD") nextUsd += fiatToReceive;
      else if (sourceCurrency === "THB") nextThb += fiatToReceive;
      else if (sourceCurrency === "JPY") nextJpy += fiatToReceive;
      else if (sourceCurrency === "GBP") nextGbp += fiatToReceive;
      else if (sourceCurrency === "EUR") nextEur += fiatToReceive;

      const success = onSpendCoins(andToSell, `ขายเหรียญ AndamanCoin (AND)`, `รับเข้ากระเป๋าเงินสดสกุล ${sourceCurrency}: +${fiatToReceive.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${sourceCurrency}`);
      
      if (success) {
        onUpdateBalances(nextUsd, nextThb, nextJpy, nextGbp, nextEur);
        triggerSuccess(`ทำรายการขายสำเร็จ! ได้รับยอดเงินตราต่างประเทศ +${fiatToReceive.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${sourceCurrency}`);
        setAmount("");
      } else {
        triggerError(`เกิดข้อผิดพลาดระหว่างทำรายการขายเหรียญ`);
      }
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel rounded-3xl p-6 md:p-8 space-y-6 relative overflow-hidden border border-white/5">
      {/* Visual Ambient Background */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-emerald-500/5 rounded-full blur-3xl"></div>

      {/* Header and Core Branding */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/5 pb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 to-teal-500 flex items-center justify-center text-white shadow shadow-cyan-950 shrink-0">
            <Wallet className="w-6 h-6 text-cyan-200" />
          </div>
          <div>
            <h3 className="font-display font-black text-lg text-white">
              ระบบธุรกรรมเงินตราหลายสกุล (Multi-Currency Fiat Portal)
            </h3>
            <p className="text-xs text-gray-400 font-mono">
              สลับแลกเปลี่ยน โอนฝาก และซื้อขาย 5 สกุลเงินหลักอย่างปลอดภัยในแดนอันดามัน
            </p>
          </div>
        </div>

        {/* Sync Status Badge */}
        <div className="flex items-center gap-1.5 self-start md:self-center bg-cyan-950/40 border border-cyan-500/20 px-3 py-1.5 rounded-xl text-[10px] font-mono text-cyan-400 font-bold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>MULTI-FIAT SYNCED</span>
        </div>
      </div>

      {/* Quick Info Box */}
      <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-4 flex gap-3 text-xs text-gray-400">
        <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-white font-bold text-[11px]">อัตราแลกเปลี่ยนอ้างอิงกองทุนพัฒนาสิ่งแวดล้อมสากล</p>
          <p className="leading-relaxed">
            คุณสามารถเติมเงิน/ฝากเงิน หรือแลกเปลี่ยนสกุลเงินได้อิสระ โดยทุกยอดใช้ในการทำธุรกรรมร่วมกับเครือข่ายอนุรักษ์อันดามัน (1 AND ≈ 0.15 USD / 5.25 THB)
          </p>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl p-4 text-xs flex items-center gap-2.5 animate-pulse">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl p-4 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tab Selectors */}
      <div className="flex bg-slate-950 border border-white/5 p-1 rounded-2xl text-xs font-mono">
        <button
          onClick={() => { setActiveSubTab("balances"); setAmount(""); }}
          className={`flex-1 py-2.5 rounded-xl transition font-bold ${activeSubTab === "balances" ? "bg-cyan-600 text-white" : "text-gray-400 hover:text-white"}`}
        >
          {CURRENCY_DETAILS.THB.flag} บัญชีของฉัน
        </button>
        <button
          onClick={() => { setActiveSubTab("exchange"); setAmount(""); }}
          className={`flex-1 py-2.5 rounded-xl transition font-bold ${activeSubTab === "exchange" ? "bg-cyan-600 text-white" : "text-gray-400 hover:text-white"}`}
        >
          <ArrowRightLeft className="w-3.5 h-3.5 inline mr-1" /> แลกเปลี่ยนเงิน
        </button>
        <button
          onClick={() => { setActiveSubTab("and_trade"); setAmount(""); }}
          className={`flex-1 py-2.5 rounded-xl transition font-bold ${activeSubTab === "and_trade" ? "bg-cyan-600 text-white" : "text-gray-400 hover:text-white"}`}
        >
          <Coins className="w-3.5 h-3.5 inline mr-1" /> ซื้อ/ขาย AND
        </button>
        <button
          onClick={() => { setActiveSubTab("transfer"); setAmount(""); }}
          className={`flex-1 py-2.5 rounded-xl transition font-bold ${activeSubTab === "transfer" ? "bg-cyan-600 text-white" : "text-gray-400 hover:text-white"}`}
        >
          <Send className="w-3.5 h-3.5 inline mr-1" /> โอนเงินสากล
        </button>
      </div>

      {/* SUB-TAB 1: BALANCES GRID AND DEPOSIT PORTAL */}
      {activeSubTab === "balances" && (
        <div className="space-y-6 relative z-10">
          <h4 className="font-display font-black text-sm text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            <span>ยอดคงเหลือ 5 สกุลเงินหลัก (My Fiat Balances)</span>
          </h4>

          {/* Core Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
            {/* USD */}
            <div className="bg-slate-900/80 border border-white/5 rounded-2xl p-4.5 space-y-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-full blur-xl"></div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold font-mono">USD {CURRENCY_DETAILS.USD.flag}</span>
                <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded font-mono">สหรัฐ</span>
              </div>
              <div>
                <p className="text-gray-500 text-[10px] uppercase font-mono">ยอดคงเหลือ</p>
                <p className="text-xl font-mono font-black text-white">{CURRENCY_DETAILS.USD.symbol}{usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <button
                onClick={() => handleDeposit("USD", 100)}
                className="w-full py-1.5 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 hover:border-blue-500/40 text-blue-400 text-[11px] font-bold font-mono rounded-lg transition"
              >
                + ฝาก $100
              </button>
            </div>

            {/* THB */}
            <div className="bg-slate-900/80 border border-white/5 rounded-2xl p-4.5 space-y-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/5 rounded-full blur-xl"></div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold font-mono">THB {CURRENCY_DETAILS.THB.flag}</span>
                <span className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded font-mono">ไทย</span>
              </div>
              <div>
                <p className="text-gray-500 text-[10px] uppercase font-mono">ยอดคงเหลือ</p>
                <p className="text-xl font-mono font-black text-white">{CURRENCY_DETAILS.THB.symbol}{thb.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <button
                onClick={() => handleDeposit("THB", 3000)}
                className="w-full py-1.5 bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 hover:border-red-500/40 text-red-400 text-[11px] font-bold font-mono rounded-lg transition"
              >
                + ฝาก ฿3,000
              </button>
            </div>

            {/* JPY */}
            <div className="bg-slate-900/80 border border-white/5 rounded-2xl p-4.5 space-y-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-pink-500/5 rounded-full blur-xl"></div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold font-mono">JPY {CURRENCY_DETAILS.JPY.flag}</span>
                <span className="text-xs bg-pink-500/10 text-pink-400 border border-pink-500/20 px-1.5 py-0.5 rounded font-mono">ญี่ปุ่น</span>
              </div>
              <div>
                <p className="text-gray-500 text-[10px] uppercase font-mono">ยอดคงเหลือ</p>
                <p className="text-xl font-mono font-black text-white">{CURRENCY_DETAILS.JPY.symbol}{jpy.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
              </div>
              <button
                onClick={() => handleDeposit("JPY", 15000)}
                className="w-full py-1.5 bg-pink-600/10 hover:bg-pink-600/20 border border-pink-500/20 hover:border-pink-500/40 text-pink-400 text-[11px] font-bold font-mono rounded-lg transition"
              >
                + ฝาก ¥15,000
              </button>
            </div>

            {/* GBP */}
            <div className="bg-slate-900/80 border border-white/5 rounded-2xl p-4.5 space-y-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 rounded-full blur-xl"></div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold font-mono">GBP {CURRENCY_DETAILS.GBP.flag}</span>
                <span className="text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20 px-1.5 py-0.5 rounded font-mono">อังกฤษ</span>
              </div>
              <div>
                <p className="text-gray-500 text-[10px] uppercase font-mono">ยอดคงเหลือ</p>
                <p className="text-xl font-mono font-black text-white">{CURRENCY_DETAILS.GBP.symbol}{gbp.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <button
                onClick={() => handleDeposit("GBP", 100)}
                className="w-full py-1.5 bg-purple-600/10 hover:bg-purple-600/20 border border-purple-500/20 hover:border-purple-500/40 text-purple-400 text-[11px] font-bold font-mono rounded-lg transition"
              >
                + ฝาก £100
              </button>
            </div>

            {/* EUR */}
            <div className="bg-slate-900/80 border border-white/5 rounded-2xl p-4.5 space-y-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-teal-500/5 rounded-full blur-xl"></div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold font-mono">EUR {CURRENCY_DETAILS.EUR.flag}</span>
                <span className="text-xs bg-teal-500/10 text-teal-400 border border-teal-500/20 px-1.5 py-0.5 rounded font-mono">EU</span>
              </div>
              <div>
                <p className="text-gray-500 text-[10px] uppercase font-mono">ยอดคงเหลือ</p>
                <p className="text-xl font-mono font-black text-white">{CURRENCY_DETAILS.EUR.symbol}{eur.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <button
                onClick={() => handleDeposit("EUR", 100)}
                className="w-full py-1.5 bg-teal-600/10 hover:bg-teal-600/20 border border-teal-500/20 hover:border-teal-500/40 text-teal-400 text-[11px] font-bold font-mono rounded-lg transition"
              >
                + ฝาก €100
              </button>
            </div>
          </div>

          {/* Quick Deposit Form */}
          <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-5 space-y-4">
            <h5 className="font-display font-bold text-xs text-white">ฝากเงินด่วน (Quick Deposit Portal)</h5>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <input
                  type="number"
                  placeholder="กรอกจำนวนเงินตรา..."
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-slate-900 text-white rounded-xl px-4 py-2.5 border border-white/10 focus:border-cyan-400 focus:outline-none placeholder:text-gray-600 font-mono text-sm"
                />
              </div>
              <div className="w-full sm:w-48">
                <select
                  value={sourceCurrency}
                  onChange={(e) => setSourceCurrency(e.target.value)}
                  className="w-full bg-slate-900 text-white rounded-xl px-4 py-2.5 border border-white/10 focus:border-cyan-400 focus:outline-none font-mono text-sm"
                >
                  <option value="USD">USD ($) 🇺🇸</option>
                  <option value="THB">THB (฿) 🇹🇭</option>
                  <option value="JPY">JPY (¥) 🇯🇵</option>
                  <option value="GBP">GBP (£) 🇬🇧</option>
                  <option value="EUR">EUR (€) 🇪🇺</option>
                </select>
              </div>
              <button
                disabled={loading}
                onClick={() => handleDeposit(sourceCurrency, parseFloat(amount))}
                className="bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl px-6 py-2.5 font-bold text-sm transition shrink-0 active:scale-95 duration-100 flex items-center justify-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>ยืนยันการฝากเงิน</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: EXCHANGE/SWAP PORTAL */}
      {activeSubTab === "exchange" && (
        <div className="space-y-6 relative z-10 max-w-xl mx-auto">
          <div className="text-center space-y-1">
            <h4 className="font-display font-black text-sm text-white">
              ระบบสลับแลกเปลี่ยนสกุลเงินสด (Universal Foreign Exchange)
            </h4>
            <p className="text-[11px] text-gray-400">
              ทำการแปลงเงินในกระเป๋าของคุณได้ทันที ด้วยอัตราแลกเปลี่ยนจริงที่ไม่มีค่าธรรมเนียม
            </p>
          </div>

          <div className="bg-slate-900/60 border border-white/5 rounded-3xl p-6 space-y-5">
            {/* Source Currency */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-gray-500 font-mono font-bold uppercase block">คุณต้องการจ่าย (From)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="flex-1 bg-slate-950 text-white font-mono rounded-xl px-4 py-3 border border-white/10 focus:border-cyan-400 focus:outline-none text-base"
                />
                <select
                  value={sourceCurrency}
                  onChange={(e) => setSourceCurrency(e.target.value)}
                  className="bg-slate-950 text-white font-mono rounded-xl px-4 py-3 border border-white/10 focus:border-cyan-400 focus:outline-none text-sm w-32"
                >
                  <option value="USD">USD 🇺🇸</option>
                  <option value="THB">THB 🇹🇭</option>
                  <option value="JPY">JPY 🇯🇵</option>
                  <option value="GBP">GBP 🇬🇧</option>
                  <option value="EUR">EUR 🇪🇺</option>
                </select>
              </div>
              <div className="text-[10px] text-gray-400 font-mono flex items-center gap-1 mt-1 pl-1">
                <span>ยอดที่มีอยู่ออมทรัพย์:</span>
                <span className="font-bold text-white">
                  {sourceCurrency === "USD" && `$${usd}`}
                  {sourceCurrency === "THB" && `฿${thb}`}
                  {sourceCurrency === "JPY" && `¥${jpy}`}
                  {sourceCurrency === "GBP" && `£${gbp}`}
                  {sourceCurrency === "EUR" && `€${eur}`}
                </span>
              </div>
            </div>

            {/* Swap visual decoration indicator */}
            <div className="flex justify-center -my-2.5">
              <button 
                onClick={() => {
                  const temp = sourceCurrency;
                  setSourceCurrency(targetCurrency);
                  setTargetCurrency(temp);
                }}
                className="w-8 h-8 rounded-full bg-slate-950 hover:bg-cyan-600 text-gray-400 hover:text-white flex items-center justify-center border border-white/5 transition active:rotate-185 duration-300"
              >
                <ArrowRightLeft className="w-4 h-4 rotate-90" />
              </button>
            </div>

            {/* Target Currency */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-gray-500 font-mono font-bold uppercase block">คุณจะได้รับโดยประมาณ (To)</label>
              <div className="flex gap-2">
                <div className="flex-1 bg-slate-950/40 text-gray-400 font-mono rounded-xl px-4 py-3 border border-white/5 flex items-center text-base">
                  {amount && !isNaN(parseFloat(amount))
                    ? getExchangeAmount(parseFloat(amount), sourceCurrency, targetCurrency).toLocaleString(undefined, { maximumFractionDigits: 2 })
                    : "0.00"
                  }
                </div>
                <select
                  value={targetCurrency}
                  onChange={(e) => setTargetCurrency(e.target.value)}
                  className="bg-slate-950 text-white font-mono rounded-xl px-4 py-3 border border-white/10 focus:border-cyan-400 focus:outline-none text-sm w-32"
                >
                  <option value="USD">USD 🇺🇸</option>
                  <option value="THB">THB 🇹🇭</option>
                  <option value="JPY">JPY 🇯🇵</option>
                  <option value="GBP">GBP 🇬🇧</option>
                  <option value="EUR">EUR 🇪🇺</option>
                </select>
              </div>
              <div className="text-[10px] text-cyan-400 font-mono mt-1 pl-1">
                <span>อัตราแลกเปลี่ยน: 1 {sourceCurrency} ≈ {(EXCHANGE_RATES[targetCurrency] / EXCHANGE_RATES[sourceCurrency]).toFixed(4)} {targetCurrency}</span>
              </div>
            </div>

            {/* CTA */}
            <button
              disabled={loading}
              onClick={handleSwap}
              className="w-full py-3 bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-500 hover:to-teal-400 text-white text-sm font-bold rounded-2xl transition active:scale-[0.98] duration-150 flex items-center justify-center gap-1.5 shrink-0"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span>ทำรายการสลับแลกเปลี่ยนสกุลเงิน</span>
            </button>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: BUY/SELL ANDAMANCOIN (AND) WITH FIAT */}
      {activeSubTab === "and_trade" && (
        <div className="space-y-6 relative z-10 max-w-xl mx-auto">
          <div className="text-center space-y-1">
            <h4 className="font-display font-black text-sm text-white">
              กระดานแลกเปลี่ยน AndamanCoin (AND Liquid Exchange)
            </h4>
            <p className="text-[11px] text-gray-400">
              ซื้อเหรียญสะสมรักษ์โลกด้วยเงินสดสากล หรือ เทขายเหรียญ AND คืนเข้าสู่บัญชีเงินสดของคุณ
            </p>
          </div>

          <div className="bg-slate-900/60 border border-white/5 rounded-3xl p-6 space-y-5">
            {/* Currency select for purchasing/selling */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-500 font-mono uppercase block">สัญญาสกุลเงินชำระ</label>
                <select
                  value={sourceCurrency}
                  onChange={(e) => setSourceCurrency(e.target.value)}
                  className="w-full bg-slate-950 text-white font-mono rounded-xl px-4 py-2.5 border border-white/10 focus:border-cyan-400 focus:outline-none text-xs"
                >
                  <option value="USD">USD ($) 🇺🇸</option>
                  <option value="THB">THB (฿) 🇹🇭</option>
                  <option value="JPY">JPY (¥) 🇯🇵</option>
                  <option value="GBP">GBP (£) 🇬🇧</option>
                  <option value="EUR">EUR (€) 🇪🇺</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-500 font-mono uppercase block">เหรียญปลายทาง</label>
                <div className="w-full bg-slate-950/40 text-yellow-400 border border-white/5 font-mono rounded-xl px-4 py-2.5 text-xs flex items-center gap-1 font-bold">
                  <Coins className="w-3.5 h-3.5" />
                  AND (AndamanCoin)
                </div>
              </div>
            </div>

            {/* Value Inputs */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-gray-500 font-mono uppercase block">กรอกจำนวนตัวเลขที่จะแลก</label>
              <input
                type="number"
                placeholder="จำนวนหน่วย..."
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-950 text-white font-mono rounded-xl px-4 py-3 border border-white/10 focus:border-cyan-400 focus:outline-none text-sm"
              />
              <p className="text-[10px] text-gray-400 leading-relaxed font-mono">
                *ถ้าเลือก <strong className="text-emerald-400">ซื้อ AND</strong> ตัวเลขนี้จะเป็นหน่วยเงินตรา {sourceCurrency} ที่ใช้จ่าย
                <br />
                *ถ้าเลือก <strong className="text-amber-400">ขาย AND</strong> ตัวเลขนี้จะเป็นจำนวนเหรียญ AND ที่คุณต้องการเทขาย
              </p>
            </div>

            {/* Calculations preview */}
            <div className="bg-slate-950/60 rounded-2xl p-4 border border-white/5 space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-gray-500">อัตราตลาดปัจจุบัน:</span>
                <span className="text-yellow-400 font-bold">1 AND ≈ {(0.15 * EXCHANGE_RATES[sourceCurrency]).toFixed(4)} {sourceCurrency}</span>
              </div>
              <div className="flex justify-between border-t border-white/5 pt-2 text-[11px]">
                <span className="text-gray-400">เหรียญสะสมของคุณ:</span>
                <span className="text-white font-bold">{balance} AND</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-gray-400">ยอดเงินสดคงเหลือ:</span>
                <span className="text-white font-bold">
                  {sourceCurrency === "USD" && `$${usd}`}
                  {sourceCurrency === "THB" && `฿${thb}`}
                  {sourceCurrency === "JPY" && `¥${jpy}`}
                  {sourceCurrency === "GBP" && `£${gbp}`}
                  {sourceCurrency === "EUR" && `€${eur}`}
                </span>
              </div>
            </div>

            {/* Trade Actions Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                disabled={loading}
                onClick={() => handleAndTrade(true)}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-bold transition active:scale-95 duration-150 flex items-center justify-center gap-1.5 shrink-0"
              >
                <Download className="w-4 h-4" />
                <span>ซื้อเหรียญ AND ด้วยเงินสด {sourceCurrency}</span>
              </button>

              <button
                disabled={loading}
                onClick={() => handleAndTrade(false)}
                className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-2xl text-xs font-bold transition active:scale-95 duration-150 flex items-center justify-center gap-1.5 shrink-0"
              >
                <Send className="w-4 h-4" />
                <span>ขายเหรียญ AND แลกเงินสด {sourceCurrency}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: SEND / TRANSFER FIAT TO ANOTHER USER */}
      {activeSubTab === "transfer" && (
        <div className="space-y-6 relative z-10 max-w-xl mx-auto">
          <div className="text-center space-y-1">
            <h4 className="font-display font-black text-sm text-white">
              บริการโอนเงินระหว่างประเทศอันดามัน (Global Swift Remittance)
            </h4>
            <p className="text-[11px] text-gray-400">
              โอนเงินดอลลาร์, บาท, เยน, ปอนด์ หรือยูโร ไปยังอาสาสมัคร ชุมชน หรือผู้คนปลายทางข้ามภูมิภาคทันที
            </p>
          </div>

          <div className="bg-slate-900/60 border border-white/5 rounded-3xl p-6 space-y-5">
            {/* Recipient Input */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-gray-500 font-mono font-bold uppercase block">ที่อยู่อีเมล หรือรหัสกระเป๋าเงินผู้รับ (Recipient Address)</label>
              <input
                type="text"
                placeholder="เช่น: partner-hotel@andamancoisea.com"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="w-full bg-slate-950 text-white rounded-xl px-4 py-3 border border-white/10 focus:border-cyan-400 focus:outline-none text-xs font-mono"
              />
            </div>

            {/* Currency and Amount */}
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-1.5">
                <label className="text-[10px] text-gray-500 font-mono font-bold uppercase block">จำนวนเงิน</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-slate-950 text-white font-mono rounded-xl px-4 py-3 border border-white/10 focus:border-cyan-400 focus:outline-none text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-500 font-mono font-bold uppercase block">สกุลเงิน</label>
                <select
                  value={transferCurrency}
                  onChange={(e) => setTransferCurrency(e.target.value)}
                  className="w-full bg-slate-950 text-white font-mono rounded-xl px-4 py-3 border border-white/10 focus:border-cyan-400 focus:outline-none text-xs"
                >
                  <option value="AND">AND (AndamanCoin) 🪙</option>
                  <option value="USD">USD ($) 🇺🇸</option>
                  <option value="THB">THB (฿) 🇹🇭</option>
                  <option value="JPY">JPY (¥) 🇯🇵</option>
                  <option value="GBP">GBP (£) 🇬🇧</option>
                  <option value="EUR">EUR (€) 🇪🇺</option>
                </select>
              </div>
            </div>

            {/* Transfer Balance Preview */}
            <div className="text-[10px] text-gray-400 font-mono pl-1">
              <span>ยอดที่คุณมีสิทธิ์โอนสูงสุด:</span>
              <strong className="text-white ml-1 font-mono">
                {transferCurrency === "AND" && `${balance} AND`}
                {transferCurrency === "USD" && `$${usd.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                {transferCurrency === "THB" && `฿${thb.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                {transferCurrency === "JPY" && `¥${jpy.toLocaleString(undefined, { minimumFractionDigits: 0 })}`}
                {transferCurrency === "GBP" && `£${gbp.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                {transferCurrency === "EUR" && `€${eur.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
              </strong>
            </div>

            {/* CTA */}
            <button
              disabled={loading}
              onClick={handleTransfer}
              className="w-full py-3 bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-500 hover:to-teal-400 text-white text-xs font-bold rounded-2xl transition active:scale-[0.98] duration-150 flex items-center justify-center gap-1.5 shrink-0"
            >
              <Send className="w-4 h-4" />
              <span>ดำเนินการส่งและทำธุรกรรมโอนเงิน</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
