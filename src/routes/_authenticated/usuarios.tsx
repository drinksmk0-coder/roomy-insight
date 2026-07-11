import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/AppLayout';
import { Modal, Field, Badge, EmptyState } from '@/components/ui-kit';
import { getRoleLabel, type UserRole } from '@/lib/permissions';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const Route = createFileRoute('/_authenticated/usuarios')({
  component: Usuarios,
});

interface Usuario {
  id: string;
  email: string;
  nome: string;
  role: UserRole;
  ativo: boolean;
  created_at: string;
}

function Usuarios() {
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState<Usuario | null>(null);
  const qc = useQueryClient();

  // Fetch users
  const { data: usuarios = [] } = useQuery({
    queryKey: ['usuarios'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Usuario[];
    },
  });

  // Create user mutation
  const createMutation = useMutation({
    mutationFn: async (usuario: Omit<Usuario, 'id' | 'created_at'>) => {
      const { error } = await supabase.from('usuarios').insert(usuario);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios'] });
      toast.success('Usuário criado com sucesso');
      setOpenCreate(false);
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao criar usuário'),
  });

  // Update user mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Usuario> & { id: string }) => {
      const { error } = await supabase.from('usuarios').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios'] });
      toast.success('Usuário atualizado');
      setOpenEdit(null);
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao atualizar'),
  });

  // Delete user mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('usuarios').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios'] });
      toast.success('Usuário removido');
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao remover'),
  });

  return (
    <div>
      <PageHeader
        title="Gerenciamento de Usuários"
        subtitle="Crie e gerencie usuários com diferentes níveis de acesso"
        action={
          <button onClick={() => setOpenCreate(true)} className="btn-primary flex items-center gap-1.5">
            <Plus className="h-4 w-4" /> Novo Usuário
          </button>
        }
      />

      {usuarios.length === 0 ? (
        <EmptyState text="Nenhum usuário cadastrado" />
      ) : (
        <div className="space-y-2">
          {usuarios.map((u) => (
            <div key={u.id} className="card-surface flex items-center justify-between p-4">
              <div>
                <p className="font-semibold">{u.nome}</p>
                <p className="text-sm text-muted-foreground">{u.email}</p>
                <div className="mt-2 flex gap-2">
                  <Badge tone="slate">{getRoleLabel(u.role)}</Badge>
                  <Badge tone={u.ativo ? 'sage' : 'brick'}>{u.ativo ? 'Ativo' : 'Inativo'}</Badge>
                </div>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setOpenEdit(u)}
                  className="rounded-md bg-brass-bg px-2.5 py-1 text-xs font-semibold text-[oklch(0.4_0.06_74)]"
                >
                  <Edit2 className="h-3 w-3" />
                </button>
                <button
                  onClick={() => deleteMutation.mutate(u.id)}
                  className="rounded-md bg-brick-bg px-2.5 py-1 text-xs font-semibold text-red-700"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {openCreate && (
        <UsuarioForm
          onClose={() => setOpenCreate(false)}
          onSave={(usuario) => createMutation.mutate(usuario)}
        />
      )}

      {openEdit && (
        <UsuarioForm
          usuario={openEdit}
          onClose={() => setOpenEdit(null)}
          onSave={(usuario) => updateMutation.mutate({ ...openEdit, ...usuario })}
        />
      )}
    </div>
  );
}

function UsuarioForm({
  usuario,
  onClose,
  onSave,
}: {
  usuario?: Usuario;
  onClose: () => void;
  onSave: (usuario: any) => void;
}) {
  const [email, setEmail] = useState(usuario?.email || '');
  const [nome, setNome] = useState(usuario?.nome || '');
  const [role, setRole] = useState<UserRole>(usuario?.role || 'recepcionista');
  const [ativo, setAtivo] = useState(usuario?.ativo ?? true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !nome) {
      toast.error('Preencha todos os campos');
      return;
    }
    onSave({ email, nome, role, ativo });
  };

  return (
    <Modal onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <h2 className="text-lg font-semibold">{usuario ? 'Editar' : 'Novo'} Usuário</h2>
        <Field label="Email">
          <input
            type="email"
            className="field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={!!usuario}
          />
        </Field>
        <Field label="Nome">
          <input className="field" value={nome} onChange={(e) => setNome(e.target.value)} />
        </Field>
        <Field label="Cargo">
          <select className="field" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
            <option value="admin">Administrador</option>
            <option value="gerente">Gerente</option>
            <option value="recepcionista">Recepcionista</option>
            <option value="limpeza">Limpeza & Manutenção</option>
          </select>
        </Field>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
          <span className="text-sm">Usuário ativo</span>
        </label>
        <div className="flex gap-2">
          <button type="submit" className="btn-primary flex-1">
            Salvar
          </button>
          <button type="button" onClick={onClose} className="btn-ghost flex-1">
            Cancelar
          </button>
        </div>
      </form>
    </Modal>
  );
}
