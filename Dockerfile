# Stage 1: Build frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Install backend dependencies
FROM node:18-alpine AS backend-builder
WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm install --only=production
COPY backend/ ./

# Stage 3: Production image
FROM node:18-alpine
WORKDIR /app

# Install minimal deps
RUN apk add --no-cache dumb-init

# Copy backend
COPY --from=backend-builder /app/backend ./backend

# Copy frontend build into backend/public
COPY --from=frontend-builder /app/frontend/dist ./backend/public

# Create logs/uploads dirs
RUN mkdir -p /app/backend/logs /app/backend/uploads

# Switch to non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
USER nextjs

EXPOSE 5100

# Healthcheck → match Express (/api/health)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5100/api/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "backend/src/index.js"]
