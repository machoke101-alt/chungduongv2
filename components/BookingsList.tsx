
import React, { useState, useMemo } from 'react';
import { Booking, Trip } from '../types';
import { 
  Clock, MapPin, Trash2, Map as MapIcon, Navigation, ExternalLink, 
  Calendar, AlertCircle, XCircle, Loader2, CheckCircle2, ArrowUpDown, Search, RefreshCcw, Car, ArrowRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import CopyableCode from './CopyableCode';
import { UnifiedDropdown } from './SearchTrips';

interface BookingsListProps {
  bookings: Booking[];
  trips: Trip[];
  onRefresh?: () => void;
}

type SortConfig = { key: string; direction: 'asc' | 'desc' | null };

const parseRouteInfo = (address: string) => {
  if (!address) return { huyen: '', tinh: '' };
  const parts = address.split(',').map(p => p.trim());
  const clean = (str: string) => str.replace(/^(Huyện|Quận|Xã|Thị trấn|Thị xã|Thành phố|Tp\.)\s+/i, '').trim();
  const tinhRaw = parts[parts.length - 1] || '';
  const huyenRaw = parts[parts.length - 2] || tinhRaw;
  return { huyen: clean(huyenRaw), tinh: clean(tinhRaw) };
};

const BookingsList: React.FC<BookingsListProps> = ({ bookings, trips, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'created_at', direction: 'desc' });
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showMapId, setShowMapId] = useState<string | null>(null);

  const handleSort = (key: string) => {
    let direction: SortConfig['direction'] = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    else if (sortConfig.key === key && sortConfig.direction === 'desc') direction = null;
    setSortConfig({ key, direction });
  };

  const filteredBookings = useMemo(() => {
    return bookings.filter(booking => {
      const trip = (booking as any).trips || trips.find(t => t.id === booking.trip_id);
      if (!trip) return false;
      const bookingCode = `#ORD-${booking.id.substring(0, 5).toUpperCase()}`;
      const route = `${trip.origin_name} ${trip.dest_name}`.toLowerCase();
      const matchesSearch = bookingCode.includes(searchTerm.toUpperCase()) || route.includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || booking.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [bookings, trips, searchTerm, statusFilter]);

  const sortedBookings = useMemo(() => {
    let sorted = [...filteredBookings];
    if (sortConfig.key && sortConfig.direction) {
      sorted.sort((a: any, b: any) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];
        if (sortConfig.key === 'departure_time') {
          const tripA = a.trips || trips.find((t:any) => t.id === a.trip_id);
          const tripB = b.trips || trips.find((t:any) => t.id === b.trip_id);
          valA = tripA?.departure_time || '';
          valB = tripB?.departure_time || '';
        }
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sorted;
  }, [filteredBookings, sortConfig, trips]);

  const handleCancelBooking = async (bookingId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy yêu cầu đặt chỗ này?')) return;
    setActionLoading(bookingId);
    try {
      const { error } = await supabase.from('bookings').delete().eq('id', bookingId);
      if (error) throw error;
      if (onRefresh) onRefresh();
    } catch (err: any) { alert('Lỗi: ' + err.message); } finally { setActionLoading(null); }
  };

  const SortHeader = ({ label, sortKey, width, textAlign = 'text-left', hideOnMobile = false }: any) => (
    <th 
      style={{ width }} 
      className={`px-3 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100/50 transition-colors ${textAlign} ${hideOnMobile ? 'hidden md:table-cell' : ''}`} 
      onClick={() => handleSort(sortKey)}
    >
      <div className={`flex items-center gap-1.5 ${textAlign === 'text-center' ? 'justify-center' : textAlign === 'text-right' ? 'justify-end' : ''}`}>
        {label} <ArrowUpDown size={10} className={`${sortConfig.key === sortKey ? 'text-indigo-600' : 'opacity-20'}`} />
      </div>
    </th>
  );

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="bg-white p-3 md:p-4 rounded-[24px] border border-slate-100 flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input type="text" placeholder="Tìm mã đơn, lộ trình..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white outline-none text-[11px] font-bold" />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <UnifiedDropdown label="Trạng thái" icon={Clock} value={statusFilter} onChange={setStatusFilter}
            options={[{label:'Tất cả', value:'ALL'}, {label:'Đang chờ', value:'PENDING'}, {label:'Xác nhận', value:'CONFIRMED'}, {label:'Bị từ chối', value:'REJECTED'}]} />
          <button onClick={() => onRefresh?.()} className="p-2 bg-slate-50 rounded-xl hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors border border-slate-200">
            <RefreshCcw size={14} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left table-fixed min-w-full">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <SortHeader label="MÃ ĐƠN" sortKey="created_at" width="15%" />
                <SortHeader label="LỘ TRÌNH" sortKey="origin_name" width="30%" />
                <SortHeader label="LỊCH TRÌNH" sortKey="departure_time" width="25%" />
                <SortHeader label="GIÁ" sortKey="total_price" width="15%" textAlign="text-right" hideOnMobile={true} />
                <SortHeader label="TRẠNG THÁI" sortKey="status" width="15%" textAlign="text-center" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sortedBookings.length > 0 ? sortedBookings.map(booking => {
                const trip = (booking as any).trips || trips.find(t => t.id === booking.trip_id);
                if (!trip) return null;
                const bookingCode = `#ORD-${booking.id.substring(0, 5).toUpperCase()}`;
                const isRejected = booking.status === 'REJECTED';
                const isConfirmed = booking.status === 'CONFIRMED';
                const isMapVisible = showMapId === booking.id;
                const depTime = new Date(trip.departure_time).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'});
                const arrTime = trip.arrival_time ? new Date(trip.arrival_time).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'}) : '--:--';

                const originInfo = parseRouteInfo(trip.origin_name);
                const destInfo = parseRouteInfo(trip.dest_name);

                return (
                  <React.Fragment key={booking.id}>
                    <tr className={`hover:bg-slate-50/50 transition-colors group cursor-pointer ${isRejected ? 'opacity-70' : ''}`} onClick={() => setShowMapId(isMapVisible ? null : booking.id)}>
                      <td className="px-3 py-3">
                        <div className="text-[10px] font-black text-slate-900">{bookingCode}</div>
                        <div className="text-[8px] font-bold text-slate-400 mt-0.5 uppercase">{new Date(booking.created_at).toLocaleDateString('vi-VN')}</div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-black text-slate-800 truncate">{originInfo.huyen}</p>
                            <p className="text-[9px] font-bold text-slate-400 truncate">{originInfo.tinh}</p>
                          </div>
                          <ArrowRight size={10} className="text-slate-300 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-black text-emerald-600 truncate">{destInfo.huyen}</p>
                            <p className="text-[9px] font-bold text-slate-400 truncate">{destInfo.tinh}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold text-slate-800">{depTime}</span>
                          <span className="text-slate-200">-</span>
                          <span className="text-[11px] font-bold text-indigo-500">{arrTime}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right hidden md:table-cell">
                        <div className="text-[11px] font-black text-indigo-600">{new Intl.NumberFormat('vi-VN').format(booking.total_price)}đ</div>
                        <div className="text-[8px] font-bold text-slate-400">{booking.seats_booked} ghế</div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[8px] font-black uppercase border ${isConfirmed ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : isRejected ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                          {isConfirmed ? 'Duyệt' : isRejected ? 'Hủy' : 'Chờ'}
                        </span>
                      </td>
                    </tr>
                    {isMapVisible && (
                      <tr>
                        <td colSpan={5} className="px-4 py-4 bg-slate-50/50 border-t border-slate-100">
                           <div className="flex flex-col sm:flex-row gap-4">
                              <div className="flex-1 rounded-xl overflow-hidden border border-slate-200 h-[150px]">
                                <iframe width="100%" height="100%" frameBorder="0" src={`https://maps.google.com/maps?q=${encodeURIComponent(trip.origin_name)}+to+${encodeURIComponent(trip.dest_name)}&output=embed`} />
                              </div>
                              <div className="w-full sm:w-48 flex flex-col gap-2">
                                <div className="p-3 bg-white rounded-xl border border-slate-200">
                                   <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Thanh toán</p>
                                   <p className="text-sm font-black text-indigo-600">{new Intl.NumberFormat('vi-VN').format(booking.total_price)}đ</p>
                                </div>
                                {booking.status === 'PENDING' && (
                                  <button onClick={(e) => { e.stopPropagation(); handleCancelBooking(booking.id); }} className="w-full py-2 bg-rose-50 text-rose-600 text-[10px] font-bold rounded-xl border border-rose-100 hover:bg-rose-600 hover:text-white transition-all">HỦY YÊU CẦU</button>
                                )}
                              </div>
                           </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              }) : (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-2">
                       <Navigation size={40} className="text-slate-200" />
                       <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Chưa có hành trình nào</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default BookingsList;
