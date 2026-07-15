import React, { useState, useEffect, useMemo } from "react";
import { UserProfile, StockHolding } from "../types";
import { updateUserPortfolioAndBalance, addUserActivity } from "../firebaseService";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { 
  LineChart as LucideLineChart,
  TrendingUp, 
  TrendingDown, 
  Search, 
  DollarSign, 
  Briefcase, 
  Activity, 
  RefreshCw, 
  ArrowUpDown,
  FileText,
  CheckCircle,
  AlertCircle,
  Newspaper,
  Flame,
  Award
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface StockTradingSectionProps {
  userProfile: UserProfile | null;
  onUpdatePortfolio: (updatedPortfolio: { [symbol: string]: StockHolding }, nextBalance: number, currency: "USD" | "THB") => void;
}

interface StockDef {
  symbol: string;
  name: string;
  currency: "USD" | "THB";
  basePrice: number;
  category: "Tech" | "Clean Energy" | "Retail" | "Infrastructure" | "Healthcare";
  description: string;
}

// ESG and Global Blue-Chips related to Andaman sustainable development
const SUPPORTED_STOCKS: StockDef[] = [
  { symbol: "TSLA", name: "Tesla Inc. (Green EV & Solar)", currency: "USD", basePrice: 245.50, category: "Clean Energy", description: "ผู้นำด้านยานยนต์ไฟฟ้าและโซลาร์เซลล์ สนับสนุนการเปลี่ยนผ่านสู่พลังงานสะอาดในรีสอร์ทอันดามัน" },
  { symbol: "AAPL", name: "Apple Inc. (Carbon Neutral Tech)", currency: "USD", basePrice: 182.20, category: "Tech", description: "บริษัทเทคโนโลยียักษ์ใหญ่ มุ่งสู่การปล่อยคาร์บอนสุทธิเป็นศูนย์ 100% ตลอดซัพพลายเชน" },
  { symbol: "NVDA", name: "NVIDIA Corp. (AI Ocean Modeling)", currency: "USD", basePrice: 120.80, category: "Tech", description: "ชิปประมวลผล AI ขั้นสูง ใช้ในการจำลองแบบจำลองกระแสน้ำและการคาดการณ์มรสุมอันดามัน" },
  { symbol: "GOOGL", name: "Alphabet Inc. (AI Eco-Mapping)", currency: "USD", basePrice: 165.40, category: "Tech", description: "ระบบติดตามปะการังด้วยปัญญาประดิษฐ์และแผนที่รักษ์ป่าชายเลน" },
  { symbol: "PTT.BK", name: "PTT Pcl. (Andaman ESG Bond)", currency: "THB", basePrice: 34.25, category: "Clean Energy", description: "บมจ.ปตท. ร่วมลงทุนพันธบัตรสีเขียวฟื้นฟูระบบนิเวศและพลังงานสะอาดภาคใต้" },
  { symbol: "CPALL.BK", name: "CP ALL Pcl. (Green Packaging)", currency: "THB", basePrice: 57.50, category: "Retail", description: "เครือข่ายร้านค้าปลีกรักษ์โลก มุ่งยกเลิกถุงพลาสติกและใช้บรรจุภัณฑ์ย่อยสลายได้ในเกาะท่องเที่ยว" },
  { symbol: "BDMS.BK", name: "Bangkok Dusit Med (Eco-Hospital)", currency: "THB", basePrice: 28.00, category: "Healthcare", description: "เครือข่ายโรงพยาบาลรักษ์โลกที่จัดการของเสียการแพทย์เป็นมิตรต่อทะเล" },
  { symbol: "AOT.BK", name: "Airports of Thailand (Solar Airport)", currency: "THB", basePrice: 62.25, category: "Infrastructure", description: "ท่าอากาศยานสีเขียว ติดตั้งโซลาร์รูฟท็อปเต็มรูปแบบ ณ สนามบินภูเก็ตและกระบี่" }
];

// Helper to generate realistic starting historical data for the stock
function generateHistoricalData(basePrice: number, pointsCount = 30) {
  const data = [];
  let currentPrice = basePrice * 0.9; // start a bit lower
  const now = new Date();
  
  for (let i = pointsCount; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toLocaleDateString("th-TH", { month: "short", day: "numeric" });
    const change = (Math.random() - 0.48) * (basePrice * 0.03); // slight upward bias
    currentPrice = Math.max(1, currentPrice + change);
    data.push({
      date: dateStr,
      price: parseFloat(currentPrice.toFixed(2))
    });
  }
  return data;
}

const ECO_NEWS = [
  { title: "ตลาดหลักทรัพย์อันดามันคึกคัก หุ้นกลุ่มพลังงานหมุนเวียนบวกยกแผง นำโดย TSLA และ PTT", time: "5 นาทีที่แล้ว" },
  { title: "CPALL ประกาศความสำเร็จ ยอดใช้ถุงพลาสติกลดลง 92% ในพื้นที่เกาะพีพีและภูเก็ต", time: "20 นาทีที่แล้ว" },
  { title: "AOT ร่วมกับสหกรณ์ท้องถิ่น เปิดตัวแท็กซี่ไฟฟ้าพลังงานแสงอาทิตย์เต็มรูปแบบ ณ สนามบินภูเก็ต", time: "1 ชั่วโมงที่แล้ว" },
  { title: "นักวิเคราะห์แนะสะสม หุ้นเทคโนโลยี ESG (NVDA, AAPL) รับเทรนด์การติดตามสิ่งแวดล้อมโลก", time: "2 ชั่วโมงที่แล้ว" },
  { title: "แอดมินอนุมัติกองทุนอนุรักษ์แนวปะการัง ดึงเม็ดเงินจาก Andaman Exchange หนุนสิทธิประโยชน์สมาชิก", time: "4 ชั่วโมงที่แล้ว" }
];

export default function StockTradingSection({ userProfile, onUpdatePortfolio }: StockTradingSectionProps) {
  // Current active stock
  const [selectedSymbol, setSelectedSymbol] = useState<string>("TSLA");
  const [chartRange, setChartRange] = useState<"1W" | "1M" | "All">("1M");
  const [tradeTab, setTradeTab] = useState<"buy" | "sell">("buy");
  const [searchQuery, setSearchQuery] = useState("");
  const [tradeQuantity, setTradeQuantity] = useState<string>("1");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Success / Error message banners
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Live prices with fluctuation mapping
  const [livePrices, setLivePrices] = useState<{ [symbol: string]: { price: number; change24h: number; prevPrice: number } }>(() => {
    const initial: { [symbol: string]: { price: number; change24h: number; prevPrice: number } } = {};
    SUPPORTED_STOCKS.forEach(stock => {
      // randomly fluctuate base slightly for dynamic startup
      const startupVariance = (Math.random() - 0.5) * (stock.basePrice * 0.02);
      const price = parseFloat((stock.basePrice + startupVariance).toFixed(2));
      const change24h = parseFloat(((Math.random() - 0.45) * 5).toFixed(2)); // slight green bias
      initial[stock.symbol] = { price, change24h, prevPrice: price };
    });
    return initial;
  });

  // Background price ticking simulator (Brownian motion) to make it feel alive!
  useEffect(() => {
    const interval = setInterval(() => {
      setLivePrices(prev => {
        const next = { ...prev };
        SUPPORTED_STOCKS.forEach(stock => {
          const current = prev[stock.symbol];
          if (!current) return;
          const fluctuationPercent = (Math.random() - 0.5) * 0.008; // max 0.4% change per tick
          const priceDiff = current.price * fluctuationPercent;
          const nextPrice = parseFloat(Math.max(0.1, current.price + priceDiff).toFixed(2));
          // adjust 24h change slowly toward new drift
          const nextChange = parseFloat((current.change24h + (fluctuationPercent * 100)).toFixed(2));
          
          next[stock.symbol] = {
            price: nextPrice,
            change24h: nextChange,
            prevPrice: current.price
          };
        });
        return next;
      });
    }, 4000); // Ticks every 4 seconds

    return () => clearInterval(interval);
  }, []);

  // Generate historical data once selectedSymbol or chartRange changes
  const activeStockDef = useMemo(() => {
    return SUPPORTED_STOCKS.find(s => s.symbol === selectedSymbol) || SUPPORTED_STOCKS[0];
  }, [selectedSymbol]);

  const historicalData = useMemo(() => {
    const points = chartRange === "1W" ? 7 : chartRange === "1M" ? 30 : 90;
    // Anchor historical data around current live price
    const currentPrice = livePrices[selectedSymbol]?.price || activeStockDef.basePrice;
    return generateHistoricalData(currentPrice, points);
  }, [selectedSymbol, chartRange, livePrices[selectedSymbol]?.price]);

  // Handle errors
  const triggerError = (msg: string) => {
    setErrorMsg(msg);
    setSuccessMsg(null);
    setTimeout(() => setErrorMsg(null), 5000);
  };

  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setErrorMsg(null);
    setTimeout(() => setSuccessMsg(null), 5000);
  };

  // Extract user cash reserves
  const usdCash = userProfile?.usdBalance !== undefined ? userProfile.usdBalance : 1000;
  const thbCash = userProfile?.thbBalance !== undefined ? userProfile.thbBalance : 30000;

  // Compute stock-specific details
  const activeLivePrice = livePrices[selectedSymbol]?.price || activeStockDef.basePrice;
  const activeChange = livePrices[selectedSymbol]?.change24h || 0;
  const activePrevPrice = livePrices[selectedSymbol]?.prevPrice || activeLivePrice;
  const activeCurrency = activeStockDef.currency;
  const activeCash = activeCurrency === "USD" ? usdCash : thbCash;

  // Filtered stocks based on user search query
  const filteredStocks = SUPPORTED_STOCKS.filter(
    s => s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) || 
         s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Extract owned holdings
  const portfolio = useMemo(() => {
    return userProfile?.portfolio || {};
  }, [userProfile?.portfolio]);

  const activeHolding = portfolio[selectedSymbol];

  // Calculated values
  const numericQuantity = parseFloat(tradeQuantity);
  const isValidQuantity = !isNaN(numericQuantity) && numericQuantity > 0;
  const estimatedCost = isValidQuantity ? numericQuantity * activeLivePrice : 0;

  // Calculate Net Worth / Valuation of Portfolio
  const portfolioValuation = useMemo(() => {
    let usdStocksValue = 0;
    let thbStocksValue = 0;

    Object.values(portfolio).forEach((holding: StockHolding) => {
      const currentPrice = livePrices[holding.symbol]?.price || holding.avgBuyPrice;
      const stockVal = holding.quantity * currentPrice;
      if (holding.currency === "USD") {
        usdStocksValue += stockVal;
      } else {
        thbStocksValue += stockVal;
      }
    });

    return {
      usdStocksValue,
      thbStocksValue,
      totalUsdValue: usdCash + usdStocksValue,
      totalThbValue: thbCash + thbStocksValue
    };
  }, [portfolio, livePrices, usdCash, thbCash]);

  // QUICK BUY percentage allocator
  const setPercentageQty = (pct: number) => {
    const maxAffordable = Math.floor((activeCash / activeLivePrice) * 100) / 100;
    const targetQty = maxAffordable * pct;
    if (targetQty <= 0) {
      setTradeQuantity("0");
    } else {
      setTradeQuantity(targetQty.toFixed(2));
    }
  };

  // Perform TRANSACTION: BUY / SELL STOCK
  const handleExecuteTrade = async () => {
    if (!userProfile?.email) {
      triggerError("กรุณาเข้าสู่ระบบก่อนทำรายการเทรดหุ้น");
      return;
    }

    if (!isValidQuantity) {
      triggerError("กรุณาระบุจำนวนหุ้นที่ถูกต้องมากกว่า 0");
      return;
    }

    setIsSubmitting(true);
    try {
      const updatedPortfolio = { ...portfolio };
      let nextCashBalance = activeCash;

      if (tradeTab === "buy") {
        if (estimatedCost > activeCash) {
          throw new Error(`ยอดเงิน ${activeCurrency} ไม่เพียงพอสำหรับการซื้อหุ้นนี้ (ต้องการ: ${estimatedCost.toLocaleString()} ${activeCurrency}, ยอดปัจจุบัน: ${activeCash.toLocaleString()} ${activeCurrency})`);
        }

        nextCashBalance = activeCash - estimatedCost;

        // Add to portfolio
        if (updatedPortfolio[selectedSymbol]) {
          const oldQty = updatedPortfolio[selectedSymbol].quantity;
          const oldAvg = updatedPortfolio[selectedSymbol].avgBuyPrice;
          const nextQty = oldQty + numericQuantity;
          const nextAvg = parseFloat(((oldQty * oldAvg + estimatedCost) / nextQty).toFixed(2));

          updatedPortfolio[selectedSymbol] = {
            ...updatedPortfolio[selectedSymbol],
            quantity: nextQty,
            avgBuyPrice: nextAvg
          };
        } else {
          updatedPortfolio[selectedSymbol] = {
            symbol: selectedSymbol,
            name: activeStockDef.name,
            quantity: numericQuantity,
            avgBuyPrice: activeLivePrice,
            currency: activeCurrency
          };
        }

        // Save to Database
        await updateUserPortfolioAndBalance(userProfile.email, updatedPortfolio, activeCurrency, nextCashBalance);

        // Record Activity Logs
        await addUserActivity(userProfile.email, {
          type: "spend",
          region: userProfile.regionId || "thailand",
          date: new Date().toLocaleDateString(),
          description: `ซื้อหุ้นรักษ์โลก ${selectedSymbol} จำนวน ${numericQuantity} หุ้น ที่ราคา ${activeLivePrice} ${activeCurrency}`,
          coinEarned: 0,
          quantityDetails: `ยอดเงินหัก: -${estimatedCost.toLocaleString()} ${activeCurrency}`,
          status: "verified"
        });

        triggerSuccess(`ทำการซื้อหุ้น ${selectedSymbol} จำนวน ${numericQuantity} หุ้น สำเร็จและบันทึกคลาวด์พอร์ตโฟลิโอเรียบร้อย! 📈`);
        setTradeQuantity("1");
      } else {
        // SELL ACTION
        if (!activeHolding || activeHolding.quantity < numericQuantity) {
          throw new Error(`คุณมีหุ้น ${selectedSymbol} ไม่เพียงพอสำหรับการขาย (มี: ${activeHolding?.quantity || 0} หุ้น, ต้องการขาย: ${numericQuantity} หุ้น)`);
        }

        const remainingQty = activeHolding.quantity - numericQuantity;
        const proceeds = estimatedCost;
        nextCashBalance = activeCash + proceeds;

        if (remainingQty <= 0) {
          delete updatedPortfolio[selectedSymbol];
        } else {
          updatedPortfolio[selectedSymbol] = {
            ...activeHolding,
            quantity: remainingQty
          };
        }

        // Save to Database
        await updateUserPortfolioAndBalance(userProfile.email, updatedPortfolio, activeCurrency, nextCashBalance);

        // Record Activity Logs
        await addUserActivity(userProfile.email, {
          type: "refill",
          region: userProfile.regionId || "thailand",
          date: new Date().toLocaleDateString(),
          description: `ขายหุ้นรักษ์โลก ${selectedSymbol} จำนวน ${numericQuantity} หุ้น ที่ราคา ${activeLivePrice} ${activeCurrency}`,
          coinEarned: 0,
          quantityDetails: `ยอดเงินรับ: +${proceeds.toLocaleString()} ${activeCurrency}`,
          status: "verified"
        });

        triggerSuccess(`ทำการขายหุ้น ${selectedSymbol} จำนวน ${numericQuantity} หุ้น สำเร็จ ยอดคงเหลือถูกโอนเข้าบัญชีของคุณเรียบร้อย! 📉`);
        setTradeQuantity("1");
      }

      // Notify parent component about state updates
      onUpdatePortfolio(updatedPortfolio, nextCashBalance, activeCurrency);
    } catch (err: any) {
      triggerError(err.message || "เกิดข้อผิดพลาดในการทำรายการ");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Determine visual color change
  const priceColor = activeChange >= 0 ? "text-emerald-400" : "text-red-400";
  const bgTrendColor = activeChange >= 0 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20";
  const isRising = activeLivePrice >= activePrevPrice;

  return (
    <div id="stock-trading-section" className="space-y-6 max-w-7xl mx-auto px-1">
      
      {/* Top Banner & Wallet Status */}
      <div className="bg-gradient-to-r from-slate-950 via-blue-950/40 to-slate-950 border border-white/5 p-6 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="space-y-1.5 text-left">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-cyan-500/10 rounded-lg text-cyan-400">
              <LucideLineChart className="w-4 h-4" />
            </span>
            <span className="text-[10px] uppercase font-mono tracking-wider text-cyan-400 font-bold">Andaman Sustainable Exchange (ADX)</span>
          </div>
          <h2 className="font-display font-black text-xl text-white">ตลาดหลักทรัพย์สิ่งแวดล้อมสากลอันดามัน</h2>
          <p className="text-xs text-gray-400">เลือกลงทุนในองค์กรชั้นนำที่มีนวัตกรรมรักษ์สิ่งแวดล้อมและสนับสนุนเศรษฐกิจสีน้ำเงิน (Blue Economy)</p>
        </div>

        {/* User Multi-Currency Asset Value */}
        <div className="flex flex-wrap gap-4">
          <div className="bg-slate-900/60 border border-white/5 px-4 py-3 rounded-2xl text-left min-w-[150px]">
            <span className="text-[9px] text-gray-400 font-mono block">สินทรัพย์ USD ทั้งหมด (Cash + Stocks)</span>
            <strong className="text-sm font-mono text-white block mt-0.5">
              ${portfolioValuation.totalUsdValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </strong>
            <span className="text-[9px] text-emerald-400 font-mono block mt-0.5">
              (เงินสด: ${usdCash.toLocaleString()})
            </span>
          </div>

          <div className="bg-slate-900/60 border border-white/5 px-4 py-3 rounded-2xl text-left min-w-[150px]">
            <span className="text-[9px] text-gray-400 font-mono block">สินทรัพย์ THB ทั้งหมด (Cash + Stocks)</span>
            <strong className="text-sm font-mono text-white block mt-0.5">
              ฿{portfolioValuation.totalThbValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </strong>
            <span className="text-[9px] text-emerald-400 font-mono block mt-0.5">
              (เงินสด: ฿{thbCash.toLocaleString()})
            </span>
          </div>
        </div>
      </div>

      {/* Message Notifications */}
      <AnimatePresence>
        {successMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 text-xs text-left flex items-start gap-2.5"
          >
            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </motion.div>
        )}
        {errorMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs text-left flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* SIDEBAR: Supported Stock List */}
        <div className="lg:col-span-4 bg-slate-950/20 border border-white/5 rounded-3xl p-4.5 space-y-4">
          <div className="space-y-1.5 text-left">
            <h3 className="text-xs font-bold font-mono uppercase text-gray-400">รายการดัชนีหลักทรัพย์สีเขียว ({SUPPORTED_STOCKS.length})</h3>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-500" />
              <input
                type="text"
                placeholder="ค้นหาชื่อหุ้นหรือสัญลักษณ์..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900/60 text-white pl-9 pr-4 py-2 rounded-xl border border-white/5 focus:border-cyan-400 focus:outline-none text-xs font-sans"
              />
            </div>
          </div>

          {/* List scroll */}
          <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
            {filteredStocks.map((stock) => {
              const live = livePrices[stock.symbol];
              const price = live?.price || stock.basePrice;
              const chg = live?.change24h || 0;
              const isSel = stock.symbol === selectedSymbol;

              return (
                <button
                  key={stock.symbol}
                  onClick={() => {
                    setSelectedSymbol(stock.symbol);
                    setSuccessMsg(null);
                    setErrorMsg(null);
                  }}
                  className={`w-full p-3 rounded-2xl border transition text-left flex justify-between items-center relative overflow-hidden group active:scale-[0.98] ${
                    isSel 
                      ? "bg-cyan-500/10 border-cyan-500/40" 
                      : "bg-slate-900/30 hover:bg-slate-900/60 border-white/5 hover:border-white/10"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-black text-xs text-white tracking-wider">{stock.symbol}</span>
                      <span className="text-[8px] bg-white/5 text-gray-400 px-1 py-0.5 rounded uppercase font-mono">
                        {stock.category}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 line-clamp-1">{stock.name}</p>
                  </div>

                  <div className="text-right space-y-1">
                    <div className="font-mono font-bold text-xs text-white">
                      {stock.currency === "USD" ? "$" : "฿"}{price.toLocaleString()}
                    </div>
                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border block w-fit ml-auto ${
                      chg >= 0 
                        ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-400" 
                        : "bg-red-500/5 border-red-500/10 text-red-400"
                    }`}>
                      {chg >= 0 ? "+" : ""}{chg}%
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Real-time Environmental News Feed widget */}
          <div className="border-t border-white/5 pt-4 text-left space-y-3">
            <h4 className="text-[10px] font-black uppercase text-gray-400 flex items-center gap-1.5">
              <Newspaper className="w-3.5 h-3.5 text-cyan-400" />
              <span>ข่าวสารตลาดรักษ์โลก (ADX News Feed)</span>
            </h4>
            <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
              {ECO_NEWS.map((n, i) => (
                <div key={i} className="bg-slate-900/40 p-2.5 rounded-xl border border-white/5 space-y-1 text-left">
                  <p className="text-[10px] leading-relaxed text-gray-300 font-sans font-medium">{n.title}</p>
                  <span className="text-[8px] text-gray-500 font-mono">{n.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* MAIN PANEL: Active Stock detail, Recharts line, and Trades */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Active Stock Overview Panel */}
          <div className="bg-slate-900/30 border border-white/5 rounded-3xl p-5 space-y-5">
            
            {/* Header: Selected details */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-left border-b border-white/5 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-black text-lg text-white tracking-tight">{activeStockDef.name}</h3>
                  <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
                    {activeStockDef.symbol}
                  </span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed max-w-xl">{activeStockDef.description}</p>
              </div>

              {/* Price detail right */}
              <div className="text-right space-y-1 self-start sm:self-center">
                <div className="text-xs text-gray-500 font-mono">ราคาเสนอซื้อเรียลไทม์ (LIVE)</div>
                <div className="flex items-center gap-2 justify-end">
                  <AnimatePresence mode="popLayout">
                    <motion.strong 
                      key={activeLivePrice}
                      initial={{ scale: 1.05, color: isRising ? "#34d399" : "#f87171" }}
                      animate={{ scale: 1, color: "#ffffff" }}
                      transition={{ duration: 0.5 }}
                      className="text-2xl font-black font-mono tracking-tight"
                    >
                      {activeCurrency === "USD" ? "$" : "฿"}{activeLivePrice.toLocaleString()}
                    </motion.strong>
                  </AnimatePresence>
                  
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${bgTrendColor}`}>
                    {activeChange >= 0 ? "+" : ""}{activeChange}%
                  </span>
                </div>
              </div>
            </div>

            {/* Price Chart Panel */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-[10px] font-mono font-bold text-gray-400 uppercase">กราฟความเคลื่อนไหวราคาประวัติศาสตร์</span>
                </div>

                {/* Range selectors */}
                <div className="flex gap-1.5 bg-slate-950/60 p-0.5 rounded-lg border border-white/5">
                  {(["1W", "1M", "All"] as const).map(r => (
                    <button
                      key={r}
                      onClick={() => setChartRange(r)}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold font-mono transition-colors ${
                        chartRange === r 
                          ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/10" 
                          : "text-gray-500 hover:text-white"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Interactive Recharts area chart */}
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={historicalData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="stockGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={activeChange >= 0 ? "#10b981" : "#ef4444"} stopOpacity={0.2}/>
                        <stop offset="95%" stopColor={activeChange >= 0 ? "#10b981" : "#ef4444"} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#475569" 
                      fontSize={9} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <YAxis 
                      stroke="#475569" 
                      fontSize={9} 
                      domain={['auto', 'auto']}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${activeCurrency === "USD" ? "$" : "฿"}${v}`}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#020617", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px" }}
                      labelStyle={{ color: "#94a3b8", fontSize: "10px", fontWeight: "bold" }}
                      itemStyle={{ color: "#ffffff", fontSize: "11px", fontFamily: "monospace" }}
                      formatter={(v) => [`${activeCurrency === "USD" ? "$" : "฿"}${v}`, "ราคา"]}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="price" 
                      stroke={activeChange >= 0 ? "#10b981" : "#ef4444"} 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#stockGrad)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Trading Entry Panel & Available Funds */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 text-left">
              
              {/* Left Column: Form config */}
              <div className="space-y-4">
                <div className="flex gap-2 bg-slate-950 p-1 rounded-xl border border-white/5">
                  <button
                    onClick={() => {
                      setTradeTab("buy");
                      setTradeQuantity("1");
                    }}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                      tradeTab === "buy" 
                        ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/10" 
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    สั่งซื้อ (BUY)
                  </button>
                  <button
                    onClick={() => {
                      setTradeTab("sell");
                      setTradeQuantity("1");
                    }}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                      tradeTab === "sell" 
                        ? "bg-red-600/20 text-red-400 border border-red-500/10" 
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    สั่งขาย (SELL)
                  </button>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] text-gray-400 font-mono">
                    <span>ระบุจำนวนหุ้น (Shares)</span>
                    {activeHolding && (
                      <span>ถือครองอยู่: <strong className="text-white font-mono">{activeHolding.quantity} หุ้น</strong></span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="0.00"
                      value={tradeQuantity}
                      onChange={(e) => setTradeQuantity(e.target.value)}
                      className="w-full bg-slate-950 text-white font-mono rounded-xl px-4 py-3 border border-white/10 focus:border-cyan-400 focus:outline-none text-sm"
                      step="any"
                    />
                    <span className="absolute right-4 top-3 text-[10px] text-gray-500 font-mono font-bold">SHARES</span>
                  </div>
                </div>

                {/* Hot % selection buttons */}
                {tradeTab === "buy" && (
                  <div className="flex gap-1.5 justify-between">
                    {[0.25, 0.5, 0.75, 1.0].map(pct => (
                      <button
                        key={pct}
                        onClick={() => setPercentageQty(pct)}
                        className="flex-1 py-1.5 bg-slate-900 border border-white/5 hover:border-white/10 hover:bg-slate-900/60 rounded-lg text-[9px] font-mono text-gray-300 font-bold transition-all active:scale-95"
                      >
                        {pct * 100}%
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Dynamic Estimates & Button execution */}
              <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-4 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs border-b border-white/5 pb-2">
                    <span className="text-gray-400">เงินสดที่คุณมีสิทธิ์เทรด:</span>
                    <strong className="text-white font-mono">
                      {activeCurrency === "USD" ? "$" : "฿"}{activeCash.toLocaleString()}
                    </strong>
                  </div>

                  <div className="flex justify-between items-center text-xs border-b border-white/5 pb-2">
                    <span className="text-gray-400">ราคาเฉลี่ยสัญญานี้:</span>
                    <strong className="text-gray-300 font-mono">
                      {activeCurrency === "USD" ? "$" : "฿"}{activeLivePrice.toLocaleString()}
                    </strong>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400">{tradeTab === "buy" ? "ประมาณยอดที่ต้องชำระ:" : "ประมาณยอดที่จะได้รับ:"}</span>
                    <strong className={`font-mono text-sm ${tradeTab === "buy" ? "text-amber-400" : "text-emerald-400"}`}>
                      {activeCurrency === "USD" ? "$" : "฿"}{estimatedCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                </div>

                <button
                  onClick={handleExecuteTrade}
                  disabled={isSubmitting || !isValidQuantity}
                  className={`w-full py-3 text-xs font-black uppercase tracking-wider rounded-xl transition duration-150 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none ${
                    tradeTab === "buy" 
                      ? "bg-gradient-to-r from-emerald-600 to-teal-500 text-white hover:brightness-110 shadow-lg shadow-emerald-950/25" 
                      : "bg-gradient-to-r from-red-600 to-rose-500 text-white hover:brightness-110 shadow-lg shadow-red-950/25"
                  }`}
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>กำลังส่งธุรกรรมเข้าสู่คลาวด์บล็อก...</span>
                    </span>
                  ) : (
                    <span>
                      {tradeTab === "buy" ? `ยืนยันคำสั่งซื้อหุ้น ${selectedSymbol}` : `ยืนยันคำสั่งขายหุ้น ${selectedSymbol}`}
                    </span>
                  )}
                </button>
              </div>

            </div>

          </div>

          {/* ACTIVE PORTFOLIO: Shows what they own */}
          <div className="bg-slate-900/30 border border-white/5 rounded-3xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3 text-left">
              <h3 className="font-display font-bold text-sm text-white flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-cyan-400" />
                <span>พอร์ตการลงทุนของคุณ (Your Active ADX Portfolio)</span>
              </h3>
              <span className="text-[10px] text-gray-400 font-mono">Real-time valuation</span>
            </div>

            {Object.keys(portfolio).length === 0 ? (
              <div className="bg-slate-950/40 rounded-2xl p-8 text-center text-gray-500 text-xs">
                คุณยังไม่ได้ทำการซื้อหุ้นตัวใดในตลาด ADX ขณะนี้ บัญชีจำลองจะให้เงินทุนเริ่มแรก $1,000 USD และ ฿30,000 THB ไปเริ่มหัดวิเคราะห์กันได้เลย! 🍀
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.values(portfolio).map((holding: StockHolding) => {
                  const live = livePrices[holding.symbol];
                  const currentPrice = live?.price || holding.avgBuyPrice;
                  const totalValue = holding.quantity * currentPrice;
                  const totalCost = holding.quantity * holding.avgBuyPrice;
                  const profitLoss = totalValue - totalCost;
                  const profitLossPct = totalCost > 0 ? (profitLoss / totalCost) * 100 : 0;

                  const isProfit = profitLoss >= 0;

                  return (
                    <div key={holding.symbol} className="bg-slate-950/50 border border-white/5 rounded-2xl p-4 space-y-3 text-left hover:border-white/10 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <strong className="font-mono text-sm text-white">{holding.symbol}</strong>
                            <span className="text-[8px] bg-cyan-500/10 text-cyan-400 px-1 rounded uppercase font-mono">
                              {holding.currency}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-400 truncate max-w-[160px]">{holding.name}</p>
                        </div>

                        <div className="text-right">
                          <div className="text-[10px] text-gray-500">จำนวนที่ถือ</div>
                          <div className="font-mono font-bold text-xs text-white">{holding.quantity} หุ้น</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 border-t border-b border-white/5 py-2 font-mono text-[10px]">
                        <div>
                          <span className="text-gray-500 block">ต้นทุนเฉลี่ย</span>
                          <span className="text-gray-300">
                            {holding.currency === "USD" ? "$" : "฿"}{holding.avgBuyPrice.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 block">ราคาปัจจุบัน</span>
                          <span className="text-gray-300">
                            {holding.currency === "USD" ? "$" : "฿"}{currentPrice.toLocaleString()}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-gray-500 block">มูลค่ารวม</span>
                          <strong className="text-white">
                            {holding.currency === "USD" ? "$" : "฿"}{totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </strong>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="space-y-0.5">
                          <span className="text-[9px] text-gray-500 font-mono block">กำไร/ขาดทุนสะสม (P&L)</span>
                          <strong className={`font-mono text-xs ${isProfit ? "text-emerald-400" : "text-red-400"}`}>
                            {isProfit ? "+" : ""}
                            {holding.currency === "USD" ? "$" : "฿"}{profitLoss.toLocaleString(undefined, { maximumFractionDigits: 2 })} 
                            ({isProfit ? "+" : ""}{profitLossPct.toFixed(2)}%)
                          </strong>
                        </div>

                        {/* Quick SELL Shortcut */}
                        <button
                          onClick={() => {
                            setSelectedSymbol(holding.symbol);
                            setTradeTab("sell");
                            setTradeQuantity(holding.quantity.toString());
                            // Scroll up slightly to trade panel
                            document.getElementById("stock-trading-section")?.scrollIntoView({ behavior: "smooth" });
                          }}
                          className="px-2.5 py-1 bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 text-red-400 rounded-lg text-[9px] font-bold transition duration-150"
                        >
                          ขายด่วนทั้งหมด
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
