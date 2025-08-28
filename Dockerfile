# Multi-stage build for Vigi App
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/

# Install dependencies for root, frontend, and backend
RUN npm ci --only=production && \
    cd frontend && npm ci && \
    cd ../backend && npm ci

# Copy all source code
COPY . .

# Fix permissions for node_modules binaries
RUN find /app -name "node_modules" -type d -exec chmod -R +x {}/\.bin \; || true

# Build frontend with direct npx call
RUN cd frontend && npx vite build

# Production stage
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 -G nodejs

WORKDIR /app

# Copy backend package files and install production dependencies
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --only=production && npm cache clean --force

# Copy backend source
COPY backend/ ./backend/
COPY --from=builder /app/frontend/dist ./frontend/dist

# Create uploads directory with correct permissions
RUN mkdir -p backend/uploads && \
    chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node backend/healthcheck.js

# Start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "backend/server.js"]