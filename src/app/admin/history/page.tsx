'use client';

import React, { Suspense } from 'react';
import RouteGuard from '@/components/RouteGuard';
import ServiceHistoryBase from '@/components/ServiceHistoryBase';
import { LoadingState } from '@/components/ui';
import { useSearchParams } from 'next/navigation';

function AdminHistoryContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const bizId = searchParams.get('bizId');

  return (
    <ServiceHistoryBase 
      role="admin" 
      targetId={id}
      businessId={bizId || undefined}
    />
  );
}

export default function AdminHistoryPage() {
  return (
    <RouteGuard requiredRole="admin">
      <Suspense fallback={<LoadingState label="Servis arşivi yükleniyor…" />}>
         <AdminHistoryContent />
      </Suspense>
    </RouteGuard>
  );
}
