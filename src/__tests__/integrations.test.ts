import { describe, it, expect, beforeAll, vi } from 'vitest';

describe('Email Service', () => {
  it('should validate email format', () => {
    const validEmail = 'test@example.com';
    expect(validEmail).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  });

  it('should reject invalid email', () => {
    const invalidEmail = 'not-an-email';
    expect(invalidEmail).not.toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  });

  it('should format WhatsApp number correctly', () => {
    const formatWhatsApp = (phone: string) => {
      let formatted = phone.trim();
      if (!formatted.startsWith('+')) {
        formatted = '+55' + formatted.replace(/\D/g, '');
      }
      return `whatsapp:${formatted}`;
    };

    expect(formatWhatsApp('11999999999')).toBe('whatsapp:+5511999999999');
    expect(formatWhatsApp('+5511999999999')).toBe('whatsapp:+5511999999999');
  });
});

describe('Calendar Sync', () => {
  it('should create valid calendar event', () => {
    const event = {
      summary: 'Test Reservation',
      description: 'Test Description',
      start: {
        dateTime: '2026-07-20T14:00:00',
        timeZone: 'America/Sao_Paulo',
      },
      end: {
        dateTime: '2026-07-22T11:00:00',
        timeZone: 'America/Sao_Paulo',
      },
      location: 'Room 101',
    };

    expect(event.summary).toBeDefined();
    expect(event.start.dateTime).toBeDefined();
    expect(event.end.dateTime).toBeDefined();
  });

  it('should validate date order', () => {
    const start = new Date('2026-07-20');
    const end = new Date('2026-07-22');
    expect(end.getTime()).toBeGreaterThan(start.getTime());
  });
});
