# Multi-stage build for minimal image size
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build if needed (tsx runs TypeScript directly, so optional)
# RUN npm run build

# Production stage
FROM node:20-slim

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --production

# Copy built application and source (tsx needs source)
COPY --from=builder /app .

# Install tsx globally for running TypeScript
RUN npm install -g tsx

# Set environment to production
ENV NODE_ENV=production

# Default command (will be overridden by Cloud Run Job)
CMD ["tsx", "crawl.ts", "--help"]
