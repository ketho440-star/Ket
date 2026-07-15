import { useState } from "react";
import { REGIONS } from "../data";
import { RegionDetail } from "../types";
import { Globe, Shield, MapPin, Users, Anchor, Trash2 } from "lucide-react";

interface RegionExplorerProps {
  onSelectRegion: (regionId: string) => void;
}

export default function RegionExplorer({ onSelectRegion }: RegionExplorerProps) {
  const [selectedRegionId, setSelectedRegionId] = useState<string>("thailand");
  const selectedRegion = REGIONS.find(r => r.id === selectedRegionId) || REGIONS[0];

  const getCountryFlag = (country: string) => {
    switch (country.toLowerCase()) {
      case "thailand": return "🇹🇭";
      case "myanmar": return "🇲🇲";
      case "malaysia": return "🇲🇾";
      case "india": return "🇮🇳";
      case "indonesia": return "🇮🇩";
      case "maldives": return "🇲🇻";
      case "japan": return "🇯🇵";
      default: return "🏳️";
    }
  };

  return (
    <div id="region-explorer" className="glass-panel rounded-3xl p-6 h-full flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
          <div>
            <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-cyan-400" />
              <span>พื้นที่แนวร่วมอนุรักษ์ทะเลอันดามัน (Andaman Partner Regions)</span>
            </h3>
            <p className="text-xs text-gray-400 font-mono">ความร่วมมือข้ามพรมแดนเพื่อรักษาทะเลที่สะอาดและยั่งยืน</p>
          </div>
        </div>

        {/* Region Selector Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-5">
          {REGIONS.map((region) => (
            <button
              key={region.id}
              onClick={() => {
                setSelectedRegionId(region.id);
                onSelectRegion(region.id);
              }}
              className={`flex flex-col items-center p-2 rounded-xl border text-center transition ${
                selectedRegionId === region.id
                  ? "bg-slate-900 border-cyan-400/80 shadow shadow-cyan-900/30"
                  : "bg-slate-950/40 border-white/5 hover:bg-slate-900/50"
              }`}
            >
              <span className="text-xl mb-1">{getCountryFlag(region.country)}</span>
              <span className="text-[10px] font-mono text-gray-400 font-bold block truncate w-full">
                {region.country.toUpperCase()}
              </span>
              <span className="text-xs font-sans font-semibold text-white truncate w-full mt-0.5">
                {region.name}
              </span>
            </button>
          ))}
        </div>

        {/* Active Region Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
          {/* Text Info */}
          <div className="md:col-span-7 space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{getCountryFlag(selectedRegion.country)}</span>
                <h4 className="font-display font-bold text-xl text-white">
                  {selectedRegion.name} ({selectedRegion.country})
                </h4>
              </div>
              <p className="text-xs font-mono text-cyan-400 mt-1 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span>{selectedRegion.localProvinces}</span>
              </p>
              <p className="text-xs text-gray-300 leading-relaxed mt-2.5 bg-slate-900/30 p-3 rounded-xl border border-white/5">
                {selectedRegion.description}
              </p>
            </div>

            {/* Impact stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-white/5 flex items-center gap-2">
                <div className="w-7 h-7 rounded bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0">
                  <Anchor className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[9px] text-gray-400 font-mono leading-none">เก็บขยะร่วมกัน</div>
                  <div className="text-xs font-display font-bold text-white mt-0.5">{selectedRegion.stats.cleanups} ครั้ง</div>
                </div>
              </div>

              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-white/5 flex items-center gap-2">
                <div className="w-7 h-7 rounded bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[9px] text-gray-400 font-mono leading-none">รวมขวดพลาสติก</div>
                  <div className="text-xs font-display font-bold text-emerald-400 mt-0.5">{selectedRegion.stats.plasticKg} Kg</div>
                </div>
              </div>

              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-white/5 flex items-center gap-2">
                <div className="w-7 h-7 rounded bg-cyan-500/10 flex items-center justify-center text-cyan-400 shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[9px] text-gray-400 font-mono leading-none">เครือข่ายอนุรักษ์</div>
                  <div className="text-xs font-display font-bold text-cyan-300 mt-0.5">{selectedRegion.stats.members} คน</div>
                </div>
              </div>
            </div>

            {/* Local Sustainable projects */}
            <div className="space-y-2">
              <div className="text-xs font-mono text-gray-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-yellow-400" />
                <span>โครงการอนุรักษ์เชิงรุกที่กำลังดำเนินงาน:</span>
              </div>
              <ul className="space-y-1.5 pl-0">
                {selectedRegion.activeProjects.map((project, idx) => (
                  <li key={idx} className="text-xs text-gray-300 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-white/5 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                    <span>{project}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Interactive Regional SVG Map */}
          <div className="md:col-span-5 flex flex-col items-center justify-center">
            <div className="relative w-full aspect-square max-w-[200px] md:max-w-full bg-slate-950 rounded-2xl p-4 border border-white/5 overflow-hidden">
              <div className="absolute inset-0 bg-cyan-500/5 blur-xl"></div>
              {/* SVG drawing map resembling the Andaman peninsula */}
              <svg viewBox="0 0 200 200" className="w-full h-full relative z-10">
                {/* Landmass outline (Rough stylized sketch matching Thai-Myanmar peninsular coast) */}
                <path 
                  d="M 120 10 Q 130 40, 140 70 T 150 140 Q 140 160, 145 190 Q 130 190, 130 170 Q 115 150, 120 130 T 100 100 Q 90 70, 95 40 Z" 
                  fill="#1e293b" 
                  stroke="#334155" 
                  strokeWidth="1.5"
                />
                
                {/* Sea Label */}
                <text x="35" y="115" className="fill-cyan-500/40 text-[9px] font-mono tracking-widest font-black uppercase">ANDAMAN SEA</text>

                {/* Andaman Nicobar Islands (India) on the Left */}
                <g className={selectedRegionId === "india" ? "opacity-100" : "opacity-40"}>
                  <ellipse cx="45" cy="50" rx="3" ry="8" fill="#f97316" className="animate-pulse" />
                  <ellipse cx="48" cy="85" rx="2.5" ry="6" fill="#f97316" />
                  <circle cx="51" cy="110" r="2" fill="#f97316" />
                  <text x="30" y="35" className="fill-orange-400 text-[8px] font-mono font-bold">Andaman & Nicobar</text>
                </g>

                {/* Myanmar (Top coast) */}
                <g className={selectedRegionId === "myanmar" ? "opacity-100 animate-pulse" : "opacity-40"}>
                  <circle cx="100" cy="35" r="4.5" fill="#eab308" />
                  <line x1="100" y1="35" x2="115" y2="40" stroke="#eab308" strokeWidth="0.5" strokeDasharray="1" />
                  <text x="122" y="35" className="fill-yellow-400 text-[8px] font-mono font-bold">Mergui</text>
                </g>

                {/* Thailand (Mid peninsula) */}
                <g className={selectedRegionId === "thailand" ? "opacity-100 animate-pulse" : "opacity-40"}>
                  {/* Phuket / Krabi */}
                  <circle cx="118" cy="98" r="5" fill="#06b6d4" />
                  <line x1="118" y1="98" x2="80" y2="98" stroke="#06b6d4" strokeWidth="0.5" strokeDasharray="1" />
                  <text x="65" y="94" className="fill-cyan-400 text-[8px] font-mono font-bold">Phuket/Krabi</text>
                  
                  {/* Satun / Trang */}
                  <circle cx="125" cy="130" r="4.5" fill="#06b6d4" />
                </g>

                {/* Malaysia (Langkawi / Penang - Bottom peninsula) */}
                <g className={selectedRegionId === "malaysia" ? "opacity-100 animate-pulse" : "opacity-40"}>
                  <circle cx="132" cy="155" r="4.5" fill="#3b82f6" />
                  <line x1="132" y1="155" x2="90" y2="165" stroke="#3b82f6" strokeWidth="0.5" strokeDasharray="1" />
                  <text x="70" y="175" className="fill-blue-400 text-[8px] font-mono font-bold">Kedah/Penang</text>
                </g>

                {/* Indonesia (Aceh - Southern entrance of Strait of Malacca) */}
                <g className={selectedRegionId === "indonesia" ? "opacity-100 animate-pulse" : "opacity-40"}>
                  <circle cx="120" cy="185" r="4.5" fill="#ef4444" />
                  <line x1="120" y1="185" x2="85" y2="190" stroke="#ef4444" strokeWidth="0.5" strokeDasharray="1" />
                  <text x="58" y="193" className="fill-red-400 text-[8px] font-mono font-bold">Aceh/Sumatra</text>
                </g>

                {/* Maldives (West / South-West) */}
                <g className={selectedRegionId === "maldives" ? "opacity-100 animate-pulse" : "opacity-40"}>
                  <circle cx="20" cy="140" r="4" fill="#10b981" />
                  <line x1="20" y1="140" x2="45" y2="140" stroke="#10b981" strokeWidth="0.5" strokeDasharray="1" />
                  <text x="50" y="143" className="fill-emerald-400 text-[8px] font-mono font-bold">Maldives</text>
                </g>

                {/* Japan (Ishigaki/Okinawa - East / North-East) */}
                <g className={selectedRegionId === "japan" ? "opacity-100 animate-pulse" : "opacity-40"}>
                  <circle cx="180" cy="45" r="4" fill="#a855f7" />
                  <line x1="180" y1="45" x2="145" y2="45" stroke="#a855f7" strokeWidth="0.5" strokeDasharray="1" />
                  <text x="148" y="55" className="fill-purple-400 text-[8px] font-mono font-bold">Okinawa</text>
                </g>
              </svg>
              <div className="absolute bottom-1 right-2 text-[8px] font-mono text-gray-500">
                แผนภาพจุดประสานงานจริง
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
