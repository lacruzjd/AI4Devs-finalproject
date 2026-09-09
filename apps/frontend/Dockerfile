FROM node:24-alpine AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/frontend/package.json ./apps/frontend/
COPY apps/frontend/tsconfig.json ./apps/frontend/

RUN corepack enable && corepack prepare pnpm@9 --activate && pnpm install --frozen-lockfile

COPY apps/frontend ./apps/frontend

RUN pnpm --filter @restostock/frontend build

# nginx:stable-alpine (no nginx:1.27-alpine, fijo en Alpine 3.21 desactualizado con 35 CVEs
# High/Critical vía `trivy image`) — nginx:stable-alpine rastrea la rama estable de nginx
# reconstruida contra el Alpine mas reciente (3.24, 0 CVEs High/Critical al validar, TK-044).
FROM nginx:stable-alpine AS runner

# TK-134: aplica los parches de seguridad de los paquetes de SO del base (libcrypto3/OpenSSL,
# util-linux) publicados tras el pin del tag — `docker build` reutiliza la capa cacheada del
# base y no vería los fixes. Determinista: trae la versión corregida desde el repo de Alpine.
RUN apk --no-cache upgrade

# TK-142: la config es una PLANTILLA. La imagen oficial de nginx ejecuta
# /docker-entrypoint.d/20-envsubst-on-templates.sh, que expande /etc/nginx/templates/*.template
# hacia /etc/nginx/conf.d/ al arrancar. Sin esto el upstream quedaba hardcodeado al alias
# `backend` de docker-compose, inexistente en cualquier otro entorno (ADR-006).
COPY apps/frontend/nginx.conf.template /etc/nginx/templates/default.conf.template

# Defaults = el comportamiento previo EXACTO, para que docker-compose y OpenTofu sigan
# funcionando sin cambios. Render los sobreescribe con su hostname interno y su PORT.
ENV BACKEND_ORIGIN=http://backend:3000
ENV NGINX_PORT=8080
# Acota envsubst a estas dos variables: sin filtro tambien sustituiria las propias de nginx
# ($uri, $host, $remote_addr, $scheme) y la $spa_csp que define TK-141.
ENV NGINX_ENVSUBST_FILTER='^(BACKEND_ORIGIN|NGINX_PORT)$'

RUN addgroup -S restostock && adduser -S restostock -G restostock && \
    sed -i '/user  nginx;/d' /etc/nginx/nginx.conf && \
    touch /var/run/nginx.pid && \
    chown -R restostock:restostock /var/cache/nginx /var/run/nginx.pid /etc/nginx/conf.d

COPY --from=builder --chown=restostock:restostock /app/apps/frontend/dist /usr/share/nginx/html

USER restostock

EXPOSE 8080

# 127.0.0.1 (no `localhost`): `localhost` resuelve primero a ::1 (IPv6) y nginx
# solo escucha en IPv4:8080 — el healthcheck con `localhost` daba "unhealthy"
# pese a que la app respondía correctamente.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${NGINX_PORT}" || exit 1

CMD ["nginx", "-g", "daemon off;"]
