// src/app/admin/inventory/page.tsx
import type { Metadata } from 'next';
import InventoryClient from '@/components/admin/inventory-client';

export const metadata: Metadata = { title: 'Inventory' };

export default function AdminInventoryPage() {
  return <InventoryClient />;
}
