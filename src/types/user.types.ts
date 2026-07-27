// src/types/user.types.ts
export type UserRole = 'ADMIN' | 'EDITOR' | 'CUSTOMER';

export interface ISignupInput {
  fullname: string;
  email: string;
  password: string;
  phone?: string;
}

export interface IUser {
  id: string;
  email: string;
  fullname: string;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  profilePicture?: string | null;
  role: UserRole;
  twoFactorEnabled?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateUserInput {
  fullname: string;
  email: string;
  password: string;
  phone?: string;
  role?: UserRole;
}

export interface IUpdateUserInput {
  fullname?: string;
  email?: string;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  role?: UserRole;
}

export interface IUpdateUserRoleInput {
  userId: string;
  role: UserRole;
}

export interface IUserResponse {
  message: string;
  data: IUser;
}

export interface IUsersPaginatedResponse {
  message: string;
  data: IUser[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface IUsersQueryParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface IUsersDataTableProps {
  data: IUser[];
  loading?: boolean;
  totalCount?: number;
  page?: number;
  pageSize?: number;
  filters: Omit<IUsersQueryParams, 'page' | 'limit'>;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onFiltersChange: (
    filters: Partial<Omit<IUsersQueryParams, 'page' | 'limit'>>,
  ) => void;
  onRefresh?: () => void;
}
