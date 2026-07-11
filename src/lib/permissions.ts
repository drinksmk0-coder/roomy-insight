// Role-based access control (RBAC)

export type UserRole = 'admin' | 'gerente' | 'recepcionista' | 'limpeza';

export interface UserProfile {
  id: string;
  email: string;
  nome: string;
  role: UserRole;
  ativo: boolean;
  pousada_id: string;
  created_at: string;
}

type Permission = 'view' | 'create' | 'update' | 'delete';
type Resource = 'usuarios' | 'quartos' | 'reservas' | 'vendas' | 'reclamacoes' | 'feedbacks' | 'relatorios';

const ROLE_PERMISSIONS: Record<UserRole, Record<Resource, Permission[]>> = {
  admin: {
    usuarios: ['view', 'create', 'update', 'delete'],
    quartos: ['view', 'create', 'update', 'delete'],
    reservas: ['view', 'create', 'update', 'delete'],
    vendas: ['view', 'create', 'update', 'delete'],
    reclamacoes: ['view', 'create', 'update', 'delete'],
    feedbacks: ['view'],
    relatorios: ['view', 'create'],
  },
  gerente: {
    usuarios: ['view'],
    quartos: ['view', 'update'],
    reservas: ['view', 'create', 'update'],
    vendas: ['view', 'create', 'update'],
    reclamacoes: ['view', 'update'],
    feedbacks: ['view'],
    relatorios: ['view', 'create'],
  },
  recepcionista: {
    usuarios: [],
    quartos: ['view'],
    reservas: ['view', 'create', 'update'],
    vendas: ['view', 'create'],
    reclamacoes: ['view', 'create'],
    feedbacks: [],
    relatorios: [],
  },
  limpeza: {
    usuarios: [],
    quartos: ['view'],
    reservas: ['view'],
    vendas: [],
    reclamacoes: ['view'],
    feedbacks: [],
    relatorios: [],
  },
};

export function canAccess(
  userRole: UserRole,
  resource: Resource,
  permission: Permission,
): boolean {
  const permissions = ROLE_PERMISSIONS[userRole]?.[resource] ?? [];
  return permissions.includes(permission);
}

export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    admin: 'Administrador',
    gerente: 'Gerente',
    recepcionista: 'Recepcionista',
    limpeza: 'Limpeza & Manutenção',
  };
  return labels[role];
}
