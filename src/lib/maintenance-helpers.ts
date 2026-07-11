// Maintenance Status Helpers

export type MaintenanceStatus = 'disponivel' | 'manutencao' | 'limpeza';

export interface MaintenanceWindow {
  id: string;
  quarto: number;
  status: MaintenanceStatus;
  motivo: string;
  data_inicio: string;
  data_fim: string;
  responsavel?: string;
  observacoes?: string;
  created_at: string;
}

export function getMaintenanceStatusLabel(status: MaintenanceStatus): string {
  const labels: Record<MaintenanceStatus, string> = {
    disponivel: 'Disponível',
    manutencao: 'Manutenção',
    limpeza: 'Limpeza',
  };
  return labels[status];
}

export function getMaintenanceStatusColor(status: MaintenanceStatus): string {
  const colors: Record<MaintenanceStatus, string> = {
    disponivel: 'sage',
    manutencao: 'brick',
    limpeza: 'brass',
  };
  return colors[status];
}

export function isRoomUnderMaintenance(
  quartoNumero: number,
  maintenanceWindows: MaintenanceWindow[],
  date: string = new Date().toISOString().split('T')[0],
): boolean {
  return maintenanceWindows.some(
    (m) =>
      m.quarto === quartoNumero &&
      m.status !== 'disponivel' &&
      m.data_inicio <= date &&
      m.data_fim >= date,
  );
}
