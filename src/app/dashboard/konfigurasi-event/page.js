'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { useSession } from '@/hooks/useSession';
import { SigninEventConfigsContent } from '@/app/dashboard/signin-event-configs/page';
import { WatchEventConfigsContent } from '@/app/dashboard/watch-event-configs/page';
import { ANIMATIONS } from './constants';
import { EventHeader } from './components/EventHeader';

export default function KonfigurasiEventPage() {
  const router = useRouter();
  const { user, loading } = useSession();

  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const roleKey = String(user?.role || "").toLowerCase();
  const isSuperadmin = roleKey === "superadmin";

  const canSignin = isSuperadmin || permissions.includes("signin-event-configs");
  const canWatch = isSuperadmin || permissions.includes("watch-event-configs");

  const availableTabs = useMemo(() => {
    const out = [];
    if (canWatch) out.push("watch");
    if (canSignin) out.push("signin");
    return out;
  }, [canSignin, canWatch]);

  const [tab, setTab] = useState(() => (availableTabs[0] ? availableTabs[0] : "watch"));

  useEffect(() => {
    if (loading || !user) return;
    if (!canSignin && !canWatch) {
      toast.error("Kamu tidak punya permission untuk Konfigurasi Event");
      router.replace("/dashboard");
    }
  }, [canSignin, canWatch, loading, router, user]);

  useEffect(() => {
    if (availableTabs.length === 0) return;
    setTab((t) => (availableTabs.includes(t) ? t : availableTabs[0]));
  }, [availableTabs]);

  if (loading || !user) return null;

  if (!canSignin && !canWatch) return null;

  const activeTab = availableTabs.includes(tab) ? tab : availableTabs[0];

  // Handle tab change
  const handleTabChange = (newTab) => {
    setTab(newTab);
  };

  return (
    <motion.div
      variants={ANIMATIONS.container}
      initial="hidden"
      animate="visible"
      className="space-y-6 min-w-0"
    >
      {/* Header & Tabs */}
      <EventHeader
        activeTab={activeTab}
        availableTabs={availableTabs}
        onTabChange={handleTabChange}
      />

      {/* Tab Content */}
      <motion.div variants={ANIMATIONS.item}>
        {activeTab === 'watch' && <WatchEventConfigsContent embedded />}
        {activeTab === 'signin' && <SigninEventConfigsContent embedded />}
      </motion.div>
    </motion.div>
  );
}
