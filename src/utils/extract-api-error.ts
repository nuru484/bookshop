// src/utils/extract-api-error.ts
interface ApiErrorResult {
  message: string;
  fieldErrors?: Record<string, string>;
  hasFieldErrors: boolean;
  errorId?: string;
  code?: string;
  status?: number | string;
}

export const extractApiError = (error: unknown): ApiErrorResult => {
  if (!error) {
    return { message: "An unknown error occurred", hasFieldErrors: false };
  }

  // Handle string errors
  if (typeof error === "string") {
    return { message: error, hasFieldErrors: false };
  }

  // Handle RTK Query or API errors
  if (typeof error === "object" && error !== null) {
    // Handle RTK Query FETCH_ERROR (network errors, server down, etc.)
    if (
      "status" in error &&
      error.status === "FETCH_ERROR" &&
      "error" in error
    ) {
      const errorMessage =
        typeof error.error === "string"
          ? error.error
          : "Network error - unable to connect to server";
      return {
        message: errorMessage,
        hasFieldErrors: false,
        status: "FETCH_ERROR",
      };
    }

    // Handle RTK Query PARSING_ERROR
    if (
      "status" in error &&
      error.status === "PARSING_ERROR" &&
      "error" in error
    ) {
      return {
        message: "Failed to parse server response",
        hasFieldErrors: false,
        status: "PARSING_ERROR",
      };
    }

    // Handle RTK Query TIMEOUT_ERROR
    if ("status" in error && error.status === "TIMEOUT_ERROR") {
      return {
        message: "Request timed out",
        hasFieldErrors: false,
        status: "TIMEOUT_ERROR",
      };
    }

    // RTK Query error with status and data
    if ("status" in error && "data" in error) {
      const { data } = error;
      const status =
        typeof error.status === "number" || typeof error.status === "string"
          ? error.status
          : undefined;

      if (typeof data === "string") {
        return { message: data, hasFieldErrors: false, status };
      }

      if (data && typeof data === "object") {
        if ("status" in data && data.status === "error") {
          const result: ApiErrorResult = {
            message:
              "message" in data && typeof data.message === "string"
                ? data.message
                : "An error occurred",
            hasFieldErrors: false,
            status,
          };

          // ID and code if available (non-production)
          if ("errorId" in data && typeof data.errorId === "string") {
            result.errorId = data.errorId;
          }
          if ("code" in data && typeof data.code === "string") {
            result.code = data.code;
          }

          // Check for field-specific validation errors in details.errors
          if (
            "details" in data &&
            data.details &&
            typeof data.details === "object" &&
            "errors" in data.details &&
            Array.isArray(data.details.errors)
          ) {
            const fieldErrors: Record<string, string[]> = {};

            // Group errors by field
            data.details.errors.forEach((error: unknown) => {
              if (
                error &&
                typeof error === "object" &&
                "field" in error &&
                "message" in error &&
                typeof error.field === "string" &&
                typeof error.message === "string"
              ) {
                if (!fieldErrors[error.field]) {
                  fieldErrors[error.field] = [];
                }
                fieldErrors[error.field].push(error.message);
              }
            });

            if (Object.keys(fieldErrors).length > 0) {
              // Convert to the expected format (first error message for each field)
              const formattedFieldErrors: Record<string, string> = {};
              Object.entries(fieldErrors).forEach(([field, messages]) => {
                formattedFieldErrors[field] = messages[0]; // Use first error message
                // Or join multiple messages: messages.join(', ')
              });

              result.fieldErrors = formattedFieldErrors;
              result.hasFieldErrors = true;
            }
          }

          // Also check for field errors in details.fieldErrors (object format - fallback)
          if (
            "details" in data &&
            data.details &&
            typeof data.details === "object" &&
            "fieldErrors" in data.details &&
            typeof data.details.fieldErrors === "object" &&
            data.details.fieldErrors !== null
          ) {
            const fieldErrors: Record<string, string> = {};
            let hasValidFieldErrors = false;

            Object.entries(data.details.fieldErrors).forEach(
              ([field, messages]) => {
                if (Array.isArray(messages) && messages.length > 0) {
                  fieldErrors[field] = messages[0];
                  hasValidFieldErrors = true;
                } else if (typeof messages === "string") {
                  fieldErrors[field] = messages;
                  hasValidFieldErrors = true;
                }
              },
            );

            if (hasValidFieldErrors) {
              result.fieldErrors = fieldErrors;
              result.hasFieldErrors = true;
            }
          }

          return result;
        }

        // Handle field-specific validation errors (legacy format or other APIs)
        if (
          "errors" in data &&
          typeof data.errors === "object" &&
          data.errors !== null
        ) {
          const fieldErrors: Record<string, string> = {};
          let hasValidFieldErrors = false;

          Object.entries(data.errors).forEach(([field, messages]) => {
            if (Array.isArray(messages) && messages.length > 0) {
              fieldErrors[field] = messages[0];
              hasValidFieldErrors = true;
            } else if (typeof messages === "string") {
              fieldErrors[field] = messages;
              hasValidFieldErrors = true;
            }
          });

          if (hasValidFieldErrors) {
            const generalMessage =
              "message" in data && typeof data.message === "string"
                ? data.message
                : "Validation failed";

            return {
              message: generalMessage,
              fieldErrors,
              hasFieldErrors: true,
              status,
            };
          }
        }

        // Handle general error messages
        if ("message" in data && typeof data.message === "string") {
          return { message: data.message, hasFieldErrors: false, status };
        }
        if ("error" in data && typeof data.error === "string") {
          return { message: data.error, hasFieldErrors: false, status };
        }

        // Handle array of errors (non-field specific)
        if ("errors" in data && Array.isArray(data.errors)) {
          const message = data.errors
            .map((e: { message?: string }) => e.message || String(e))
            .join(", ");
          return { message, hasFieldErrors: false, status };
        }
      }

      // Handle HTTP status codes with no specific data
      if (typeof error.status === "number") {
        const statusMessages: Record<number, string> = {
          400: "Bad request",
          401: "Unauthorized - please log in",
          403: "Access forbidden",
          404: "Resource not found",
          500: "Internal server error",
          502: "Bad gateway",
          503: "Service unavailable",
        };

        const message =
          statusMessages[error.status] || `HTTP ${error.status} error`;
        return { message, hasFieldErrors: false, status: error.status };
      }
    }

    // JavaScript Error or objects with message
    if ("message" in error && typeof error.message === "string") {
      return { message: error.message, hasFieldErrors: false };
    }

    // Handle cases where error is an object but doesn't match expected patterns
    if ("error" in error && typeof error.error === "string") {
      return { message: error.error, hasFieldErrors: false };
    }
  }

  // Fallback - try to convert to string
  try {
    const stringified = JSON.stringify(error);
    if (stringified && stringified !== "{}") {
      return { message: `Error: ${stringified}`, hasFieldErrors: false };
    }
  } catch {
    // JSON.stringify failed, fall through to final fallback
  }

  return { message: "An unknown error occurred", hasFieldErrors: false };
};
