import { createApp } from './app.js';
import { getEnvironment } from '../config/environment.js';
import { prisma } from '../database/prisma.client.js';
import { buildEmailServiceForEnvironment, buildRepositoriesForEnvironment } from './composition.js';

const env = getEnvironment();
const productionRepositories = buildRepositoriesForEnvironment(env.NODE_ENV, prisma);
const emailService = buildEmailServiceForEnvironment(env);
const app = createApp({ jwtSecret: env.JWT_SECRET, ...productionRepositories, emailService });

// TK-179 / INC-002: un SMTP mal configurado no puede volver a fallar en silencio. No aborta el
// arranque (decisión humana 2026-10-01): avisa en los logs y el resto del sistema sigue en pie.
emailService
  ?.verifyConnection()
  .then(() => console.log(`📧 Servidor SMTP verificado en ${env.SMTP_HOST}:${env.SMTP_PORT}.`))
  .catch((error: unknown) => {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`[startup] El servidor SMTP ${env.SMTP_HOST}:${env.SMTP_PORT} no responde o rechaza las credenciales: ${reason}. La recuperación de PIN no enviará correos.`);
  });

app.listen(env.PORT, () => {
  console.log(`🚀 RestoStock Backend corriendo en http://localhost:${env.PORT} en modo [${env.NODE_ENV}]`);
});
