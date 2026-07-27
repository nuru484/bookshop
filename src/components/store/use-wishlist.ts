// src/components/store/use-wishlist.ts
'use client';

import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import { toggleWish } from '@/redux/shop-slice';
import { useGetMeQuery } from '@/redux/user-api';
import { useGetWishlistQuery, useToggleWishlistMutation } from '@/redux/catalog-api';
import { useHydrated } from '@/hooks/use-hydrated';
import { extractApiError } from '@/utils/extract-api-error';
import { notify } from '@/lib/notify';

/**
 * One wishlist, two backing stores: signed-in customers (real session,
 * getMe succeeds) read and toggle through the API; guests keep the
 * localStorage list in the shop slice. RTK Query dedupes the underlying
 * requests across every component that mounts this hook.
 */
export function useWishlist() {
  const hydrated = useHydrated();
  const dispatch = useAppDispatch();
  const customer = useAppSelector((s) => s.shop.customer);
  const localWishlist = useAppSelector((s) => s.shop.wishlist);

  // A local customer copy may exist without a live session (guest checkout,
  // expired cookie) - only a successful getMe proves the API path works.
  const { data: meData } = useGetMeQuery(undefined, { skip: !hydrated || !customer });
  const authed = hydrated && Boolean(customer) && Boolean(meData?.data);

  const {
    data: remoteData,
    isLoading: remoteLoading,
    isError: remoteError,
    refetch,
  } = useGetWishlistQuery(undefined, { skip: !authed });
  const [toggleRemote] = useToggleWishlistMutation();

  const wishlist = authed ? (remoteData?.data ?? []) : localWishlist;

  const toggle = useCallback(
    (id: number) => {
      if (authed) {
        toggleRemote(id)
          .unwrap()
          .then((res) => notify(res.message))
          .catch((err) => notify(extractApiError(err).message));
      } else {
        const wished = localWishlist.includes(id);
        dispatch(toggleWish(id));
        notify(wished ? 'Removed from wishlist' : 'Saved to your wishlist');
      }
    },
    [authed, localWishlist, dispatch, toggleRemote],
  );

  return {
    wishlist,
    toggle,
    authed,
    loading: authed && remoteLoading,
    error: authed && remoteError,
    refetch,
  };
}
