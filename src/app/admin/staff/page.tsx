// src/app/admin/staff/page.tsx
import type { Metadata } from 'next';
import { Suspense } from 'react';
import StaffClient from '@/components/admin/staff-client';

export const metadata: Metadata = { title: 'Staff' };

export default function AdminStaffPage() {
  return (
    <Suspense>
      <StaffClient />
    </Suspense>
  );
}
