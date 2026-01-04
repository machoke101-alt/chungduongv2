
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Shield, Search, Phone, Loader2, ArrowUpDown, Trash2, ChevronDown, Check, Car, Ticket, Trophy, Star, Medal, Zap, CalendarDays, User, Settings, ShieldAlert } from 'lucide-react';
import { Profile, UserRole } from '../types.ts';
import { supabase } from '../lib/supabase.ts';
import CopyableCode from './CopyableCode.tsx';
import { UnifiedDropdown } from './SearchTrips.tsx';

type SortConfig = { key: string; direction: 'asc' | 'desc' | null };

interface UserWithStats extends Profile {
  trips_count: number;
  bookings_count: number;
  created_at?: string;
}

const getStatBadge = (count: number, type: 'trip' | 'booking') => {
  const Icon = type === 'trip' ? Car : Ticket;
  if (count >= 10) return { bg: 'bg-rose-600 text-white border-rose-700 shadow-sm ring-1 ring-rose-200', icon: <Trophy size={10} className="animate-pulse" />, label: 'Elite' };
  if (count >= 8) return { bg: 'bg-amber-100 text-amber-700 border-amber-200', icon: <Medal size={10} />, label: 'Expert' };
  if (count >= 5) return { bg: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: <Star size={10} />, label: 'Pro' };
  if (count >= 3) return { bg: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <Zap size={10} />, label: 'Active' };
  if (count >= 1) return { bg: 'bg-blue-100 text-blue-700 border-blue-200', icon: <Icon size={10} />, label: 'User' };
  return { bg: 'bg-slate-50 text-slate-400 border-slate-100', icon: <Icon size={10} className="opacity-40" />, label: 'New' };
};

const RoleSelector = ({ value, onChange, disabled }: { value: UserRole, onChange: (role: UserRole) => void, disabled?: boolean }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const roles: { label: string, value: UserRole, icon: any, color: string }[] = [
    { label: 'Quản trị', value: 'admin', icon: Shield, color: 'text-rose-600 bg-rose-50' },
    { label: 'Điều hành', value: 'manager', icon: Settings, color: 'text-indigo-600 bg-indigo-50' },
    { label: 'Tài xế', value: 'driver', icon: Car, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Thành viên', value: 'user', icon: User, color: 'text-slate-600 bg-slate-50' },
  ];
  const currentRole = roles.find(r => r.value === value) || roles[3];

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
        className={`w-full flex items-center justify-between px-3 py-2 bg-white border rounded-xl transition-all duration-300 relative z-10 ${isOpen ? 'ring-2 ring-indigo-100 border-indigo-400 shadow-sm' : 'border-slate-200 hover:border-slate-300'}`}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <currentRole.icon size={12} className={currentRole.color.split(' ')[0]} />
          <span className={`text-[11px] font-bold truncate ${currentRole.color.split(' ')[0]}`}>{currentRole.label}</span>
        </div>
        <ChevronDown size={12} className={`text-slate-400 transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute top-full mt-1 right-0 w-44 bg-white rounded-2xl shadow-[0_15px_50px_rgba(0,0,0,0.2)] border border-slate-100 z-[999] p-1 animate-in fade-in zoom-in-95 duration-150">
          <div className="space-y-0.5">
            {roles.map((role) => (
              <button key={role.value} type="button" 
                onClick={(e) => { e.stopPropagation(); onChange(role.value); setIsOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${value === role.value ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-50 text-slate-600'}`}>
                <div className="flex items-center gap-3">
                  <role.icon size={12} className={value === role.value ? 'text-white' : role.color.split(' ')[0]} />
                  <span className="text-[11px] font-bold">{role.label}</span>
                </div>
                {value === role.value && <Check size={12} className="text-white" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'full_name', direction: 'asc' });

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: profiles, error: profileError } = await supabase.from('profiles').select('*').order('full_name', { ascending: true });
      if (profileError) throw profileError;
      const { data: trips } = await supabase.from('trips').select('driver_id');
      const { data: bookings } = await supabase.from('bookings').select('passenger_id');
      const userStats = (profiles || []).map(p => ({
        ...p,
        trips_count: trips?.filter(t => t.driver_id === p.id).length || 0,
        bookings_count: bookings?.filter(b => b.passenger_id === p.id).length || 0
      }));
      setUsers(userStats);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleSort = (key: string) => {
    let direction: SortConfig['direction'] = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    else if (sortConfig.key === key && sortConfig.direction === 'desc') direction = null;
    setSortConfig({ key, direction });
  };

  const filteredUsers = useMemo(() => {
    let filtered = users.filter(u => {
      const matchesSearch = u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || u.phone?.includes(searchTerm);
      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
    if (sortConfig.key && sortConfig.direction) {
      filtered.sort((a: any, b: any) => {
        const valA = a[sortConfig.key] || 0;
        const valB = b[sortConfig.key] || 0;
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return filtered;
  }, [users, searchTerm, roleFilter, sortConfig]);

  const handleUpdateRole = async (userId: string, newRole: UserRole) => {
    setUpdatingId(userId);
    try {
      const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err: any) { alert(err.message); } finally { setUpdatingId(null); }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!window.confirm(`Xoá người dùng "${userName}"?`)) return;
    setDeletingId(userId);
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', userId);
      if (error) throw error;
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err: any) { alert(err.message); } finally { setDeletingId(null); }
  };

  const SortHeader = ({ label, sortKey, width, textAlign = 'text-left' }: { label: string, sortKey: string, width?: string, textAlign?: string }) => (
    <th style={{ width }} className={`px-4 py-4 text-[11px] font-bold text-slate-400 tracking-widest cursor-pointer hover:bg-slate-100/50 transition-colors ${textAlign}`} onClick={() => handleSort(sortKey)}>
      <div className={`flex items-center gap-1.5 ${textAlign === 'text-center' ? 'justify-center' : textAlign === 'text-right' ? 'justify-end' : ''}`}>
        {label}
        <ArrowUpDown size={10} className={`${sortConfig.key === sortKey ? 'text-indigo-600' : 'opacity-20'}`} />
      </div>
    </th>
  );

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="bg-white p-4 rounded-[28px] border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input type="text" placeholder="Tìm thành viên..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white outline-none text-sm font-bold transition-all" />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <UnifiedDropdown label="Chức vụ" icon={Shield} value={roleFilter} onChange={setRoleFilter}
            options={[{label:'Tất cả', value:'ALL'}, {label:'Quản trị', value:'admin'}, {label:'Tài xế', value:'driver'}, {label:'Quản lý', value:'manager'}, {label:'Thành viên', value:'user'}]} />
          <button onClick={fetchUsers} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-all">
            <Loader2 className={loading ? 'animate-spin' : ''} size={16} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[28px] border border-slate-100 shadow-sm overflow-visible">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left table-fixed min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <SortHeader label="Thành viên" sortKey="full_name" width="22%" />
                <SortHeader label="Tham gia" sortKey="created_at" width="13%" />
                <SortHeader label="Liên hệ" sortKey="phone" width="16%" />
                <SortHeader label="Chuyến đăng" sortKey="trips_count" width="11%" textAlign="text-center" />
                <SortHeader label="Chuyến đi" sortKey="bookings_count" width="11%" textAlign="text-center" />
                <SortHeader label="Quyền hạn" sortKey="role" width="16%" textAlign="text-center" />
                <th className="px-4 py-4 text-[11px] font-bold text-slate-400 tracking-widest text-right pr-8">Xoá</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredUsers.map(user => {
                const tripBadge = getStatBadge(user.trips_count, 'trip');
                const bookingBadge = getStatBadge(user.bookings_count, 'booking');
                return (
                  <tr key={user.id} className="hover:bg-slate-50/30 transition-colors group/row">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-white flex items-center justify-center text-slate-500 font-black text-[11px] shrink-0 border border-slate-100 shadow-sm uppercase">{user.full_name?.charAt(0) || '?'}</div>
                        <div className="min-w-0">
                          <p className="text-[12px] font-black text-slate-800 truncate">{user.full_name}</p>
                          <CopyableCode code={`#${user.id.substring(0,4).toUpperCase()}`} className="text-[10px] font-bold text-indigo-400" />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                        <CalendarDays size={12} className="text-slate-300" />
                        {user.created_at ? new Date(user.created_at).toLocaleDateString('vi-VN') : '--/--/----'}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        {user.phone && (
                          <a href={`tel:${user.phone}`} className="w-6 h-6 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100 shrink-0" title="Gọi điện">
                             <Phone size={11} />
                          </a>
                        )}
                        {user.phone ? (
                           <CopyableCode 
                              code={user.phone} 
                              className="text-xs font-bold text-slate-600 group"
                              label={user.phone}
                           />
                        ) : (
                           <span className="text-slate-300 italic text-xs font-bold uppercase">N/A</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-all ${tripBadge.bg}`}>
                        {tripBadge.icon} <span className="text-[11px] font-black">{user.trips_count}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-all ${bookingBadge.bg}`}>
                        {bookingBadge.icon} <span className="text-[11px] font-black">{user.bookings_count}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex justify-center">
                        <div className="w-36 relative">
                          {updatingId === user.id ? <div className="flex items-center justify-center py-2 bg-slate-50 rounded-xl border border-slate-100"><Loader2 className="animate-spin text-indigo-500" size={14} /></div> : <RoleSelector value={user.role} onChange={(role) => handleUpdateRole(user.id, role)} />}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right pr-8">
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteUser(user.id, user.full_name); }} disabled={deletingId === user.id} className="p-2 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-600 hover:text-white transition-all border border-rose-100">
                        {deletingId === user.id ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
                      </button>
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
export default AdminPanel;
