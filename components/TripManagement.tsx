
import React, { useState, useMemo } from 'react';
import { 
  ClipboardList, Search, Clock, ArrowUpDown, Edit3, Play, CheckCircle2, XCircle, Loader2
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

const TripManagement: React.FC<TripManagementProps> = ({ profile, trips, bookings, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'departure_time', direction: 'asc' });
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
                            (trip.trip_code && trip.trip_code.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === 'ALL' || trip.status === statusFilter;
      return isOwner && matchesSearch && matchesStatus;
    });

    if (sortConfig.key && sortConfig.direction) {
      filtered.sort((a: any, b: any) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return filtered;
  }, [trips, searchTerm, statusFilter, sortConfig, isAdmin, profile]);

  const getStatusConfig = (trip: Trip) => {
    // Ưu tiên kiểm tra số ghế nếu trạng thái đang là chuẩn bị
    if (trip.available_seats <= 0 && (trip.status === TripStatus.PREPARING || trip.status === TripStatus.FULL)) {
      return { text: 'HẾT CHỖ', style: 'bg-rose-50 text-rose-600 border-rose-100', dot: 'bg-rose-500' };
    }

    switch (trip.status) {
      case TripStatus.FULL:
        return { text: 'HẾT CHỖ', style: 'bg-rose-50 text-rose-600 border-rose-100', dot: 'bg-rose-500' };
      case TripStatus.PREPARING: 
        return { text: 'CHUẨN BỊ', style: 'bg-indigo-50 text-indigo-600 border-indigo-100', dot: 'bg-indigo-500' };
      case TripStatus.ON_TRIP: 
        return { text: 'ĐANG ĐI', style: 'bg-amber-50 text-amber-600 border-amber-100', dot: 'bg-amber-500' };
      case TripStatus.COMPLETED: 
        return { text: 'HOÀN THÀNH', style: 'bg-emerald-50 text-emerald-600 border-emerald-100', dot: 'bg-emerald-500' };
      case TripStatus.CANCELLED:
        return { text: 'ĐÃ HỦY', style: 'bg-slate-50 text-slate-500 border-slate-200', dot: 'bg-slate-400' };
      default: 
        return { text: 'ĐÃ HỦY', style: 'bg-slate-50 text-slate-500 border-slate-200', dot: 'bg-slate-400' };
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
      className={`px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100/50 transition-colors ${textAlign}`}
      onClick={() => handleSort(sortKey)}
    >
      <div className={`flex items-center gap-2 ${textAlign === 'text-center' ? 'justify-center' : textAlign === 'text-right' ? 'justify-end' : ''}`}>
        {label}
        <ArrowUpDown size={12} className={`${sortConfig.key === sortKey ? 'text-indigo-600' : 'opacity-20'}`} />
      </div>
    </th>
  );

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="bg-white p-4 rounded-[24px] border border-slate-100 flex items-center justify-between gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" placeholder="Tìm chuyến xe..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white outline-none text-xs font-bold" 
          />
        </div>
        <UnifiedDropdown 
          label="Trạng thái" icon={ClipboardList} value={statusFilter} onChange={setStatusFilter}
          options={[{label:'Tất cả', value:'ALL'}, {label:'Chuẩn bị', value:TripStatus.PREPARING}, {label:'Đang đi', value:TripStatus.ON_TRIP}, {label:'Hoàn thành', value:TripStatus.COMPLETED}, {label:'Hết chỗ', value:TripStatus.FULL}]}
        />
      </div>

      <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left table-fixed min-w-[1000px]">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <SortHeader label="LỘ TRÌNH CHI TIẾT" sortKey="origin_name" width="22%" />
              <SortHeader label="KHỞI HÀNH" sortKey="departure_time" width="12%" />
              <SortHeader label="TẢI TRỌNG/GIÁ" sortKey="price" width="18%" />
              <SortHeader label="TRẠNG THÁI" sortKey="status" width="15%" textAlign="text-center" />
              <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">THAO TÁC</th>
              <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">GHI CHÚ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {displayTrips.map(trip => {
              const status = getStatusConfig(trip);
              const fillPercent = Math.min(100, ((trip.seats - trip.available_seats) / trip.seats) * 100);
              
              return (
                <tr key={trip.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-[10px] border border-indigo-100 shrink-0">
                        {trip.driver_name?.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[12px] font-bold text-slate-800 truncate">{trip.origin_name} → {trip.dest_name}</p>
                        <CopyableCode code={trip.trip_code || ''} className="text-[9px] font-black text-slate-300 uppercase" />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-[12px] font-bold text-slate-700">{new Date(trip.departure_time).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}</div>
                    <div className="text-[9px] font-bold text-slate-400">{new Date(trip.departure_time).toLocaleDateString('vi-VN')}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[11px] font-bold">
                        <span className="text-slate-500">{trip.seats - trip.available_seats}/{trip.seats} Ghế</span>
                        <span className="text-emerald-600">{new Intl.NumberFormat('vi-VN').format(trip.price)}đ</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${fillPercent >= 100 ? 'bg-rose-500' : 'bg-indigo-500'}`} style={{ width: `${fillPercent}%` }}></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[9px] font-black uppercase border ${status.style}`}>
                      <div className={`w-1 h-1 rounded-full ${status.dot}`}></div>
                      {status.text}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {actionLoading === trip.id ? <Loader2 className="animate-spin text-indigo-600" size={14} /> : (
                        <>
                          {(trip.status === TripStatus.PREPARING || trip.status === TripStatus.FULL) && (
                            <>
                              <button onClick={() => handleUpdateStatus(trip.id, TripStatus.ON_TRIP)} className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all border border-indigo-100" title="Bắt đầu đi"><Play size={14} /></button>
                              <button onClick={() => handleUpdateStatus(trip.id, TripStatus.CANCELLED)} className="p-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-600 hover:text-white transition-all border border-rose-100" title="Hủy chuyến"><XCircle size={14} /></button>
                            </>
                          )}
                          {trip.status === TripStatus.ON_TRIP && (
                            <>
                              <button onClick={() => handleUpdateStatus(trip.id, TripStatus.COMPLETED)} className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100" title="Hoàn thành"><CheckCircle2 size={14} /></button>
                              <button onClick={() => handleUpdateStatus(trip.id, TripStatus.CANCELLED)} className="p-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-600 hover:text-white transition-all border border-rose-100" title="Hủy chuyến"><XCircle size={14} /></button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 italic truncate group">
                      <span className="truncate">Ghi chú nhanh...</span>
                      <Edit3 size={10} className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
export default TripManagement;
