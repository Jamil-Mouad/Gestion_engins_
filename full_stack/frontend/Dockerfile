# syntax=docker/dockerfile:1
# Build the Angular app and serve it via nginx (also reverse-proxies /api to the gateway).
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
# The project carries known peer-dependency conflicts (e.g. lucide-angular /
# ngx-charts) that it installs through; honor the lockfile but allow them.
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html
EXPOSE 80
