import { describe, it, expect } from 'vitest';
import { canAccess, getRoleLabel } from '@/lib/permissions';

describe('RBAC - Permissions', () => {
  const roles = ['admin', 'gerente', 'recepcionista', 'limpeza'] as const;

  describe('Admin Access', () => {
    it('should have full access', () => {
      expect(canAccess('admin', 'usuarios', 'view')).toBe(true);
      expect(canAccess('admin', 'usuarios', 'create')).toBe(true);
      expect(canAccess('admin', 'usuarios', 'update')).toBe(true);
      expect(canAccess('admin', 'usuarios', 'delete')).toBe(true);
    });

    it('should manage all modules', () => {
      const modules = ['usuarios', 'quartos', 'reservas', 'vendas', 'reclamacoes', 'feedbacks', 'relatorios'];
      modules.forEach(module => {
        expect(canAccess('admin', module as any, 'view')).toBe(true);
      });
    });
  });

  describe('Gerente Access', () => {
    it('should have operational access', () => {
      expect(canAccess('gerente', 'quartos', 'view')).toBe(true);
      expect(canAccess('gerente', 'quartos', 'update')).toBe(true);
      expect(canAccess('gerente', 'usuarios', 'view')).toBe(false);
    });
  });

  describe('Recepcionista Access', () => {
    it('should have limited access', () => {
      expect(canAccess('recepcionista', 'reservas', 'view')).toBe(true);
      expect(canAccess('recepcionista', 'reservas', 'create')).toBe(true);
      expect(canAccess('recepcionista', 'usuarios', 'view')).toBe(false);
      expect(canAccess('recepcionista', 'vendas', 'delete')).toBe(false);
    });
  });

  describe('Limpeza Access', () => {
    it('should only view data', () => {
      expect(canAccess('limpeza', 'quartos', 'view')).toBe(true);
      expect(canAccess('limpeza', 'quartos', 'create')).toBe(false);
      expect(canAccess('limpeza', 'usuarios', 'view')).toBe(false);
    });
  });

  describe('Role Labels', () => {
    it('should return correct labels', () => {
      expect(getRoleLabel('admin')).toBe('Administrador');
      expect(getRoleLabel('gerente')).toBe('Gerente');
      expect(getRoleLabel('recepcionista')).toBe('Recepcionista');
      expect(getRoleLabel('limpeza')).toBe('Limpeza & Manutenção');
    });
  });
});
