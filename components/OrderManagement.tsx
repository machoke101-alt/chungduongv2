
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingBag, Search, CheckCircle2, XCircle, Clock, RefreshCcw, Loader2, ArrowUpDown, Navigation, Car, User, ArrowRight
} from 'lucide-react';
import { Booking, Profile, Trip } from '../types';
import { supabase } from '../lib/supabase';
import CopyableCode from './CopyableCode';
import { UnifiedDropdown } from './SearchTrips';

interface OrderManagementProps {
  profile: Profile | null;
  trips: Trip[];
  onRefresh: () => void;
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

const OrderManagement: React.FC<OrderManagementProps> = ({ profile, trips, onRefresh }) => {
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'created_at', direction: 'desc' });

  useEffect(() => { fetchBookings(); }, [profile]);

  const fetchBookings = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      let query = supabase.from('bookings').select(`
        *, 
        trips(*, driver_profile:profiles(full_name)), 
        profiles:passenger_id(full_name, phone)
      `);
      if (profile.role === 'driver') {
        const { data: myTrips } = await supabase.from('trips').select('id').eq('driver_id', profile.id);
        const myTripIds = myTrips?.map(t => t.id) || [];
        if (myTripIds.length > 0) query = query.in('trip_id', myTripIds);
        else { setAllBookings([]); setLoading(false); return; }
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      setAllBookings(data || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleSort = (key: string) => {
    let direction: SortConfig['direction'] = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    else if (sortConfig.key === key && sortConfig.direction === 'desc') direction = null;
    setSortConfig({ key, direction });
  };

  const filteredOrders = useMemo(() => {
    let filtered = allBookings.filter(order => {
      const trip = order.trips;
      const bookingCode = `#ORD-${order.id.substring(0, 5).toUpperCase()}`;
      const passengerName = order.profiles?.full_name?.toLowerCase() || '';
      const route = `${trip?.origin_name} ${trip?.dest_name}`.toLowerCase();
      const matchesSearch = 
        order.passenger_phone?.includes(searchTerm) || 
        passengerName.includes(searchTerm.toLowerCase()) || 
        bookingCode.includes(searchTerm.toUpperCase()) || 
        route.includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    if (sortConfig.key && sortConfig.direction) {
      filtered.sort((a: any, b: any) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return filtered;
  }, [allBookings, searchTerm, statusFilter, sortConfig]);

  const handleUpdateStatus = async (bookingId: string, newStatus: string) => {
    setActionLoading(bookingId);
    try {
      const { error } = await supabase.from('bookings').update({ status: newStatus }).eq('id', bookingId);
      if (error) throw error;
      setAllBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: newStatus } : b));
      onRefresh();
    } catch (err: any) { alert(err.message); } finally { setActionLoading(null); }
  };

  const SortHeader = ({ label, sortKey, width, textAlign = 'text-left' }: any) => (
    <th 
      style={{ width }} 
      className={`px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100/50 transition-colors ${textAlign}`} 
      onClick={() => handleSort(sortKey)}
    >
      <div className={`flex items-center gap-1.5 ${textAlign === 'text-center' ? 'justify-center' : textAlign === 'text-right' ? 'justify-end' : ''}`}>
        {label} <ArrowUpDown size={10} className={`${sortConfig.key === sortKey ? 'text-indigo-600' : 'opacity-20'}`} />
      </div>
    </th>
  );

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="bg-white p-3 rounded-[20px] border border-slate-100 flex items-center justify-between gap-3">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input type="text" placeholder="Tìm đơn, khách, số ĐT..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white outline-none text-[11px] font-bold" />
        </div>
        <UnifiedDropdown label="Trạng thái" icon={ShoppingBag} value={statusFilter} onChange={setStatusFilter}
          options={[{label:'Tất cả', value:'ALL'}, {label:'Đang chờ', value:'PENDING'}, {label:'Xác nhận', value:'CONFIRMED'}, {label:'Từ chối', value:'REJECTED'}]} />
        <button onClick={fetchBookings} className="p-2 bg-slate-50 rounded-xl border border-slate-200 hover:bg-indigo-50 text-slate-400 transition-colors">
          <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="bg-white rounded-[20px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left table-fixed min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <SortHeader label="MÃ ĐƠN / ĐẶT" sortKey="created_at" width="14%" />
                <SortHeader label="HÀNH KHÁCH" sortKey="passenger_name" width="18%" />
                <SortHeader label="XE / TÀI XẾ" sortKey="driver_name" width="16%" />
                <SortHeader label="LỘ TRÌNH" sortKey="route" width="23%" />
                <SortHeader label="LỊCH TRÌNH" sortKey="departure_time" width="16%" />
                <SortHeader label="TRẠNG THÁI / THAO TÁC" sortKey="status" width="13%" textAlign="text-center" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredOrders.length > 0 ? filteredOrders.map(order => {
                const trip = order.trips;
                const depTime = trip?.departure_time ? new Date(trip.departure_time).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'}) : '--:--';
                const arrTime = trip?.arrival_time ? new Date(trip.arrival_time).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'}) : '--:--';
                const depDate = trip?.departure_time ? new Date(trip.departure_time).toLocaleDateString('vi-VN') : '--/--/----';
                const originInfo = parseRouteInfo(trip?.origin_name || '');
                const destInfo = parseRouteInfo(trip?.dest_name || '');
                const bookingCode = `#ORD-${order.id.substring(0, 5).toUpperCase()}`;
                
                const createdAt = order.created_at ? new Date(order.created_at) : null;
                const bookingTime = createdAt ? createdAt.toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'}) : '--:--';
                const bookingDate = createdAt ? createdAt.toLocaleDateString('vi-VN') : '--/--/----';

                const driverName = trip?.driver_profile?.full_name || 'Đang cập nhật';
                const vehicleInfo = trip?.vehicle_info || '---';

                return (
                  <tr key={order.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-3 py-2">
                       <div className="flex flex-col">
                         <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter leading-tight">{bookingTime} {bookingDate}</span>
                         <CopyableCode code={bookingCode} className="text-[10px] font-black text-indigo-600 uppercase tracking-tighter" />
                       </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-[10px] shrink-0 border border-indigo-100">{order.profiles?.full_name?.charAt(0)}</div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-slate-800 truncate leading-tight">{order.profiles?.full_name}</p>
                          <p className="text-[9px] font-bold text-indigo-600 truncate">{order.passenger_phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-slate-800 truncate leading-tight">{driverName}</p>
                        <p className="text-[9px] font-bold text-slate-500 truncate uppercase mt-0.5 italic">{vehicleInfo}</p>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-3">
                        <div className="max-w-[95px] min-w-0">
                          <p className="text-[11px] font-black text-slate-800 truncate leading-tight">{originInfo.huyen}</p>
                          <p className="text-[9px] font-bold text-slate-500 truncate leading-tight">{originInfo.tinh}</p>
                        </div>
                        <ArrowRight size={10} className="text-slate-300 shrink-0" />
                        <div className="max-w-[95px] min-w-0">
                          <p className="text-[11px] font-black text-emerald-600 truncate leading-tight">{destInfo.huyen}</p>
                          <p className="text-[9px] font-bold text-slate-500 truncate leading-tight">{destInfo.tinh}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="text-[11px] font-black text-slate-800 leading-tight">
                        {depTime} <span className="text-slate-300">-</span> <span className="text-indigo-600">{arrTime}</span>
                      </div>
                      <div className="text-[9px] font-bold text-slate-600 mt-0.5">{depDate}</div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex flex-col items-center gap-1.5">
                        <span className={`inline-flex px-2 py-0.5 rounded-lg text-[8px] font-black uppercase border ${order.status === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : order.status === 'REJECTED' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                          {order.status === 'CONFIRMED' ? 'DUYỆT' : order.status === 'REJECTED' ? 'HỦY' : 'CHỜ'}
                        </span>
                        <div className="flex gap-1.5">
                          {actionLoading === order.id ? <Loader2 className="animate-spin text-indigo-600" size={10} /> : (
                            order.status === 'PENDING' && (
                              <>
                                <button onClick={() => handleUpdateStatus(order.id, 'CONFIRMED')} className="p-1 bg-emerald-50 text-emerald-600 rounded-md border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all"><CheckCircle2 size={12} /></button>
                                <button onClick={() => handleUpdateStatus(order.id, 'REJECTED')} className="p-1 bg-rose-50 text-rose-600 rounded-md border border-rose-100 hover:bg-rose-600 hover:text-white transition-all"><XCircle size={12} /></button>
                              </>
                            )
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center italic text-slate-400 text-xs">Chưa có đơn hàng nào</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default OrderManagement;
