import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, MapPin, Calendar, Users, Car, CheckCircle2, Navigation, Clock, Repeat, ChevronDown, Banknote, Loader2, AlertTriangle, Info, ArrowRight, DollarSign } from 'lucide-react';
import { searchPlaces, getRouteDetails } from '../services/geminiService.ts';
import CustomDatePicker from './CustomDatePicker.tsx';
import CustomTimePicker from './CustomTimePicker.tsx';

interface PostTripProps {
  onPost: (trips: any[]) => void;
}

const DAYS_OF_WEEK = [
  { label: 'T2', value: 1 }, { label: 'T3', value: 2 }, { label: 'T4', value: 3 },
  { label: 'T5', value: 4 }, { label: 'T6', value: 5 }, { label: 'T7', value: 6 }, { label: 'CN', value: 0 },
];

const getTodayFormatted = () => {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, '0');
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const y = now.getFullYear();
  return `${d}-${m}-${y}`;
};

const priceSuggestions = [
  { label: '100K', value: 100000 },
  { label: '150K', value: 150000 },
  { label: '200K', value: 200000 },
  { label: '250K', value: 250000 },
  { label: '300K', value: 300000 },
];

const PostTrip: React.FC<PostTripProps> = ({ onPost }) => {
  const [origin, setOrigin] = useState('');
  const [originDetail, setOriginDetail] = useState('');
  const [destination, setDestination] = useState('');
  const [destDetail, setDestDetail] = useState('');
  const [originUri, setOriginUri] = useState('');
  const [destUri, setDestUri] = useState('');
  
  const [vehicle, setVehicle] = useState('Sedan 4 chỗ');
  const [licensePlate, setLicensePlate] = useState('');
  const [date, setDate] = useState(getTodayFormatted());
  const [time, setTime] = useState('08:00');
  const [arrivalTime, setArrivalTime] = useState('10:00');
  const [seats, setSeats] = useState(4);
  const [price, setPrice] = useState('150000'); // Lưu giá trị thô dạng chuỗi
  const [loading, setLoading] = useState(false);
  const [analyzingRoute, setAnalyzingRoute] = useState(false);
  const [routeData, setRouteData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showArrivalTimePicker, setShowArrivalTimePicker] = useState(false);
  
  const [isRecurring, setIsRecurring] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  
  const [originSuggestions, setOriginSuggestions] = useState<{name: string, uri: string}[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<{name: string, uri: string}[]>([]);
  
  const datePickerRef = useRef<HTMLDivElement>(null);
  const timePickerRef = useRef<HTMLDivElement>(null);
  const arrivalTimePickerRef = useRef<HTMLDivElement>(null);
  const originRef = useRef<HTMLDivElement>(null);
  const destRef = useRef<HTMLDivElement>(null);

  // Hàm định dạng số có dấu chấm
  const formatNumber = (num: string) => {
    if (!num) return "";
    const value = num.replace(/\D/g, "");
    return value.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) setShowDatePicker(false);
      if (timePickerRef.current && !timePickerRef.current.contains(event.target as Node)) setShowTimePicker(false);
      if (arrivalTimePickerRef.current && !arrivalTimePickerRef.current.contains(event.target as Node)) setShowArrivalTimePicker(false);
      if (originRef.current && !originRef.current.contains(event.target as Node)) setOriginSuggestions([]);
      if (destRef.current && !destRef.current.contains(event.target as Node)) setDestSuggestions([]);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const search = async () => {
      if (origin.length >= 1 && !originUri) setOriginSuggestions(await searchPlaces(origin));
      else setOriginSuggestions([]);
    };
    search();
  }, [origin, originUri]);

  useEffect(() => {
    const search = async () => {
      if (destination.length >= 1 && !destUri) setDestSuggestions(await searchPlaces(destination));
      else setDestSuggestions([]);
    };
    search();
  }, [destination, destUri]);

  useEffect(() => {
    const analyze = async () => {
      if (origin && destination && origin !== destination) {
        setAnalyzingRoute(true);
        const data = await getRouteDetails(origin, destination);
        setRouteData(data);
        
        if (data.duration_minutes) {
          const [h, m] = time.split(':').map(Number);
          const depDate = new Date();
          depDate.setHours(h, m, 0, 0);
          const arrDate = new Date(depDate.getTime() + data.duration_minutes * 60000);
          setArrivalTime(`${String(arrDate.getHours()).padStart(2, '0')}:${String(arrDate.getMinutes()).padStart(2, '0')}`);
        }
        setAnalyzingRoute(false);
      } else {
        setRouteData(null);
      }
    };
    const timer = setTimeout(analyze, 800);
    return () => clearTimeout(timer);
  }, [origin, destination, time]);

  const toggleDay = (day: number) => {
    setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const rawPrice = price.replace(/\D/g, "");

    if (!origin || !destination || (!isRecurring && !date) || (isRecurring && selectedDays.length === 0) || !rawPrice || !licensePlate) {
      setError("Vui lòng điền đầy đủ thông tin!");
      return;
    }

    if (parseInt(rawPrice) <= 0) {
      setError("Giá không hợp lệ.");
      return;
    }

    const tripsToCreate: any[] = [];
    
    if (isRecurring) {
      const today = new Date();
      for (let i = 0; i < 7; i++) {
        const nextDay = new Date(today);
        nextDay.setDate(today.getDate() + i);
        if (selectedDays.includes(nextDay.getDay())) {
          const [h, m] = time.split(':');
          nextDay.setHours(parseInt(h), parseInt(m), 0, 0);
          
          const [ah, am] = arrivalTime.split(':');
          const nextArrDay = new Date(nextDay);
          nextArrDay.setHours(parseInt(ah), parseInt(am), 0, 0);
          if (nextArrDay < nextDay) nextArrDay.setDate(nextArrDay.getDate() + 1);

          tripsToCreate.push({ 
            departureTime: nextDay.toISOString(),
            arrivalTime: nextArrDay.toISOString()
          });
        }
      }
    } else {
      const [d, m, y] = date.split('-').map(Number);
      const departure = new Date(y, m - 1, d);
      const [h, min] = time.split(':').map(Number);
      departure.setHours(h, min, 0, 0);
      
      const arrival = new Date(y, m - 1, d);
      const [ah, amin] = arrivalTime.split(':').map(Number);
      arrival.setHours(ah, amin, 0, 0);
      if (arrival < departure) arrival.setDate(arrival.getDate() + 1);

      tripsToCreate.push({ 
        departureTime: departure.toISOString(),
        arrivalTime: arrival.toISOString()
      });
    }

    setLoading(true);
    const tripBase = {
      origin: { name: origin, description: originDetail, mapsUrl: originUri },
      destination: { name: destination, description: destDetail, mapsUrl: destUri },
      price: parseInt(rawPrice),
      seats: seats,
      availableSeats: seats,
      vehicleInfo: `${vehicle} (${licensePlate})`,
      isRecurring: isRecurring,
      recurringDays: selectedDays
    };

    const finalTrips = tripsToCreate.map(t => ({ 
      ...tripBase, 
      departureTime: t.departureTime,
      arrivalTime: t.arrivalTime 
    }));
    
    try {
      await onPost(finalTrips);
    } catch (err: any) {
      setError(err.message || "Đã có lỗi xảy ra khi lưu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-slide-up">
      <form onSubmit={handleSubmit} className="bg-white rounded-[32px] border border-slate-200 shadow-xl overflow-hidden">
        {/* Removed Header for space optimization */}
        
        {error && (
          <div className="mx-6 mt-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600">
            <AlertTriangle size={20} className="shrink-0" />
            <p className="text-xs font-bold">{error}</p>
          </div>
        )}

        <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-slate-400 flex items-center gap-2">
              <Navigation size={12} /> Lộ trình chi tiết
            </h3>
            
            <div className="space-y-4 relative">
              <div className="absolute left-[18px] top-10 bottom-10 w-0.5 bg-slate-100 border-l border-dashed border-slate-200"></div>

              <div className="relative" ref={originRef}>
                <div className="flex gap-4">
                  <div className={`mt-1 w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-all ${originUri ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                    <Navigation size={16} />
                  </div>
                  <div className="flex-1 space-y-2">
                    <label className="text-xs font-semibold text-slate-500 ml-1">Điểm đón</label>
                    <input 
                      type="text" value={origin} onChange={(e) => { setOrigin(e.target.value); setOriginUri(''); setError(null); }}
                      placeholder="Tìm địa chỉ đón..." required
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold text-sm text-slate-900 placeholder:text-slate-400"
                    />
                    <input 
                      type="text" value={originDetail} onChange={(e) => setOriginDetail(e.target.value)}
                      placeholder="Số nhà, ngõ ngách..."
                      className="w-full px-4 py-2 bg-white border border-slate-100 rounded-lg outline-none text-xs italic text-slate-600"
                    />
                  </div>
                </div>
                {originSuggestions.length > 0 && (
                  <div className="absolute top-16 left-12 right-0 z-50 bg-white rounded-xl border border-slate-100 shadow-xl overflow-hidden">
                    {originSuggestions.map((s, idx) => (
                      <button key={idx} type="button" onClick={() => { setOrigin(s.name); setOriginUri(s.uri); setOriginSuggestions([]); }}
                        className="w-full px-4 py-2.5 text-left hover:bg-emerald-50 text-xs font-bold text-slate-700 border-b border-slate-50 last:border-0">{s.name}</button>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative" ref={destRef}>
                <div className="flex gap-4">
                  <div className={`mt-1 w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-all ${destUri ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                    <MapPin size={16} />
                  </div>
                  <div className="flex-1 space-y-2">
                    <label className="text-xs font-semibold text-slate-500 ml-1">Điểm trả</label>
                    <input 
                      type="text" value={destination} onChange={(e) => { setDestination(e.target.value); setDestUri(''); setError(null); }}
                      placeholder="Tìm địa chỉ trả..." required
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold text-sm text-slate-900 placeholder:text-slate-400"
                    />
                    <input 
                      type="text" value={destDetail} onChange={(e) => setDestDetail(e.target.value)}
                      placeholder="Ghi chú điểm trả..."
                      className="w-full px-4 py-2 bg-white border border-slate-100 rounded-lg outline-none text-xs italic text-slate-600"
                    />
                  </div>
                </div>
                {destSuggestions.length > 0 && (
                  <div className="absolute top-16 left-12 right-0 z-50 bg-white rounded-xl border border-slate-100 shadow-xl overflow-hidden">
                    {destSuggestions.map((s, idx) => (
                      <button key={idx} type="button" onClick={() => { setDestination(s.name); setDestUri(s.uri); setDestSuggestions([]); }}
                        className="w-full px-4 py-2.5 text-left hover:bg-emerald-50 text-xs font-bold text-slate-700 border-b border-slate-50 last:border-0">{s.name}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {(analyzingRoute || routeData) && (
              <div className="mt-4 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center gap-3 animate-in fade-in transition-all">
                <div className="p-2 bg-white rounded-xl text-indigo-600 shadow-sm shrink-0">
                  {analyzingRoute ? <Loader2 size={16} className="animate-spin" /> : <Info size={16} />}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Phân tích lộ trình Gemini</p>
                  <p className="text-xs font-semibold text-indigo-800">
                    {analyzingRoute ? "Đang tính toán..." : `Quãng đường: ${routeData.distance} - Thời gian: ${routeData.duration_text}`}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <h3 className="text-sm font-bold text-slate-400 flex items-center gap-2">
              <Clock size={12} /> Thời gian & chi phí
            </h3>

            <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg"><Repeat size={14} /></div>
                  <span className="text-xs font-bold text-slate-700">Chuyến định kỳ</span>
                </div>
                <button type="button" onClick={() => setIsRecurring(!isRecurring)}
                  className={`w-10 h-5 rounded-full transition-all relative ${isRecurring ? 'bg-emerald-600' : 'bg-slate-300'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${isRecurring ? 'left-5.5' : 'left-0.5'}`} />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {!isRecurring && (
                  <div className="relative" ref={datePickerRef}>
                    <button type="button" onClick={() => setShowDatePicker(!showDatePicker)} className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900">
                      <span>Ngày: {date}</span><Calendar size={14} className="text-emerald-400" />
                    </button>
                    {showDatePicker && <div className="absolute top-full left-0 z-[60] mt-2"><CustomDatePicker selectedDate={date} onSelect={setDate} onClose={() => setShowDatePicker(false)} /></div>}
                  </div>
                )}
                
                {isRecurring && (
                  <div className="grid grid-cols-7 gap-1">
                    {DAYS_OF_WEEK.map(day => (
                      <button key={day.value} type="button" onClick={() => toggleDay(day.value)}
                        className={`py-1.5 rounded-lg text-xs font-bold border ${selectedDays.includes(day.value) ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-400 border-slate-200'}`}>
                        {day.label}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <div className="flex-1 space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 ml-1">Khởi hành</label>
                    <div className="relative" ref={timePickerRef}>
                      <button type="button" onClick={() => setShowTimePicker(!showTimePicker)} className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900">
                        <span>{time}</span><Clock size={14} className="text-emerald-400" />
                      </button>
                      {showTimePicker && <div className="absolute top-full left-0 z-[60] mt-2"><CustomTimePicker selectedTime={time} onSelect={setTime} onClose={() => setShowTimePicker(false)} /></div>}
                    </div>
                  </div>
                  <div className="pt-5"><ArrowRight size={14} className="text-slate-300" /></div>
                  <div className="flex-1 space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 ml-1">Dự kiến đến</label>
                    <div className="relative" ref={arrivalTimePickerRef}>
                      <button type="button" onClick={() => setShowArrivalTimePicker(!showArrivalTimePicker)} className={`w-full flex items-center justify-between px-4 py-2.5 bg-white border rounded-xl text-xs font-bold text-slate-900 ${analyzingRoute ? 'animate-pulse border-indigo-200' : 'border-slate-200'}`}>
                        <span>{arrivalTime}</span><Clock size={14} className="text-indigo-400" />
                      </button>
                      {showArrivalTimePicker && <div className="absolute top-full right-0 z-[60] mt-2"><CustomTimePicker selectedTime={arrivalTime} onSelect={setArrivalTime} onClose={() => setShowArrivalTimePicker(false)} /></div>}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 ml-1">Loại xe</label>
                <select value={vehicle} onChange={(e) => setVehicle(e.target.value)} 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-900 outline-none">
                  <option>Sedan 4 chỗ</option>
                  <option>SUV 7 chỗ</option>
                  <option>Limousine 9 chỗ</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 ml-1">Ghế trống</label>
                <input type="number" value={seats} onChange={(e) => setSeats(parseInt(e.target.value))} min="1"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-900 outline-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 ml-1">Biển kiểm soát</label>
              <input 
                type="text" 
                value={licensePlate} 
                onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                placeholder="Ví dụ: 29A-XXXXX" 
                required
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-900 outline-none" 
              />
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-500 ml-1">Giá/Chỗ</label>
                <div className="flex flex-wrap gap-2">
                  {priceSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.value}
                      type="button"
                      onClick={() => setPrice(suggestion.value.toString())}
                      className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 transition-colors whitespace-nowrap"
                    >
                      {suggestion.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" size={20} />
                <input 
                  type="text" 
                  value={formatNumber(price)} 
                  onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))} 
                  placeholder="0" 
                  required 
                  className="w-full pl-12 pr-10 py-3 bg-white border-2 border-slate-100 rounded-2xl text-2xl font-black text-emerald-600 focus:border-emerald-500 outline-none text-right" 
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500 font-bold text-lg">đ</span>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2 disabled:opacity-70 mt-4"
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : <><Sparkles size={16} /> Xác nhận đăng chuyến</>}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default PostTrip;