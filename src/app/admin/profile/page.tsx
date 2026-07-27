// src/app/admin/profile/page.tsx
import type { Metadata } from 'next';
import ProfileClient from '@/components/admin/profile-client';

export const metadata: Metadata = { title: 'My profile' };

export default function AdminProfilePage() {
  return <ProfileClient />;
}
