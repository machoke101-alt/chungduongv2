
import React, { useState, useEffect } from 'react';
import { User, Phone, Mail, ShieldCheck, Save, Loader2, Camera, MapPin, Ticket, AlertCircle, Sparkles } from 'lucide-react';
import { Profile, UserRole } from '../types';
import { supabase } from '../lib/supabase';
import CopyableCode from './CopyableCode';

interface ProfileManagementProps {
  profile: Profile | null;
  onUpdate: () => void;
  stats: {
    tripsCount: number;
    bookingsCount: number;
  };
}

const ProfileManagement: React.FC<ProfileManagementProps> = ({ profile, onUpdate, stats }) => {
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name);
      setPhone(profile.phone || '');
    }
  }, [profile]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName, phone: phone })
        .eq('id', profile.id);

      if (error) throw error;
      
      setMessage({ type: 'success', text: 'Cập nhật thông tin thành công!' });
      onUpdate();
      
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Đã có lỗi xảy ra.' });
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = (role?: UserRole) => {
    switch(role) {
      case 'admin': return { label: 'Quản trị viên', color: 'bg-red-500' };
      case 'driver': return { label: 'Tài xế', color: 'bg-emerald-500' };
      case 'manager': return { label: 'Điều phối viên', color: 'bg-amber-500' };
      default: return { label: 'Thành viên', color: 'bg-indigo-500' };
    }
  };

  const userCode = profile?.user_code || `#USR-${profile?.id.substring(0, 5).toUpperCase() || '0000'}`;
  const roleInfo = getRoleBadge(profile?.role);

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-indigo-600 to-violet-600 relative">
          <div className="absolute -bottom-12 left-8 flex items-end gap-6">
            <div className="w-24 h-24 rounded-[28px] bg-white p-1.5 shadow-xl">
              <div className="w-full h-full rounded-[22px] bg-indigo-50 flex items-center justify-center text-3xl font-black text-indigo-600 border border-indigo-100">
                {profile?.full_name?.charAt(0) || 'U'}
              </div>
            </div>
            <div className="mb-2">
              <div className="flex items-center gap-2">
                 <h2 className="text-2xl font-black text-white drop-shadow-sm">{profile?.full_name}</h2>
                 <CopyableCode 
                    code={userCode} 
                    className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-black text-white uppercase tracking-tighter"
                 />
              </div>
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-white text-[10px] font-black uppercase tracking-wider mt-1 ${roleInfo.color}`}>
                <ShieldCheck size={12} />
                {roleInfo.label}
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 pt-20 grid grid-cols-1 md:grid-cols-2 gap-12">
          <form onSubmit={handleUpdate} className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest border-l-4 border-indigo-600 pl-3">Thông tin cơ bản</h3>
            </div>
            
            {message && (
              <div className={`p-4 rounded-2xl text-xs font-bold border animate-in fade-in slide-in-from-top-2 duration-300 flex items-center gap-2 ${
                message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'
              }`}>
                {message.type === 'error' && <AlertCircle size={14} />}
                {message.text}
              </div>
            )}

            {!profile?.phone && (
              <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start gap-3">
                <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={16} />
                <div>
                  <p className="text-[11px] font-black text-amber-800 uppercase">Chưa có số điện thoại</p>
                  <p className="text-[10px] text-amber-700 mt-1">Vui lòng cập nhật số điện thoại để tài xế có thể liên hệ đón bạn dễ dàng.</p>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Họ và tên</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex justify-between">
                Số điện thoại
                <span className="text-[9px] text-slate-300 normal-case font-medium italic">Tự động điền khi đặt xe</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                  placeholder="0xxxxxxxxx"
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700 transition-all"
                />
              </div>
            </div>

            <button 
              type="submit" disabled={loading}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black flex items-center justify-center gap-2 shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
              LƯU THÔNG TIN
            </button>
          </form>

          <div className="space-y-8">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest border-l-4 border-indigo-600 pl-3">Thống kê hoạt động</h3>
            
            <div className="grid grid-cols-1 gap-4">
              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-center gap-6">
                <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-indigo-600">
                  <MapPin size={28} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chuyến xe đã đăng</p>
                  <p className="text-3xl font-black text-slate-800">{stats.tripsCount}</p>
                </div>
              </div>

              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-center gap-6">
                <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-indigo-600">
                  <Ticket size={28} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đơn hàng đã đặt</p>
                  <p className="text-3xl font-black text-slate-800">{stats.bookingsCount}</p>
                </div>
              </div>
            </div>

            <div className="p-6 bg-indigo-50 rounded-3xl border border-indigo-100">
              <h4 className="font-bold text-indigo-800 text-sm mb-2 flex items-center gap-2">
                <Sparkles size={16} className="text-amber-500" /> Hệ thống Mã Định Danh
              </h4>
              <p className="text-xs text-indigo-600 leading-relaxed font-medium">
                Mã <CopyableCode code={userCode} className="inline-flex font-black text-indigo-800 bg-indigo-100 px-1 rounded hover:bg-indigo-200" /> là định danh duy nhất của bạn trên hệ thống. Hãy cung cấp mã này khi cần hỗ trợ từ bộ phận điều phối.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileManagement;
