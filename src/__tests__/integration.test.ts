import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

describe('Supabase Connection', () => {
  it('should connect to Supabase', async () => {
    const { data, error } = await supabase.auth.getSession();
    expect(error).toBeNull();
  });

  it('should have valid URL and key', () => {
    expect(import.meta.env.VITE_SUPABASE_URL).toBeDefined();
    expect(import.meta.env.VITE_SUPABASE_ANON_KEY).toBeDefined();
  });
});

describe('Database Tables', () => {
  it('should fetch users table', async () => {
    const { data, error } = await supabase.from('usuarios').select('*').limit(1);
    expect(error).toBeNull();
  });

  it('should fetch rooms table', async () => {
    const { data, error } = await supabase.from('rooms').select('*').limit(1);
    expect(error).toBeNull();
  });

  it('should fetch reservations table', async () => {
    const { data, error } = await supabase.from('reservations').select('*').limit(1);
    expect(error).toBeNull();
  });
});

describe('Authentication', () => {
  it('should have getSession method', async () => {
    const { data, error } = await supabase.auth.getSession();
    expect(error).toBeNull();
  });

  it('should have signUp method', () => {
    expect(supabase.auth.signUp).toBeDefined();
  });

  it('should have signIn method', () => {
    expect(supabase.auth.signInWithPassword).toBeDefined();
  });
});

describe('Permissions', () => {
  it('should have canAccess function', () => {
    const { canAccess } = require('@/lib/permissions');
    expect(canAccess).toBeDefined();
  });

  it('admin should access all resources', () => {
    const { canAccess } = require('@/lib/permissions');
    expect(canAccess('admin', 'usuarios', 'view')).toBe(true);
    expect(canAccess('admin', 'reservas', 'delete')).toBe(true);
  });

  it('recepcionista should have limited access', () => {
    const { canAccess } = require('@/lib/permissions');
    expect(canAccess('recepcionista', 'reservas', 'view')).toBe(true);
    expect(canAccess('recepcionista', 'usuarios', 'view')).toBe(false);
  });
});
