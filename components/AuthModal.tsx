
import React, { useState, useEffect, useRef } from 'react';
import { X, Mail, Lock, User, Phone, Loader2, LogIn, UserPlus, Smartphone, History, Trash2, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const RECENT_LOGINS_KEY = 'tripease_recent_logins';

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [identifier, setIdentifier] = useState('0825846888'); 
  const [password, setPassword] = useState('123123');
  const [fullName, setFullName] = useState('');
  const [recentLogins, setRecentLogins] = useState<string[]>([]);
  
  const autoLoginAttempted = useRef(false);

  useEffect(() => {
    const saved = localStorage.getItem(RECENT_LOGINS_KEY);
    if (saved) {
      try {
        setRecentLogins(JSON.parse(saved));
      } catch (e) {
        setRecentLogins([]);
      }
    }
  }, [isOpen]);

  // Tự động đăng nhập NGAY LẬP TỨC khi mở modal nếu là tài khoản test
  useEffect(() => {
    if (isOpen && isLogin && identifier === '0825846888' && !autoLoginAttempted.current) {
      autoLoginAttempted.current = true;
      // Thực hiện đăng nhập ngay không cần chờ đợi lâu
      handleAuth(new Event('submit') as any);
    }
  }, [isOpen]);

  const saveToRecent = (val: string) => {
    const updated = [val, ...recentLogins.filter(i => i !== val)].slice(0, 3);
    setRecentLogins(updated);
    localStorage.setItem(RECENT_LOGINS_KEY, JSON.stringify(updated));
  };

  const clearRecent = (val: string) => {
    const updated = recentLogins.filter(i => i !== val);
    setRecentLogins(updated);
    localStorage.setItem(RECENT_LOGINS_KEY, JSON.stringify(updated));
  };

  if (!isOpen) return null;

  const isEmail = (val: string) => val.includes('@');

  const formatPhoneNumber = (phoneStr: string) => {
    let cleaned = phoneStr.trim().replace(/\s/g, '');
    if (cleaned.startsWith('0')) return '+84' + cleaned.substring(1);
    if (!cleaned.startsWith('+')) return '+84' + cleaned;
    return cleaned;
  };

  const handleAuth = async (e: React.FormEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const isMail = isEmail(identifier);
      const finalIdentifier = isMail ? identifier.trim() : formatPhoneNumber(identifier);

      if (isLogin) {
        const credentials = isMail 
          ? { email: finalIdentifier, password } 
          : { phone: finalIdentifier, password };
        
        const { error: authError } = await supabase.auth.signInWithPassword(credentials);
        if (authError) throw authError;
        
        saveToRecent(identifier);
      } else {
        const signUpData = isMail
          ? { email: finalIdentifier, password, options: { data: { full_name: fullName } } }
          : { phone: finalIdentifier, password, options: { data: { full_name: fullName, phone: identifier } } };

        const { error: authError } = await supabase.auth.signUp(signUpData);
        if (authError) throw authError;
        
        if (isMail) alert('Vui lòng kiểm tra email để xác nhận!');
        else {
          alert('Đăng ký thành công!');
          saveToRecent(identifier);
        }
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      autoLoginAttempted.current = false; 
      let errorMsg = err.message;
      if (errorMsg.includes('E.164')) errorMsg = 'Số điện thoại không đúng định dạng.';
      else if (errorMsg.includes('Invalid login credentials')) errorMsg = 'Thông tin đăng nhập không chính xác.';
      setError(errorMsg || 'Đã có lỗi xảy ra.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-500">
      <div className="bg-white w-full max-w-[400px] rounded-[32px] shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300">
        <div className="pt-10 pb-6 px-8 text-center relative">
          <button onClick={onClose} className="absolute right-6 top-6 p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-full hover:bg-slate-50">
            <X size={20} />
          </button>
          <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-50 rounded-2xl mb-4 border border-indigo-100 shadow-sm">
            <div className="w-7 h-7 rounded-full border-4 border-indigo-600 relative">
               <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-white"></div>
            </div>
          </div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight italic">
            {loading && identifier === '0825846888' ? 'Đang tự động đăng nhập...' : 'Chào mừng tới TripEase'}
          </h3>
          <p className="text-slate-500 text-xs mt-2 font-bold uppercase tracking-wider">Hệ thống xe tiện chuyến thông minh</p>
        </div>

        <div className="flex px-8 mb-8 relative">
          <button 
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-3 text-[11px] font-black uppercase tracking-widest transition-all relative z-10 ${isLogin ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Đăng nhập
            {isLogin && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-full animate-in slide-in-from-left-2"></div>}
          </button>
          <button 
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-3 text-[11px] font-black uppercase tracking-widest transition-all relative z-10 ${!isLogin ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Đăng ký
            {!isLogin && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-full animate-in slide-in-from-right-2"></div>}
          </button>
          <div className="absolute bottom-0 left-8 right-8 h-px bg-slate-100"></div>
        </div>

        <form onSubmit={handleAuth} className="px-8 pb-10 space-y-4">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-[10px] font-black uppercase tracking-tight text-center">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tài khoản</label>
            <input 
              type="text" required value={identifier} onChange={(e) => setIdentifier(e.target.value)}
              className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-400 focus:bg-white outline-none font-bold text-slate-800 transition-all text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mật khẩu</label>
            <input 
              type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-400 focus:bg-white outline-none font-bold text-slate-800 transition-all text-sm"
            />
          </div>

          <button 
            type="submit" disabled={loading}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-[0.98] mt-6"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : (isLogin ? 'ĐĂNG NHẬP NGAY' : 'TẠO TÀI KHOẢN')}
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AuthModal;
