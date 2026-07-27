// src/app/admin/page.tsx
import type { Metadata } from 'next';
import DashboardClient from '@/components/admin/dashboard-client';

export const metadata: Metadata = { title: 'Dashboard' };

export default function AdminDashboardPage() {
  return <DashboardClient />;
}
