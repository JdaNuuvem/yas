FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
RUN npx prisma generate
ENV NODE_ENV=production
ENV UV_THREADPOOL_SIZE=32
EXPOSE 3001
COPY <<'EOF' /app/start.sh
#!/bin/sh
npx prisma migrate deploy
node --max-old-space-size=768 --max-semi-space-size=64 dist/server.js
EOF
RUN chmod +x /app/start.sh
CMD ["/bin/sh", "/app/start.sh"]
