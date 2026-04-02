'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Sidebar, Topbar } from '@/components/DashboardShell';
import RouteGuard from '@/components/RouteGuard';
import { useAuth } from '@/context/AuthContext';
import { supabase, type Profile, type Mall } from '@/lib/supabase';
import { 
  Users, UserPlus, Search, Loader2, Shield, Building2, Mail, 
  Trash2, Edit3, X, Check, ShieldAlert, KeyRound, UserCheck, AlertCircle,
  MoreVertical, CheckCircle2, RefreshCw
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

  return (
    <div className="min-h-screen flex">
      <Sidebar role="admin" />
      <main className="flex-1 lg:ml-72 transition-all duration-500">
        <Topbar 
          title="Kullanıcı Yönetimi" 
          subtitle={isRefreshing ? 'Yenileniyor...' : 'Sistem erişimlerini ve rolleri yönetin'} 
        />

        <div className="p-6 lg:p-8 space-y-6 max-w-[1200px] mx-auto">
          {/* Error Banner */}
          {fetchError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center justify-between gap-4 animate-fade-in shadow-lg shadow-red-500/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center text-red-500">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-red-400">Veri Bağlantı Sorunu</p>
                  <p className="text-xs text-red-400/70">{fetchError}</p>
                </div>
              </div>
              <button 
                onClick={() => fetchData(true)}
                className="px-4 py-2 bg-red-500 text-white rounded-xl text-xs font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
              >
                Tekrar Dene
              </button>
            </div>
          )}

          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Profiller</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Müşteri hesaplarını buradan direkt oluşturun</p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => fetchData(true)}
                className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors text-muted-foreground group"
                title="Yenile"
              >
                <RefreshCw size={18} className={cn("transition-transform duration-500", isRefreshing && "animate-spin")} />
              </button>
              <button 
                onClick={() => { setInfoMsg(null); setShowAddUser(true); }}
                className="btn-primary h-12 px-6 rounded-2xl flex items-center gap-2 text-sm font-bold shadow-lg shadow-red-500/20 active:scale-95 transition-transform"
              >
                <UserPlus size={18} /> Yeni Hesap Oluştur
              </button>
            </div>
          </div>

          {/* Messages */}
          {infoMsg && (
            <div className={cn(
              "p-4 rounded-2xl text-sm font-medium flex items-center gap-3 animate-fade-in",
              infoMsg.type === 'success' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
            )}>
              {infoMsg.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
              {infoMsg.text}
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Username veya isim ara..."
              className="w-full input-premium pl-11 py-3"
            />
          </div>

          {/* Users List */}
          <div className="glass rounded-3xl overflow-hidden shadow-2xl border border-white/[0.04]">
            {loading && !initialLoadDone.current ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold border-b border-white/[0.04] bg-white/[0.01]">
                      <th className="px-6 py-4 italic">KULLANICI ADI</th>
                      <th className="px-6 py-4">AD SOYAD</th>
                      <th className="px-6 py-4">YETKİLİ OLDUĞU AVM</th>
                      <th className="px-6 py-4 text-right">EYLEMLER</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.02]">
                    {filteredProfiles.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-20 text-center text-muted-foreground text-sm italic">
                          Kriterlere uygun kullanıcı bulunamadı.
                        </td>
                      </tr>
                    ) : (
                      filteredProfiles.map((p, i) => {
                        const mall = malls.find(m => m.id === p.mall_id);
                        return (
                          <tr key={p.id} className="hover:bg-white/[0.01] transition-colors group animate-fade-in" style={{ animationDelay: `${i * 0.03}s` }}>
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "w-10 h-10 rounded-xl flex items-center justify-center border transition-all",
                                  p.role === 'admin' ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-white/[0.03] border-white/[0.06] text-muted-foreground"
                                )}>
                                  {p.role === 'admin' ? <ShieldAlert size={18} /> : <Mail size={16} />}
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-sm font-bold tracking-tight">
                                    {p.email.split('@')[0]}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                                    {p.role === 'admin' ? 'Sistem Yöneticisi' : 'Saha Müşterisi'}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <span className="text-sm font-semibold">{p.full_name || '—'}</span>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-2">
                                <Building2 size={14} className="text-muted-foreground/40" />
                                <span className={cn(
                                  "text-xs font-medium",
                                  mall ? "text-primary/80" : "text-muted-foreground/40 italic"
                                )}>
                                  {mall ? mall.name : 'AVM Tanımsız (Bağımsız)'}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button 
                                  onClick={() => handleEditClick(p)}
                                  className="w-9 h-9 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] hover:text-white transition-all flex items-center justify-center text-muted-foreground"
                                  title="Düzenle"
                                >
                                  <Edit3 size={14} />
                                </button>
                                <button 
                                  disabled={p.role === 'admin'}
                                  onClick={() => handleDeleteUser(p)}
                                  className={cn(
                                    "w-9 h-9 rounded-xl transition-all flex items-center justify-center",
                                    p.role === 'admin' 
                                      ? "opacity-20 cursor-not-allowed bg-white/[0.03] text-muted-foreground" 
                                      : "bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 text-red-400"
                                  )}
                                  title="Sil"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* CREATE USER MODAL */}
        {showAddUser && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4" onClick={() => setShowAddUser(false)}>
            <div className="glass-strong rounded-3xl p-8 w-full max-w-md animate-scale-up shadow-2xl border border-white/[0.06]" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center text-red-500">
                    <UserPlus size={20} />
                  </div>
                  <h3 className="text-2xl font-black tracking-tight">Yeni Profil</h3>
                </div>
                <button onClick={() => setShowAddUser(false)} className="w-10 h-10 rounded-xl hover:bg-white/[0.05] transition-colors flex items-center justify-center"><X size={20} /></button>
              </div>
              
              <form onSubmit={handleCreateUser} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Ad Soyad</label>
                  <input 
                    value={newUser.full_name} onChange={e => setNewUser({...newUser, full_name: e.target.value})}
                    placeholder="Örn: Mehmet Mutfak" className="w-full h-12 input-premium px-4" required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Kullanıcı Adı</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input 
                        value={newUser.username} 
                        onChange={e => {
                          const val = e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, '');
                          setNewUser({...newUser, username: val});
                        }}
                        placeholder="username" className="w-full h-12 input-premium pl-11 pr-4" required
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Şifre</label>
                    <div className="relative">
                      <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input 
                        type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})}
                        placeholder="••••" className="w-full h-12 input-premium pl-11 pr-4" required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Müşteri AVM'si (Opsiyonel)</label>
                  <select 
                    value={newUser.mall_id} onChange={e => setNewUser({...newUser, mall_id: e.target.value})}
                    className="w-full h-12 input-premium px-4 appearance-none"
                  >
                    <option value="">AVM Seçilmedi (Bağımsız)</option>
                    {malls.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>

                <div className="pt-6">
                  <button 
                    disabled={creating}
                    className="w-full h-14 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-2xl flex items-center justify-center gap-3 font-bold text-base shadow-lg shadow-red-500/20 active:scale-[0.98] transition-all"
                  >
                    {creating ? <Loader2 size={20} className="animate-spin" /> : <><UserPlus size={20} /> Müşteriyi Oluştur</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* EDIT USER MODAL */}
        {editingProfile && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4" onClick={() => setEditingProfile(null)}>
            <div className="glass-strong rounded-3xl p-8 w-full max-w-md animate-scale-up shadow-2xl border border-white/[0.06]" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-500">
                    <Edit3 size={20} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black tracking-tight">Profili Düzenle</h3>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{editingProfile.email}</p>
                  </div>
                </div>
                <button onClick={() => setEditingProfile(null)} className="w-10 h-10 rounded-xl hover:bg-white/[0.05] transition-colors flex items-center justify-center"><X size={20} /></button>
              </div>
              
              <form onSubmit={handleUpdateUser} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Ad Soyad</label>
                  <input 
                    value={editForm.full_name} onChange={e => setEditForm({...editForm, full_name: e.target.value})}
                    placeholder="Ad Soyad" className="w-full h-12 input-premium px-4" required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Yetkili AVM</label>
                  <select 
                    value={editForm.mall_id} onChange={e => setEditForm({...editForm, mall_id: e.target.value})}
                    className="w-full h-12 input-premium px-4 appearance-none"
                  >
                    <option value="">AVM Seçilmedi (Bağımsız)</option>
                    {malls.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Şifre Değiştir (Opsiyonel)</label>
                  <div className="relative">
                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input 
                      type="password" value={editForm.password} onChange={e => setEditForm({...editForm, password: e.target.value})}
                      placeholder="Yeni şifre (Boş bırakılırsa aynı kalır)" className="w-full h-12 input-premium pl-11 pr-4"
                    />
                  </div>
                </div>

                <div className="pt-6">
                  <button 
                    disabled={creating}
                    className="w-full h-14 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-2xl flex items-center justify-center gap-3 font-bold text-base shadow-lg shadow-red-500/20 active:scale-[0.98] transition-all"
                  >
                    {creating ? <Loader2 size={20} className="animate-spin" /> : 'Değişiklikleri Kaydet'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
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
