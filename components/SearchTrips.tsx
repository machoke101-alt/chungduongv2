
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search as SearchIcon, MapPin, Calendar, Clock, User, ChevronRight, Star, LayoutGrid, CalendarDays, ChevronDown, Car, DollarSign, ArrowUpDown, Filter, Check, X, History, Users, ArrowRight, AlertCircle, Timer, Zap, CheckCircle2 } from 'lucide-react';
import { Trip, TripStatus } from '../types.ts';
import CopyableCode from './CopyableCode.tsx';

// Component Dropdown dùng chung cho toàn hệ thống
export const UnifiedDropdown = ({ label, icon: Icon, options, value, onChange, placeholder = "Tìm nhanh..." }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter((opt: any) => 
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl hover:border-emerald-400 transition-all shadow-sm ${isOpen ? 'ring-2 ring-emerald-100 border-emerald-400' : ''}`}
      >
        <Icon size={14} className="text-slate-400" />
        <span className="text-[11px] font-bold text-slate-700 whitespace-nowrap">
          {options.find((o:any) => o.value === value)?.label || label}
        </span>
        <ChevronDown size={12} className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 w-64 bg-white border border-slate-200 rounded-[20px] shadow-2xl z-50 p-2 animate-in fade-in zoom-in-95 duration-200">
          <div className="relative mb-2 p-1">
            <SearchIcon size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder={placeholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm font-medium outline-none focus:ring-1 focus:ring-emerald-100"
            />
          </div>
          <div className="max-h-60 overflow-y-auto custom-scrollbar">
            {filteredOptions.length > 0 ? filteredOptions.map((opt: any) => (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setIsOpen(false); }}
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 rounded-xl text-sm font-semibold text-slate-600 transition-colors text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 border rounded flex items-center justify-center transition-all ${value === opt.value ? 'bg-emerald-600 border-emerald-600 shadow-sm' : 'border-slate-300 bg-white group-hover:border-emerald-300'}`}>
                    {value === opt.value && <Check size={10} className="text-white" />}
                  </div>
                  {opt.label}
                </div>
              </button>
            )) : (
              <div className="p-4 text-center text-xs text-slate-400 italic">Không tìm thấy kết quả</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const getTripStatusDisplay = (trip: Trip) => {
  const now = new Date();
  const depTime = new Date(trip.departure_time);
  const arrTime = trip.arrival_time ? new Date(trip.arrival_time) : new Date(depTime.getTime() + 3 * 60 * 60 * 1000);
  const diffMins = Math.floor((depTime.getTime() - now.getTime()) / 60000);

  if (trip.status === TripStatus.CANCELLED) {
    return { label: 'Huỷ', style: 'bg-rose-50 text-rose-500 border-rose-100', icon: X };
  }
  if (now > arrTime) {
    return { label: 'Hoàn thành', style: 'bg-emerald-50 text-emerald-600 border-emerald-100', icon: CheckCircle2 };
  }
  if (now >= depTime && now <= arrTime) {
    return { label: 'Đang chạy', style: 'bg-blue-50 text-blue-600 border-blue-100 animate-pulse', icon: Car };
  }
  if (trip.available_seats <= 0) {
    return { label: 'Hết chỗ', style: 'bg-slate-100 text-slate-500 border-slate-200', icon: AlertCircle };
  }
  if (diffMins > 0 && diffMins <= 60) {
    return { label: 'Chuẩn bị', style: 'bg-orange-50 text-orange-600 border-orange-200 font-black', icon: Timer };
  }
  return { label: 'Chờ', style: 'bg-amber-50 text-amber-600 border-amber-100', icon: Clock };
};

const TripCard: React.FC<{ trip: Trip; onBook: (id: string) => void }> = ({ trip, onBook }) => {
  const tripCode = trip.trip_code || `#Trp-${trip.id.substring(0, 5).toUpperCase()}`;
  const departureDate = new Date(trip.departure_time);
  const statusInfo = getTripStatusDisplay(trip);
  const StatusIcon = statusInfo.icon;

  const timeStr = departureDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const dateStr = departureDate.toLocaleDateString('vi-VN');
  
  const arrivalStr = trip.arrival_time 
    ? new Date(trip.arrival_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : null;

  const isBookable = (statusInfo.label === 'Chờ' || statusInfo.label === 'Chuẩn bị') && trip.available_seats > 0;

  return (
    <div className={`bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group overflow-hidden relative flex flex-col h-full ${!isBookable && statusInfo.label !== 'Hết chỗ' ? 'opacity-60 grayscale-[0.3]' : ''}`}>
      
      {/* Badge Trạng thái */}
      <div className={`absolute top-4 right-4 flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[9px] font-black tracking-wider z-10 ${statusInfo.style}`}>
        <StatusIcon size={10} />
        {statusInfo.label}
      </div>

      <div className="flex justify-between items-start mb-5 pt-2">
        <div className="flex gap-2.5 items-center">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 text-sm font-black border border-emerald-100 shrink-0">
            {trip.driver_name?.charAt(0) || 'T'}
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-slate-900 text-[13px] leading-tight truncate">{trip.driver_name}</h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Star size={8} fill="#f59e0b" className="text-amber-500" />
              <span className="text-[10px] font-bold text-slate-400 truncate">{trip.vehicle_info}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3 mb-5 relative flex-1">
        <div className="absolute left-[7px] top-3 bottom-3 w-[1px] bg-slate-100 border-l border-dashed border-slate-200"></div>
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-200 bg-white shrink-0"></div>
          <p className="font-bold text-slate-700 text-[12px] truncate">{trip.origin_name}</p>
        </div>
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-3.5 h-3.5 rounded-full border-2 border-emerald-500 bg-emerald-50 shrink-0"></div>
          <p className="font-bold text-slate-700 text-[12px] truncate">{trip.dest_name}</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-50">
        <div className="flex flex-col">
          <div className="flex items-center gap-1 text-[13px] font-black text-slate-800">
            <Clock size={12} className="text-emerald-500" /> {timeStr}
            {arrivalStr && <><ArrowRight size={10} className="text-slate-300" /> <span className="text-emerald-500">{arrivalStr}</span></>}
          </div>
          <div className="text-[10px] font-bold text-slate-400 mt-0.5 tracking-wider">
             {dateStr}
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-black text-emerald-600 tracking-tight">
            {new Intl.NumberFormat('vi-VN').format(trip.price)}đ
          </p>
          <div className={`${trip.available_seats <= 0 ? 'text-rose-500' : 'text-slate-400'} text-[9px] font-bold`}>
            {trip.available_seats <= 0 ? 'Hết ghế' : `${trip.available_seats}/${trip.seats} trống`}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-1.5 text-[9px] font-bold text-slate-300 border-t border-slate-50 pt-3 italic">
        <div className="flex items-center gap-1">
          <History size={10} /> 
          {trip.created_at ? `Đăng lúc: ${new Date(trip.created_at).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})} ${new Date(trip.created_at).toLocaleDateString('vi-VN')}` : 'Mới cập nhật'}
        </div>
        <CopyableCode code={tripCode} className="text-[8px] font-black opacity-40 group-hover:opacity-100 transition-opacity" />
      </div>
      
      <button 
        onClick={() => onBook(trip.id)}
        disabled={!isBookable}
        className={`w-full mt-4 py-3 rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${
          isBookable
          ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-100 active:scale-95' 
          : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
        }`}
      >
        {statusInfo.label === 'Hoàn thành' ? 'Chuyến đã kết thúc' : 
         statusInfo.label === 'Đang chạy' ? 'Xe đang di chuyển' : 
         statusInfo.label === 'Huỷ' ? 'Chuyến xe đã huỷ' :
         trip.available_seats <= 0 ? 'Hết chỗ' : 'Đặt chỗ ngay'} <ChevronRight size={12} />
      </button>
    </div>
  );
};

interface SearchTripsProps {
  trips: Trip[];
  onBook: (id: string) => void;
}

const SearchTrips: React.FC<SearchTripsProps> = ({ trips, onBook }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('ALL');
  const [sortOrder, setSortOrder] = useState('TIME_ASC');

  const filteredTrips = useMemo(() => {
    let result = trips.filter(t => {
      const matchesSearch = t.origin_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            t.dest_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            t.trip_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            t.driver_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesVehicle = vehicleFilter === 'ALL' || t.vehicle_info.includes(vehicleFilter);
      return matchesSearch && matchesVehicle;
    });

    result.sort((a, b) => {
      const timeA = new Date(a.departure_time).getTime();
      const timeB = new Date(b.departure_time).getTime();
      
      const statusA = getTripStatusDisplay(a).label;
      const statusB = getTripStatusDisplay(b).label;

      if (sortOrder === 'TIME_ASC') {
        const priority = (s: string) => {
          if (s === 'Chuẩn bị') return 0;
          if (s === 'Chờ') return 1;
          if (s === 'Đang chạy') return 2;
          if (s === 'Hết chỗ') return 3;
          return 4;
        };
        if (priority(statusA) !== priority(statusB)) return priority(statusA) - priority(statusB);
        return timeA - timeB;
      }
      if (sortOrder === 'PRICE_ASC') return a.price - b.price;
      if (sortOrder === 'NEWEST') {
         const createA = a.created_at ? new Date(a.created_at).getTime() : 0;
         const createB = b.created_at ? new Date(b.created_at).getTime() : 0;
         return createB - createA;
      }
      return 0;
    });

    return result;
  }, [trips, searchTerm, vehicleFilter, sortOrder]);

  return (
    <div className="space-y-6 pb-20 animate-slide-up max-w-[1600px] mx-auto">
      <div className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full group">
            <SearchIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Tìm lộ trình, tài xế, mã chuyến..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-14 pr-6 py-3.5 bg-slate-50 border border-slate-200 focus:border-emerald-400 focus:bg-white rounded-2xl outline-none transition-all font-bold text-slate-800 text-sm" 
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <UnifiedDropdown 
            label="Loại xe" 
            icon={Car} 
            value={vehicleFilter}
            options={[
              { label: 'Tất cả loại xe', value: 'ALL' },
              { label: 'Sedan 4 chỗ', value: '4 chỗ' },
              { label: 'SUV 7 chỗ', value: '7 chỗ' },
              { label: 'Limousine', value: 'Limousine' }
            ]}
            onChange={setVehicleFilter}
          />
          <UnifiedDropdown 
            label="Sắp xếp" 
            icon={ArrowUpDown} 
            value={sortOrder}
            options={[
              { label: 'Sắp khởi hành', value: 'TIME_ASC' },
              { label: 'Vừa đăng xong', value: 'NEWEST' },
              { label: 'Giá từ thấp tới cao', value: 'PRICE_ASC' }
            ]}
            onChange={setSortOrder}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {filteredTrips.length > 0 ? filteredTrips.map(trip => (
          <TripCard key={trip.id} trip={trip} onBook={onBook} />
        )) : (
          <div className="col-span-full py-20 text-center bg-white rounded-[32px] border border-dashed border-slate-200">
             <AlertCircle size={40} className="mx-auto text-slate-200 mb-3" />
             <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Không có chuyến xe nào</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchTrips;
