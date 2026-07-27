// src/redux/catalog-api.ts
// RTK Query endpoints for books, orders, customers and dashboard stats.
import { apiSlice } from './api-slice';
import type { ICreateBookInput, IUpdateBookInput } from '@/validations/book-validation';
import type { ICheckoutInput } from '@/validations/order-validation';
import type { IUser } from '@/types/user.types';
import type {
  IBooksResponse,
  IBookResponse,
  IBookDetailResponse,
  IOrdersResponse,
  IOrderDetailResponse,
  IOrderWithTotal,
  ITrackedOrder,
  ICustomersResponse,
  ICustomerDetail,
  IDashboardStats,
  TableQuery,
} from '@/types/catalog-api';

export interface IPromoRecord {
  id: number;
  code: string;
  percentOff: number;
  description: string;
  genre: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

const toQuery = (params: TableQuery): string => {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') sp.append(key, String(value));
  });
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
};

export const catalogApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    /* ── Books ── */
    getBooks: builder.query<IBooksResponse, TableQuery>({
      query: (params) => `/books${toQuery(params)}`,
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'Book' as const, id })),
              { type: 'Books' as const, id: 'LIST' },
            ]
          : [{ type: 'Books' as const, id: 'LIST' }],
    }),
    getBook: builder.query<IBookDetailResponse, number>({
      query: (id) => `/books/${id}`,
      providesTags: (result, error, id) => [{ type: 'Book', id }],
    }),
    createBook: builder.mutation<IBookResponse, ICreateBookInput>({
      query: (body) => ({ url: '/books', method: 'POST', body }),
      invalidatesTags: [{ type: 'Books', id: 'LIST' }, 'DashboardStats'],
    }),
    updateBook: builder.mutation<IBookResponse, { id: number; body: IUpdateBookInput }>({
      query: ({ id, body }) => ({ url: `/books/${id}`, method: 'PUT', body }),
      invalidatesTags: (r, e, { id }) => [
        { type: 'Book', id },
        { type: 'Books', id: 'LIST' },
        'DashboardStats',
      ],
    }),
    deleteBook: builder.mutation<{ message: string }, number>({
      query: (id) => ({ url: `/books/${id}`, method: 'DELETE' }),
      invalidatesTags: (r, e, id) => [
        { type: 'Book', id },
        { type: 'Books', id: 'LIST' },
        'DashboardStats',
      ],
    }),
    restockBook: builder.mutation<IBookResponse, { id: number; qty?: number }>({
      query: ({ id, qty }) => ({ url: `/books/${id}/restock`, method: 'PATCH', body: { qty } }),
      invalidatesTags: (r, e, { id }) => [
        { type: 'Book', id },
        { type: 'Books', id: 'LIST' },
        'DashboardStats',
      ],
    }),

    /* ── Orders ── */
    getOrders: builder.query<IOrdersResponse, TableQuery>({
      query: (params) => `/orders${toQuery(params)}`,
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'Order' as const, id })),
              { type: 'Orders' as const, id: 'LIST' },
            ]
          : [{ type: 'Orders' as const, id: 'LIST' }],
    }),
    getOrder: builder.query<IOrderDetailResponse, string>({
      query: (id) => `/orders/${id}`,
      providesTags: (result, error, id) => [{ type: 'Order', id }],
    }),
    updateOrderStatus: builder.mutation<
      { message: string; data: IOrderWithTotal },
      {
        id: string;
        action: 'advance' | 'set' | 'cancel' | 'reinstate';
        status?: 'Pending' | 'Paid' | 'Shipped' | 'Delivered';
      }
    >({
      query: ({ id, action, status }) => ({
        url: `/orders/${id}/status`,
        method: 'PATCH',
        body: { action, ...(status ? { status } : {}) },
      }),
      invalidatesTags: (r, e, { id }) => [
        { type: 'Order', id },
        { type: 'Orders', id: 'LIST' },
        { type: 'Books', id: 'LIST' }, // cancel restocks
        'DashboardStats',
        'Customers',
      ],
    }),
    createAdminOrder: builder.mutation<
      { message: string; data: IOrderWithTotal },
      {
        name: string;
        email: string;
        phone: string;
        address: string;
        city: string;
        items: { id: number; qty: number }[];
        promoCode?: string;
        status?: 'Pending' | 'Paid';
      }
    >({
      query: (body) => ({ url: '/orders/admin', method: 'POST', body }),
      invalidatesTags: [
        { type: 'Orders', id: 'LIST' },
        { type: 'Books', id: 'LIST' },
        'DashboardStats',
        'Customers',
      ],
    }),
    getMyOrders: builder.query<{ message: string; data: IOrderWithTotal[] }, void>({
      query: () => '/orders/mine',
      providesTags: ['MyOrders'],
    }),
    trackOrder: builder.mutation<{ message: string; data: ITrackedOrder }, { orderId: string; contact: string }>({
      query: (body) => ({ url: '/orders/track', method: 'POST', body }),
    }),

    /* ── Customers ── */
    getCustomers: builder.query<ICustomersResponse, TableQuery>({
      query: (params) => `/customers${toQuery(params)}`,
      providesTags: ['Customers'],
    }),
    getCustomer: builder.query<{ message: string; data: ICustomerDetail }, string>({
      query: (email) => `/customers/${encodeURIComponent(email)}`,
      providesTags: (r, e, email) => [{ type: 'Customer', id: email }],
    }),
    createCustomer: builder.mutation<
      { message: string; data: IUser },
      { fullname: string; email: string; password: string; phone?: string; address?: string; city?: string }
    >({
      query: (body) => ({ url: '/customers', method: 'POST', body }),
      invalidatesTags: ['Customers'],
    }),

    /* ── Search (public) ── */
    searchBooks: builder.query<{ message: string; data: import('@/data/catalog').Book[] }, string>({
      query: (q) => `/books/search?q=${encodeURIComponent(q)}`,
    }),
    logSearch: builder.mutation<{ message: string }, string>({
      query: (term) => ({ url: '/search/log', method: 'POST', body: { term } }),
    }),
    getPopularSearches: builder.query<{ message: string; data: { term: string; count: number }[] }, void>({
      query: () => '/search/popular',
    }),

    /* ── Promotions ── */
    getPromos: builder.query<{ message: string; data: IPromoRecord[] }, void>({
      query: () => '/promos',
      providesTags: ['Promos'],
    }),
    createPromo: builder.mutation<
      { message: string; data: IPromoRecord },
      { code: string; percentOff: number; description?: string; genre?: string | null }
    >({
      query: (body) => ({ url: '/promos', method: 'POST', body }),
      invalidatesTags: ['Promos'],
    }),
    togglePromoActive: builder.mutation<{ message: string; data: IPromoRecord }, number>({
      query: (id) => ({ url: `/promos/${id}`, method: 'PATCH' }),
      invalidatesTags: ['Promos'],
    }),
    deletePromo: builder.mutation<{ message: string }, number>({
      query: (id) => ({ url: `/promos/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Promos'],
    }),
    validatePromo: builder.query<
      { message: string; data: { code: string; percentOff: number; genre: string | null; description: string } },
      string
    >({
      query: (code) => `/promos/validate?code=${encodeURIComponent(code)}`,
    }),

    /* ── Customer order detail ── */
    getMyOrder: builder.query<IOrderDetailResponse, string>({
      query: (id) => `/orders/mine/${id}`,
      providesTags: (r, e, id) => [{ type: 'Order', id: `mine-${id}` }],
    }),

    /* ── Payments ── */
    initializePayment: builder.mutation<
      {
        message: string;
        data: { orderId: string; reference: string; authorizationUrl: string; total: number };
      },
      ICheckoutInput
    >({
      query: (body) => ({ url: '/payments/initialize', method: 'POST', body }),
    }),
    verifyPayment: builder.query<
      {
        success: boolean;
        message: string;
        data: { orderId: string; reference: string; status: string; total: number | null };
      },
      string
    >({
      query: (reference) => `/payments/verify?reference=${encodeURIComponent(reference)}`,
    }),

    /* ── Wishlist (signed-in customers) ── */
    getWishlist: builder.query<{ message: string; data: number[] }, void>({
      query: () => '/wishlist',
      providesTags: ['Wishlist'],
    }),
    toggleWishlist: builder.mutation<{ message: string; data: number[]; added: boolean }, number>({
      query: (bookId) => ({ url: '/wishlist', method: 'POST', body: { bookId } }),
      invalidatesTags: ['Wishlist'],
    }),
    mergeWishlist: builder.mutation<{ message: string; data: number[] }, number[]>({
      query: (bookIds) => ({ url: '/wishlist', method: 'PUT', body: { bookIds } }),
      invalidatesTags: ['Wishlist'],
    }),

    /* ── Dashboard ── */
    getDashboardStats: builder.query<{ message: string; data: IDashboardStats }, TableQuery>({
      query: (params) => `/dashboard/stats${toQuery(params)}`,
      providesTags: ['DashboardStats'],
    }),
  }),
});

export const {
  useGetBooksQuery,
  useGetBookQuery,
  useCreateBookMutation,
  useUpdateBookMutation,
  useDeleteBookMutation,
  useRestockBookMutation,
  useGetOrdersQuery,
  useGetOrderQuery,
  useUpdateOrderStatusMutation,
  useCreateAdminOrderMutation,
  useGetMyOrdersQuery,
  useTrackOrderMutation,
  useGetCustomersQuery,
  useGetCustomerQuery,
  useCreateCustomerMutation,
  useSearchBooksQuery,
  useLazySearchBooksQuery,
  useLogSearchMutation,
  useGetPopularSearchesQuery,
  useGetPromosQuery,
  useCreatePromoMutation,
  useTogglePromoActiveMutation,
  useDeletePromoMutation,
  useLazyValidatePromoQuery,
  useGetMyOrderQuery,
  useInitializePaymentMutation,
  useVerifyPaymentQuery,
  useGetWishlistQuery,
  useToggleWishlistMutation,
  useMergeWishlistMutation,
  useGetDashboardStatsQuery,
} = catalogApi;
