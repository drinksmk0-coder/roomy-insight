// ============================================================================
// INTEGRAÇÃO: useSendNotification Hook
// ============================================================================
// Hook React para enviar notificações via Edge Functions
// Uso simplificado nas componentes
// ============================================================================

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface SendEmailPayload {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

interface SendWhatsAppPayload {
  to: string;
  body: string;
  mediaUrl?: string;
}

interface SyncCalendarPayload {
  summary: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  attendeeEmail?: string;
}

export function useSendEmail() {
  return useMutation({
    mutationFn: async (payload: SendEmailPayload) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) throw new Error("Usuário não autenticado");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao enviar email");
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("Email enviado com sucesso");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao enviar email");
    },
  });
}

export function useSendWhatsApp() {
  return useMutation({
    mutationFn: async (payload: SendWhatsAppPayload) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) throw new Error("Usuário não autenticado");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-whatsapp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao enviar WhatsApp");
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("WhatsApp enviado com sucesso");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao enviar WhatsApp");
    },
  });
}

export function useSyncCalendar() {
  return useMutation({
    mutationFn: async (payload: SyncCalendarPayload) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) throw new Error("Usuário não autenticado");

      // Obter Google token do usuário (requer Google OAuth)
      // Este é um exemplo - você precisa implementar Google OAuth
      const googleToken = localStorage.getItem("google_access_token");
      if (!googleToken) {
        throw new Error("Conecte com Google Calendar primeiro");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-calendar`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            event: {
              summary: payload.summary,
              description: payload.description,
              start: {
                dateTime: `${payload.startDate}T14:00:00`,
                timeZone: "America/Sao_Paulo",
              },
              end: {
                dateTime: `${payload.endDate}T11:00:00`,
                timeZone: "America/Sao_Paulo",
              },
              location: payload.location,
              attendees: payload.attendeeEmail
                ? [{ email: payload.attendeeEmail }]
                : undefined,
            },
            calendarId: "primary",
            accessToken: googleToken,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao sincronizar calendar");
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("Evento criado no Google Calendar");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao sincronizar calendar");
    },
  });
}

// ============================================================================
// EXEMPLO DE USO EM COMPONENTE
// ============================================================================

/*
import { useSendEmail, useSendWhatsApp, useSyncCalendar } from '@/lib/integrations/use-send-notification';

function ReservaConfirmada({ reserva }) {
  const sendEmail = useSendEmail();
  const sendWhatsApp = useSendWhatsApp();
  const syncCalendar = useSyncCalendar();

  const handleConfirm = async () => {
    // 1. Enviar email
    await sendEmail.mutateAsync({
      to: reserva.hospede_email,
      subject: 'Reserva Confirmada',
      html: generateReservationEmail(reserva),
    });

    // 2. Enviar WhatsApp
    if (reserva.hospede_telefone) {
      await sendWhatsApp.mutateAsync({
        to: reserva.hospede_telefone,
        body: formatReservationMessage(reserva),
      });
    }

    // 3. Sincronizar Google Calendar
    await syncCalendar.mutateAsync({
      summary: `Reserva - Quarto ${reserva.quarto}`,
      description: `Hóspede: ${reserva.hospede_nome}`,
      startDate: reserva.checkin,
      endDate: reserva.checkout,
      location: `Quarto ${reserva.quarto}`,
      attendeeEmail: reserva.hospede_email,
    });
  };

  return (
    <button onClick={handleConfirm} disabled={sendEmail.isPending}>
      {sendEmail.isPending ? 'Enviando...' : 'Confirmar e Notificar'}
    </button>
  );
}
*/
