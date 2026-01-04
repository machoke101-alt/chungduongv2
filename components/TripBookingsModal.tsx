import React, { useState } from 'react';
import { X, Users, Phone, CheckCircle2, XCircle, Trash2, Loader2, Navigation } from 'lucide-react';
import { Trip, Booking } from '../types';
import { supabase } from '../lib/supabase';
import CopyableCode from './CopyableCode';

interface TripBookingsModalProps {
  trip: Trip;
  bookings: Booking[];
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

const TripBookingsModal: React.FC<TripBookingsModalProps> = ({ trip, bookings, isOpen, onClose, onRefresh }) => {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUpdateStatus = async (bookingId: string, newStatus: string) => {
    setActionLoading(bookingId);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', bookingId);

      if (error) throw error;
      onRefresh();
    } catch (err: any) {
      alert('LỖI: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa đơn hàng này? Thao tác này sẽ giải phóng ghế.')) return;
    
    setDeletingId(bookingId);
    try {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', bookingId);

      if (error) throw error;
      onRefresh();
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const tripCode = trip.trip_code || `#TRP-${trip.id.substring(0, 5).toUpperCase()}`;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-8 bg-indigo-600 text-white shrink-0">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Users size={24} />
                </div>
                <h3 className="text-2xl font-black uppercase italic tracking-tight">Danh sách Hành khách</h3>
              </div>
              <div className="flex items-center gap-2 mt-2">
                 <CopyableCode code={tripCode} className="text-[10px] font-black bg-white/20 px-2 py-0.5 rounded text-white" />
                 <span className="text-white/40">•</span>
                 <p className="text-xs font-bold text-indigo-100 flex items-center gap-1.5 uppercase tracking-wider">
                    <Navigation size={12} /> {trip.origin_name} → {trip.dest_name}
                 </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2.5 hover:bg-white/10 rounded-full transition-colors">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {bookings.length > 0 ? (
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Hành khách / Mã Đơn</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Ghế / Giá</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Trạng thái</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {bookings.map((booking: any) => {
                    const bookingCode = `#ORD-${booking.id.substring(0, 5).toUpperCase()}`;
                    const isLoading = actionLoading === booking.id;
                    const isDeleting = deletingId === booking.id;

                    return (
                      <tr key={booking.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black border border-indigo-100 text-sm">
                              {booking.profiles?.full_name?.charAt(0) || 'P'}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-black text-slate-900 truncate">{booking.profiles?.full_name || 'Khách vãng lai'}</p>
                              <div className="flex items-center gap-3 mt-1">
                                <CopyableCode code={bookingCode} className="text-[9px] font-black text-slate-400 uppercase tracking-tighter" />
                                <div className="flex items-center gap-2">
                                  {booking.passenger_phone && (
                                    <a href={`tel:${booking.passenger_phone}`} className="w-5 h-5 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100" title="Gọi điện">
                                      <Phone size={8} />
                                    </a>
                                  )}
                                  {booking.passenger_phone ? (
                                     <CopyableCode 
                                        code={booking.passenger_phone} 
                                        className="text-[10px] font-bold text-indigo-500 group"
                                        label={booking.passenger_phone}
                                     />
                                  ) : (
                                     <span className="text-slate-300 italic text-[10px] font-bold">N/A</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-slate-900">{booking.seats_booked} Ghế</span>
                            <span className="text-[10px] font-black text-indigo-600">{new Intl.NumberFormat('vi-VN').format(booking.total_price)}đ</span>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <span className={`inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase border ${
                            booking.status === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                            booking.status === 'REJECTED' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                            'bg-amber-50 text-amber-600 border-amber-100'
                          }`}>
                            {booking.status === 'CONFIRMED' ? 'Đã xác nhận' : booking.status === 'REJECTED' ? 'Từ chối' : 'Chờ duyệt'}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isLoading ? (
                              <Loader2 className="animate-spin text-indigo-600" size={18} />
                            ) : (
                              <>
                                {booking.status !== 'CONFIRMED' && (
                                  <button 
                                    onClick={() => handleUpdateStatus(booking.id, 'CONFIRMED')}
                                    className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100"
                                    title="Xác nhận"
                                  >
                                    <CheckCircle2 size={16} />
                                  </button>
                                )}
                                {booking.status !== 'REJECTED' && (
                                  <button 
                                    onClick={() => handleUpdateStatus(booking.id, 'REJECTED')}
                                    className="p-2 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-600 hover:text-white transition-all border border-amber-100"
                                    title="Từ chối"
                                  >
                                    <XCircle size={16} />
                                  </button>
                                )}
                                <button 
                                  onClick={() => handleDeleteBooking(booking.id)}
                                  disabled={isDeleting}
                                  className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all border border-rose-100"
                                  title="Xóa đơn"
                                >
                                  {isDeleting ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-24 text-center bg-slate-50/50 rounded-[40px] border-2 border-dashed border-slate-100">
              <Users className="mx-auto text-slate-200 mb-4" size={48} />
              <p className="text-lg font-black text-slate-400 uppercase tracking-widest">Chưa có khách đặt chỗ</p>
              <p className="text-slate-300 text-sm mt-1">Danh sách hành khách sẽ hiển thị ở đây khi có đơn hàng mới.</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-8 bg-slate-50 border-t border-slate-100 shrink-0">
          <div className="flex justify-between items-center">
             <div className="flex items-center gap-6">
                <div className="text-center">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Tổng ghế đã đặt</p>
                   <p className="text-xl font-black text-slate-900">
                      {bookings.reduce((sum, b) => sum + b.seats_booked, 0)}/{trip.seats} Ghế
                   </p>
                </div>
                <div className="w-px h-8 bg-slate-200"></div>
                <div className="text-center">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Dự kiến thu hộ</p>
                   <p className="text-xl font-black text-indigo-600">
                      {new Intl.NumberFormat('vi-VN').format(bookings.reduce((sum, b) => sum + (b.status === 'CONFIRMED' ? b.total_price : 0), 0))}đ
                   </p>
                </div>
             </div>
             <button 
               onClick={onClose}
               className="px-8 py-3 bg-white border border-slate-200 rounded-2xl text-[11px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-100 transition-all"
             >
               Đóng cửa sổ
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TripBookingsModal;