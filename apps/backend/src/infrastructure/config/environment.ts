import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load .env file into process.env if present
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'apps/backend/.env') });

// `docker-compose` con `${VAR:-}` (y un `.env` con la clave presente pero vacía) inyecta la
// variable como cadena vacía, no como ausente. Sin esto, `"".url()` / `"".min(16)` fallan la
// validación de formato antes de que `.optional()` tenga oportunidad de aplicar → arranque abortado
// aunque la variable sea legítimamente opcional. Normaliza "" a `undefined`.
const optionalEnv = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => (value === '' ? undefined : value), schema.optional());

function isHttpOrigin(candidate: string): boolean {
  if (!URL.canParse(candidate)) return false;
  const url = new URL(candidate);
  return (url.protocol === 'http:' || url.protocol === 'https:') && url.origin === candidate;
}

interface SmtpCoherenceInput {
  NODE_ENV: string;
  CORS_ALLOWED_ORIGINS: string;
  CLIENT_ORIGIN?: string;
  SMTP_HOST?: string;
  SMTP_REQUIRE_TLS: boolean;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  SMTP_FROM?: string;
}

/** Coherencia de la configuración SMTP (TK-179, endurecida en AUDIT-DEV-018). */
const SMTP_COHERENCE_RULES: { path: string; message: string; violated: (env: SmtpCoherenceInput) => boolean }[] = [
  {
    path: 'SMTP_FROM',
    message: 'SMTP_FROM es obligatorio cuando se define SMTP_HOST.',
    violated: (env) => Boolean(env.SMTP_HOST) && !env.SMTP_FROM,
  },
  {
    path: 'SMTP_PASS',
    message: 'SMTP_PASS es obligatorio cuando se define SMTP_USER.',
    violated: (env) => Boolean(env.SMTP_USER) && !env.SMTP_PASS,
  },
  {
    path: 'SMTP_USER',
    message: 'SMTP_USER es obligatorio cuando se define SMTP_PASS.',
    violated: (env) => Boolean(env.SMTP_PASS) && !env.SMTP_USER,
  },
  {
    path: 'SMTP_REQUIRE_TLS',
    message: 'SMTP_REQUIRE_TLS no puede ser false en producción.',
    violated: (env) => Boolean(env.SMTP_HOST) && env.NODE_ENV === 'production' && !env.SMTP_REQUIRE_TLS,
  },
  // AUDIT-DEV-018 D-2: con CORS "*" el caso de uso aceptaría cualquier header Origin para el
  // enlace de reset; mientras solo iba a los logs era inocuo, entregado por correo es reset-poisoning.
  {
    path: 'CLIENT_ORIGIN',
    message: 'Con SMTP_HOST definido, CLIENT_ORIGIN es obligatorio si CORS_ALLOWED_ORIGINS es "*": el enlace de recuperación no puede tomar el origen de la petición.',
    violated: (env) => Boolean(env.SMTP_HOST) && !env.CLIENT_ORIGIN && env.CORS_ALLOWED_ORIGINS === '*',
  },
];

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform((val) => parseInt(val, 10)).default('3000'),
  DATABASE_URL: z.string().url('DATABASE_URL debe ser una URI valida de PostgreSQL'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET debe contener al menos 16 caracteres para alta entropia.'),
  // `*` o una lista de orígenes separada por comas. El middleware `cors` compara el header
  // `Origin` por igualdad exacta, así que un hostname sin esquema o con barra final no falla:
  // rechaza en silencio al frontend legítimo (PM-001). Cada elemento debe ser ya su propio
  // `URL.origin`. Vacío (docker-compose sin la variable) cuenta como ausente.
  CORS_ALLOWED_ORIGINS: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z
      .string()
      .default('*')
      .superRefine((value, ctx) => {
        if (value === '*') return;
        for (const origin of value.split(',').map((item) => item.trim()).filter((item) => item.length > 0)) {
          if (!isHttpOrigin(origin)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `CORS_ALLOWED_ORIGINS contiene "${origin}", que no es un origen http(s) exacto (esquema + host [+ puerto], sin ruta ni barra final). Ejemplo: https://app.example.com`,
            });
          }
        }
      })
  ),
  // Clave dedicada para el cifrado AES-256-GCM de credenciales de terceros (API keys de IA).
  // Separada de JWT_SECRET a propósito (AUDIT-SEC-004): rotar el JWT no debe volver ilegibles
  // las credenciales cifradas, y una fuga de una no compromete la otra.
  ENCRYPTION_KEY: optionalEnv(z.string().min(16, 'ENCRYPTION_KEY debe tener al menos 16 caracteres.')),
  // Origen (esquema+host) del frontend, usado para construir el enlace del email de
  // recuperación de PIN. En producción NO se confía en el header `Origin` de la petición.
  CLIENT_ORIGIN: optionalEnv(z.string().url('CLIENT_ORIGIN debe ser una URL válida.')),
  RATE_LIMIT_WINDOW_MS: z.string().transform((val) => parseInt(val, 10)).default('900000'), // 15 minutos
  RATE_LIMIT_MAX_REQUESTS: z.string().transform((val) => parseInt(val, 10)).default('300'), // global /api/v1/*, por cliente real (AUDIT-SEC-003)
  LOGIN_RATE_LIMIT_WINDOW_MS: z.string().transform((val) => parseInt(val, 10)).default('900000'),
  LOGIN_RATE_LIMIT_MAX: z.string().transform((val) => parseInt(val, 10)).default('10'), // anti-fuerza-bruta login/forgot/reset PIN (Guard 16)
  // Servidor SMTP del correo de recuperación de PIN (TK-179 / INC-002). Todo opcional: sin
  // SMTP_HOST se mantiene ConsoleEmailService y el aviso de arranque, para no romper un
  // despliegue que aún no tiene proveedor de correo. SMTP_SECURE=true es TLS implícito (465);
  // con false se usa STARTTLS, obligatorio salvo SMTP_REQUIRE_TLS=false (ver abajo).
  SMTP_HOST: optionalEnv(z.string().min(1)),
  SMTP_PORT: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z
      .string()
      .regex(/^\d+$/, 'SMTP_PORT debe ser un número de puerto.')
      .default('587')
      .transform((val) => parseInt(val, 10))
      .refine((port) => port >= 1 && port <= 65535, 'SMTP_PORT debe estar entre 1 y 65535.')
  ),
  SMTP_SECURE: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.enum(['true', 'false'], { message: 'SMTP_SECURE debe ser "true" o "false".' }).default('false').transform((val) => val === 'true')
  ),
  // AUDIT-DEV-018 D-1: sin requireTLS, nodemailer solo cifra si el servidor anuncia STARTTLS, y
  // un atacante en la ruta puede quitarlo para leer SMTP_PASS y el token de reset en claro.
  // Solo se puede desactivar fuera de producción (servidor SMTP local de pruebas sin TLS).
  SMTP_REQUIRE_TLS: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.enum(['true', 'false'], { message: 'SMTP_REQUIRE_TLS debe ser "true" o "false".' }).default('true').transform((val) => val === 'true')
  ),
  SMTP_USER: optionalEnv(z.string().min(1)),
  SMTP_PASS: optionalEnv(z.string().min(1)),
  SMTP_FROM: optionalEnv(z.string().min(3)),
}).superRefine((env, ctx) => {
  for (const rule of SMTP_COHERENCE_RULES) {
    if (rule.violated(env)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [rule.path], message: rule.message });
    }
  }
});

export type Environment = z.infer<typeof environmentSchema>;

/** AUDIT-DEV-018 D-6: combinaciones SMTP que arrancan pero casi seguro no funcionarán. */
function warnSmtpInconsistencies(env: Environment): void {
  if (!env.SMTP_HOST) {
    if (env.SMTP_USER || env.SMTP_PASS || env.SMTP_FROM) {
      console.warn('[config] Hay variables SMTP definidas sin SMTP_HOST: se ignoran y el correo de recuperación no se envía.');
    }
    return;
  }
  if (env.SMTP_PORT === 465 && !env.SMTP_SECURE) {
    console.warn('[config] SMTP_PORT=465 suele exigir TLS implícito: revisa SMTP_SECURE (está a false).');
  } else if (env.SMTP_PORT === 587 && env.SMTP_SECURE) {
    console.warn('[config] SMTP_PORT=587 suele usar STARTTLS: revisa SMTP_SECURE (está a true).');
  }
}

export function getEnvironment(env: Record<string, string | undefined> = process.env): Environment {
  const result = environmentSchema.safeParse(env);
  if (!result.success) {
    const errorFormatted = result.error.format();
    throw new Error(
      `Error de configuracion de entorno Fail-Fast (Guard 14): ${JSON.stringify(errorFormatted, null, 2)}`
    );
  }

  warnSmtpInconsistencies(result.data);

  if (result.data.NODE_ENV === 'production') {
    if (result.data.JWT_SECRET.length < 32) {
      throw new Error(
        'CONFIG FATAL (Guard 14): En entorno de produccion, JWT_SECRET debe tener una entropia minima de 32 caracteres.'
      );
    }

    if (result.data.CORS_ALLOWED_ORIGINS === '*') {
      throw new Error(
        'CONFIG FATAL (Guard 14): En entorno de produccion, CORS_ALLOWED_ORIGINS no puede ser un comodin "*". Especifique los dominios permitidos.'
      );
    }

    if (result.data.JWT_SECRET.includes('dev') || result.data.JWT_SECRET.includes('default')) {
      throw new Error(
        'CONFIG FATAL (Guard 14): En entorno de produccion, JWT_SECRET no puede usar valores por defecto de desarrollo.'
      );
    }

    if (!result.data.ENCRYPTION_KEY) {
      throw new Error(
        'CONFIG FATAL (Guard 14 / AUDIT-SEC-004): En produccion ENCRYPTION_KEY es obligatorio — sin el, el cifrado de credenciales cae a un valor no seguro.'
      );
    }

    if (result.data.ENCRYPTION_KEY === result.data.JWT_SECRET) {
      throw new Error(
        'CONFIG FATAL (Guard 14 / AUDIT-SEC-004): ENCRYPTION_KEY no puede ser igual a JWT_SECRET — deben ser secretos independientes.'
      );
    }
    // Nota: no hace falta un fail-fast dedicado para CLIENT_ORIGIN — el check de
    // CORS_ALLOWED_ORIGINS != "*" de arriba ya garantiza un allowlist concreto en producción, y
    // `RequestAdminPinResetUseCase.resolveResetOrigin` sólo usa un `Origin` de la petición si
    // está en ese allowlist (si no, cae al primer origen concreto). CLIENT_ORIGIN es opcional
    // y sólo fija el origen canónico cuando se quiere forzar uno distinto del primero del CORS.
  }

  return result.data;
}
