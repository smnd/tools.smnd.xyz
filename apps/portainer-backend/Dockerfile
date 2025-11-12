FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy only the backend app
COPY apps/portainer-backend ./apps/portainer-backend

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build TypeScript (backend only)
RUN pnpm --filter portainer-updater-backend build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy backend package.json
COPY apps/portainer-backend/package.json ./

# Copy dependencies from builder (pnpm hoists to root node_modules)
COPY --from=builder /app/node_modules ./node_modules

# Copy built files from builder
COPY --from=builder /app/apps/portainer-backend/dist ./dist

# Create data directory
RUN mkdir -p /app/data

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/app/data
ENV CONFIG_PATH=/app/config.json

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
CMD ["node", "dist/index.js"]
