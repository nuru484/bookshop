// src/app/admin/staff/[userId]/page.tsx
import type { Metadata } from 'next';
import StaffDetailClient from '@/components/admin/staff-detail-client';

export const metadata: Metadata = { title: 'Staff member' };

export default async function StaffMemberPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  return <StaffDetailClient userId={userId} />;
}
