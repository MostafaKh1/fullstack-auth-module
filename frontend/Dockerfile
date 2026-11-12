# nginx proxies /api to the back end so the browser sees one origin: the refresh cookie and the Origin check rely on it.
# Built from the repository root (compose.yaml), so the workspace lockfile and the contract package are in reach.

FROM node:22-alpine AS build
WORKDIR /app
# npm ci checks every workspace's manifest against the root lockfile, so all four are copied.
COPY package.json package-lock.json ./
COPY contract/package.json ./contract/
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
COPY e2e/package.json ./e2e/
# The root's `prepare` runs husky, which a workspace-only install leaves out; the native tools arrive as optional
# per-platform packages, so no install script is needed.
RUN npm ci --workspace contract --workspace frontend --ignore-scripts
COPY contract/tsconfig.json ./contract/
COPY contract/src ./contract/src
RUN npm run build --workspace contract
COPY frontend ./frontend
RUN npm run build --workspace frontend

FROM nginxinc/nginx-unprivileged:1.29-alpine
ENV BACKEND_URL=http://backend:3000
COPY frontend/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/frontend/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=5 \
  CMD wget -qO /dev/null http://127.0.0.1:8080/ || exit 1
