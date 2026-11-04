# Stage 1: build the static site with Node
FROM node:24-alpine AS build
WORKDIR /app

# Install dependencies first so this layer is cached between code changes
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Optional build settings (see .env.example). Defaults serve the site at "/".
ARG VITE_BASE=/
ARG VITE_SITE_URL=
ENV VITE_BASE=$VITE_BASE VITE_SITE_URL=$VITE_SITE_URL

RUN npm run build

# Stage 2: serve the built files with nginx
FROM nginx:1.29-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 83
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:83/ >/dev/null || exit 1
