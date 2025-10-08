# Multi-stage Dockerfile for the Node.js crawler backend

# Build stage
FROM node:20.18 AS builder
WORKDIR /usr/src/app

# Install app dependencies (only production deps will be copied later)
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund

# Copy source
COPY . .

# Production stage
FROM node:20.18-slim
WORKDIR /usr/src/app

# Create non-root user
RUN useradd --user-group --create-home --shell /bin/false appuser || true

# Copy only needed files from builder
COPY --from=builder /usr/src/app .

# Expose nothing by default; this is a worker. If your app listens on HTTP, set PORT env.
ENV NODE_ENV=production

# Use a non-root user for security
USER appuser

# Default command: use the package.json `start` script. In development `start` uses nodemon
CMD ["npm", "start"]