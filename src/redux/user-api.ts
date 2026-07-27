// src/redux/user-api.ts
import { apiSlice } from './api-slice';
import type {
  IUserResponse,
  IUpdateUserInput,
  ISignupInput,
  ICreateUserInput,
  IUsersPaginatedResponse,
  UserRole,
} from '@/types/user.types';

export const userApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    /** Public customer signup - creates the account and its session cookie. */
    signup: builder.mutation<IUserResponse, ISignupInput>({
      query: (body) => ({
        url: '/auth/signup',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Me'],
    }),

    getMe: builder.query<IUserResponse, void>({
      query: () => '/users/me',
      providesTags: ['Me'],
    }),

    /* ── Staff management (admin) ── */
    getUsers: builder.query<
      IUsersPaginatedResponse,
      { page?: number; limit?: number; search?: string; role?: string }
    >({
      query: (params = {}) => {
        const sp = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') sp.append(key, String(value));
        });
        const qs = sp.toString();
        return `/users${qs ? `?${qs}` : ''}`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'User' as const, id })),
              { type: 'Users' as const, id: 'LIST' },
            ]
          : [{ type: 'Users' as const, id: 'LIST' }],
    }),
    getUser: builder.query<IUserResponse, string>({
      query: (userId) => `/users/${userId}`,
      providesTags: (result, error, userId) => [{ type: 'User', id: userId }],
    }),
    createStaff: builder.mutation<IUserResponse, ICreateUserInput>({
      query: (body) => ({ url: '/users', method: 'POST', body }),
      invalidatesTags: [{ type: 'Users', id: 'LIST' }],
    }),
    updateUserRole: builder.mutation<IUserResponse, { userId: string; role: UserRole }>({
      query: ({ userId, role }) => ({
        url: `/users/${userId}/role`,
        method: 'PATCH',
        body: { role },
      }),
      invalidatesTags: (r, e, { userId }) => [
        { type: 'User', id: userId },
        { type: 'Users', id: 'LIST' },
      ],
    }),

    updateProfile: builder.mutation<IUserResponse, { userId: string; body: IUpdateUserInput }>({
      query: ({ userId, body }) => ({
        url: `/users/${userId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { userId }) => ['Me', { type: 'User', id: userId }],
    }),

    changePassword: builder.mutation<
      { message: string },
      { userId: string; currentPassword: string; newPassword: string }
    >({
      query: ({ userId, ...body }) => ({
        url: `/users/${userId}/change-password`,
        method: 'PATCH',
        body,
      }),
    }),

    uploadAvatar: builder.mutation<IUserResponse, { userId: string; image: string }>({
      query: ({ userId, image }) => ({
        url: `/users/${userId}/avatar`,
        method: 'POST',
        body: { image },
      }),
      invalidatesTags: ['Me'],
    }),
    removeAvatar: builder.mutation<IUserResponse, string>({
      query: (userId) => ({ url: `/users/${userId}/avatar`, method: 'DELETE' }),
      invalidatesTags: ['Me'],
    }),

    // --- Two-factor authentication (profile) ---
    requestTwoFactorSetup: builder.mutation<{ message: string }, string>({
      query: (userId) => ({
        url: `/users/${userId}/2fa/setup`,
        method: 'POST',
      }),
    }),

    confirmTwoFactorSetup: builder.mutation<{ message: string }, { userId: string; code: string }>({
      query: ({ userId, code }) => ({
        url: `/users/${userId}/2fa/enable`,
        method: 'POST',
        body: { code },
      }),
      invalidatesTags: ['Me'],
    }),

    disableTwoFactor: builder.mutation<{ message: string }, { userId: string; password: string }>({
      query: ({ userId, password }) => ({
        url: `/users/${userId}/2fa/disable`,
        method: 'POST',
        body: { password },
      }),
      invalidatesTags: ['Me'],
    }),
  }),
});

export const {
  useSignupMutation,
  useGetMeQuery,
  useGetUsersQuery,
  useGetUserQuery,
  useCreateStaffMutation,
  useUpdateUserRoleMutation,
  useUpdateProfileMutation,
  useUploadAvatarMutation,
  useRemoveAvatarMutation,
  useChangePasswordMutation,
  useRequestTwoFactorSetupMutation,
  useConfirmTwoFactorSetupMutation,
  useDisableTwoFactorMutation,
} = userApi;
