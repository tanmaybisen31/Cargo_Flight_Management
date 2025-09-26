# Multi-stage build: build with devDeps, serve via Nginx with /api proxy

# 1) Build stage (Debian-based to avoid musl/rollup native issues)
FROM node:20-bullseye-slim AS build
WORKDIR /app

# Ensure rollup native binary isn't required on arm64
ENV ROLLUP_SKIP_NODEJS_NATIVE=1

# Copy package files and install ALL deps (including devDependencies for Vite)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# 2) Runtime stage (Nginx serving static files)
FROM nginx:alpine

# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx config that proxies /api to the backend service
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]