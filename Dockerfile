# Multi-stage build for Advanced Diagram Detection System
FROM node:18-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
FROM base AS deps
RUN npm ci --only=production && npm cache clean --force

# Build stage
FROM base AS build
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache \
    cairo \
    jpeg \
    pango \
    giflib \
    pixman \
    libjpeg-turbo \
    freetype

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nuxt -u 1001

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=build --chown=nuxt:nodejs /app/.output /app/.output
COPY --from=deps --chown=nuxt:nodejs /app/node_modules /app/node_modules

# Copy package.json for metadata
COPY --chown=nuxt:nodejs package.json ./

# Set environment variables
ENV NODE_ENV=production
ENV NUXT_HOST=0.0.0.0
ENV NUXT_PORT=3000

# Expose port
EXPOSE 3000

# Switch to non-root user
USER nuxt

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node --eval "
        const http = require('http');
        const options = {
            host: 'localhost',
            port: 3000,
            timeout: 2000,
            path: '/health'
        };
        const request = http.request(options, (res) => {
            console.log('Health check status:', res.statusCode);
            process.exit(res.statusCode === 200 ? 0 : 1);
        });
        request.on('error', (err) => {
            console.error('Health check failed:', err);
            process.exit(1);
        });
        request.end();
    "

# Start the application
CMD ["node", ".output/server/index.mjs"]