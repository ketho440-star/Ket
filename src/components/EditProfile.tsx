import React, { useState } from "react";
import { UserProfile } from "../types";
import { REGIONS } from "../data";
import { User, ShieldCheck, MapPin, Sparkles, Check, X, CheckCircle2 } from "lucide-react";

interface EditProfileProps {
  userProfile: UserProfile;
  onSave: (updatedProfile: UserProfile) => void;
  onCancel: () => void;
}

const AVATARS = [
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80", // Ocean volunteer male
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80", // Eco-tourist female
  "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=120&q=80", // Local leader
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=120&q=80", // Activist girl
];

export default function EditProfile({ userProfile, onSave, onCancel }: EditProfileProps) {
  const [name, setName] = useState(userProfile.name);
  const [role, setRole] = useState<UserProfile["role"]>(userProfile.role);
  const [regionId, setRegionId] = useState(userProfile.regionId);
  const [selectedAvatar, setSelectedAvatar] = useState(userProfile.avatarUrl);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const updated: UserProfile = {
      ...userProfile,
      name: name.trim(),
      role,
      regionId,
      avatarUrl: selectedAvatar,
    };

    onSave(updated);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 2000);
  };

  return (
    <div className="bg-slate-950/60 border border-white/10 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-xl animate-fade-in">
      <div className="absolute -top-12 -right-12 w-36 h-36 bg-cyan-500/10 rounded-full blur-2xl"></div>
      
      <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
        <div>
          <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
            <User className="w-5 h-5 text-cyan-400" />
            <span>แก้ไขโปรไฟล์ผู้พิทักษ์เล (Edit Profile)</span>
          </h3>
          <p className="text-xs text-gray-400 font-mono">ปรับแต่งข้อมูลสมาชิกและตำแหน่งกิจกรรมของคุณเพื่อเก็บสะสมสิทธิ์</p>
        </div>
        <button
          onClick={onCancel}
          className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {saveSuccess && (
        <div className="bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 p-4 rounded-2xl text-xs mb-5 flex items-center gap-2 animate-pulse">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>บันทึกการเปลี่ยนแปลงบัญชีของคุณเรียบร้อยแล้ว!</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 text-xs">
        {/* Full Name */}
        <div className="space-y-1.5">
          <label className="text-gray-400 font-mono font-semibold flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-cyan-400" />
            <span>ชื่อ-นามสกุลของคุณ (Full Name)</span>
          </label>
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
          <label className="text-gray-400 font-mono font-semibold flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>บทบาทหน้าที่เพื่อสิ่งแวดล้อม (My Role)</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setRole("volunteer")}
              className={`p-2.5 rounded-xl border text-left transition flex flex-col gap-1 ${
                role === "volunteer" ? "border-cyan-400 bg-cyan-950/30 text-white" : "border-white/5 bg-slate-900 text-gray-400 hover:border-white/10"
              }`}
            >
              <span className="font-bold text-xs text-white">🌿 อาสาสมัคร</span>
              <span className="text-[9px] text-gray-400">Volunteer</span>
            </button>
            <button
              type="button"
              onClick={() => setRole("tourist")}
              className={`p-2.5 rounded-xl border text-left transition flex flex-col gap-1 ${
                role === "tourist" ? "border-cyan-400 bg-cyan-950/30 text-white" : "border-white/5 bg-slate-900 text-gray-400 hover:border-white/10"
              }`}
            >
              <span className="font-bold text-xs text-white">✈️ นักท่องเที่ยว Eco</span>
              <span className="text-[9px] text-gray-400">Eco-Tourist</span>
            </button>
            <button
              type="button"
              onClick={() => setRole("fisherman")}
              className={`p-2.5 rounded-xl border text-left transition flex flex-col gap-1 ${
                role === "fisherman" ? "border-cyan-400 bg-cyan-950/30 text-white" : "border-white/5 bg-slate-900 text-gray-400 hover:border-white/10"
              }`}
            >
              <span className="font-bold text-xs text-white">🎣 ชาวประมง</span>
              <span className="text-[9px] text-gray-400">Fisherman</span>
            </button>
            <button
              type="button"
              onClick={() => setRole("business")}
              className={`p-2.5 rounded-xl border text-left transition flex flex-col gap-1 ${
                role === "business" ? "border-cyan-400 bg-cyan-950/30 text-white" : "border-white/5 bg-slate-900 text-gray-400 hover:border-white/10"
              }`}
            >
              <span className="font-bold text-xs text-white">🏬 ร้านค้า/ทัวร์สีเขียว</span>
              <span className="text-[9px] text-gray-400">Green Partner</span>
            </button>
          </div>
        </div>

        {/* Region selection */}
        <div className="space-y-1.5">
          <label className="text-gray-400 font-mono font-semibold flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-cyan-400" />
            <span>ภูมิภาคหลักที่คุณทำกิจกรรม (Active Region)</span>
          </label>
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
          <label className="text-gray-400 font-mono font-semibold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>เลือกอวาตาร์ตัวแทน (Choose Profile Avatar)</span>
          </label>
          <div className="flex gap-4 justify-start pt-1">
            {AVATARS.map((av, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedAvatar(av)}
                className={`w-12 h-12 rounded-full overflow-hidden border-2 transition ${
                  selectedAvatar === av ? "border-cyan-400 scale-110 shadow-lg gold-glow" : "border-transparent opacity-50 hover:opacity-80"
                }`}
              >
                <img src={av} alt="Avatar option" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Actions Button */}
        <div className="flex gap-3 pt-4 border-t border-white/5">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold transition flex items-center justify-center gap-1.5"
          >
            <X className="w-4 h-4" />
            <span>ยกเลิก</span>
          </button>
          
          <button
            type="submit"
            className="flex-1 h-10 bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-lg"
          >
            <Check className="w-4 h-4" />
            <span>บันทึกโปรไฟล์</span>
          </button>
        </div>
      </form>
    </div>
  );
}
