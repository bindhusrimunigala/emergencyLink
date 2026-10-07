# ── Stage 1: Build React app ───────────────────────────────────────────────────
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files and install all dependencies (including devDeps for build)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY public ./public
COPY src ./src
ARG REACT_APP_API_URL=/api
ARG REACT_APP_SOCKET_URL=http://localhost:5000
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_SOCKET_URL=$REACT_APP_SOCKET_URL

RUN npm run build

# ── Stage 2: Serve with Nginx ──────────────────────────────────────────────────
FROM nginx:alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built React app
COPY --from=builder /app/build /usr/share/nginx/html

# Non-root user
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:80 || exit 1

CMD ["nginx", "-g", "daemon off;"]
