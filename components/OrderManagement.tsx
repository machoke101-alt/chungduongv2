
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ShoppingBag, Search, CheckCircle2, XCircle, Clock, RefreshCcw, Loader2, ArrowUpDown, Navigation, Car, User, ArrowRight, Phone, DollarSign, ChevronDown, Check, X
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

const BookingStatusSelector = ({ value, onChange, disabled }: { value: string, onChange: (status: string) => void, disabled?: boolean }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const statusOptions = [
    { label: 'Chờ duyệt', value: 'PENDING', style: 'text-amber-600 bg-amber-50', icon: Clock },
    { label: 'Xác nhận', value: 'CONFIRMED', style: 'text-emerald-600 bg-emerald-50', icon: CheckCircle2 },
    { label: 'Từ chối', value: 'REJECTED', style: 'text-rose-600 bg-rose-50', icon: XCircle },
  ];

  const currentStatus = statusOptions.find(s => s.value === value) || statusOptions[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => document.removeEventListener('mousedown', handleClickOutside, true);
  }, []);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button 
        type="button" 
        disabled={disabled} 
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border transition-all duration-300 z-10 relative ${isOpen ? 'ring-2 ring-indigo-100 border-indigo-400 shadow-sm bg-white' : 'bg-white border-slate-200 hover:border-slate-300'}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <currentStatus.icon size={12} className={currentStatus.style.split(' ')[0]} />
          <span className={`text-[11px] font-bold truncate ${currentStatus.style.split(' ')[0]}`}>{currentStatus.label}</span>
        </div>
        <ChevronDown size={12} className={`text-slate-400 transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute top-full mt-1 right-0 w-44 bg-white rounded-2xl shadow-[0_15px_50px_rgba(0,0,0,0.2)] border border-slate-100 z-[999] p-1 animate-in fade-in zoom-in-95 duration-150">
          <div className="space-y-0.5">
            {statusOptions.map((opt) => (
              <button 
                key={opt.value} 
                type="button" 
                onClick={(e) => { e.stopPropagation(); onChange(opt.value); setIsOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${value === opt.value ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-50 text-slate-600'}`}
              >
                <div className="flex items-center gap-3">
                  <opt.icon size={12} className={value === opt.value ? 'text-white' : opt.style.split(' ')[0]} />
                  <span className="text-[11px] font-bold">{opt.label}</span>
                </div>
                {value === opt.value && <Check size={12} className="text-white" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
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
        trips(*, driver_profile:profiles(full_name, phone)), 
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
      const driverName = trip?.driver_profile?.full_name?.toLowerCase() || '';
      const route = `${trip?.origin_name} ${trip?.dest_name}`.toLowerCase();
      const matchesSearch = 
        order.passenger_phone?.includes(searchTerm) || 
        passengerName.includes(searchTerm.toLowerCase()) || 
        driverName.includes(searchTerm.toLowerCase()) ||
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
    const statusLabel = newStatus === 'CONFIRMED' ? 'xác nhận' : newStatus === 'REJECTED' ? 'từ chối' : 'chờ duyệt';
    if (!window.confirm(`Xác nhận cập nhật đơn hàng sang "${statusLabel}"?`)) return;
    
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
      className={`px-4 py-4 text-[11px] font-bold text-slate-400 tracking-tight cursor-pointer hover:bg-slate-100/50 transition-colors ${textAlign}`} 
      onClick={() => handleSort(sortKey)}
    >
      <div className={`flex items-center gap-1.5 ${textAlign === 'text-center' ? 'justify-center' : textAlign === 'text-right' ? 'justify-end' : ''}`}>
        {label} <ArrowUpDown size={10} className={`${sortConfig.key === sortKey ? 'text-indigo-600' : 'opacity-20'}`} />
      </div>
    </th>
  );

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="bg-white p-3 rounded-[28px] border border-slate-100 flex items-center justify-between gap-3">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input type="text" placeholder="Tìm đơn, khách, tài xế..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white outline-none text-sm font-bold" />
        </div>
        <UnifiedDropdown label="Trạng thái" icon={ShoppingBag} value={statusFilter} onChange={setStatusFilter}
          options={[{label:'Tất cả', value:'ALL'}, {label:'Đang chờ', value:'PENDING'}, {label:'Xác nhận', value:'CONFIRMED'}, {label:'Từ chối', value:'REJECTED'}]} />
        <button onClick={fetchBookings} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 hover:bg-indigo-50 text-slate-400 transition-colors">
          <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="bg-white rounded-[28px] border border-slate-100 shadow-sm overflow-visible">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left table-fixed min-w-[1100px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <SortHeader label="Thông tin đơn" sortKey="created_at" width="12%" />
                <SortHeader label="Lộ trình" sortKey="route" width="18%" />
                <SortHeader label="Lịch trình" sortKey="departure_time" width="14%" />
                <SortHeader label="Giá" sortKey="total_price" width="11%" textAlign="text-right" />
                <SortHeader label="Hành khách" sortKey="passenger_name" width="16%" />
                <SortHeader label="Trạng thái" sortKey="status" width="11%" textAlign="text-center" />
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
                const driverPhone = trip?.driver_profile?.phone || '';
                const vehicleInfo = trip?.vehicle_info || '---';

                return (
                  <tr key={order.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-4 py-4">
                       <div className="flex flex-col">
                         <span className="text-[10px] font-black text-slate-600 leading-tight">{bookingTime} {bookingDate}</span>
                         <CopyableCode code={bookingCode} className="text-sm font-black text-indigo-600" />
                       </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-4">
                        <div className="max-w-[100px] min-w-0">
                          <p className="text-[11px] font-black text-slate-800 truncate leading-tight">{originInfo.huyen}</p>
                          <p className="text-[10px] font-bold text-slate-500 truncate leading-tight">{originInfo.tinh}</p>
                        </div>
                        <ArrowRight size={10} className="text-slate-300 shrink-0" />
                        <div className="max-w-[100px] min-w-0">
                          <p className="text-[11px] font-black text-emerald-600 truncate leading-tight">{destInfo.huyen}</p>
                          <p className="text-[10px] font-bold text-slate-500 truncate leading-tight">{destInfo.tinh}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-[11px] font-black text-slate-800 leading-tight">
                        {depTime} <span className="text-slate-300">-</span> <span className="text-indigo-600">{arrTime}</span>
                      </div>
                      <div className="text-[10px] font-bold text-slate-600 mt-1">{depDate}</div>
                    </td>
                    <td className="px-4 py-4 text-right">
                       <p className="text-[11px] font-black text-emerald-600 leading-tight">
                         {new Intl.NumberFormat('vi-VN').format(order.total_price)}đ
                       </p>
                       <p className="text-[9px] font-black text-slate-400 mt-1">{order.seats_booked} ghế</p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-[11px] shrink-0 border border-indigo-100">{order.profiles?.full_name?.charAt(0)}</div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-black text-slate-800 truncate leading-tight">{order.profiles?.full_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                             {order.passenger_phone && (
                                <a href={`tel:${order.passenger_phone}`} className="w-5 h-5 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100 shrink-0" title="Gọi khách">
                                   <Phone size={9} />
                                </a>
                             )}
                             {order.passenger_phone ? (
                                <CopyableCode 
                                  code={order.passenger_phone} 
                                  className="text-[10px] font-black text-indigo-600 truncate group"
                                  label={order.passenger_phone}
                                />
                             ) : (
                                <span className="text-slate-300 italic text-[10px] font-black">N/A</span>
                             )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="w-36 relative">
                          {actionLoading === order.id ? (
                            <div className="flex items-center justify-center py-2 bg-slate-50 rounded-xl border border-slate-100">
                              <Loader2 className="animate-spin text-indigo-500" size={14} />
                            </div>
                          ) : (
                            <BookingStatusSelector 
                              value={order.status} 
                              onChange={(newStatus) => handleUpdateStatus(order.id, newStatus)} 
                            />
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={6} className="px-6 py-24 text-center italic text-slate-400 text-xs font-black">Chưa có đơn hàng nào</td>
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
