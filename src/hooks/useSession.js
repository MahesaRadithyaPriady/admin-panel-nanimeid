'use client';

import { useEffect, useState } from 'react';

export function useSession() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('nanimeid_admin_session');
      if (raw) {
        setUser(JSON.parse(raw));
      }
    } catch {}
    setLoading(false);
  }, []);

  return { user, loading };
}
