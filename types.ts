
export type UserRole = 'admin' | 'manager' | 'driver' | 'user';

export interface Profile {
  id: string;
  full_name: string;
  phone: string;
  role: UserRole;
  avatar_url?: string;
  // Mã người dùng ngắn gọn để tra cứu nhanh
  user_code?: string; 
}

export enum TripStatus {
  PREPARING = 'PREPARING',     // Chuẩn bị khởi hành
  FULL = 'FULL',               // Đã full ghế
  ON_TRIP = 'ON_TRIP',         // Đang trong chuyến
  COMPLETED = 'COMPLETED',     // Hoàn thành
  CANCELLED = 'CANCELLED'      // Đã hủy
}

export interface Location {
  name: string;
  description?: string;
  mapsUrl?: string;
}

export interface Trip {
  id: string;
  driver_id: string;
  driver_name?: string;
  origin_name: string;
  origin_desc?: string;
  dest_name: string;
  dest_desc?: string;
  departure_time: string;
  arrival_time?: string; // Thời gian dự kiến đến (Mới)
  created_at?: string; // Thời gian tạo chuyến
  price: number;
  seats: number;
  available_seats: number;
  vehicle_info: string;
  status: TripStatus;
  // Mã chuyến xe ngắn gọn
  trip_code?: string;
}

export interface Booking {
  id: string;
  trip_id: string;
  passenger_id: string;
  passenger_phone: string;
  seats_booked: number;
  total_price: number;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED';
  created_at: string;
  trip_details?: Trip;
  // Mã đơn hàng định danh
  booking_code?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning';
  timestamp: string;
  read: boolean;
}
