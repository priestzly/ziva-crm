'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PanelLayout } from '@/components/DashboardShell';
import {
  Button, IconButton, Card, PageHeader, Badge, Field, Input, Select,
  SearchInput, Segmented, LoadingState, EmptyState, ErrorBanner, Sheet,
} from '@/components/ui';
import RouteGuard from '@/components/RouteGuard';
import { useAuth } from '@/context/AuthContext';
import { supabase, type Profile, type Mall } from '@/lib/supabase';
import {
  Users, UserPlus, Shield, Building2, Trash2, Edit3, Check, AlertCircle, CheckCircle2, RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

function UsersContent() {
  const { profile: currentAdmin } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [malls, setMalls] = useState<Mall[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'client'>('all');
  
  // Create User Modal
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '', full_name: '', role: 'client', mall_id: '' });
  const [creating, setCreating] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [editForm, setEditForm] = useState({ full_name: '', mall_id: '', password: '' });
  const [infoMsg, setInfoMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const initialLoadDone = useRef(false);
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  /**
   * ENHANCED FAILSAFE FETCH PATTERN
   */
  const fetchData = useCallback(async (isRefresh = false) => {
    if (!initialLoadDone.current) setLoading(true);
    if (isRefresh) {
      setIsRefreshing(true);
      setFetchError(null);
    }
    
    try {
      const [profRes, mallsRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('malls').select('*').order('name'),
      ]);

      if (profRes.error) throw profRes.error;
      if (mallsRes.error) throw mallsRes.error;

      setProfiles(profRes.data || []);
      setMalls(mallsRes.data || []);
      initialLoadDone.current = true;
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setFetchError(`Veri çekilemedi: ${err.message || 'Bilinmeyen hata'}`);
    } finally {
      setLoading(false);
      if (isRefresh) setIsRefreshing(false);
    }
  }, []);

  const setupSubscription = useCallback(() => {
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }

    const sub = supabase.channel('user-malls-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'malls' }, () => fetchData(true))
      .subscribe((status: string) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('Users Realtime error, retrying...');
          setTimeout(() => setupSubscription(), 3000);
        }
      });

    subscriptionRef.current = sub;
    return sub;
  }, [fetchData]);

  const visibilityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchData();
    setupSubscription();

    const handleVisibility = () => {
      if (visibilityTimeoutRef.current) clearTimeout(visibilityTimeoutRef.current);

      if (document.visibilityState === 'visible') {
        visibilityTimeoutRef.current = setTimeout(() => {
          fetchData(true);
          setupSubscription();
        }, 500);
      } else {
        if (subscriptionRef.current) {
          supabase.removeChannel(subscriptionRef.current);
          subscriptionRef.current = null;
        }
      }
    };
    
    window.addEventListener('focus', handleVisibility);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (visibilityTimeoutRef.current) clearTimeout(visibilityTimeoutRef.current);
      window.removeEventListener('focus', handleVisibility);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [fetchData, setupSubscription]);

  const handleDeleteUser = async (profile: Profile) => {
    if (profile.role === 'admin') {
      alert('Admin hesabı bu panelden silinemez.');
      return;
    }
    if (!confirm(`${profile.full_name || profile.email} kullanıcısını silmek istediğinize emin misiniz?`)) return;
    
    const { error } = await supabase.from('profiles').delete().eq('id', profile.id);
    if (!error) fetchData(true);
  };

  const handleEditClick = (p: Profile) => {
    setEditingProfile(p);
    setEditForm({ full_name: p.full_name || '', mall_id: p.mall_id || '', password: '' });
    setInfoMsg(null);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile) return;
    setCreating(true);
    try {
      const { error: profileError } = await supabase.from('profiles').update({
        full_name: editForm.full_name,
        mall_id: editForm.mall_id || null
      }).eq('id', editingProfile.id);

      if (profileError) throw profileError;

      if (editForm.password.trim()) {
        const res = await fetch('/api/admin/update-user-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: editingProfile.id, password: editForm.password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Şifre güncellenemedi');
      }

      setInfoMsg({ type: 'success', text: 'Profil başarıyla güncellendi' });
      setEditingProfile(null);
      fetchData(true);
    } catch (err: any) {
      setInfoMsg({ type: 'error', text: err.message });
    } finally {
      setCreating(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setInfoMsg(null);
    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });
      const data = await res.json();
      if (!res.ok) { 
        setInfoMsg({ type: 'error', text: data.error || 'Kullanıcı oluşturulamadı' }); 
      } else { 
        setInfoMsg({ type: 'success', text: 'Kullanıcı başarıyla oluşturuldu' }); 
        setShowAddUser(false); 
        setNewUser({ username: '', password: '', full_name: '', role: 'client', mall_id: '' }); 
        fetchData(true);
      }
    } catch (err) { 
      setInfoMsg({ type: 'error', text: 'Bir hata oluştu' }); 
    } finally { 
      setCreating(false); 
    }
  };

  const filteredProfiles = profiles.filter(p => 
    p.email.toLowerCase().includes(search.toLowerCase()) || 
    p.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  const visibleProfiles = filteredProfiles.filter(p => roleFilter === 'all' || p.role === roleFilter);
  const adminCount = profiles.filter(p => p.role === 'admin').length;

  const mallName = (id: string | null | undefined) => malls.find(m => m.id === id)?.name;

  return (
    <PanelLayout
      role="admin"
      title="Kullanıcılar"
      subtitle={isRefreshing ? 'Yenileniyor…' : `${profiles.length} kullanıcı · ${adminCount} yönetici`}
    >
      <PageHeader
        title="Kullanıcı yönetimi"
        description="Panel hesaplarını, rollerini ve bağlı oldukları AVM’leri yönetin."
        actions={
          <>
            <IconButton icon={RefreshCw} label="Yenile" variant="secondary" onClick={() => fetchData(true)} className={cn(isRefreshing && '[&_svg]:animate-spin')} />
            <Button icon={UserPlus} onClick={() => { setInfoMsg(null); setShowAddUser(true); }}>Kullanıcı ekle</Button>
          </>
        }
      />

      {fetchError && <ErrorBanner message={fetchError} onRetry={() => fetchData(true)} className="mb-4" />}

      {infoMsg && <InfoMessage msg={infoMsg} className="mb-4" />}

      <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Kullanıcı adı veya isim ara…" className="sm:max-w-sm sm:flex-1" />
        <Segmented
          value={roleFilter}
          onChange={setRoleFilter}
          options={[
            { value: 'all', label: 'Tümü' },
            { value: 'admin', label: 'Yönetici' },
            { value: 'client', label: 'Müşteri' },
          ]}
          className="self-start sm:self-auto"
        />
      </div>

      {loading && !initialLoadDone.current ? (
        <LoadingState />
      ) : visibleProfiles.length === 0 ? (
        <Card>
          <EmptyState
            icon={Users}
            title={search || roleFilter !== 'all' ? 'Eşleşen kullanıcı yok' : 'Henüz kullanıcı yok'}
            description={search || roleFilter !== 'all' ? 'Farklı bir arama veya filtre deneyin.' : 'İlk hesabı “Kullanıcı ekle” ile oluşturun.'}
          />
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden md:block overflow-x-auto">
            <table className="p-table">
              <thead>
                <tr>
                  <th>Kullanıcı</th>
                  <th>Rol</th>
                  <th>Bağlı AVM</th>
                  <th className="text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {visibleProfiles.map(p => {
                  const mall = mallName(p.mall_id);
                  return (
                    <tr key={p.id}>
                      <td>
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar name={p.full_name || p.email} />
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">{p.full_name || '—'}</p>
                            <p className="text-xs text-muted-foreground truncate">{p.email.split('@')[0]}</p>
                          </div>
                        </div>
                      </td>
                      <td><RoleBadge role={p.role} /></td>
                      <td>
                        {mall ? (
                          <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
                            <Building2 size={14} className="text-muted-foreground shrink-0" /> {mall}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">Bağımsız</span>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <IconButton icon={Edit3} label="Düzenle" size="sm" onClick={() => handleEditClick(p)} />
                          <IconButton
                            icon={Trash2}
                            label={p.role === 'admin' ? 'Yönetici hesabı silinemez' : 'Sil'}
                            size="sm"
                            disabled={p.role === 'admin'}
                            className="hover:!text-destructive disabled:opacity-40"
                            onClick={() => handleDeleteUser(p)}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {visibleProfiles.map(p => {
              const mall = mallName(p.mall_id);
              return (
                <Card key={p.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar name={p.full_name || p.email} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground truncate">{p.full_name || '—'}</p>
                      <p className="text-xs text-muted-foreground truncate">{p.email.split('@')[0]}</p>
                    </div>
                    <div className="flex items-center gap-1 -mr-1.5 -mt-1">
                      <IconButton icon={Edit3} label="Düzenle" size="sm" onClick={() => handleEditClick(p)} />
                      <IconButton
                        icon={Trash2}
                        label={p.role === 'admin' ? 'Yönetici hesabı silinemez' : 'Sil'}
                        size="sm"
                        disabled={p.role === 'admin'}
                        className="hover:!text-destructive disabled:opacity-40"
                        onClick={() => handleDeleteUser(p)}
                      />
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border flex items-center justify-between gap-3">
                    <RoleBadge role={p.role} />
                    <span className={cn('inline-flex items-center gap-1.5 text-xs truncate', mall ? 'text-foreground' : 'text-muted-foreground')}>
                      <Building2 size={13} className="text-muted-foreground shrink-0" /> {mall || 'Bağımsız'}
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Create user */}
      <Sheet
        isOpen={showAddUser}
        onClose={() => setShowAddUser(false)}
        title="Kullanıcı ekle"
        description="Yeni bir müşteri hesabı oluşturun."
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAddUser(false)}>Vazgeç</Button>
            <Button type="submit" form="create-user-form" icon={UserPlus} loading={creating}>Hesabı oluştur</Button>
          </>
        }
      >
        <form id="create-user-form" onSubmit={handleCreateUser} className="space-y-4">
          {infoMsg?.type === 'error' && <InfoMessage msg={infoMsg} />}
          <Field label="Ad soyad" required>
            <Input
              value={newUser.full_name} onChange={e => setNewUser({...newUser, full_name: e.target.value})}
              placeholder="Örn: Mehmet Yılmaz" required
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Field label="Kullanıcı adı" required hint="Küçük harf, rakam, . _ -">
              <Input
                value={newUser.username}
                onChange={e => {
                  const val = e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, '');
                  setNewUser({...newUser, username: val});
                }}
                placeholder="kullanici" autoComplete="off" required
              />
            </Field>
            <Field label="Şifre" required>
              <Input
                type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})}
                placeholder="••••••••" autoComplete="new-password" required
              />
            </Field>
          </div>
          <Field label="Bağlı AVM" hint="İsteğe bağlı. Seçilmezse hesap bağımsız kalır.">
            <Select value={newUser.mall_id} onChange={e => setNewUser({...newUser, mall_id: e.target.value})}>
              <option value="">AVM seçilmedi (bağımsız)</option>
              {malls.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </Select>
          </Field>
        </form>
      </Sheet>

      {/* Edit user / change password */}
      <Sheet
        isOpen={!!editingProfile}
        onClose={() => setEditingProfile(null)}
        title="Kullanıcıyı düzenle"
        description={editingProfile ? `Hesap: ${editingProfile.email}` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditingProfile(null)}>Vazgeç</Button>
            <Button type="submit" form="edit-user-form" icon={CheckCircle2} loading={creating}>Değişiklikleri kaydet</Button>
          </>
        }
      >
        {editingProfile && (
          <form id="edit-user-form" onSubmit={handleUpdateUser} className="space-y-4">
            {infoMsg?.type === 'error' && <InfoMessage msg={infoMsg} />}
            <Field label="Ad soyad" required>
              <Input
                value={editForm.full_name} onChange={e => setEditForm({...editForm, full_name: e.target.value})}
                placeholder="Ad soyad" required
              />
            </Field>
            <Field label="Bağlı AVM">
              <Select value={editForm.mall_id} onChange={e => setEditForm({...editForm, mall_id: e.target.value})}>
                <option value="">AVM seçilmedi (bağımsız)</option>
                {malls.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </Select>
            </Field>
            <Field label="Yeni şifre" hint="Boş bırakılırsa mevcut şifre değişmez.">
              <Input
                type="password" value={editForm.password} onChange={e => setEditForm({...editForm, password: e.target.value})}
                placeholder="••••••••" autoComplete="new-password"
              />
            </Field>
          </form>
        )}
      </Sheet>
    </PanelLayout>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w.charAt(0).toLocaleUpperCase('tr-TR'))
    .join('') || '?';
  return (
    <span className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold flex items-center justify-center shrink-0">
      {initials}
    </span>
  );
}

function RoleBadge({ role }: { role: Profile['role'] }) {
  return role === 'admin'
    ? <Badge tone="primary" icon={Shield}>Yönetici</Badge>
    : <Badge tone="neutral">Müşteri</Badge>;
}

function InfoMessage({ msg, className }: { msg: { type: 'success' | 'error'; text: string }; className?: string }) {
  const ok = msg.type === 'success';
  return (
    <div
      role={ok ? 'status' : 'alert'}
      className={cn(
        'flex items-center gap-3 rounded-xl border px-4 py-3 text-sm',
        ok ? 'border-success/25 bg-success/10 text-success' : 'border-destructive/25 bg-destructive/10 text-destructive',
        className
      )}
    >
      {ok ? <Check size={18} className="shrink-0" /> : <AlertCircle size={18} className="shrink-0" />}
      <span className="flex-1">{msg.text}</span>
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <RouteGuard requiredRole="admin">
      <UsersContent />
    </RouteGuard>
  );
}
