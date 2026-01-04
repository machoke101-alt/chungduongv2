
import React, { useState, useEffect, useMemo } from 'react';
import { 
  User, Phone, ShieldCheck, Save, Loader2, Clock, 
  CheckCircle2, Navigation, Ticket, ArrowRight, AlertCircle, 
  History, Calendar, LucideIcon, Bookmark, Camera, Award, Star, Medal, Trophy, Car
} from 'lucide-react';
import { Profile, UserRole, Trip, Booking } from '../types';
import { supabase } from '../lib/supabase';
import CopyableCode from './CopyableCode';

interface ProfileManagementProps {
  profile: Profile | null;
  onUpdate: () => void;
  stats: {
    tripsCount: number;
    bookingsCount: number;
  };
  allTrips: Trip[];
  userBookings: Booking[];
}

interface ActivityItem {
  id: string;
  type: 'trip' | 'booking';
  title: string;
  description: string;
  timestamp: string;
  status?: string;
  icon: LucideIcon;
  color: string;
}

const ProfileManagement: React.FC<ProfileManagementProps> = ({ profile, onUpdate, stats, allTrips, userBookings }) => {
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [activeFilter, setActiveFilter] = useState<'all' | 'trip' | 'booking'>('all');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name);
      setPhone(profile.phone || '');
    }
  }, [profile]);

  // Ranking System Logic
  const getRankInfo = useMemo(() => {
    const totalActivity = stats.tripsCount + stats.bookingsCount;
    if (totalActivity >= 20) return { label: 'Kim cương', icon: Trophy, color: 'text-sky-400 bg-white/10 border-white/20' };
    if (totalActivity >= 10) return { label: 'Vàng', icon: Medal, color: 'text-amber-400 bg-white/10 border-white/20' };
    if (totalActivity >= 5) return { label: 'Bạc', icon: Star, color: 'text-slate-300 bg-white/10 border-white/20' };
    return { label: 'Đồng', icon: Award, color: 'text-orange-300 bg-white/10 border-white/20' };
  }, [stats]);

  const RankIcon = getRankInfo.icon;

  const activities = useMemo(() => {
    const items: ActivityItem[] = [];

    const myTrips = allTrips.filter(t => t.driver_id === profile?.id);
    myTrips.forEach(t => {
      items.push({
        id: `trip-${t.id}`,
        type: 'trip',
        title: 'Đã đăng chuyến xe mới',
        description: `${t.origin_name} → ${t.dest_name}`,
        timestamp: t.created_at || t.departure_time,
        icon: Navigation,
        color: 'text-emerald-500 bg-emerald-50',
        status: t.status
      });
    });

    userBookings.forEach(b => {
      items.push({
        id: `booking-${b.id}`,
        type: 'booking',
        title: 'Đã đặt chỗ thành công',
        description: `Mã đơn: Ord-${b.id.substring(0, 5).toUpperCase()}`,
        timestamp: b.created_at,
        icon: Ticket,
        color: 'text-indigo-500 bg-indigo-50',
        status: b.status
      });
    });

    let sorted = items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    if (activeFilter !== 'all') {
      sorted = sorted.filter(item => item.type === activeFilter);
    }
    
    return sorted.slice(0, 10);
  }, [allTrips, userBookings, profile, activeFilter]);

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
      case 'admin': return { label: 'Quản trị viên', color: 'bg-rose-500' };
      case 'driver': return { label: 'Tài xế chuyên nghiệp', color: 'bg-emerald-500' };
      case 'manager': return { label: 'Điều phối viên', color: 'bg-amber-500' };
      default: return { label: 'Thành viên', color: 'bg-indigo-500' };
    }
  };

  const userCode = profile?.user_code || `#Usr-${profile?.id.substring(0, 5).toUpperCase() || '0000'}`;
  const roleInfo = getRoleBadge(profile?.role);

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 animate-slide-up">
      {/* Header Section */}
      <div className="bg-white rounded-[48px] border border-slate-100 shadow-2xl shadow-indigo-100/50 overflow-hidden relative">
        <div className="h-64 bg-gradient-to-br from-indigo-700 via-indigo-600 to-indigo-500 relative p-10 flex flex-col md:flex-row items-center justify-between gap-8">
          
          {/* Left: Avatar & Identity */}
          <div className="flex flex-col items-center md:items-start gap-4">
            <div className="group relative">
              <div className="w-32 h-32 rounded-[40px] bg-white p-2 shadow-2xl rotate-3 group-hover:rotate-0 transition-transform duration-500">
                <div className="w-full h-full rounded-[32px] bg-indigo-50 flex items-center justify-center text-4xl font-black text-indigo-600 border border-indigo-100 overflow-hidden">
                  {profile?.full_name?.charAt(0) || 'U'}
                </div>
                <button className="absolute -bottom-2 -right-2 p-2.5 bg-indigo-600 text-white rounded-2xl shadow-lg hover:bg-indigo-700 transition-all border-4 border-white">
                  <Camera size={18} />
                </button>
              </div>
            </div>
            
            <div className="text-center md:text-left">
              <h2 className="text-3xl font-black text-white italic tracking-tight">{profile?.full_name}</h2>
              <div className="flex items-center justify-center md:justify-start gap-2 mt-1">
                <CopyableCode 
                  code={userCode} 
                  className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-xl text-[10px] font-black text-white border border-white/10 hover:bg-white/30"
                />
                <div className={`px-3 py-1 rounded-xl text-[9px] font-black text-white border border-white/20 shadow-sm ${roleInfo.color}`}>
                  {roleInfo.label}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Stats & Ranking */}
          <div className="flex flex-wrap justify-center md:justify-end gap-4">
            {/* Rank Card */}
            <div className={`flex flex-col items-center justify-center p-4 rounded-3xl border min-w-[120px] backdrop-blur-md ${getRankInfo.color}`}>
              <RankIcon size={24} className="mb-2" />
              <p className="text-[10px] font-bold opacity-60">Hạng thành viên</p>
              <p className="text-sm font-black tracking-widest">{getRankInfo.label}</p>
            </div>

            {/* Trips Count */}
            <div className="flex flex-col items-center justify-center p-4 rounded-3xl border border-white/20 bg-white/10 backdrop-blur-md text-white min-w-[120px]">
              <Car size={24} className="mb-2 text-emerald-400" />
              <p className="text-[10px] font-bold opacity-60">Chuyến đã đăng</p>
              <p className="text-xl font-black">{stats.tripsCount}</p>
            </div>

            {/* Bookings Count */}
            <div className="flex flex-col items-center justify-center p-4 rounded-3xl border border-white/20 bg-white/10 backdrop-blur-md text-white min-w-[120px]">
              <Ticket size={24} className="mb-2 text-sky-400" />
              <p className="text-[10px] font-bold opacity-60">Chuyến đã đặt</p>
              <p className="text-xl font-black">{stats.bookingsCount}</p>
            </div>
          </div>
        </div>

        {/* Body Section */}
        <div className="p-10 grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Cột trái: Form cập nhật */}
          <div className="lg:col-span-5 space-y-8">
            <div className="flex items-center gap-3 border-l-4 border-indigo-600 pl-4">
              <h3 className="text-sm font-black text-slate-800 tracking-tight">Cập nhật hồ sơ</h3>
            </div>
            
            <form onSubmit={handleUpdate} className="space-y-6">
              {message && (
                <div className={`p-4 rounded-2xl text-xs font-bold border animate-in fade-in slide-in-from-top-2 flex items-center gap-2 ${
                  message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'
                }`}>
                  {message.type === 'error' && <AlertCircle size={14} />}
                  {message.text}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 ml-1">Họ và tên</label>
                <div className="relative group">
                  <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={18} />
                  <input 
                    type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-14 pr-5 py-4 bg-slate-50 border border-slate-100 rounded-[22px] focus:bg-white focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 outline-none font-bold text-slate-700 transition-all text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[11px] font-bold text-slate-400">Số điện thoại</label>
                  <span className="text-[9px] text-slate-300 font-bold italic">Dùng để tài xế liên hệ</span>
                </div>
                <div className="relative group">
                  <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={18} />
                  <input 
                    type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                    placeholder="Nhập số điện thoại..."
                    className="w-full pl-14 pr-5 py-4 bg-slate-50 border border-slate-100 rounded-[22px] focus:bg-white focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 outline-none font-bold text-slate-700 transition-all text-sm"
                  />
                </div>
              </div>

              <button 
                type="submit" disabled={loading}
                className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black text-sm flex items-center justify-center gap-3 shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                Lưu thay đổi hồ sơ
              </button>
            </form>
          </div>

          {/* Cột phải: Timeline Lịch sử Hoạt động */}
          <div className="lg:col-span-7 space-y-8">
            <div className="flex items-center justify-between border-l-4 border-indigo-600 pl-4">
              <h3 className="text-sm font-black text-slate-800 tracking-tight">Lịch sử hoạt động</h3>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                 <button onClick={() => setActiveFilter('all')} className={`px-2 py-1 rounded-lg text-[9px] font-bold transition-all ${activeFilter === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Tất cả</button>
                 <button onClick={() => setActiveFilter('trip')} className={`px-2 py-1 rounded-lg text-[9px] font-bold transition-all ${activeFilter === 'trip' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>Chuyến xe</button>
                 <button onClick={() => setActiveFilter('booking')} className={`px-2 py-1 rounded-lg text-[9px] font-bold transition-all ${activeFilter === 'booking' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Đơn hàng</button>
              </div>
            </div>
            
            <div className="relative space-y-6">
              <div className="absolute left-[23px] top-4 bottom-4 w-px bg-slate-100"></div>

              {activities.length > 0 ? activities.map((activity) => (
                <div key={activity.id} className="relative flex gap-5 animate-in fade-in slide-in-from-right-4">
                  <div className={`w-12 h-12 rounded-[18px] ${activity.color} flex items-center justify-center shrink-0 z-10 border-4 border-white shadow-md`}>
                    <activity.icon size={20} />
                  </div>
                  <div className="flex-1 pt-1.5">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-[13px] font-black text-slate-800 leading-tight">{activity.title}</p>
                      <span className="text-[9px] font-bold text-slate-300 whitespace-nowrap ml-2">
                        {new Date(activity.timestamp).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                    <p className="text-[11px] font-bold text-slate-500 leading-relaxed">{activity.description}</p>
                  </div>
                </div>
              )) : (
                <div className="py-20 text-center bg-slate-50 rounded-[40px] border border-dashed border-slate-200">
                  <History className="mx-auto text-slate-200 mb-3" size={40} />
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Không tìm thấy hoạt động</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Security Info Card */}
      <div className="bg-white p-8 rounded-[40px] border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
            <ShieldCheck size={28} />
          </div>
          <div>
            <h4 className="text-sm font-black text-slate-800 tracking-tight">Xác thực mã định danh cá nhân</h4>
            <p className="text-[11px] font-bold text-slate-500 mt-1">Hồ sơ đã xác minh chính chủ, an tâm giao dịch trên Chung đường.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <div className="px-4 py-2 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-xl border border-emerald-100">An toàn</div>
           <CopyableCode code={userCode} className="text-[10px] font-bold text-slate-400" />
        </div>
      </div>
    </div>
  );
};

export default ProfileManagement;
