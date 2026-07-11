// Email Service Integration (Gmail via Supabase Edge Functions)
// Sends confirmation emails, notifications, and reports

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Email send failed: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Email service error:', error);
    throw error;
  }
}

export function generateReservationConfirmationEmail(
  hospedeName: string,
  quartoNumero: number,
  checkin: string,
  checkout: string,
  valorTotal: number,
): string {
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Confirmação de Reserva</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2c3e50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8f9fa; padding: 20px; border: 1px solid #dee2e6; }
        .footer { background: #e9ecef; padding: 15px; text-align: center; font-size: 12px; color: #6c757d; border-radius: 0 0 8px 8px; }
        .detail-row { margin: 10px 0; }
        .detail-label { font-weight: bold; color: #2c3e50; }
        .btn { display: inline-block; background: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✓ Reserva Confirmada</h1>
        </div>
        <div class="content">
          <p>Olá <strong>${hospedeName}</strong>,</p>
          <p>Sua reserva foi confirmada com sucesso!</p>
          
          <div class="detail-row">
            <span class="detail-label">Quarto:</span> ${quartoNumero}
          </div>
          <div class="detail-row">
            <span class="detail-label">Check-in:</span> ${new Date(checkin).toLocaleDateString('pt-BR')}
          </div>
          <div class="detail-row">
            <span class="detail-label">Check-out:</span> ${new Date(checkout).toLocaleDateString('pt-BR')}
          </div>
          <div class="detail-row">
            <span class="detail-label">Valor Total:</span> R$ ${valorTotal.toFixed(2)}
          </div>
          
          <p style="margin-top: 20px; color: #666;">Obrigado por escolher nossa pousada! Esperamos vê-lo em breve.</p>
        </div>
        <div class="footer">
          <p>Pousada Real Cruzília - Sistema de Reservas</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function generateComplaintNotificationEmail(
  categoria: string,
  quartoNumero: number,
  descricao: string,
): string {
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Nova Reclamação Registrada</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .alert { background: #fff3cd; border: 1px solid #ffc107; color: #856404; padding: 15px; border-radius: 5px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>⚠️ Nova Reclamação Registrada</h2>
        <div class="alert">
          <p><strong>Categoria:</strong> ${categoria}</p>
          <p><strong>Quarto:</strong> ${quartoNumero}</p>
          <p><strong>Descrição:</strong></p>
          <p>${descricao}</p>
        </div>
        <p>Por favor, verifique o sistema para mais detalhes.</p>
      </div>
    </body>
    </html>
  `;
}
