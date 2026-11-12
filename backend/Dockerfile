# Built from the repository root (compose.yaml), so the workspace lockfile and the contract package are in reach.

FROM node:22-alpine AS build
WORKDIR /app
# npm ci checks every workspace's manifest against the root lockfile, so all four are copied.
COPY package.json package-lock.json ./
COPY contract/package.json ./contract/
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
COPY e2e/package.json ./e2e/
# The root's `prepare` runs husky, which a workspace-only install leaves out; nothing the back end needs runs a script.
RUN npm ci --workspace contract --workspace backend --ignore-scripts
COPY contract/tsconfig.json ./contract/
COPY contract/src ./contract/src
RUN npm run build --workspace contract
COPY backend/tsconfig.json backend/tsconfig.build.json ./backend/
COPY backend/src ./backend/src
RUN npm run build --workspace backend

FROM node:22-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY contract/package.json ./contract/
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
COPY e2e/package.json ./e2e/
RUN npm ci --workspace backend --omit=dev --ignore-scripts

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY contract/package.json ./contract/
COPY --from=build /app/contract/dist ./contract/dist
COPY backend/package.json ./backend/
COPY --from=build /app/backend/dist ./backend/dist
WORKDIR /app/backend
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "dist/main.js"]
