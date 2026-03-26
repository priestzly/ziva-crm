'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar, Topbar } from '@/components/DashboardShell';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { supabase, type MaintenanceRecord, type Business } from '@/lib/supabase';
import { 
  ClipboardList, Search, Loader2, Calendar, Store, 
  ExternalLink, ChevronRight, Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

function ClientHistoryContent() {
  const { profile } = useAuth();
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    if (!profile || !profile.mall_id) {
      setLoading(false);
      return;
    }
    setLoading(true);

    // 1. Get all businesses in this mall
    const { data: bizData } = await supabase
      .from('businesses')
      .select('id')
      .eq('mall_id', profile.mall_id);
    
    const bizIds = bizData?.map(b => b.id) || [];

    if (bizIds.length > 0) {
      // 2. Get all records for those businesses
      const { data: recData } = await supabase
        .from('maintenance_records')
        .select('*, businesses(name, category)')
        .in('business_id', bizIds)
        .order('created_at', { ascending: false });
      
      setRecords(recData || []);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [profile]);

  const filteredRecords = records.filter(r => 
    r.description.toLowerCase().includes(search.toLowerCase()) ||
    (r as any).businesses?.name?.toLowerCase().includes(search.toLowerCase()) ||
    r.service_type?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen flex">
      <Sidebar role="client" />
      <main className="flex-1 lg:ml-72 transition-all duration-500">
        <Topbar title="Servis Geçmişi" subtitle="AVM genelindeki tüm bakım ve onarım kayıtları" />

        <div className="p-6 lg:p-8 space-y-6 max-w-[1200px] mx-auto">
          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="glass rounded-2xl p-5 border border-white/[0.04]">
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1.5 flex items-center gap-1.5"><Clock size={12} /> Toplam İşlem</p>
              <p className="text-2xl font-black text-white">{records.length}</p>
            </div>
            <div className="glass rounded-2xl p-5 border border-white/[0.04]">
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1.5 flex items-center gap-1.5"><Calendar size={12} /> Son 30 Gün</p>
              <p className="text-2xl font-black text-white">{records.filter(r => Date.now() - new Date(r.created_at).getTime() < 30 * 86400000).length}</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Kayıt açıklaması veya dükkan ismi ile ara..."
              className="w-full input-premium pl-11 py-3"
            />
          </div>

          {/* Records Table */}
          <div className="glass rounded-2xl overflow-hidden shadow-2xl">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                <ClipboardList className="w-12 h-12 text-muted-foreground/20 mb-4" />
                <h3 className="text-lg font-bold">Herhangi bir kayıt bulunamadı</h3>
                {!profile?.mall_id && <p className="text-sm text-amber-400 mt-2 font-medium italic">Hesabınıza atanmış bir AVM bulunmadığı için kayıtlar listelenemiyor.</p>}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-widest text-muted-foreground font-black border-b border-white/[0.04] bg-white/[0.01]">
                      <th className="text-left px-6 py-5">Tarih</th>
                      <th className="text-left px-6 py-5">İşletme</th>
                      <th className="text-left px-6 py-5">İşlem Türü</th>
                      <th className="text-left px-6 py-5">Açıklama</th>
                      <th className="text-right px-6 py-5">Detay</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {filteredRecords.map((rec, i) => (
                      <tr key={rec.id} className="hover:bg-white/[0.02] transition-colors group animate-fade-in" style={{ animationDelay: `${i * 0.03}s` }}>
                        <td className="px-6 py-4">
                          <p className="text-xs font-semibold whitespace-nowrap">{new Date(rec.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</p>
                          <p className="text-[10px] text-muted-foreground">{new Date(rec.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold group-hover:text-red-400 transition-colors">{(rec as any).businesses?.name}</p>
                          <p className="text-[10px] text-muted-foreground">{(rec as any).businesses?.category || 'Kategori yok'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06] text-muted-foreground">
                            {rec.service_type || 'Genel Bakım'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-xs text-muted-foreground line-clamp-1 max-w-[200px] italic">"{rec.description}"</p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link 
                            href={`/client/businesses/${rec.business_id}`}
                            className="p-2 rounded-xl glass hover:bg-white/[0.05] inline-flex text-muted-foreground hover:text-red-400 transition-all"
                          >
                            <ExternalLink size={14} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ClientHistoryPage() {
  return <ClientHistoryContent />;
}
