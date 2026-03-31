'use client';

import React, { Suspense } from 'react';
import RouteGuard from '@/components/RouteGuard';
import ServiceHistoryBase from '@/components/ServiceHistoryBase';
import { useAuth } from '@/context/AuthContext';
import { useSearchParams } from 'next/navigation';

function ClientHistoryContent() {
  const { profile } = useAuth();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  return (
    <ServiceHistoryBase 
      role="client" 
      businessId={profile?.business_id || undefined}
      targetId={id}
    />
  );
}

export default function ClientHistoryPage() {
  return (
    <RouteGuard requiredRole="client">
      <Suspense fallback={<div className="p-20 text-center text-xs font-black uppercase tracking-widest animate-pulse">Servis Geçmişi Yükleniyor...</div>}>
         <ClientHistoryContent />
      </Suspense>
    </RouteGuard>
  );
}
