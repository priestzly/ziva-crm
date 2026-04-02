'use client';

import React, { useState, useRef } from 'react';
import { useSafeFetch } from '@/hooks/useSafeFetch';
import { Sidebar, Topbar } from '@/components/DashboardShell';
import RouteGuard from '@/components/RouteGuard';
import { useAuth } from '@/context/AuthContext';
import { supabase, type Profile, type Mall } from '@/lib/supabase';
import { 
  Users, UserPlus, Search, Loader2, Shield, Building2, Mail, 
  Trash2, Edit3, X, Check, ShieldAlert, KeyRound, UserCheck, AlertCircle,
  MoreVertical, CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';

function UsersContent() {
  const { profile: currentAdmin } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [malls, setMalls] = useState<Mall[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Create User Modal
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '', full_name: '', role: 'client', mall_id: '' });
  const [creating, setCreating] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [editForm, setEditForm] = useState({ full_name: '', mall_id: '', password: '' });
  const [infoMsg, setInfoMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const initialLoadDone = useRef(false);

  const fetchData = async (signal: AbortSignal) => {
    if (!initialLoadDone.current) setLoading(true);
    try {
      const [profRes, mallsRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }).abortSignal(signal),
        supabase.from('malls').select('*').order('name').abortSignal(signal),
      ]);
      if (signal.aborted) return;
      setProfiles(profRes.data || []);
      setMalls(mallsRes.data || []);
      initialLoadDone.current = true;
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      console.error('Error fetching users:', err);
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  };

  const { safeFetch } = useSafeFetch(fetchData);

  const handleDeleteUser = async (profile: Profile) => {
    if (profile.role === 'admin') {
      alert('Admin hesabı bu panelden silinemez.');
      return;
    }
    if (!confirm(`${profile.full_name || profile.email} kullanıcısını silmek istediğinize emin misiniz?`)) return;
    
    // Note: This only deletes from public.profiles. 
    // Real auth user deletion requires admin API or service role, 
    // but for simplicity we'll just remove the profile link for now 
    // unless we use the API similar to create-user.
    const { error } = await supabase.from('profiles').delete().eq('id', profile.id);
    if (!error) safeFetch();
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
      // 1. Update basic info
      const { error: profileError } = await supabase.from('profiles').update({
        full_name: editForm.full_name,
        mall_id: editForm.mall_id || null
      }).eq('id', editingProfile.id);

      if (profileError) throw profileError;

      // 2. Update password if provided
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
      safeFetch();
    } catch (err: any) {
      setInfoMsg({ type: 'error', text: err.message });
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
        <Topbar title="Kullanıcı Yönetimi" subtitle="Sistem erişimlerini ve rolleri yönetin" />

        <div className="p-6 lg:p-8 space-y-6 max-w-[1200px] mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Profiller</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Müşteri hesaplarını buradan direkt oluşturun</p>
            </div>
            <button 
              onClick={() => { setInfoMsg(null); setShowAddUser(true); }}
              className="btn-primary h-12 px-6 rounded-2xl flex items-center gap-2 text-sm font-bold shadow-lg shadow-red-500/20 active:scale-95 transition-transform"
            >
              <UserPlus size={18} /> Yeni Hesap Oluştur
            </button>
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
          <div className="glass rounded-2xl overflow-hidden shadow-2xl">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold border-b border-white/[0.04]">
                      <th className="text-left px-6 py-4 italic">KULLANICI ADI</th>
                      <th className="text-left px-6 py-4">AD SOYAD</th>
                      <th className="text-left px-6 py-4">YETKİLİ OLDUĞU AVM</th>
                      <th className="text-right px-6 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {filteredProfiles.map((p, i) => {
                      const mall = malls.find(m => m.id === p.mall_id);
                      return (
                        <tr key={p.id} className="hover:bg-white/[0.01] transition-colors group animate-fade-in" style={{ animationDelay: `${i * 0.03}s` }}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-white/[0.03] flex items-center justify-center border border-white/[0.06] text-muted-foreground">
                                <Mail size={14} />
                              </div>
                              <span className="text-sm font-mono text-muted-foreground">
                                {p.email.split('@')[0]}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-semibold text-sm">{p.full_name || '—'}</td>
                          <td className="px-6 py-4">
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
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => handleEditClick(p)}
                                className="p-2 rounded-xl hover:bg-white/10 text-muted-foreground hover:text-white transition-all"
                                title="Düzenle"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button 
                                onClick={() => handleDeleteUser(p)}
                                className="p-2 rounded-xl hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-all"
                                title="Sil"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* CREATE USER MODAL */}
        {showAddUser && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4" onClick={() => setShowAddUser(false)}>
            <div className="glass-strong rounded-3xl p-8 w-full max-w-md animate-scale-up shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black tracking-tight">Yeni Profil</h3>
                <button onClick={() => setShowAddUser(false)} className="p-2.5 rounded-2xl hover:bg-white/[0.05]"><X size={20} /></button>
              </div>
              
              <form 
                onSubmit={async (e) => {
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
                    if (!res.ok) { setInfoMsg({ type: 'error', text: data.error || 'Hata' }); }
                    else { 
                      setInfoMsg({ type: 'success', text: 'Hazır!' }); 
                      setShowAddUser(false); 
                      setNewUser({ username: '', password: '', full_name: '', role: 'client', mall_id: '' }); 
                      safeFetch();
                    }
                  } catch (err) { setInfoMsg({ type: 'error', text: 'Hata' }); }
                  finally { setCreating(false); }
                }} 
                className="space-y-5"
              >
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ad Soyad</label>
                  <input 
                    value={newUser.full_name} onChange={e => setNewUser({...newUser, full_name: e.target.value})}
                    placeholder="Örn: Mehmet Mutfak" className="w-full input-premium py-3" required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Kullanıcı Adı</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input 
                        value={newUser.username} 
                        onChange={e => {
                          const val = e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, '');
                          setNewUser({...newUser, username: val});
                        }}
                        placeholder="mehmet_ali" className="w-full input-premium pl-11 py-3" required
                      />
                    </div>
                    <p className="px-1 text-[9px] text-muted-foreground/60 italic">Giriş yaparken bunu kullanacak.</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Şifre</label>
                    <div className="relative">
                      <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input 
                        type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})}
                        placeholder="••••" className="w-full input-premium pl-11 py-3" required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Müşteri AVM'si (Opsiyonel)</label>
                  <select 
                    value={newUser.mall_id} onChange={e => setNewUser({...newUser, mall_id: e.target.value})}
                    className="w-full input-premium py-3"
                  >
                    <option value="">AVM Seçilmedi (Bağımsız)</option>
                    {malls.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>

                <div className="pt-6">
                  <button 
                    disabled={creating}
                    className="w-full btn-primary h-14 rounded-2xl flex items-center justify-center gap-3 font-bold text-base hover:scale-[1.02] active:scale-[0.98] transition-all"
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
            <div className="glass-strong rounded-3xl p-8 w-full max-w-md animate-scale-up shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-black tracking-tight">Profili Düzenle</h3>
                  <p className="text-xs text-muted-foreground mt-1">{editingProfile.email}</p>
                </div>
                <button onClick={() => setEditingProfile(null)} className="p-2.5 rounded-2xl hover:bg-white/[0.05]"><X size={20} /></button>
              </div>
              
              <form onSubmit={handleUpdateUser} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ad Soyad</label>
                  <input 
                    value={editForm.full_name} onChange={e => setEditForm({...editForm, full_name: e.target.value})}
                    placeholder="Ad Soyad" className="w-full input-premium py-3" required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Yetkili AVM</label>
                  <select 
                    value={editForm.mall_id} onChange={e => setEditForm({...editForm, mall_id: e.target.value})}
                    className="w-full input-premium py-3"
                  >
                    <option value="">AVM Seçilmedi (Bağımsız)</option>
                    {malls.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Şifre Değiştir (Opsiyonel)</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input 
                      type="password" value={editForm.password} onChange={e => setEditForm({...editForm, password: e.target.value})}
                      placeholder="Yeni şifre (Boş bırakılırsa aynı kalır)" className="w-full input-premium pl-11 py-3"
                    />
                  </div>
                  <p className="px-1 text-[9px] text-muted-foreground/60 italic">Kullanıcının şifresini direkt buradan güncelleyebilirsiniz.</p>
                </div>

                <div className="pt-6">
                  <button 
                    disabled={creating}
                    className="w-full btn-primary h-14 rounded-2xl flex items-center justify-center gap-3 font-bold text-base hover:scale-[1.02] active:scale-[0.98] transition-all"
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
