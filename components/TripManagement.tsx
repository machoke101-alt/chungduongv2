
import React, { useState, useMemo } from 'react';
import { 
  ClipboardList, Search, Clock, ArrowUpDown, Play, CheckCircle2, XCircle, Loader2, ArrowRight, User, Car, History
} from 'lucide-react';
import { Trip, Profile, TripStatus, Booking } from '../types';
import { supabase } from '../lib/supabase';
import CopyableCode from './CopyableCode';
import { UnifiedDropdown } from './SearchTrips';

interface TripManagementProps {
  profile: Profile | null;
  trips: Trip[];
  bookings: Booking[];
  onRefresh: () => void;
}

type SortConfig = { key: keyof Trip | 'driver_name' | 'eta'; direction: 'asc' | 'desc' | null };

const parseRouteInfo = (address: string) => {
  if (!address) return { huyen: '', tinh: '' };
  const parts = address.split(',').map(p => p.trim());
  const clean = (str: string) => str.replace(/^(Huyện|Quận|Xã|Thị trấn|Thị xã|Thành phố|Tp\.)\s+/i, '').trim();
  const tinhRaw = parts[parts.length - 1] || '';
  const huyenRaw = parts[parts.length - 2] || tinhRaw;
  return { huyen: clean(huyenRaw), tinh: clean(tinhRaw) };
};

const TripManagement: React.FC<TripManagementProps> = ({ profile, trips, bookings, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'created_at', direction: 'desc' });
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isAdmin = profile?.role === 'admin' || profile?.role === 'manager';
  
  const handleSort = (key: SortConfig['key']) => {
    let direction: SortConfig['direction'] = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    else if (sortConfig.key === key && sortConfig.direction === 'desc') direction = null;
    setSortConfig({ key, direction });
  };

  const displayTrips = useMemo(() => {
    let filtered = trips.filter(trip => {
      const isOwner = isAdmin || trip.driver_id === profile?.id;
      const matchesSearch = trip.origin_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            trip.dest_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (trip.trip_code && trip.trip_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
                            (trip.driver_name && trip.driver_name.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === 'ALL' || trip.status === statusFilter;
      return isOwner && matchesSearch && matchesStatus;
    });

    if (sortConfig.key && sortConfig.direction) {
      filtered.sort((a: any, b: any) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];
        if (sortConfig.key === 'created_at' || sortConfig.key === 'departure_time') {
          valA = valA ? new Date(valA).getTime() : 0;
          valB = valB ? new Date(valB).getTime() : 0;
        }
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return filtered;
  }, [trips, searchTerm, statusFilter, sortConfig, isAdmin, profile]);

  const getStatusConfig = (trip: Trip) => {
    if (trip.available_seats <= 0 && (trip.status === TripStatus.PREPARING || trip.status === TripStatus.FULL)) {
      return { text: 'HẾT CHỖ', style: 'bg-rose-50 text-rose-600 border-rose-100', dot: 'bg-rose-500' };
    }
    switch (trip.status) {
      case TripStatus.FULL: return { text: 'HẾT CHỖ', style: 'bg-rose-50 text-rose-600 border-rose-100', dot: 'bg-rose-500' };
      case TripStatus.PREPARING: return { text: 'CHỜ', style: 'bg-indigo-50 text-indigo-600 border-indigo-100', dot: 'bg-indigo-500' };
      case TripStatus.ON_TRIP: return { text: 'ĐANG ĐI', style: 'bg-amber-50 text-amber-600 border-amber-100', dot: 'bg-amber-500' };
      case TripStatus.COMPLETED: return { text: 'XONG', style: 'bg-emerald-50 text-emerald-600 border-emerald-100', dot: 'bg-emerald-500' };
      case TripStatus.CANCELLED: return { text: 'HỦY', style: 'bg-slate-50 text-slate-500 border-slate-200', dot: 'bg-slate-400' };
      default: return { text: 'HỦY', style: 'bg-slate-50 text-slate-500 border-slate-200', dot: 'bg-slate-400' };
    }
  };

  const handleUpdateStatus = async (tripId: string, newStatus: TripStatus) => {
    setActionLoading(tripId);
    try {
      const { error } = await supabase.from('trips').update({ status: newStatus }).eq('id', tripId);
      if (error) throw error;
      onRefresh();
    } catch (err: any) { alert(err.message); } finally { setActionLoading(null); }
  };

  const SortHeader = ({ label, sortKey, width, textAlign = 'text-left' }: { label: string, sortKey: SortConfig['key'], width?: string, textAlign?: string }) => (
    <th 
      style={{ width }} 
      className={`px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100/50 transition-colors ${textAlign}`}
      onClick={() => handleSort(sortKey)}
    >
      <div className={`flex items-center gap-1.5 ${textAlign === 'text-center' ? 'justify-center' : textAlign === 'text-right' ? 'justify-end' : ''}`}>
        {label}
        <ArrowUpDown size={10} className={`${sortConfig.key === sortKey ? 'text-indigo-600' : 'opacity-20'}`} />
      </div>
    </th>
  );

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="bg-white p-3 rounded-[20px] border border-slate-100 flex items-center justify-between gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input 
            type="text" placeholder="Tìm chuyến xe, tài xế..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white outline-none text-xs font-bold" 
          />
        </div>
        <UnifiedDropdown 
          label="Trạng thái" icon={ClipboardList} value={statusFilter} onChange={setStatusFilter}
          options={[{label:'Tất cả', value:'ALL'}, {label:'Chuẩn bị', value:TripStatus.PREPARING}, {label:'Đang đi', value:TripStatus.ON_TRIP}, {label:'Hoàn thành', value:TripStatus.COMPLETED}, {label:'Hết chỗ', value:TripStatus.FULL}]}
        />
      </div>

      <div className="bg-white rounded-[20px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left table-fixed min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <SortHeader label="MÃ CHUYẾN / ĐĂNG" sortKey="created_at" width="15%" />
                <SortHeader label="XE / TÀI XẾ" sortKey="driver_name" width="16%" />
                <SortHeader label="LỘ TRÌNH" sortKey="origin_name" width="22%" />
                <SortHeader label="LỊCH TRÌNH" sortKey="departure_time" width="18%" />
                <SortHeader label="KHÁCH / GHẾ" sortKey="price" width="18%" />
                <SortHeader label="TRẠNG THÁI / THAO TÁC" sortKey="status" width="11%" textAlign="text-center" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {displayTrips.map(trip => {
                const status = getStatusConfig(trip);
                const fillPercent = Math.min(100, ((trip.seats - trip.available_seats) / trip.seats) * 100);
                const depTime = new Date(trip.departure_time).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'});
                const arrTime = trip.arrival_time ? new Date(trip.arrival_time).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'}) : '--:--';
                const depDate = new Date(trip.departure_time).toLocaleDateString('vi-VN');
                
                const createdAt = trip.created_at ? new Date(trip.created_at) : null;
                const postTime = createdAt ? createdAt.toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'}) : '--:--';
                const postDate = createdAt ? createdAt.toLocaleDateString('vi-VN') : '--/--/----';

                const originInfo = parseRouteInfo(trip.origin_name);
                const destInfo = parseRouteInfo(trip.dest_name);

                return (
                  <tr key={trip.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-3 py-2">
                       <div className="flex flex-col">
                         <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter leading-tight">{postTime} {postDate}</span>
                         <CopyableCode code={trip.trip_code || ''} className="text-[10px] font-black text-indigo-600 uppercase tracking-tighter" />
                       </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500 font-black text-[10px] border border-slate-100 shrink-0">
                          {trip.driver_name?.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-slate-800 truncate leading-tight">{trip.driver_name}</p>
                          <p className="text-[9px] font-bold text-slate-600 truncate uppercase mt-0.5">{trip.vehicle_info}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-3">
                        <div className="max-w-[90px] min-w-0">
                          <p className="text-[11px] font-black text-slate-800 truncate leading-tight">{originInfo.huyen}</p>
                          <p className="text-[9px] font-bold text-slate-500 truncate leading-tight">{originInfo.tinh}</p>
                        </div>
                        <ArrowRight size={10} className="text-slate-300 shrink-0" />
                        <div className="max-w-[90px] min-w-0">
                          <p className="text-[11px] font-black text-emerald-600 truncate leading-tight">{destInfo.huyen}</p>
                          <p className="text-[9px] font-bold text-slate-500 truncate leading-tight">{destInfo.tinh}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-800">
                        {depTime} <span className="text-slate-300">-</span> <span className="text-indigo-600">{arrTime}</span>
                      </div>
                      <div className="text-[9px] font-bold text-slate-600">{depDate}</div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                        <span className="text-slate-700">{trip.seats - trip.available_seats}/{trip.seats} Ghế</span>
                        <span className="text-emerald-600">{new Intl.NumberFormat('vi-VN').format(trip.price)}đ</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${fillPercent >= 100 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${fillPercent}%` }}></div>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex flex-col items-center gap-1.5">
                        <span className={`inline-flex px-2 py-0.5 rounded-lg text-[8px] font-black uppercase border ${status.style}`}>
                          {status.text}
                        </span>
                        <div className="flex items-center justify-center gap-1.5">
                          {actionLoading === trip.id ? <Loader2 className="animate-spin text-indigo-600" size={10} /> : (
                            <>
                              {(trip.status === TripStatus.PREPARING || trip.status === TripStatus.FULL) && (
                                <>
                                  <button onClick={() => handleUpdateStatus(trip.id, TripStatus.ON_TRIP)} className="p-1 bg-emerald-50 text-emerald-600 rounded-md hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100"><Play size={10} /></button>
                                  <button onClick={() => handleUpdateStatus(trip.id, TripStatus.CANCELLED)} className="p-1 bg-rose-50 text-rose-600 rounded-md hover:bg-rose-600 hover:text-white transition-all border border-rose-100"><XCircle size={10} /></button>
                                </>
                              )}
                              {trip.status === TripStatus.ON_TRIP && (
                                <button onClick={() => handleUpdateStatus(trip.id, TripStatus.COMPLETED)} className="p-1 bg-indigo-50 text-indigo-600 rounded-md hover:bg-indigo-600 hover:text-white transition-all border border-indigo-100"><CheckCircle2 size={10} /></button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default TripManagement;
