# QuickSheets Excel add-in – build then serve with nginx
# Office requires HTTPS for the add-in; put behind HTTPS reverse proxy or use a tunnel (e.g. ngrok).

FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM nginx:alpine AS runner

# Serve task pane and assets from / (so /taskpane/taskpane.html, etc.)
COPY --from=builder /app/dist /usr/share/nginx/html
# Default nginx config serves static from /usr/share/nginx/html
# Optional: custom config for SPA or cache headers
RUN chown -R nginx:nginx /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
