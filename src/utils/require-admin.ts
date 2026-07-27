// src/utils/require-admin.ts
import { ForbiddenError } from '@/middlewares/error-handler';
import type { UserRole } from '@/lib/prisma';

/**
 * Guards admin-only actions (deleting content, managing users & roles).
 * Throws ForbiddenError when the session is not an admin.
 */
export function requireAdmin(session: { isAdmin: boolean }): void {
  if (!session.isAdmin) {
    throw new ForbiddenError('Admin access required');
  }
}

/**
 * Guards staff actions (creating & editing content): both ADMIN and EDITOR
 * are allowed. Editors can create/edit but never delete (use requireAdmin
 * for deletions).
 */
export function requireStaff(session: { role: UserRole }): void {
  if (session.role !== 'ADMIN' && session.role !== 'EDITOR') {
    throw new ForbiddenError('Staff access required');
  }
}
