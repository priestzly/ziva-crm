'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar, Topbar } from '@/components/DashboardShell';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { supabase, type Profile, type Mall } from '@/lib/supabase';
import { 
  Users, UserPlus, Search, Loader2, Shield, Building2, Mail, 
  Trash2, Edit3, X, Check, ShieldAlert, KeyRound, UserCheck, AlertCircle
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
  const [infoMsg, setInfoMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const [profRes, mallsRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('malls').select('*').order('name'),
    ]);
    setProfiles(profRes.data || []);
    setMalls(mallsRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

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
        setInfoMsg({ type: 'error', text: data.error || 'Hata oluştu' });
      } else {
        setInfoMsg({ type: 'success', text: 'Kullanıcı başarıyla oluşturuldu.' });
        setShowAddUser(false);
        setNewUser({ username: '', password: '', full_name: '', role: 'client', mall_id: '' });
        fetchData();
      }
    } catch (err) {
      setInfoMsg({ type: 'error', text: 'Sunucuya bağlanılamadı.' });
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
                      <th className="text-left px-6 py-4 italic">GİRİŞ ADI / EMAIL</th>
                      <th className="text-left px-6 py-4">AD SOYAD</th>
                      <th className="text-left px-6 py-4">ROL</th>
                      <th className="text-left px-6 py-4">YETKİLİ OLD. AVM</th>
                      <th className="text-right px-6 py-4">KAYIT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {filteredProfiles.map((p, i) => (
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
                          <span className={cn(
                            "text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full border",
                            p.role === 'admin' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                          )}>
                            {p.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Building2 size={13} className="text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {malls.find(m => m.id === p.mall_id)?.name || <span className="text-[10px] uppercase opacity-50 tracking-tighter">Bağımsız / Atanmamış</span>}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right text-[10px] text-muted-foreground/40 font-mono">
                          {p.id.substring(0, 8)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* CREATE USER MODAL */}
        {showAddUser && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4" onClick={() => setShowAddUser(false)}>
            <div className="glass-strong rounded-3xl p-8 w-full max-w-md animate-scale-up shadow-[0_0_50px_-12px_rgba(239,68,68,0.3)]" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold tracking-tight">Yeni Profil Tanımla</h3>
                <button onClick={() => setShowAddUser(false)} className="p-2.5 rounded-2xl hover:bg-white/[0.05] transition-colors text-muted-foreground">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleCreateUser} className="space-y-5">
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
                        value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value.toLowerCase().trim()})}
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
      </main>
    </div>
  );
}

export default function AdminUsersPage() {
  return <UsersContent />;
}
