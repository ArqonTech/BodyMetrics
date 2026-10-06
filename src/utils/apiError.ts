export interface ApiErrorLike {
  code?: string;
  message?: string;
  response?: {
    data?: {
      errors?: Record<string, string[]>;
      detail?: string;
      title?: string;
    };
  };
}

export const asApiError = (err: unknown): ApiErrorLike => (err ?? {}) as ApiErrorLike;
