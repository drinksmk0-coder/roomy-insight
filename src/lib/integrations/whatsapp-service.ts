// WhatsApp Integration (Twilio or similar service)
// Sends notifications about reservations, check-ins, and maintenance

export interface WhatsAppMessage {
  to: string;
  body: string;
  mediaUrl?: string;
}

const ACCOUNT_SID = import.meta.env.VITE_WHATSAPP_ACCOUNT_SID;
const API_KEY = import.meta.env.VITE_WHATSAPP_API_KEY;
const FROM_NUMBER = import.meta.env.VITE_WHATSAPP_PHONE_NUMBER;

export async function sendWhatsAppMessage(payload: WhatsAppMessage): Promise<void> {
  if (!API_KEY || !ACCOUNT_SID) {
    console.warn('WhatsApp API not configured');
    return;
  }

  try {
    const response = await fetch('/api/send-whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: payload.to,
        body: payload.body,
        mediaUrl: payload.mediaUrl,
      }),
    });

    if (!response.ok) {
      throw new Error(`WhatsApp send failed: ${response.statusText}`);
    }
  } catch (error) {
    console.error('WhatsApp service error:', error);
  }
}

export function formatReservationMessage(
  hospedeName: string,
  quartoNumero: number,
  checkin: string,
  checkout: string,
): string {
  const checkinDate = new Date(checkin).toLocaleDateString('pt-BR');
  const checkoutDate = new Date(checkout).toLocaleDateString('pt-BR');
  
  return `
🏨 *Confirmação de Reserva*

Olá ${hospedeName}!

Sua reserva foi confirmada:

🔑 Quarto: ${quartoNumero}
📅 Check-in: ${checkinDate}
📅 Check-out: ${checkoutDate}

Obrigado e bem-vindo! 🎉
  `.trim();
}

export function formatMaintenanceNotification(
  quartoNumero: number,
  motivo: string,
): string {
  return `
🔧 *Quarto em Manutenção*

O quarto ${quartoNumero} está em manutenção:

${motivo}

Por favor, não aloque este quarto para novas reservas.
  `.trim();
}

export function formatCheckoutReminder(
  quartoNumero: number,
  checkoutTime: string,
): string {
  return `
🔑 *Lembrete de Check-out*

Quarto ${quartoNumero}
Horário de check-out: ${checkoutTime}

Agradecemos a sua hospedagem!
  `.trim();
}
