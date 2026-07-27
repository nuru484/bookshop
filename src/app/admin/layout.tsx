// src/app/admin/layout.tsx
import type { Metadata } from 'next';
import { requireSession } from '@/lib/session';
import AdminShell from '@/components/admin/admin-shell';

export const metadata: Metadata = {
  title: 'Staff console',
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // proxy.ts already gates /admin; this is defense in depth.
  await requireSession();

  return <AdminShell>{children}</AdminShell>;
}
