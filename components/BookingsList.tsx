
import React, { useState, useMemo } from 'react';
import { Booking, Trip } from '../types';
import { 
  Clock, MapPin, Trash2, Map as MapIcon, Navigation, ExternalLink, 
  Calendar, AlertCircle, XCircle, Loader2, CheckCircle2, ArrowUpDown, Search, RefreshCcw, Car
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

const getShortCity = (address: string) => {
  if (!address) return '';
  const parts = address.split(',');
  return parts[parts.length - 1].trim();
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
    let filtered = bookings.filter(booking => {
      const trip = trips.find(t => t.id === booking.trip_id);
      const bookingCode = `#ORD-${booking.id.substring(0, 5).toUpperCase()}`;
      const route = `${trip?.origin_name} ${trip?.dest_name}`.toLowerCase();
      const matchesSearch = bookingCode.includes(searchTerm.toUpperCase()) || route.includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || booking.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
    if (sortConfig.key && sortConfig.direction) {
      filtered.sort((a: any, b: any) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];
        if (sortConfig.key === 'departure_time') {
          const tripA = trips.find(t => t.id === a.trip_id);
          const tripB = trips.find(t => t.id === b.trip_id);
          valA = tripA?.departure_time || '';
          valB = tripB?.departure_time || '';
        }
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return filtered;
  }, [bookings, trips, searchTerm, statusFilter, sortConfig]);

  const handleCancelBooking = async (bookingId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy yêu cầu đặt chỗ này?')) return;
    setActionLoading(bookingId);
    try {
      const { error } = await supabase.from('bookings').delete().eq('id', bookingId);
      if (error) throw error;
      if (onRefresh) onRefresh();
    } catch (err: any) { alert('Lỗi: ' + err.message); } finally { setActionLoading(null); }
  };

  const SortHeader = ({ label, sortKey, width, textAlign = 'text-left' }: { label: string, sortKey: string, width?: string, textAlign?: string }) => (
    <th style={{ width }} className={`px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100/50 transition-colors ${textAlign}`} onClick={() => handleSort(sortKey)}>
      <div className={`flex items-center gap-2 ${textAlign === 'text-center' ? 'justify-center' : textAlign === 'text-right' ? 'justify-end' : ''}`}>
        {label} <ArrowUpDown size={12} className={`${sortConfig.key === sortKey ? 'text-indigo-600' : 'opacity-20'}`} />
      </div>
    </th>
  );

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="bg-white p-4 rounded-[24px] border border-slate-100 flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input type="text" placeholder="Tìm theo mã đơn, lộ trình..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white outline-none text-xs font-bold" />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <UnifiedDropdown label="Trạng thái" icon={Clock} value={statusFilter} onChange={setStatusFilter}
            options={[{label:'Tất cả', value:'ALL'}, {label:'Đang chờ', value:'PENDING'}, {label:'Xác nhận', value:'CONFIRMED'}, {label:'Bị từ chối', value:'REJECTED'}]} />
          <button onClick={() => onRefresh?.()} className="p-2.5 bg-slate-50 rounded-xl hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors border border-slate-200">
            <RefreshCcw size={16} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left table-fixed min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <SortHeader label="MÃ ĐƠN" sortKey="created_at" width="15%" />
                <SortHeader label="LỘ TRÌNH" sortKey="origin_name" width="20%" />
                <SortHeader label="PHƯƠNG TIỆN" sortKey="vehicle_info" width="15%" />
                <SortHeader label="KHỞI HÀNH" sortKey="departure_time" width="15%" />
                <SortHeader label="THANH TOÁN" sortKey="total_price" width="15%" textAlign="text-right" />
                <SortHeader label="TRẠNG THÁI" sortKey="status" width="12%" textAlign="text-center" />
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">HÀNH ĐỘNG</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredBookings.map(booking => {
                const trip = trips.find(t => t.id === booking.trip_id);
                if (!trip) return null;
                const bookingCode = `#ORD-${booking.id.substring(0, 5).toUpperCase()}`;
                const isRejected = booking.status === 'REJECTED';
                const isConfirmed = booking.status === 'CONFIRMED';
                const isMapVisible = showMapId === booking.id;

                return (
                  <React.Fragment key={booking.id}>
                    <tr className={`hover:bg-slate-50/50 transition-colors ${isRejected ? 'opacity-70' : ''}`}>
                      <td className="px-4 py-3">
                        <CopyableCode code={bookingCode} className="text-[11px] font-black text-slate-900" />
                        <div className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">
                          {new Date(booking.created_at).toLocaleDateString('vi-VN')}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-[12px] font-bold text-slate-800">
                          {getShortCity(trip.origin_name)} <Navigation size={10} className="text-emerald-500" /> {getShortCity(trip.dest_name)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-tighter">
                          <Car size={12} className="text-indigo-400" />
                          {trip.vehicle_info}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-[11px] font-bold text-slate-700">{new Date(trip.departure_time).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}</div>
                        <div className="text-[9px] font-bold text-slate-400">{new Date(trip.departure_time).toLocaleDateString('vi-VN')}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-[12px] font-black text-indigo-600">{new Intl.NumberFormat('vi-VN').format(booking.total_price)}đ</div>
                        <div className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{booking.seats_booked} Ghế</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl text-[9px] font-black uppercase border ${isConfirmed ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : isRejected ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                          {isConfirmed ? 'Đã duyệt' : isRejected ? 'Từ chối' : 'Chờ duyệt'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => setShowMapId(isMapVisible ? null : booking.id)} className={`p-1.5 rounded-lg border transition-all ${isMapVisible ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-400 hover:text-indigo-600 border-slate-200'}`}><MapIcon size={14} /></button>
                          {(booking.status === 'PENDING' || isRejected) && (
                            <button onClick={() => handleCancelBooking(booking.id)} disabled={actionLoading === booking.id} className="p-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-600 hover:text-white transition-all border border-rose-100">
                              {actionLoading === booking.id ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isMapVisible && (
                      <tr>
                        <td colSpan={7} className="px-6 py-6 bg-slate-50/50 border-t border-slate-100 animate-in slide-in-from-top-4 duration-300">
                           <div className="rounded-2xl overflow-hidden border border-slate-200 h-[200px]">
                             <iframe width="100%" height="100%" frameBorder="0" src={`https://maps.google.com/maps?q=${encodeURIComponent(trip.origin_name)}+to+${encodeURIComponent(trip.dest_name)}&output=embed`} loading="lazy" />
                           </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default BookingsList;
