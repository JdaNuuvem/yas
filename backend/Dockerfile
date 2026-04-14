FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
ENV NODE_ENV=development
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
RUN npx prisma generate
ENV NODE_ENV=production
ENV UV_THREADPOOL_SIZE=32
EXPOSE 3001
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'echo "Running migrations..."' >> /app/start.sh && \
    echo 'npx prisma migrate deploy 2>&1 || echo "Migration warning - continuing"' >> /app/start.sh && \
    echo 'echo "Starting server..."' >> /app/start.sh && \
    echo 'exec node --max-old-space-size=768 dist/server.js' >> /app/start.sh && \
    chmod +x /app/start.sh
CMD ["sh", "/app/start.sh"]
