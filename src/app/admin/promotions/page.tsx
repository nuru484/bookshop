// src/app/admin/promotions/page.tsx
import type { Metadata } from 'next';
import PromotionsClient from '@/components/admin/promotions-client';

export const metadata: Metadata = { title: 'Promotions' };

export default function AdminPromotionsPage() {
  return <PromotionsClient />;
}
