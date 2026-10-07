# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --only=production

# ── Stage 2: Production image ──────────────────────────────────────────────────
FROM node:18-alpine

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001

# Copy installed dependencies from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy source code
COPY src ./src
COPY package*.json ./

# Set ownership
RUN chown -R nodeuser:nodejs /app

# Switch to non-root user
USER nodeuser

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:5000/health || exit 1

# Start server
CMD ["node", "src/server.js"]
