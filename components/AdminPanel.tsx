
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Shield, Search, Phone, Loader2, ArrowUpDown, Trash2, ChevronDown, Check, Car, Ticket, Trophy, Star, Medal, Zap, CalendarDays } from 'lucide-react';
import { Profile, UserRole } from '../types';
import { supabase } from '../lib/supabase';
import CopyableCode from './CopyableCode';
import { UnifiedDropdown } from './SearchTrips';

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
  const roles: { label: string, value: UserRole, dot: string, text: string }[] = [
    { label: 'Admin', value: 'admin', dot: 'bg-rose-500', text: 'text-rose-600' },
    { label: 'Manager', value: 'manager', dot: 'bg-indigo-500', text: 'text-indigo-600' },
    { label: 'Driver', value: 'driver', dot: 'bg-emerald-500', text: 'text-emerald-600' },
    { label: 'User', value: 'user', dot: 'bg-slate-400', text: 'text-slate-600' },
  ];
  const currentRole = roles.find(r => r.value === value) || roles[3];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button type="button" disabled={disabled} onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3 py-1.5 bg-white border rounded-lg transition-all duration-300 ${isOpen ? 'ring-2 ring-indigo-100 border-indigo-400 shadow-sm' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}>
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${currentRole.dot}`}></div>
          <span className={`text-[9px] font-black uppercase tracking-wider ${currentRole.text}`}>{currentRole.label}</span>
        </div>
        <ChevronDown size={12} className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-white rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.15)] border border-slate-100 z-[100] p-1 animate-in fade-in zoom-in-95 duration-150">
          <div className="space-y-0.5">
            {roles.map((role) => (
              <button key={role.value} type="button" onClick={() => { onChange(role.value); setIsOpen(false); }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md transition-all ${value === role.value ? 'bg-indigo-600 text-white' : 'hover:bg-slate-50 text-slate-600'}`}>
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${role.dot} ${value === role.value ? 'bg-white' : ''}`}></div>
                  <span className="text-[9px] font-bold uppercase tracking-widest">{role.label}</span>
                </div>
                {value === role.value && <Check size={10} className="text-white" />}
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
      const userStats = profiles.map(p => ({
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
    <th style={{ width }} className={`px-3 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100/50 transition-colors ${textAlign}`} onClick={() => handleSort(sortKey)}>
      <div className={`flex items-center gap-1.5 ${textAlign === 'text-center' ? 'justify-center' : textAlign === 'text-right' ? 'justify-end' : ''}`}>
        {label}
        <ArrowUpDown size={10} className={`${sortConfig.key === sortKey ? 'text-indigo-600' : 'opacity-20'}`} />
      </div>
    </th>
  );

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="bg-white p-4 rounded-[20px] border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input type="text" placeholder="Tìm thành viên..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white outline-none text-[11px] font-bold transition-all" />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <UnifiedDropdown label="Chức vụ" icon={Shield} value={roleFilter} onChange={setRoleFilter}
            options={[{label:'Tất cả', value:'ALL'}, {label:'Admin', value:'admin'}, {label:'Tài xế', value:'driver'}, {label:'Quản lý', value:'manager'}, {label:'Thành viên', value:'user'}]} />
          <button onClick={fetchUsers} className="p-2 bg-slate-50 border border-slate-200 rounded-xl hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-all">
            <Loader2 className={loading ? 'animate-spin' : ''} size={14} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[20px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left table-fixed min-w-[900px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <SortHeader label="THÀNH VIÊN" sortKey="full_name" width="22%" />
                <SortHeader label="NGÀY GIA NHẬP" sortKey="created_at" width="12%" />
                <SortHeader label="LIÊN HỆ" sortKey="phone" width="15%" />
                <SortHeader label="CHUYẾN ĐĂNG" sortKey="trips_count" width="12%" textAlign="text-center" />
                <SortHeader label="CHUYẾN ĐI" sortKey="bookings_count" width="12%" textAlign="text-center" />
                <SortHeader label="QUYỀN HẠN" sortKey="role" width="15%" textAlign="text-center" />
                <th className="px-3 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right pr-6">XOÁ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredUsers.map(user => {
                const tripBadge = getStatBadge(user.trips_count, 'trip');
                const bookingBadge = getStatBadge(user.bookings_count, 'booking');
                return (
                  <tr key={user.id} className="hover:bg-slate-50/30 transition-colors group/row">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center text-slate-500 font-black text-[10px] shrink-0 border border-slate-100 shadow-sm">{user.full_name?.charAt(0) || '?'}</div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-slate-800 truncate">{user.full_name}</p>
                          <CopyableCode code={`#${user.id.substring(0,4).toUpperCase()}`} className="text-[8px] font-black text-indigo-400 uppercase tracking-tighter" />
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                        <CalendarDays size={10} className="text-slate-300" />
                        {user.created_at ? new Date(user.created_at).toLocaleDateString('vi-VN') : '--/--/----'}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600">
                        <Phone size={10} className="text-slate-400" />
                        {user.phone || <span className="text-slate-300 italic">N/A</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border transition-all ${tripBadge.bg}`}>
                        {tripBadge.icon} <span className="text-[9px] font-black">{user.trips_count}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border transition-all ${bookingBadge.bg}`}>
                        {bookingBadge.icon} <span className="text-[9px] font-black">{user.bookings_count}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex justify-center">
                        <div className="w-28 relative z-10">
                          {updatingId === user.id ? <div className="flex items-center justify-center py-1 bg-slate-50 rounded-lg border border-slate-100"><Loader2 className="animate-spin text-indigo-500" size={10} /></div> : <RoleSelector value={user.role} onChange={(role) => handleUpdateRole(user.id, role)} />}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right pr-6">
                      <button onClick={() => handleDeleteUser(user.id, user.full_name)} disabled={deletingId === user.id} className="p-1.5 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-600 hover:text-white transition-all border border-rose-100">
                        {deletingId === user.id ? <Loader2 className="animate-spin" size={12} /> : <Trash2 size={12} />}
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
