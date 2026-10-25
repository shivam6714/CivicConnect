/**
 * API client for communicating with the CivicConnect backend.
 * Configured with environment-based base URL and standardized response handling.
 *
 * Token Storage & Security Architecture:
 * - Persisted in browser localStorage under key 'civic_auth_token'.
 * - Automatically attached as 'Authorization: Bearer <token>' for authenticated requests.
 * - Security Trade-off: While localStorage is vulnerable to XSS compared to HttpOnly cookies,
 *   the current backend issues JWT tokens directly in JSON verification payloads.
 *   Tokens are never logged, never rendered in DOM markup, and wiped on logout.
 */

export const TOKEN_STORAGE_KEY = 'civic_auth_token';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000').replace(/\/$/, '');

export interface ApiFetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

export class ApiError extends Error {
  status: number;
  data: unknown;
  details?: unknown;

  constructor(status: number, message: string, data?: unknown, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.details = details;
  }
}

export async function apiClient<T>(endpoint: string, options: ApiFetchOptions = {}): Promise<T> {
  const { params, headers, ...rest } = options;

  let url = `${API_BASE_URL}${endpoint}`;

  if (params) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        query.append(key, String(value));
      }
    });
    const queryString = query.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const token = localStorage.getItem(TOKEN_STORAGE_KEY);

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        ...defaultHeaders,
        ...headers,
      },
      ...rest,
    });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))) {
      throw new ApiError(
        0,
        'Cannot connect to the CivicConnect server. Please verify the backend is running at http://localhost:8000.',
        err
      );
    }
    throw new ApiError(0, error.message || 'Network request failed', err);
  }

  if (!response.ok) {
    let errorData: unknown;
    try {
      errorData = await response.json();
    } catch {
      errorData = await response.text();
    }

    let errorMessage = `Request failed with status ${response.status}`;
    let errorDetails: unknown = undefined;

    if (errorData && typeof errorData === 'object') {
      const payload = errorData as Record<string, unknown>;
      if (payload.error && typeof payload.error === 'object') {
        const errorObj = payload.error as Record<string, unknown>;
        if (typeof errorObj.message === 'string') {
          errorMessage = errorObj.message;
        }
        errorDetails = errorObj.details;

        // If Zod validation issues are present, use the first human-readable validation issue
        if (Array.isArray(errorObj.details) && errorObj.details.length > 0) {
          const firstIssue = errorObj.details[0] as Record<string, unknown>;
          if (typeof firstIssue?.message === 'string') {
            errorMessage = firstIssue.message;
          }
        }
      } else if (typeof payload.message === 'string') {
        errorMessage = payload.message;
      }
    }

    throw new ApiError(response.status, errorMessage, errorData, errorDetails);
  }

  return response.json() as Promise<T>;
}
