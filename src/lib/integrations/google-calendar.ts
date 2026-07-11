// Google Calendar Integration
// Syncs reservations and maintenance windows with Google Calendar

import type { Reservation } from '@/lib/data';

const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
const API_KEY = import.meta.env.VITE_GOOGLE_CALENDAR_API_KEY;

export interface CalendarEvent {
  summary: string;
  description: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  location: string;
  attendees?: Array<{ email: string }>;
}

export async function syncReservationToCalendar(
  reservation: Reservation,
  calendarId: string = 'primary',
): Promise<void> {
  if (!API_KEY) {
    console.warn('Google Calendar API key not configured');
    return;
  }

  const event: CalendarEvent = {
    summary: `Reserva - Quarto ${reservation.quarto} (${reservation.hospede_nome || 'Sem nome'})`,
    description: `Reserva ID: ${reservation.id}\nStatus: ${reservation.status}\nValor: R$ ${reservation.valor_total || 0}`,
    start: { dateTime: `${reservation.checkin}T14:00:00`, timeZone: 'America/Sao_Paulo' },
    end: { dateTime: `${reservation.checkout}T11:00:00`, timeZone: 'America/Sao_Paulo' },
    location: `Quarto ${reservation.quarto}`,
  };

  try {
    const response = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/${calendarId}/events?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to sync to Google Calendar: ${response.statusText}`);
    }

    console.log('Reservation synced to Google Calendar');
  } catch (error) {
    console.error('Google Calendar sync error:', error);
  }
}

export async function syncMaintenanceWindow(
  quartoNumero: number,
  startDate: string,
  endDate: string,
  calendarId: string = 'primary',
): Promise<void> {
  if (!API_KEY) {
    console.warn('Google Calendar API key not configured');
    return;
  }

  const event: CalendarEvent = {
    summary: `🔧 Manutenção - Quarto ${quartoNumero}`,
    description: `Quarto em manutenção - indisponível para reservas`,
    start: { dateTime: `${startDate}T08:00:00`, timeZone: 'America/Sao_Paulo' },
    end: { dateTime: `${endDate}T18:00:00`, timeZone: 'America/Sao_Paulo' },
    location: `Quarto ${quartoNumero}`,
  };

  try {
    await fetch(`${GOOGLE_CALENDAR_API}/calendars/${calendarId}/events?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
  } catch (error) {
    console.error('Maintenance window sync error:', error);
  }
}
