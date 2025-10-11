# ===== Dockerfile (recommended: Debian-slim) =====
# Multi-stage build for smaller final image and reproducible python availability

### BUILD STAGE ###
FROM node:20-slim AS builder

# Install python3, pip and build tools for any native modules
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
    python3 python3-pip python3-dev build-essential ca-certificates curl \
 && ln -sf /usr/bin/python3 /usr/bin/python \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install deps
COPY package*.json ./
RUN npm ci

# Copy rest of app and build
COPY . .
# If your Next app requires environment variables during build, set them here (only if needed)
RUN npm run build

### RUNTIME STAGE ###
FROM node:20-slim AS runner

# Install python runtime only (keeps runtime image smaller)
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 python3-pip ca-certificates \
 && ln -sf /usr/bin/python3 /usr/bin/python \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Copy the Next standalone output and other necessary files from builder
# The following copies assume you used `next build`/standalone mode and have .next/standalone
COPY --from=builder /app/.next/standalone ./         
COPY --from=builder /app/.next/static ./.next/static  
COPY --from=builder /app/public ./public              
COPY --from=builder /app/python ./python              
COPY --from=builder /app/node_modules ./node_modules  

# Create uploads dir & drop privileges
RUN mkdir -p /app/uploads \
 && groupadd --gid 1001 nextgroup || true \
 && useradd --uid 1001 --gid 1001 --create-home --shell /bin/false nextuser || true \
 && chown -R nextuser:nextgroup /app

USER nextuser

EXPOSE 3000

# Entrypoint should launch the standalone server created by next/standalone build
CMD ["node", "server.js"]
