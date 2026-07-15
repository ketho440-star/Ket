import React, { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Image, ShieldAlert, CheckCircle, HelpCircle, Loader2 } from "lucide-react";
import { ChatMessage } from "../types";

// Preset simulated trash items with description, estimated coins, and high-quality illustration placeholders
const PRESET_TRASH_ITEMS = [
  {
    name: "ขวดพลาสติก PET บนชายหาด",
    type: "plastic",
    estimatedValue: 2,
    imagePlaceholder: "https://images.unsplash.com/photo-1618477388954-7852f32655ec?auto=format&fit=crop&w=150&q=80",
    description: "ขวดเครื่องดื่มพลาสติกใสทั่วไป มักพบบ่อยที่สุดบนหาดทราย ทำร้ายเต่าทะเลและระบบนิเวศ"
  },
  {
    name: "กระป๋องอลูมิเนียมบุบ",
    type: "metal",
    estimatedValue: 2,
    imagePlaceholder: "https://images.unsplash.com/photo-1532634922-8fe0b757fb13?auto=format&fit=crop&w=150&q=80",
    description: "กระป๋องน้ำอัดลมอลูมิเนียม รีไซเคิลได้ไม่จำกัดจำนวนครั้ง มีมูลค่าคาร์บอนต่ำเมื่อคืนสู่ระบบ"
  },
  {
    name: "เศษอวนจับปลาที่ถูกทิ้ง (Ghost Net)",
    type: "cleanup",
    estimatedValue: 50,
    imagePlaceholder: "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&w=150&q=80",
    description: "อวนประมงขาดที่ลอยกลางทะเล เป็นกับดักทำร้ายพะยูนและแนวปะการัง การกู้ชีพต้องอาศัยทีมนักดำน้ำ"
  },
  {
    name: "ขวดแก้วมีตะไคร่น้ำเกาะ",
    type: "glass",
    estimatedValue: 5,
    imagePlaceholder: "https://images.unsplash.com/photo-1594913366159-183200572d4c?auto=format&fit=crop&w=150&q=80",
    description: "ขวดเครื่องดื่มประเภทแก้ว จมอยู่ใต้ทรายหรือลอยน้ำมา มีน้ำหนักมาก สามารถรีไซเคิลเป็นทรายบดละเอียดได้"
  }
];

interface EcoAssistantProps {
  onEarnCoins: (amount: number, description: string, details: string) => void;
}

export default function EcoAssistant({ onEarnCoins }: EcoAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "model",
      text: "สวัสดีครับ! ผมคือ **น้องอันดามัน (Nong Andaman)** ผู้ช่วยผู้รักท้องทะเลและเพื่อนคู่คิดเรื่องการประหยัดพลังงานและการจัดการขยะรอบทะเลอันดามัน 🌊✨\n\nคุณสามารถพูดคุยปรึกษาเรื่องสิ่งแวดล้อม หรือลอง**เลือกภาพขยะจำลองด้านล่าง** เพื่อให้ผมช่วยวิเคราะห์วิธีการจัดการ ข้อมูลผลกระทบ และคำนวณเหรียญ **AndamanCoin (AND)** ที่คุณจะได้รับเมื่อนำไปรีไซเคิลครับ!\n\n💬 **หากมีข้อสงสัยเพิ่มเติมหรือขัดข้องประการใด:** ติดต่อเจ้าหน้าที่รักษ์อันดามันได้ที่ 👉 **https://lin.ee/NlmDMHU**",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedMimeType, setSelectedMimeType] = useState<string | null>(null);
  const [selectedItemName, setSelectedItemName] = useState<string | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSendMessage = async (textToSend: string = inputText, imageBase64: string | null = selectedImage, mimeType: string | null = selectedMimeType) => {
    if (!textToSend.trim() && !imageBase64) return;

    const userMsgId = `msg-${Date.now()}`;
    const newMsg: ChatMessage = {
      id: userMsgId,
      role: "user",
      text: textToSend + (selectedItemName ? ` [ส่งภาพวิเคราะห์: ${selectedItemName}]` : ""),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, newMsg]);
    setInputText("");
    setSelectedImage(null);
    setSelectedMimeType(null);
    setSelectedItemName(null);
    setLoading(true);

    try {
      // Build conversation history (limit to last 10 messages for token efficiency)
      const history = messages.slice(-10).map(m => ({
        role: m.role,
        text: m.text
      }));

      // Send to Express backend API
      const response = await fetch("/api/eco-assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: textToSend,
          history,
          image: imageBase64 ? imageBase64.split(",")[1] || imageBase64 : null,
          mimeType: mimeType
        })
      });

      const data = await response.json();

      if (data.success && data.text) {
        const modelMsgId = `msg-${Date.now() + 1}`;
        setMessages(prev => [...prev, {
          id: modelMsgId,
          role: "model",
          text: data.text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);

        // Attempt to detect if the AI rewarded coins and trigger the simulated wallet deposit!
        // We look for patterns like "+50 AND" or "ได้รับ 50 AND" or "ได้รับ 2 AND" or similar in the text
        detectAndAwardCoins(data.text);
      } else {
        throw new Error(data.error || "ขออภัยครับ เกิดข้อผิดพลาดในการเชื่อมต่อกับผู้ช่วย AI");
      }
    } catch (error: any) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: "model",
        text: `⚠️ **ข้อผิดพลาด:** ${error.message || "ไม่สามารถติดต่อเซิร์ฟเวอร์ AI ได้ในขณะนี้ กรุณาเปิดเผยคีย์ลับหรือตรวจสอบ .env.example"}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setLoading(false);
    }
  };

  const detectAndAwardCoins = (aiResponseText: string) => {
    // Basic regex checks to parse simulated coins awarded
    // matches e.g. "ได้รับ 50 AND", "ได้รับ 2 AND", "+50 AND", "+ 2 AND", "จะได้รับ 5 AND"
    const regexList = [
      /ได้รับ\s*(\d+)\s*AND/i,
      /(\d+)\s*AND\s*เหรียญ/i,
      /\+\s*(\d+)\s*AND/i,
      /จะได้รับ\s*(\d+)\s*AND/i,
      /มูลค่า\s*(\d+)\s*AND/i
    ];

    let foundAmount = 0;
    for (const regex of regexList) {
      const match = aiResponseText.match(regex);
      if (match && match[1]) {
        foundAmount = parseInt(match[1]);
        break;
      }
    }

    if (foundAmount > 0) {
      // Award the coins through the state handler!
      onEarnCoins(
        foundAmount,
        "คำปรึกษาและวิเคราะห์ขยะโดย AI (AI Trash Scan)",
        `วิเคราะห์โดยผู้ช่วยอัจฉริยะน้องอันดามัน`
      );
    }
  };

  const selectPresetTrash = async (item: typeof PRESET_TRASH_ITEMS[0]) => {
    try {
      setLoading(true);
      setSelectedItemName(item.name);
      
      // We will fetch the preset image and convert it to base64 to simulate an actual camera upload
      const response = await fetch(item.imagePlaceholder);
      const blob = await response.blob();
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        setSelectedImage(base64data);
        setSelectedMimeType(blob.type);
        setLoading(false);
        
        // Auto-fill prompt to guide the user
        setInputText(`กรุณาวิเคราะห์ขยะประเภท "${item.name}" ชิ้นนี้ให้ฉันหน่อย ว่าสร้างมลพิษอย่างไร และฉันควรคัดแยกส่งคืนอย่างไรเพื่อรับเหรียญ AND`);
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error("Error setting up preset:", err);
      setLoading(false);
    }
  };

  // Convert custom uploaded file to base64
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedItemName(file.name);
    setSelectedMimeType(file.type);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result as string);
      setInputText(`กรุณาวิเคราะห์ภาพถ่ายขยะ "${file.name}" ของฉัน และอธิบายวิธีกระบวนการรีไซเคิลพร้อมมอบรางวัลเหรียญ AND ที่เหมาะสมครับ`);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div id="eco-assistant" className="glass-panel rounded-3xl p-6 h-full flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-400 to-emerald-500 flex items-center justify-center text-white font-black animate-pulse shadow-md cyan-glow">
            🌊
          </div>
          <div>
            <div className="font-display font-bold text-white flex items-center gap-1.5">
              น้องอันดามัน <span className="text-[10px] font-mono font-medium text-emerald-400 bg-emerald-950 border border-emerald-800/50 px-2 py-0.5 rounded">AI EXPERT</span>
            </div>
            <div className="text-[10px] text-gray-400 font-mono">ผู้ดูแลและประเมินสิทธิ์รับ AndamanCoin</div>
          </div>
        </div>
        <div className="text-[11px] text-cyan-300 bg-cyan-950/40 border border-cyan-800/40 px-2.5 py-1 rounded-lg font-mono">
          Model: gemini-3.5-flash
        </div>
      </div>

      {/* LINE Contact Announcement Banner */}
      <div className="mb-4 p-3 bg-emerald-950/40 border border-emerald-500/20 rounded-2xl flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <span className="text-base shrink-0">💬</span>
          <div className="text-left">
            <span className="text-white font-bold block">ติดต่อเจ้าหน้าที่โดยตรง</span>
            <p className="text-[10px] text-gray-400">ประสานงานกับผู้พิทักษ์อันดามันผ่าน LINE OA ได้ตลอด 24 ชม.</p>
          </div>
        </div>
        <a 
          href="https://lin.ee/NlmDMHU" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="bg-[#06C755] hover:bg-[#05B34C] text-white font-sans font-extrabold text-[10px] px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition transform active:scale-95 duration-100 shrink-0 shadow shadow-emerald-950/40"
        >
          <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 5.58 2 10c0 3.97 3.44 7.3 8.2 7.8.3 0 .7.2.9.5l1.6 1.6c.3.3.6.1.6-.3l-.1-2.2c0-.3.1-.6.3-.8 4-1.1 6.5-4 6.5-7.6 0-4.42-4.48-8-10-8z" />
          </svg>
          <span>แอดไลน์ (https://lin.ee/NlmDMHU)</span>
        </a>
      </div>

      {/* Messages Window */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-4 max-h-[360px] min-h-[220px] text-sm">
        {messages.map((m) => (
          <div 
            key={m.id}
            className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
          >
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 leading-relaxed relative ${
              m.role === "user" 
                ? "bg-cyan-600 text-white rounded-tr-none" 
                : "bg-slate-900 border border-white/5 text-gray-200 rounded-tl-none"
            }`}>
              {/* Formatted Text (Simple Markdown Parser for bold and bullets) */}
              <div className="whitespace-pre-wrap select-text">
                {m.text.split("\n").map((line, i) => {
                  let formattedLine = line;
                  // Handle lists
                  const isBullet = line.startsWith("- ") || line.startsWith("* ");
                  if (isBullet) {
                    formattedLine = line.substring(2);
                  }

                  // Handle bold replacements (**text**)
                  const boldRegex = /\*\*(.*?)\*\*/g;
                  const parts = [];
                  let lastIndex = 0;
                  let match;

                  while ((match = boldRegex.exec(formattedLine)) !== null) {
                    if (match.index > lastIndex) {
                      parts.push(formattedLine.substring(lastIndex, match.index));
                    }
                    parts.push(<strong key={match.index} className="text-yellow-300 font-bold">{match[1]}</strong>);
                    lastIndex = boldRegex.lastIndex;
                  }
                  if (lastIndex < formattedLine.length) {
                    parts.push(formattedLine.substring(lastIndex));
                  }

                  return (
                    <div key={i} className={isBullet ? "pl-4 relative my-1" : "my-0.5"}>
                      {isBullet && <span className="absolute left-0 text-cyan-400">•</span>}
                      {parts.length > 0 ? parts : formattedLine}
                    </div>
                  );
                })}
              </div>
              <span className="text-[9px] text-gray-400/80 mt-1 block text-right font-mono">
                {m.timestamp}
              </span>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs pl-2 bg-cyan-950/20 py-1.5 rounded-lg border border-cyan-900/30 w-max">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>น้องอันดามันกำลังตรวจสอบภาพและคำนวณสิทธิ์ของคุณ...</span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Preset trash selector (Visual Simulation of camera scanner) */}
      <div className="mt-4 pt-3 border-t border-white/5">
        <div className="text-xs text-gray-400 mb-2 font-mono flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
          <span>จำลองการสแกนขยะชายทะเลด้วยกล้องมือถือ AI (AI Waste Scanner Simulation)</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {PRESET_TRASH_ITEMS.map((item, idx) => (
            <button
              key={idx}
              onClick={() => selectPresetTrash(item)}
              disabled={loading}
              className={`group flex flex-col items-center p-1.5 rounded-xl border transition text-center relative overflow-hidden ${
                selectedItemName === item.name 
                  ? "border-yellow-400 bg-yellow-950/20" 
                  : "border-white/5 bg-slate-900/40 hover:bg-slate-900 hover:border-white/10"
              }`}
              title={item.description}
            >
              <img 
                src={item.imagePlaceholder} 
                alt={item.name} 
                className="w-10 h-10 object-cover rounded-lg border border-white/10 group-hover:scale-105 transition duration-300"
              />
              <span className="text-[9px] text-gray-300 mt-1 truncate w-full font-sans font-medium">
                {item.name.split(" ")[0]}
              </span>
              <span className="text-[9px] font-mono text-yellow-400 font-semibold mt-0.5">
                +{item.estimatedValue} AND
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Input Area */}
      <div className="mt-4 pt-3 border-t border-white/10">
        {selectedImage && (
          <div className="flex items-center justify-between bg-slate-900/80 border border-yellow-500/20 rounded-xl p-2 mb-3">
            <div className="flex items-center gap-2">
              <img src={selectedImage} alt="Preview" className="w-8 h-8 object-cover rounded border border-white/10" />
              <div>
                <div className="text-[10px] text-gray-400 font-mono">เตรียมอัปโหลดวิเคราะห์ (Ready to Scan)</div>
                <div className="text-xs text-yellow-400 font-bold truncate max-w-[180px]">{selectedItemName}</div>
              </div>
            </div>
            <button 
              onClick={() => { setSelectedImage(null); setSelectedMimeType(null); setSelectedItemName(null); }}
              className="text-xs text-red-400 hover:text-red-300 font-mono px-2 py-1"
            >
              ยกเลิก
            </button>
          </div>
        )}

        <div className="flex gap-2">
          {/* Custom File Upload */}
          <label className="flex items-center justify-center w-11 h-11 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 hover:border-white/20 cursor-pointer text-gray-400 hover:text-white transition shadow-sm shrink-0">
            <Image className="w-5 h-5" />
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleFileUpload}
              disabled={loading}
            />
          </label>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="พิมพ์ถามข้อสงสัยเรื่องการคัดแยกขยะ หรือ ค้นหาวิธีรีไซเคิล..."
            className="flex-1 bg-slate-900 text-white rounded-xl px-4 border border-white/10 focus:border-cyan-400 focus:outline-none text-xs transition placeholder:text-gray-500"
            disabled={loading}
          />

          <button
            onClick={() => handleSendMessage()}
            disabled={loading || (!inputText.trim() && !selectedImage)}
            className="w-11 h-11 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center transition disabled:opacity-50 disabled:cursor-not-allowed shrink-0 shadow shadow-cyan-600/20"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
