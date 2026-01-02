
import React, { useState, useEffect, useCallback } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import SearchTrips from './components/SearchTrips';
import PostTrip from './components/PostTrip';
import BookingsList from './components/BookingsList';
import ProfileManagement from './components/ProfileManagement';
import AdminPanel from './components/AdminPanel';
import AIAssistant from './components/AIAssistant';
import BookingModal from './components/BookingModal';
import AuthModal from './components/AuthModal';
import TripManagement from './components/TripManagement';
import OrderManagement from './components/OrderManagement';
import { Trip, Booking, TripStatus, Notification, Profile } from './types';
import { supabase } from './lib/supabase';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('search');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [staffBookings, setStaffBookings] = useState<Booking[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userStats, setUserStats] = useState({ tripsCount: 0, bookingsCount: 0 });
  
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) setProfile(data);
  }, []);

  const fetchTrips = useCallback(async () => {
    const { data, error } = await supabase
      .from('trips')
      .select('*, profiles(full_name)')
      .order('departure_time', { ascending: true });
    
    if (error) return;

    if (data) {
      const formatted = data.map(t => ({
        ...t,
        driver_name: t.profiles?.full_name || 'Tài xế ẩn danh',
        trip_code: `#TRP-${t.id.substring(0, 5).toUpperCase()}`
      }));
      setTrips(formatted);
    }
  }, []);

  const fetchUserBookings = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('bookings')
      .select('*, trips(*)')
      .eq('passenger_id', userId)
      .order('created_at', { ascending: false });
    if (data) setBookings(data || []);
  }, []);

  const fetchStaffBookings = useCallback(async (userProfile: Profile) => {
    if (!userProfile) return;
    
    let query = supabase
      .from('bookings')
      .select('*, profiles:passenger_id(full_name, phone)');

    if (userProfile.role === 'driver') {
      const { data: myTrips } = await supabase.from('trips').select('id').eq('driver_id', userProfile.id);
      const myTripIds = myTrips?.map(t => t.id) || [];
      if (myTripIds.length > 0) {
        query = query.in('trip_id', myTripIds);
      } else {
        setStaffBookings([]);
        return;
      }
    }

    const { data } = await query.order('created_at', { ascending: false });
    setStaffBookings(data || []);
  }, []);

  const fetchUserStats = useCallback(async (userId: string) => {
    const { count: tripsCount } = await supabase.from('trips').select('*', { count: 'exact', head: true }).eq('driver_id', userId);
    const { count: bookingsCount } = await supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('passenger_id', userId);
    setUserStats({ tripsCount: tripsCount || 0, bookingsCount: bookingsCount || 0 });
  }, []);

  const refreshAllData = useCallback(() => {
    fetchTrips();
    if (user && profile) {
      fetchUserBookings(user.id);
      fetchStaffBookings(profile);
      fetchUserStats(user.id);
    }
  }, [fetchTrips, fetchUserBookings, fetchStaffBookings, fetchUserStats, user, profile]);

  const addNotification = (title: string, message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    const newNotif: Notification = {
      id: Math.random().toString(36).substr(2, 9),
      title, message, type,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  // Logic tự động cập nhật trạng thái dựa trên thời gian thực
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      let hasChanges = false;

      trips.forEach(async (trip) => {
        const departure = new Date(trip.departure_time);
        // Giả định chuyến đi mất 3 tiếng
        const completionTime = new Date(departure.getTime() + 3 * 60 * 60 * 1000);

        // 1. CHUẨN BỊ/FULL -> ĐANG ĐI (Khi đến giờ)
        if ((trip.status === TripStatus.PREPARING || trip.status === TripStatus.FULL) && now >= departure && now < completionTime) {
          hasChanges = true;
          await supabase.from('trips').update({ status: TripStatus.ON_TRIP }).eq('id', trip.id);
        }
        // 2. ĐANG ĐI -> HOÀN THÀNH (Sau 3 tiếng)
        else if (trip.status === TripStatus.ON_TRIP && now >= completionTime) {
          hasChanges = true;
          await supabase.from('trips').update({ status: TripStatus.COMPLETED }).eq('id', trip.id);
        }
      });

      if (hasChanges) fetchTrips();
    }, 60000); // Kiểm tra mỗi phút

    return () => clearInterval(interval);
  }, [trips, fetchTrips]);

  const handlePostTrip = async (tripsToPost: any[]) => {
    if (!user) return;
    
    try {
      const formattedTrips = tripsToPost.map(t => ({
        driver_id: user.id,
        origin_name: t.origin.name,
        origin_desc: t.origin.description,
        dest_name: t.destination.name,
        dest_desc: t.destination.description,
        departure_time: t.departureTime,
        price: t.price,
        seats: t.seats,
        available_seats: t.availableSeats,
        vehicle_info: t.vehicleInfo,
        status: TripStatus.PREPARING
      }));

      const { error } = await supabase.from('trips').insert(formattedTrips);
      
      if (error) throw error;

      addNotification('Thành công', `Đã đăng ${formattedTrips.length} chuyến xe mới!`, 'success');
      refreshAllData();
      setActiveTab('manage-trips');
    } catch (err: any) {
      alert('Lỗi khi đăng chuyến: ' + err.message);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchProfile(currentUser.id);
      } else {
        setProfile(null);
        setBookings([]);
        setStaffBookings([]);
        setUserStats({ tripsCount: 0, bookingsCount: 0 });
      }
    });

    fetchTrips();

    const channel = supabase.channel('app-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, () => fetchTrips())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, (payload) => {
        fetchTrips();
        if (user && profile) {
          fetchUserBookings(user.id);
          fetchStaffBookings(profile);
          
          if (payload.eventType === 'UPDATE' && payload.new && (payload.new as any).passenger_id === user.id) {
            const newBooking = payload.new as any;
            if (newBooking.status === 'CONFIRMED') {
              addNotification('Thành công', 'Đơn hàng của bạn đã được tài xế xác nhận!', 'success');
            } else if (newBooking.status === 'REJECTED') {
              addNotification('Thông báo', 'Rất tiếc, đơn hàng của bạn đã bị từ chối.', 'warning');
            }
          }
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [fetchTrips, fetchProfile, fetchUserBookings, fetchStaffBookings, fetchUserStats, user?.id, profile?.id]);

  useEffect(() => {
    if (profile) {
       fetchUserBookings(profile.id);
       fetchStaffBookings(profile);
       fetchUserStats(profile.id);
    }
  }, [profile, fetchUserBookings, fetchStaffBookings, fetchUserStats]);

  const handleConfirmBooking = async (data: { phone: string; seats: number; note: string }) => {
    if (!selectedTrip || !user) return;

    const { data: latestTrip } = await supabase.from('trips').select('available_seats').eq('id', selectedTrip.id).single();
    if (latestTrip && latestTrip.available_seats < data.seats) {
      alert(`Rất tiếc! Chuyến xe hiện chỉ còn ${latestTrip.available_seats} ghế.`);
      fetchTrips();
      return;
    }

    const { data: newBooking, error: bookingError } = await supabase.from('bookings').insert({
      trip_id: selectedTrip.id,
      passenger_id: user.id,
      passenger_phone: data.phone,
      seats_booked: data.seats,
      total_price: selectedTrip.price * data.seats,
      status: 'PENDING'
    }).select().single();

    if (bookingError) {
      alert('Lỗi đặt chỗ: ' + bookingError.message);
    } else {
      // Tự động chuyển trạng thái chuyến xe sang FULL nếu hết ghế
      const newAvailable = latestTrip.available_seats - data.seats;
      if (newAvailable === 0) {
        await supabase.from('trips').update({ status: TripStatus.FULL }).eq('id', selectedTrip.id);
      }

      const bCode = `#ORD-${newBooking.id.substring(0, 5).toUpperCase()}`;
      addNotification('Thành công', `Đặt chỗ thành công! Mã đơn: ${bCode}`, 'success');
      setIsBookingModalOpen(false);
      refreshAllData();
      setActiveTab('bookings');
    }
  };

  const isStaff = profile?.role === 'admin' || profile?.role === 'manager' || profile?.role === 'driver';

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return isStaff ? <Dashboard bookings={staffBookings} trips={trips} /> : <SearchTrips trips={trips} onBook={handleOpenBookingModal} />;
      case 'search': return <SearchTrips trips={trips} onBook={handleOpenBookingModal} />;
      case 'post': return <PostTrip onPost={handlePostTrip} />;
      case 'bookings': return <BookingsList bookings={bookings} trips={trips} onRefresh={refreshAllData} />;
      case 'manage-trips': return <TripManagement profile={profile} trips={trips} bookings={staffBookings} onRefresh={fetchTrips} />;
      case 'manage-orders': return <OrderManagement profile={profile} trips={trips} onRefresh={refreshAllData} />;
      case 'profile': return <ProfileManagement profile={profile} onUpdate={() => user && fetchProfile(user.id)} stats={userStats} />;
      case 'admin': return profile?.role === 'admin' ? <AdminPanel /> : <SearchTrips trips={trips} onBook={handleOpenBookingModal} />;
      default: return null;
    }
  };

  const handleOpenBookingModal = (tripId: string) => {
    if (!user) { setIsAuthModalOpen(true); return; }
    const trip = trips.find(t => t.id === tripId);
    if (trip) { setSelectedTrip(trip); setIsBookingModalOpen(true); }
  };

  return (
    <>
      <Layout 
        activeTab={activeTab} setActiveTab={setActiveTab} 
        notifications={notifications} clearNotification={(id) => setNotifications(n => n.filter(x => x.id !== id))}
        profile={profile}
        onLoginClick={() => setIsAuthModalOpen(true)}
      >
        <div className="animate-slide-up">
          {renderContent()}
        </div>
      </Layout>
      <AIAssistant />
      {selectedTrip && (
        <BookingModal 
          trip={selectedTrip} 
          profile={profile} 
          isOpen={isBookingModalOpen} 
          onClose={() => setIsBookingModalOpen(false)} 
          onConfirm={handleConfirmBooking} 
        />
      )}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} onSuccess={() => refreshAllData()} />
    </>
  );
};

export default App;
