# ADAPT: atlib-msp-customer-portal/Dockerfile; clean FACTACT dependencies and Node 24.
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
COPY apps/web/package.json apps/web/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/application/package.json packages/application/package.json
RUN npm ci
COPY tsconfig.json ./
COPY apps ./apps
COPY packages ./packages
RUN npm run build

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
COPY apps/web/package.json apps/web/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/application/package.json packages/application/package.json
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
USER node
EXPOSE 8080
CMD ["node", "dist/server/main.js"]
