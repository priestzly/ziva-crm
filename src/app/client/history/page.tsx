'use client';

import React, { Suspense } from 'react';
import RouteGuard from '@/components/RouteGuard';
import ServiceHistoryBase from '@/components/ServiceHistoryBase';
import { LoadingState } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useSearchParams } from 'next/navigation';

function ClientHistoryContent() {
  const { profile } = useAuth();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const businessId = (profile as any)?.business_id || undefined;
  const mallId = profile?.mall_id || undefined;

  return (
    <ServiceHistoryBase 
      role="client" 
      businessId={businessId}
      targetId={id}
      mallId={mallId}
    />
  );
}

export default function ClientHistoryPage() {
  return (
    <RouteGuard requiredRole="client">
      <Suspense fallback={<LoadingState label="Servis geçmişi yükleniyor…" />}>
         <ClientHistoryContent />
      </Suspense>
    </RouteGuard>
  );
}
