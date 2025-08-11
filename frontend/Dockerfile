# Use official Node.js image
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy package.json and pnpm-lock.yaml first (to optimize caching)
COPY package.json pnpm-lock.yaml ./

# Install dependencies with pnpm
RUN pnpm install --frozen-lockfile

# Copy the rest of the frontend application
COPY . . 

# Build the Next.js project
RUN pnpm run build

# Production stage
FROM node:18-alpine AS runner

# Set working directory
WORKDIR /app

# Install pnpm globally and curl for health checks
RUN npm install -g pnpm && \
    apk add --no-cache curl

# Copy only necessary files from builder stage
COPY --from=builder /app/.next .next
COPY --from=builder /app/node_modules node_modules
COPY --from=builder /app/public public
COPY --from=builder /app/package.json package.json

# Expose port 3000
EXPOSE 3000

# Start the Next.js server
CMD ["pnpm", "start"]