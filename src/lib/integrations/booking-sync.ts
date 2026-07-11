// Booking.com API Integration
// Syncs reservations from Booking.com to the system

export interface BookingComReservation {
  reservationId: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  roomId: string;
  checkInDate: string;
  checkOutDate: string;
  status: string;
  totalPrice: number;
  currency: string;
}

const API_URL = import.meta.env.VITE_BOOKING_COM_API_URL;
const API_KEY = import.meta.env.VITE_BOOKING_COM_API_KEY;

export async function fetchBookingComReservations(
  propertyId: string,
  startDate: string,
  endDate: string,
): Promise<BookingComReservation[]> {
  if (!API_KEY || !API_URL) {
    console.warn('Booking.com API not configured');
    return [];
  }

  try {
    const params = new URLSearchParams({
      property_id: propertyId,
      start_date: startDate,
      end_date: endDate,
      fields: 'id,guest_name,guest_email,guest_phone,room_id,checkin,checkout,status,total_price,currency',
    });

    const response = await fetch(`${API_URL}/reservations?${params}`, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Booking.com API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.reservations || [];
  } catch (error) {
    console.error('Booking.com sync error:', error);
    return [];
  }
}

export async function syncBookingComReservation(
  booking: BookingComReservation,
  createFn: (reservation: any) => Promise<void>,
): Promise<void> {
  const reservation = {
    id: booking.reservationId,
    quarto: parseInt(booking.roomId, 10),
    hospede_nome: booking.guestName,
    hospede_email: booking.guestEmail,
    hospede_telefone: booking.guestPhone,
    checkin: booking.checkInDate,
    checkout: booking.checkOutDate,
    valor_total: booking.totalPrice,
    valor_pago: booking.status === 'confirmed' ? booking.totalPrice : 0,
    status: booking.status === 'confirmed' ? 'ocupado' : 'reservado',
    origem: 'booking.com',
    observacoes: `Sincronizado do Booking.com em ${new Date().toISOString()}`,
  };

  await createFn(reservation);
}
