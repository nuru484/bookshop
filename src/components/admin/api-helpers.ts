// src/components/admin/api-helpers.ts
import { extractApiError } from '@/utils/extract-api-error';

/** True when an RTK Query error is a 404 (record genuinely missing). */
export const isNotFound = (error: unknown): boolean => extractApiError(error).status === 404;

/** Sort direction param value for the APIs. */
export const dirParam = (dir: 1 | -1): 'asc' | 'desc' => (dir === 1 ? 'asc' : 'desc');

/** Container classes that dim a list while it refetches in the background. */
export const refetchDim = (isFetching: boolean, isLoading: boolean): string =>
  isFetching && !isLoading ? 'opacity-60 transition-opacity' : 'transition-opacity';
