// src/middlewares/error-handler.ts
import { NextApiRequest } from 'next';
import { NextResponse } from 'next/server';
import logger from '@/utils/logger';
import { handlePrismaError, isPrismaError } from './prisma-error-handler';

/**
 * Severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Custom Error
 */
export class CustomError extends Error {
  readonly status: number;
  readonly severity: ErrorSeverity;
  readonly layer: string;
  readonly code?: string;
  readonly context?: Record<string, unknown>;

  constructor(
    status: number,
    message: string,
    options: {
      severity?: ErrorSeverity;
      layer?: string;
      code?: string;
      context?: Record<string, unknown>;
    } = {},
  ) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.severity = options.severity || ErrorSeverity.MEDIUM;
    this.layer = options.layer || 'unknown';
    this.code = options.code;
    this.context = options.context;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Generate error ID
 */
const generateErrorId = (): string =>
  `err_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

/**
 * Type-safe sanitize function
 */
export const sanitize = (data: unknown): unknown => {
  if (data === null || typeof data !== 'object') {
    return data;
  }

  const sensitiveKeys = ['password', 'token', 'secret', 'key'];

  if (Array.isArray(data)) {
    return data.map((item) => sanitize(item));
  }

  const sanitizedObject: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (sensitiveKeys.some((k) => key.toLowerCase().includes(k))) {
      sanitizedObject[key] = '[REDACTED]';
    } else {
      sanitizedObject[key] = sanitize(value);
    }
  }

  return sanitizedObject;
};

/**
 * Log payload type
 */
interface LogPayload {
  errorId: string;
  message: string;
  method?: string;
  url?: string;
  query: NextApiRequest['query'];
  body: unknown;
  severity: ErrorSeverity;
  layer: string;
  code?: string;
  context?: Record<string, unknown>;
  stack?: string;
  timestamp: string;
}

/**
 * Map severity → logger method
 */
const logBySeverity = (severity: ErrorSeverity, payload: LogPayload): void => {
  switch (severity) {
    case ErrorSeverity.LOW:
      logger.info(payload);
      break;
    case ErrorSeverity.MEDIUM:
      logger.warn(payload);
      break;
    case ErrorSeverity.HIGH:
      logger.error(payload);
      break;
    case ErrorSeverity.CRITICAL:
      logger.fatal(payload);
      break;
    default:
      logger.error(payload);
  }
};

/**
 * Normalize unknown error into Error
 */
const normalizeError = (err: unknown): Error => {
  if (err instanceof Error) return err;

  return new Error(typeof err === 'string' ? err : 'Unknown error occurred');
};

/**
 * App Router equivalent of handleError.
 * Use in the catch block of every API route handler.
 */
export const handleApiError = (err: unknown): NextResponse => {
  const isProduction = process.env.NODE_ENV === 'production';
  const errorId = generateErrorId();

  let error: Error = normalizeError(err);

  if (isPrismaError(error)) {
    error = handlePrismaError(error);
  }

  let status = 500;
  let severity = ErrorSeverity.HIGH;
  let code: string | undefined;
  let context: Record<string, unknown> | undefined;
  let layer = 'unknown';

  if (error instanceof CustomError) {
    status = error.status;
    severity = error.severity;
    code = error.code;
    context = error.context;
    layer = error.layer;
  }

  // Reduced log payload - no req context available in App Router
  logBySeverity(severity, {
    errorId,
    message: error.message,
    method: undefined,
    url: undefined,
    query: {},
    body: undefined,
    severity,
    layer,
    code,
    context,
    stack: !isProduction ? error.stack : undefined,
    timestamp: new Date().toISOString(),
  });

  return NextResponse.json(
    {
      status: 'error',
      message:
        isProduction && status === 500
          ? 'Internal Server Error'
          : error.message,
      ...(!isProduction && {
        errorId,
        ...(code && { code }),
        ...(context && { details: context }),
      }),
    },
    { status },
  );
};

/**
 * Common custom error subclasses
 */
export class NotFoundError extends CustomError {
  constructor(
    message = 'Resource not found',
    options?: {
      layer?: string;
      code?: string;
      context?: Record<string, unknown>;
    },
  ) {
    super(404, message, { ...options, severity: ErrorSeverity.LOW });
  }
}

export class UnauthorizedError extends CustomError {
  constructor(
    message = 'Unauthorized access',
    options?: {
      layer?: string;
      code?: string;
      context?: Record<string, unknown>;
    },
  ) {
    super(401, message, { ...options, severity: ErrorSeverity.MEDIUM });
  }
}

export class ForbiddenError extends CustomError {
  constructor(
    message = 'Access forbidden, you are not allowed to access this resource',
    options?: {
      layer?: string;
      code?: string;
      context?: Record<string, unknown>;
    },
  ) {
    super(403, message, { ...options, severity: ErrorSeverity.MEDIUM });
  }
}

export class ValidationError extends CustomError {
  constructor(
    message = 'Validation failed',
    options?: {
      layer?: string;
      code?: string;
      context?: Record<string, unknown>;
    },
  ) {
    super(400, message, { ...options, severity: ErrorSeverity.LOW });
  }
}

export class InternalServerError extends CustomError {
  constructor(
    message = 'Internal server error',
    options?: {
      layer?: string;
      code?: string;
      context?: Record<string, unknown>;
    },
  ) {
    super(500, message, { ...options, severity: ErrorSeverity.HIGH });
  }
}

export class ConflictError extends CustomError {
  constructor(
    message = 'Conflict detected',
    options?: {
      layer?: string;
      code?: string;
      context?: Record<string, unknown>;
    },
  ) {
    super(409, message, { ...options, severity: ErrorSeverity.MEDIUM });
  }
}

export class BadRequestError extends CustomError {
  constructor(
    message = 'Bad request',
    options?: {
      layer?: string;
      code?: string;
      context?: Record<string, unknown>;
    },
  ) {
    super(400, message, { ...options, severity: ErrorSeverity.LOW });
  }
}

export class MethodNotAllowedError extends CustomError {
  constructor(
    message = 'Method not allowed',
    options?: {
      layer?: string;
      code?: string;
      context?: Record<string, unknown>;
    },
  ) {
    super(405, message, { ...options, severity: ErrorSeverity.MEDIUM });
  }
}

export class TooManyRequestsError extends CustomError {
  constructor(
    message = 'Too many requests',
    options?: {
      layer?: string;
      code?: string;
      context?: Record<string, unknown>;
    },
  ) {
    super(429, message, { ...options, severity: ErrorSeverity.MEDIUM });
  }
}

export class TokenExpiredError extends CustomError {
  constructor(
    message = 'Authentication token expired',
    options?: {
      layer?: string;
      code?: string;
      context?: Record<string, unknown>;
    },
  ) {
    super(401, message, { ...options, severity: ErrorSeverity.MEDIUM });
  }
}
