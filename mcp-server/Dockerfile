FROM node:22-alpine AS builder

WORKDIR /app

# Install root deps (lib/ modules need weaviate-client etc.)
COPY package.json package-lock.json ./
RUN npm ci

# Install mcp-server deps
COPY mcp-server/package.json mcp-server/package-lock.json ./mcp-server/
RUN cd mcp-server && npm ci

# Copy source
COPY lib ./lib
COPY mcp-server/src ./mcp-server/src
COPY mcp-server/tsconfig.json ./mcp-server/

# Build
RUN cd mcp-server && npx tsc

# --- Production ---
FROM node:22-alpine

WORKDIR /app

# Root deps (for lib/ runtime imports)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

# MCP server deps
COPY --from=builder /app/mcp-server/package.json ./mcp-server/
COPY --from=builder /app/mcp-server/package-lock.json ./mcp-server/
RUN cd mcp-server && npm ci --omit=dev

# Compiled server + shared lib
COPY --from=builder /app/mcp-server/dist ./mcp-server/dist
COPY --from=builder /app/lib ./lib

ENV NODE_ENV=production
ENV TRANSPORT=http
ENV PORT=3100

EXPOSE 3100

WORKDIR /app/mcp-server
CMD ["node", "dist/index.js"]
