import { AuthService } from '../../features/auth/services/auth.service.js';

const DEFAULT_BASE_URL = '/api/v1';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  baseUrl?: string;
  signal?: AbortSignal;
  retries?: number;
  retryDelayMs?: number;
}

type TokenProvider = () => string | null;

let customTokenProvider: TokenProvider | null = null;

/**
 * Permite inyectar un proveedor de tokens desacoplado (útil para pruebas o middleware).
 */
export function setTokenProvider(provider: TokenProvider | null): void {
  customTokenProvider = provider;
}

function resolveToken(): string | null {
  if (customTokenProvider) {
    return customTokenProvider();
  }
  return AuthService.getLegacyToken();
}

const CSRF_COOKIE = 'restostock_csrf';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function readCsrfCookie(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const entry = document.cookie.split('; ').find((part) => part.startsWith(`${CSRF_COOKIE}=`));
  return entry ? decodeURIComponent(entry.slice(CSRF_COOKIE.length + 1)) : undefined;
}

/**
 * TK-140 / ADR-005: cabeceras de sesión de una petición. El navegador adjunta solo la cookie
 * `httpOnly`; aquí se añade el token CSRF que exigen las mutaciones, y `Authorization` solo
 * para una sesión heredada de antes de TK-140 (o un proveedor inyectado).
 */
export function sessionHeaders(method: string): Record<string, string> {
  const headers: Record<string, string> = {};
  const token = resolveToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const csrf = readCsrfCookie();
  if (csrf && !SAFE_METHODS.has(method)) {
    headers['X-CSRF-Token'] = csrf;
  }
  return headers;
}

/**
 * Cliente HTTP compartido — maneja autenticación, deserialización, captura de errores
 * RFC 7807 y resiliencia de red (reintentos exponenciales y cancelación con AbortSignal).
 */
import { mapToUserFriendlyError } from '../utils/errorMessageMapper.js';

async function readErrorBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

/** Mensaje de un cuerpo RFC 7807 (o de sus alias de compatibilidad), con el estado como último recurso. */
function problemMessage(errorBody: unknown, status: number): string {
  const parsed = errorBody as { detail?: string; message?: string; error?: string; title?: string } | undefined;
  return parsed?.detail || parsed?.message || parsed?.error || parsed?.title || `Error HTTP ${status}`;
}

async function parseErrorResponse(response: Response): Promise<never> {
  const errorBody = await readErrorBody(response);
  const rawMessage = problemMessage(errorBody, response.status);

  const tempApiError = new ApiError(response.status, rawMessage, errorBody);
  const friendly = mapToUserFriendlyError(tempApiError);

  if (response.status === 401) {
    AuthService.logout();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('restostock:unauthorized', { detail: { message: friendly.message } }));
    }
  }

  throw new ApiError(response.status, friendly.message, errorBody);
}



function isTransientError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return [502, 503, 504].includes(error.status);
  }
  if (error instanceof Error) {
    return error.name === 'TypeError' || error.message.includes('fetch') || error.message.includes('network');
  }
  return false;
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendOnce<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    await parseErrorResponse(response);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

function shouldRetry(error: unknown, attemptsLeft: boolean, signal?: AbortSignal): boolean {
  return attemptsLeft && !signal?.aborted && isTransientError(error);
}

function buildRequestInit({ method = 'GET', body, signal }: ApiRequestOptions): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json', ...sessionHeaders(method) },
    credentials: 'same-origin',
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  };
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { baseUrl = DEFAULT_BASE_URL, signal, retries = 0, retryDelayMs = 100 } = options;
  const init = buildRequestInit(options);
  const maxAttempts = Math.max(1, retries + 1);

  for (let attempt = 0; ; attempt++) {
    try {
      return await sendOnce<T>(`${baseUrl}${path}`, init);
    } catch (err) {
      if (!shouldRetry(err, attempt + 1 < maxAttempts, signal)) {
        throw err;
      }
      await delay(retryDelayMs * Math.pow(2, attempt));
    }
  }
}
