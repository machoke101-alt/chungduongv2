import React, { useState, useEffect, useCallback } from 'react';
import Layout from './components/Layout.tsx';
import Dashboard from './components/Dashboard.tsx';
import SearchTrips from './components/SearchTrips.tsx';
import PostTrip from './components/PostTrip.tsx';
import BookingsList from './components/BookingsList.tsx';
import ProfileManagement from './components/ProfileManagement.tsx';
import AdminPanel from './components/AdminPanel.tsx';
import BookingModal from './components/BookingModal.tsx';
import AuthModal from './components/AuthModal.tsx';
import TripManagement from './components/TripManagement.tsx';
import OrderManagement from './components/OrderManagement.tsx';
import { Trip, Booking, TripStatus, Notification, Profile } from './types.ts';
import { supabase } from './lib/supabase.ts';
import { getTripStatusDisplay } from './components/SearchTrips.tsx';

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
    if (!userId) return;
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
    if (!userId) return;
    const { data, error } = await supabase
      .from('bookings')
      .select('*, trips(*)')
      .eq('passenger_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("Error fetching bookings:", error);
      return;
    }
    setBookings(data || []);
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
    if (!userId) return;
    const { count: tripsCount } = await supabase.from('trips').select('*', { count: 'exact', head: true }).eq('driver_id', userId);
    const { count: bookingsCount } = await supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('passenger_id', userId);
    setUserStats({ tripsCount: tripsCount || 0, bookingsCount: bookingsCount || 0 });
  }, []);

  const refreshAllData = useCallback(() => {
    fetchTrips();
    if (user?.id) {
      fetchUserBookings(user.id);
      fetchUserStats(user.id);
      if (profile) fetchStaffBookings(profile);
    }
  }, [fetchTrips, fetchUserBookings, fetchStaffBookings, fetchUserStats, user?.id, profile]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const session = data?.session;
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
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

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [fetchTrips, fetchProfile]);

  useEffect(() => {
    if (user?.id) {
      fetchUserBookings(user.id);
      fetchUserStats(user.id);
    }
  }, [user?.id, fetchUserBookings, fetchUserStats]);

  useEffect(() => {
    if (profile) {
      fetchStaffBookings(profile);
    }
  }, [profile, fetchStaffBookings]);

  useEffect(() => {
    const channel = supabase.channel('app-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, () => fetchTrips())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, (payload) => {
        fetchTrips();
        if (user?.id) {
          fetchUserBookings(user.id);
          fetchUserStats(user.id);
          if (profile) fetchStaffBookings(profile);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTrips, fetchUserBookings, fetchStaffBookings, fetchUserStats, user?.id, profile]);

  // Background worker để tự động cập nhật trạng thái chuyến đi
  useEffect(() => {
    const interval = setInterval(async () => {
      const now = new Date();
      let hasGlobalChanges = false;

      for (const trip of trips) {
        if (trip.status === TripStatus.CANCELLED || trip.status === TripStatus.COMPLETED) continue;

        const departure = new Date(trip.departure_time);
        const arrival = trip.arrival_time ? new Date(trip.arrival_time) : new Date(departure.getTime() + 3 * 60 * 60 * 1000);
        
        let targetStatus = trip.status;

        if (now > arrival) {
          targetStatus = TripStatus.COMPLETED;
        } else if (now >= departure && now <= arrival) {
          targetStatus = TripStatus.ON_TRIP;
        } else {
          const diffMins = Math.floor((departure.getTime() - now.getTime()) / 60000);
          if (diffMins <= 60 && diffMins > 0) {
            targetStatus = TripStatus.PREPARING;
          }
        }

        if (targetStatus !== trip.status) {
          hasGlobalChanges = true;
          await supabase.from('trips').update({ status: targetStatus }).eq('id', trip.id);
        }
      }

      if (hasGlobalChanges) fetchTrips();
    }, 30000);

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
        arrival_time: t.arrivalTime,
        price: t.price,
        seats: t.seats,
        available_seats: t.availableSeats,
        vehicle_info: t.vehicleInfo,
        status: TripStatus.PREPARING 
      }));
      
      const { error } = await supabase.from('trips').insert(formattedTrips);
      if (error) throw error;
      
      refreshAllData();
      setActiveTab('manage-trips');
    } catch (err: any) {
      alert('Lỗi khi đăng chuyến: ' + err.message);
    }
  };

  const handleConfirmBooking = async (data: { phone: string; seats: number; note: string }) => {
    if (!selectedTrip || !user) return;
    const { data: latestTrip } = await supabase.from('trips').select('available_seats, status').eq('id', selectedTrip.id).single();
    
    if (latestTrip && (latestTrip.status === TripStatus.CANCELLED || latestTrip.status === TripStatus.COMPLETED)) {
      alert('Xin lỗi, chuyến xe này không còn khả dụng.');
      return;
    }

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
      const newAvailable = (latestTrip?.available_seats || 0) - data.seats;
      if (newAvailable === 0) {
        await supabase.from('trips').update({ status: TripStatus.FULL }).eq('id', selectedTrip.id);
      }
      setIsBookingModalOpen(false);
      refreshAllData();
      setActiveTab('bookings');
    }
  };

  const handleOpenBookingModal = (tripId: string) => {
    if (!user) { setIsAuthModalOpen(true); return; }
    const trip = trips.find(t => t.id === tripId);
    if (trip) { 
      const statusLabel = getTripStatusDisplay(trip).label;
      if (statusLabel !== 'Chờ' && statusLabel !== 'Chuẩn bị') {
        alert('Chuyến xe này hiện không thể nhận thêm khách.');
        return;
      }
      setSelectedTrip(trip); 
      setIsBookingModalOpen(true); 
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return profile && ['admin', 'manager', 'driver'].includes(profile.role) ? <Dashboard bookings={staffBookings} trips={trips} /> : <SearchTrips trips={trips} onBook={handleOpenBookingModal} />;
      case 'search': return <SearchTrips trips={trips} onBook={handleOpenBookingModal} />;
      case 'post': return <PostTrip onPost={handlePostTrip} />;
      case 'bookings': return <BookingsList bookings={bookings} trips={trips} onRefresh={refreshAllData} />;
      case 'manage-trips': return <TripManagement profile={profile} trips={trips} bookings={staffBookings} onRefresh={fetchTrips} />;
      case 'manage-orders': return <OrderManagement profile={profile} trips={trips} onRefresh={refreshAllData} />;
      case 'profile': return (
        <ProfileManagement 
          profile={profile} 
          onUpdate={() => user && fetchProfile(user.id)} 
          stats={userStats} 
          allTrips={trips}
          userBookings={bookings}
        />
      );
      case 'admin': return profile?.role === 'admin' ? <AdminPanel /> : <SearchTrips trips={trips} onBook={handleOpenBookingModal} />;
      default: return null;
    }
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