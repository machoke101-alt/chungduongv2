
import React, { useState, useRef, useEffect } from 'react';
import { Search as SearchIcon, MapPin, Calendar, Clock, User, ChevronRight, Star, LayoutGrid, CalendarDays, ChevronDown, Car, DollarSign, ArrowUpDown, Filter, Check, X, History, Users, ArrowRight } from 'lucide-react';
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
        className={`flex items-center gap-2.5 px-4 py-2 bg-white border border-slate-200 rounded-xl hover:border-indigo-400 transition-all shadow-sm ${isOpen ? 'ring-2 ring-indigo-100 border-indigo-400' : ''}`}
      >
        <Icon size={16} className="text-slate-400" />
        <span className="text-[11px] font-bold text-slate-700 whitespace-nowrap">
          {options.find((o:any) => o.value === value)?.label || label}
        </span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
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
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border-none rounded-xl text-[11px] font-medium outline-none focus:ring-1 focus:ring-indigo-100"
            />
          </div>
          <div className="max-h-60 overflow-y-auto custom-scrollbar">
            {filteredOptions.length > 0 ? filteredOptions.map((opt: any) => (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setIsOpen(false); }}
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 rounded-xl text-[11px] font-bold text-slate-600 transition-colors text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 border rounded flex items-center justify-center transition-all ${value === opt.value ? 'bg-indigo-600 border-indigo-600 shadow-sm' : 'border-slate-300 bg-white group-hover:border-indigo-300'}`}>
                    {value === opt.value && <Check size={10} className="text-white" />}
                  </div>
                  {opt.label}
                </div>
              </button>
            )) : (
              <div className="p-4 text-center text-[10px] text-slate-400 italic">Không tìm thấy kết quả</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const TripCard: React.FC<{ trip: Trip; onBook: (id: string) => void }> = ({ trip, onBook }) => {
  const tripCode = trip.trip_code || `#TRP-${trip.id.substring(0, 5).toUpperCase()}`;
  const departureDate = new Date(trip.departure_time);
  const timeStr = departureDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const dateStr = departureDate.toLocaleDateString('vi-VN');
  
  const arrivalStr = trip.arrival_time 
    ? new Date(trip.arrival_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : null;

  const createdDate = trip.created_at ? new Date(trip.created_at) : null;
  const createdStr = createdDate 
    ? `Đăng lúc: ${createdDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
    : 'Mới cập nhật';

  const isFull = trip.available_seats <= 0 || trip.status === TripStatus.FULL;
  
  return (
    <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group overflow-hidden relative">
      {isFull && (
        <div className="absolute top-4 -right-8 bg-rose-500 text-white text-[9px] font-black uppercase py-1.5 px-10 rotate-45 shadow-lg z-10 ring-1 ring-white/20">
          Hết chỗ
        </div>
      )}

      <div className="flex justify-between items-start mb-6">
        <div className="flex gap-3 items-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-emerald-600 text-lg font-black border border-slate-100 shadow-sm">
            {trip.driver_name?.charAt(0) || 'T'}
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-sm leading-tight">{trip.driver_name}</h4>
            <div className="flex items-center gap-2 mt-1">
              <Star size={10} fill="#f59e0b" className="text-amber-500" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{trip.vehicle_info}</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-black text-emerald-600 tracking-tight">
            {new Intl.NumberFormat('vi-VN').format(trip.price)}đ
          </p>
          <CopyableCode code={tripCode} className="text-[9px] font-bold text-slate-300 uppercase tracking-tighter ml-auto" />
        </div>
      </div>

      <div className="space-y-4 mb-6 relative">
        <div className="absolute left-[7px] top-3 bottom-3 w-[1px] bg-slate-100 border-l border-dashed border-slate-200"></div>
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-200 bg-white"></div>
          <p className="font-bold text-slate-700 text-xs truncate">{trip.origin_name}</p>
        </div>
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-3.5 h-3.5 rounded-full border-2 border-emerald-500 bg-emerald-50"></div>
          <p className="font-bold text-slate-700 text-xs truncate">{trip.dest_name}</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-50">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-800 uppercase tracking-wider">
            <Clock size={12} className="text-emerald-500" /> {timeStr}
            {arrivalStr && <><ArrowRight size={10} className="text-slate-300" /> <span className="text-indigo-500">{arrivalStr}</span></>}
          </div>
          <div className="text-[9px] font-bold text-slate-400 mt-0.5">
             {dateStr}
          </div>
        </div>
        <div className={`${isFull ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'} px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border`}>
          {isFull ? 'Hết chỗ' : `${trip.available_seats}/${trip.seats} ghế trống`}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-1.5 text-[9px] font-bold text-slate-300 uppercase tracking-tight">
        <History size={10} /> {createdStr}
      </div>
      
      <button 
        onClick={() => onBook(trip.id)}
        disabled={isFull}
        className={`w-full mt-4 py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
          !isFull 
          ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xl shadow-emerald-100' 
          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
        }`}
      >
        {isFull ? 'ĐÃ HẾT CHỖ' : 'ĐẶT CHỖ'} <ChevronRight size={14} />
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
  const [sortOrder, setSortOrder] = useState('NEWEST');

  const filteredTrips = trips.filter(t => {
    const matchesSearch = t.origin_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.dest_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.trip_code?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesVehicle = vehicleFilter === 'ALL' || t.vehicle_info.includes(vehicleFilter);
    return matchesSearch && matchesVehicle;
  });

  return (
    <div className="space-y-8 pb-20 animate-slide-up">
      <div className="bg-white/50 p-6 rounded-[32px] border border-slate-100 space-y-6">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full group">
            <SearchIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Tìm theo lộ trình, mã chuyến, tài xế..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-16 pr-6 py-3.5 bg-slate-100/50 border border-slate-200 focus:border-emerald-400 focus:bg-white rounded-xl outline-none transition-all font-bold text-slate-800 text-xs" 
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <UnifiedDropdown 
            label="Tất cả vị trí" 
            icon={MapPin} 
            value="ALL"
            options={[{ label: 'Tất cả vị trí', value: 'ALL' }]}
            onChange={() => {}}
          />
          <UnifiedDropdown 
            label="Tất cả xe" 
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
              { label: 'Mới nhất', value: 'NEWEST' },
              { label: 'Giá thấp nhất', value: 'PRICE_ASC' }
            ]}
            onChange={setSortOrder}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTrips.map(trip => (
          <TripCard key={trip.id} trip={trip} onBook={onBook} />
        ))}
      </div>
    </div>
  );
};

export default SearchTrips;
