
import React, { useState, useEffect } from 'react';
import { X, Phone, User, MapPin, Users, CreditCard, AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';
import { Trip, Profile } from '../types';
import { supabase } from '../lib/supabase';
import CopyableCode from './CopyableCode';

interface BookingModalProps {
  trip: Trip;
  profile: Profile | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { phone: string; seats: number; note: string }) => void;
}

const BookingModal: React.FC<BookingModalProps> = ({ trip, profile, isOpen, onClose, onConfirm }) => {
  const [phone, setPhone] = useState('');
  const [seats, setSeats] = useState(1);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  useEffect(() => {
    if (isOpen && profile) {
      setPhone(profile.phone || '');
    }
  }, [isOpen, profile]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (phone.length < 10) {
      setError('Vui lòng nhập số điện thoại hợp lệ (ít nhất 10 số)');
      return;
    }
    
    if (seats > trip.available_seats) {
      setError(`Chỉ còn ${trip.available_seats} ghế trống`);
      return;
    }

    // Nếu số điện thoại khác với profile, tự động cập nhật profile
    if (profile && phone !== profile.phone) {
      setIsUpdatingProfile(true);
      await supabase.from('profiles').update({ phone: phone }).eq('id', profile.id);
      setIsUpdatingProfile(false);
    }

    onConfirm({ phone, seats, note });
    onClose();
  };

  const tripCode = trip.trip_code || `#TRP-${trip.id.substring(0, 5).toUpperCase()}`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="p-6 bg-indigo-600 text-white flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-black uppercase italic tracking-tight">Xác nhận đặt chỗ</h3>
              <CopyableCode 
                code={tripCode} 
                className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-black text-white"
              />
            </div>
            <p className="text-indigo-100 text-xs mt-0.5">Vui lòng cung cấp thông tin để tài xế đón bạn</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Trip Summary Card */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                {trip.driver_name?.charAt(0) || 'T'}
              </div>
              <div>
                <p className="text-xs font-black text-slate-400 uppercase">Tài xế</p>
                <p className="text-sm font-bold text-slate-800">{trip.driver_name}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-black text-slate-400 uppercase">Giá/ghế</p>
              <p className="text-lg font-black text-indigo-600">{new Intl.NumberFormat('vi-VN').format(trip.price)}đ</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Phone Input */}
            <div>
              <div className="flex justify-between items-center mb-1.5 ml-1">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Số điện thoại liên hệ</label>
                {profile?.phone && phone === profile.phone && (
                   <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                     <CheckCircle2 size={10} /> Đã lấy từ hồ sơ
                   </span>
                )}
              </div>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="Ví dụ: 0987654321"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700 transition-all"
                />
              </div>
              {!profile?.phone && (
                <p className="text-[9px] text-slate-400 italic mt-1.5 ml-1 flex items-center gap-1">
                  <Sparkles size={10} className="text-amber-400" /> Hệ thống sẽ ghi nhớ số này cho các lần đặt sau.
                </p>
              )}
            </div>

            {/* Seats Counter */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Số lượng ghế</label>
                <div className="relative">
                  <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <select 
                    value={seats}
                    onChange={(e) => setSeats(parseInt(e.target.value))}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700 appearance-none transition-all"
                  >
                    {[...Array(trip.available_seats)].map((_, i) => (
                      <option key={i+1} value={i+1}>{i+1} ghế</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex flex-col justify-end">
                <div className="bg-emerald-50 border border-emerald-100 p-2 rounded-2xl flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  <span className="text-[10px] font-black text-emerald-600 uppercase">Còn {trip.available_seats} ghế</span>
                </div>
              </div>
            </div>

            {/* Note Input */}
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Ghi chú điểm đón chi tiết</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-4 text-slate-400" size={18} />
                <textarea 
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ví dụ: Đón tôi trước cổng trường tiểu học..."
                  rows={3}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm text-slate-700 transition-all resize-none"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-600 text-xs font-bold animate-in shake duration-300">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-4 bg-slate-50 text-slate-500 font-black rounded-2xl hover:bg-slate-100 transition-all"
            >
              HỦY BỎ
            </button>
            <button 
              type="submit"
              disabled={isUpdatingProfile}
              className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
              <CreditCard size={18} />
              {isUpdatingProfile ? 'ĐANG LƯU...' : `XÁC NHẬN ĐẶT ${new Intl.NumberFormat('vi-VN').format(trip.price * seats)}đ`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookingModal;
