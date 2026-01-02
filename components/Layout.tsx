
import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Search, PlusCircle, Ticket, Bell, LogOut, Car, LogIn, Settings, ClipboardList, ShoppingBag, Users as UsersIcon, User, X, ChevronUp, MoreHorizontal, Shield
} from 'lucide-react';
import { Notification, Profile } from '../types';
import { supabase } from '../lib/supabase';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  notifications: Notification[];
  clearNotification: (id: string) => void;
  profile?: Profile | null;
  onLoginClick: () => void;
}

const RoadAnimation = () => {
  const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  return (
    <div className="hidden md:block flex-1 max-w-md mx-8">
      <div className="road-container">
        <div className="road-line-v2"></div>
        <div className="absolute inset-0 flex justify-between items-center px-4 z-0">
          {days.map((day, i) => (
            <div key={i} className="day-container flex flex-col items-center gap-1 group cursor-default">
              <div className="day-dot"></div>
              <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter group-hover:text-emerald-600 transition-colors">
                {day}
              </span>
            </div>
          ))}
        </div>
        
        <div className="animated-car-v2 flex items-center">
          <div className="car-trail"></div>
          <div className="car-body">
            <Car size={12} fill="currentColor" fillOpacity={0.2} />
          </div>
        </div>
      </div>
    </div>
  );
};

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, notifications, clearNotification, profile, onLoginClick }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showManageMenu, setShowManageMenu] = useState(false);
  
  const isStaff = profile?.role === 'admin' || profile?.role === 'manager' || profile?.role === 'driver';

  useEffect(() => {
    setShowManageMenu(false);
  }, [activeTab]);

  const navItems = [
    { id: 'search', label: 'Tìm Chuyến', icon: Search },
    { id: 'bookings', label: 'Lịch sử chuyến', icon: Ticket },
  ];

  const manageItems = [
    { id: 'dashboard', label: 'Thống kê', icon: LayoutDashboard, roles: ['admin', 'manager', 'driver'] },
    { id: 'manage-trips', label: 'Chuyến Xe', icon: ClipboardList, roles: ['admin', 'manager', 'driver'] },
    { id: 'manage-orders', label: 'Đơn Hàng', icon: ShoppingBag, roles: ['admin', 'manager', 'driver'] },
    { id: 'admin', label: 'Hệ thống', icon: Shield, roles: ['admin'] },
  ];

  const allPossibleItems = [
    ...navItems, 
    ...manageItems, 
    { id: 'post', label: 'Đăng Chuyến', icon: PlusCircle },
    { id: 'profile', label: 'Hồ Sơ', icon: User }
  ];

  const activeItem = allPossibleItems.find(item => item.id === activeTab);
  const ActiveIcon = activeItem?.icon || Car;
  const activeLabel = activeItem?.label || 'Chung đường';

  const isManageTabActive = ['dashboard', 'manage-trips', 'manage-orders', 'admin'].includes(activeTab);

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden flex-col lg:flex-row">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex flex-col w-72 bg-white border-r border-slate-100 p-8 shrink-0">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="bg-emerald-600 p-2.5 rounded-2xl shadow-lg shadow-emerald-100">
            <Car className="text-white w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900 italic font-outfit">
            Chung đường<span className="text-emerald-600 not-italic">.</span>
          </span>
        </div>
        
        <nav className="flex-1 space-y-1.5 overflow-y-auto custom-scrollbar pr-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-4 px-3">Cá nhân</p>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${
                activeTab === item.id ? 'bg-emerald-50 text-emerald-600 font-semibold' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <item.icon size={18} className={activeTab === item.id ? 'text-emerald-600' : 'text-slate-400 group-hover:text-emerald-600'} />
              <span className="text-sm">{item.label}</span>
            </button>
          ))}

          {isStaff && (
            <>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mt-8 mb-4 px-3">Điều hành</p>
              {manageItems.filter(item => item.roles.includes(profile?.role || '')).map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${
                    activeTab === item.id ? 'bg-emerald-50 text-emerald-600 font-semibold' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <item.icon size={18} className={activeTab === item.id ? 'text-emerald-600' : 'text-slate-400 group-hover:text-emerald-600'} />
                  <span className="text-sm">{item.label}</span>
                </button>
              ))}
              <button
                onClick={() => setActiveTab('post')}
                className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${
                  activeTab === 'post' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100 font-semibold' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <PlusCircle size={18} className={activeTab === 'post' ? 'text-white' : 'text-slate-400 group-hover:text-emerald-600'} />
                <span className="text-sm">Đăng Chuyến Mới</span>
              </button>
            </>
          )}
        </nav>

        <div className="mt-auto pt-6">
          {profile ? (
            <div className="bg-slate-50 border border-slate-100 p-4 rounded-3xl space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-emerald-600 font-bold text-base shadow-sm border border-slate-100">
                  {profile.full_name?.charAt(0) || 'U'}
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-xs font-bold text-slate-800 truncate leading-tight">{profile.full_name}</p>
                  <p className="text-[9px] font-semibold text-emerald-500 uppercase tracking-widest mt-1">{profile.role}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setActiveTab('profile')} className="flex-1 py-2 bg-white text-slate-400 rounded-xl hover:text-emerald-600 border border-slate-100 flex items-center justify-center gap-2 transition-colors"><Settings size={12} /><span className="text-[9px] font-bold uppercase">Hồ sơ</span></button>
                <button onClick={() => supabase.auth.signOut()} className="p-2 bg-white text-slate-400 rounded-xl hover:text-rose-600 border border-slate-100 transition-all"><LogOut size={14} /></button>
              </div>
            </div>
          ) : (
            <button onClick={onLoginClick} className="w-full flex items-center justify-center gap-3 py-4 bg-slate-900 text-white rounded-[20px] font-bold text-sm shadow-xl hover:bg-emerald-600 transition-all"><LogIn size={18} />Đăng nhập</button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-0 overflow-hidden relative">
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-4 sm:px-8 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="lg:hidden bg-emerald-600 p-2 rounded-xl shadow-lg shadow-emerald-100">
              <Car className="text-white w-4 h-4" />
            </div>
            <div className="flex items-center gap-2.5">
              <ActiveIcon size={20} className="text-emerald-600 shrink-0" />
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight truncate max-w-[180px] font-outfit uppercase">
                {activeLabel}
              </h2>
            </div>
          </div>

          <RoadAnimation />

          <div className="flex items-center gap-2">
            <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 sm:p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-50 rounded-xl transition-all relative">
              <Bell size={20} />
              {notifications.filter(n => !n.read).length > 0 && <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[8px] font-bold flex items-center justify-center rounded-full border-2 border-white">{notifications.filter(n => !n.read).length}</span>}
            </button>
            <div className="h-8 w-px bg-slate-100 mx-1"></div>
            {profile ? (
              <button onClick={() => setActiveTab('profile')} className="flex items-center gap-2 p-1.5 bg-slate-50 border border-slate-100 rounded-xl">
                <div className="h-7 w-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white text-[10px] font-bold">{profile.full_name?.charAt(0) || 'U'}</div>
                <div className="hidden sm:block text-left"><p className="text-[11px] font-bold text-slate-800 leading-none">{profile.full_name}</p></div>
              </button>
            ) : (
              <button onClick={onLoginClick} className="p-2 text-emerald-600 bg-emerald-50 rounded-xl transition-colors"><LogIn size={20} /></button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-10 pb-28 lg:pb-10 custom-scrollbar">
          {children}
        </div>

        {/* Mobile Management Drawer */}
        {showManageMenu && (
          <div className="lg:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] animate-in fade-in duration-300" onClick={() => setShowManageMenu(false)}>
            <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[40px] p-8 pb-32 animate-in slide-in-from-bottom-10 duration-500 shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-8">
                <div>
                   <h3 className="text-xl font-bold text-slate-900 uppercase italic font-outfit">Điều hành</h3>
                   <p className="text-slate-400 text-xs font-medium">Lựa chọn công cụ điều phối</p>
                </div>
                <button onClick={() => setShowManageMenu(false)} className="p-3 bg-slate-100 text-slate-400 rounded-2xl hover:bg-rose-50 hover:text-rose-600 transition-all"><X size={20} /></button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {manageItems.filter(item => item.roles.includes(profile?.role || '')).map(item => (
                  <button
                    key={item.id}
                    onClick={() => { setActiveTab(item.id); setShowManageMenu(false); }}
                    className={`flex flex-col items-center gap-3 p-6 rounded-[32px] border transition-all ${
                      activeTab === item.id 
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xl shadow-emerald-100' 
                      : 'bg-slate-50 text-slate-500 border-slate-100'
                    }`}
                  >
                    <item.icon size={28} />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-center">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Bottom Navigation Mobile */}
        <nav className="lg:hidden fixed bottom-6 left-4 right-4 z-[70]">
          <div className="bg-white/90 backdrop-blur-xl border border-white/40 shadow-2xl rounded-[32px] px-2 py-2 flex items-center justify-around">
            <button onClick={() => setActiveTab('search')} className={`flex flex-col items-center gap-1 p-3 flex-1 transition-all ${activeTab === 'search' ? 'text-emerald-600' : 'text-slate-400'}`}>
              <Search size={22} className={activeTab === 'search' ? 'scale-110' : ''} />
              <span className="text-[9px] font-bold uppercase tracking-widest">Tìm kiếm</span>
              {activeTab === 'search' && <div className="w-1 h-1 bg-emerald-600 rounded-full mt-0.5"></div>}
            </button>

            <button onClick={() => setActiveTab('bookings')} className={`flex flex-col items-center gap-1 p-3 flex-1 transition-all ${activeTab === 'bookings' ? 'text-emerald-600' : 'text-slate-400'}`}>
              <Ticket size={22} className={activeTab === 'bookings' ? 'scale-110' : ''} />
              <span className="text-[9px] font-bold uppercase tracking-widest">Lịch sử</span>
              {activeTab === 'bookings' && <div className="w-1 h-1 bg-emerald-600 rounded-full mt-0.5"></div>}
            </button>

            {isStaff && (
              <button onClick={() => setActiveTab('post')} className={`flex flex-col items-center justify-center h-16 w-16 bg-emerald-600 text-white rounded-[24px] shadow-lg shadow-emerald-100 -translate-y-4 scale-110 active:scale-95 transition-all ${activeTab === 'post' ? 'ring-4 ring-emerald-100' : ''}`}>
                <PlusCircle size={26} />
              </button>
            )}

            {isStaff && (
               <button onClick={() => setShowManageMenu(true)} className={`flex flex-col items-center gap-1 p-3 flex-1 transition-all ${isManageTabActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                <LayoutDashboard size={22} className={isManageTabActive ? 'scale-110' : ''} />
                <span className="text-[9px] font-bold uppercase tracking-widest">Quản lý</span>
                {isManageTabActive && <div className="w-1 h-1 bg-emerald-600 rounded-full mt-0.5"></div>}
              </button>
            )}

            <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1 p-3 flex-1 transition-all ${activeTab === 'profile' ? 'text-emerald-600' : 'text-slate-400'}`}>
              <User size={22} className={activeTab === 'profile' ? 'scale-110' : ''} />
              <span className="text-[9px] font-bold uppercase tracking-widest">Hồ sơ</span>
              {activeTab === 'profile' && <div className="w-1 h-1 bg-emerald-600 rounded-full mt-0.5"></div>}
            </button>
          </div>
        </nav>
      </main>
    </div>
  );
};

export default Layout;
