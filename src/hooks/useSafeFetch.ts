import { useRef, useEffect, useCallback } from 'react';

/**
 * Tab arka plana atıldığında browser fetch isteklerini donduruyor.
 * Tab geri geldiğinde bu istekler artık ölü bağlantıda kalmış oluyor.
 * Bu hook:
 * 1. Her safeFetch çağrısı için yeni bir AbortSignal sağlar ve öncekini iptal eder.
 * 2. Tab geri geldiğinde fetchData'yı tekrar çağırır.
 * 3. Component unmount olduğunda bekleyen isteği iptal eder.
 */
export function useSafeFetch(fetchData: (signal: AbortSignal) => Promise<void>) {
  const abortRef = useRef<AbortController | null>(null);
  
  // Stale closure olmaması için fetchData'nın her zaman son halini ref'te tutuyoruz
  const fetchRef = useRef(fetchData);
  useEffect(() => {
    fetchRef.current = fetchData;
  });

  const safeFetch = useCallback(() => {
    // Eski isteği iptal et
    abortRef.current?.abort();
    // Yeni controller oluştur
    const controller = new AbortController();
    abortRef.current = controller;
    // Güncel fetchData'ya signal'i gönder
    fetchRef.current(controller.signal);
  }, []);

  // Component unmount olduğunda işlemi temizle
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // Tab visibility değiştiğinde
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') {
        safeFetch();
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [safeFetch]);

  return { safeFetch };
}
