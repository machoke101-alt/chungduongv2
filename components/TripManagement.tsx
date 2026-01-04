
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  ClipboardList, Search, Clock, ArrowUpDown, Play, CheckCircle2, XCircle, Loader2, ArrowRight, User, Car, History, Timer, X, AlertCircle, ChevronDown, Check
} from 'lucide-react';
import { Trip, Profile, TripStatus, Booking } from '../types';
import { supabase } from '../lib/supabase';
import CopyableCode from './CopyableCode';
import { UnifiedDropdown, getTripStatusDisplay } from './SearchTrips';

interface TripManagementProps {
  profile: Profile | null;
  trips: Trip[];
  bookings: Booking[];
  onRefresh: () => void;
}

type SortConfig = { key: keyof Trip | 'driver_name'; direction: 'asc' | 'desc' | null };

const parseRouteInfo = (address: string) => {
  if (!address) return { huyen: '', tinh: '' };
  const parts = address.split(',').map(p => p.trim());
  const clean = (str: string) => str.replace(/^(Huyện|Quận|Xã|Thị trấn|Thị xã|Thành phố|Tp\.)\s+/i, '').trim();
  const tinhRaw = parts[parts.length - 1] || '';
  const huyenRaw = parts[parts.length - 2] || tinhRaw;
  return { huyen: clean(huyenRaw), tinh: clean(tinhRaw) };
};

const TripStatusSelector = ({ value, onChange, disabled }: { value: TripStatus, onChange: (status: TripStatus) => void, disabled?: boolean }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const statusOptions: { label: string, value: TripStatus, style: string, icon: any }[] = [
    { label: 'Chuẩn bị', value: TripStatus.PREPARING, style: 'text-orange-600 bg-orange-50', icon: Timer },
    { label: 'Đang chạy', value: TripStatus.ON_TRIP, style: 'text-blue-600 bg-blue-50', icon: Play },
    { label: 'Hoàn thành', value: TripStatus.COMPLETED, style: 'text-emerald-600 bg-emerald-50', icon: CheckCircle2 },
    { label: 'Đã huỷ', value: TripStatus.CANCELLED, style: 'text-rose-600 bg-rose-50', icon: X },
    { label: 'Đầy chỗ', value: TripStatus.FULL, style: 'text-slate-600 bg-slate-100', icon: AlertCircle },
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

const TripManagement: React.FC<TripManagementProps> = ({ profile, trips, bookings, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'created_at', direction: 'desc' });

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

  const handleUpdateStatus = async (tripId: string, newStatus: TripStatus) => {
    const statusLabel = newStatus === TripStatus.CANCELLED ? 'Huỷ' : 'Cập nhật';
    if (!window.confirm(`Xác nhận ${statusLabel} trạng thái chuyến xe này?`)) return;
    
    setActionLoading(tripId);
    try {
      const { error } = await supabase.from('trips').update({ status: newStatus }).eq('id', tripId);
      if (error) throw error;
      onRefresh();
    } catch (err: any) { alert(err.message); } finally { setActionLoading(null); }
  };

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const SortHeader = ({ label, sortKey, width, textAlign = 'text-left' }: { label: string, sortKey: SortConfig['key'], width?: string, textAlign?: string }) => (
    <th 
      style={{ width }} 
      className={`px-4 py-4 text-[11px] font-bold text-slate-400 tracking-tight cursor-pointer hover:bg-slate-100/50 transition-colors ${textAlign}`}
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
      <div className="bg-white p-3 rounded-[28px] border border-slate-100 flex items-center justify-between gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" placeholder="Tìm chuyến xe, tài xế..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white outline-none text-sm font-bold" 
          />
        </div>
        <UnifiedDropdown 
          label="Trạng thái" icon={ClipboardList} value={statusFilter} onChange={setStatusFilter}
          options={[
            {label:'Tất cả', value:'ALL'}, 
            {label:'Chờ', value:TripStatus.PREPARING}, 
            {label:'Đang chạy', value:TripStatus.ON_TRIP}, 
            {label:'Hoàn thành', value:TripStatus.COMPLETED}, 
            {label:'Huỷ', value:TripStatus.CANCELLED},
            {label:'Đầy chỗ', value:TripStatus.FULL}
          ]}
        />
      </div>

      <div className="bg-white rounded-[28px] border border-slate-100 shadow-sm overflow-visible">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left table-fixed min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <SortHeader label="Lộ trình" sortKey="origin_name" width="22%" />
                <SortHeader label="Lịch trình" sortKey="departure_time" width="18%" />
                <SortHeader label="Giá" sortKey="price" width="18%" />
                <SortHeader label="Xe / Tài xế" sortKey="driver_name" width="16%" />
                <SortHeader label="Trạng thái" sortKey="status" width="11%" textAlign="text-center" />
                <SortHeader label="Đăng lúc" sortKey="created_at" width="15%" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {displayTrips.map(trip => {
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
                      <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-800">
                        {depTime} <span className="text-slate-300">-</span> <span className="text-indigo-600">{arrTime}</span>
                      </div>
                      <div className="text-[10px] font-bold text-slate-600">{depDate}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-between text-[10px] font-black mb-1">
                        <span className="text-slate-700">{trip.seats - trip.available_seats}/{trip.seats} ghế</span>
                        <span className="text-emerald-600">{new Intl.NumberFormat('vi-VN').format(trip.price)}đ</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${fillPercent >= 100 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${fillPercent}%` }}></div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 font-black text-[11px] border border-emerald-100 shrink-0">
                          {trip.driver_name?.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-black text-slate-800 truncate leading-tight">{trip.driver_name}</p>
                          <p className="text-[10px] font-bold text-slate-400 truncate mt-0.5 italic">{trip.vehicle_info}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="w-36 relative">
                          {actionLoading === trip.id ? (
                            <div className="flex items-center justify-center py-2 bg-slate-50 rounded-xl border border-slate-100">
                              <Loader2 className="animate-spin text-indigo-500" size={14} />
                            </div>
                          ) : (
                            <TripStatusSelector 
                              value={trip.status} 
                              onChange={(newStatus) => handleUpdateStatus(trip.id, newStatus)} 
                            />
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                       <div className="flex flex-col">
                         <span className="text-[10px] font-black text-slate-400 leading-tight">{postTime}</span>
                         <span className="text-[10px] font-black text-slate-600 leading-tight">{postDate}</span>
                         <CopyableCode code={trip.trip_code || ''} className="text-[11px] font-black text-indigo-600 mt-1" />
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
