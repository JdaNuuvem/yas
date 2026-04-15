FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
ENV NODE_ENV=development
RUN npm install

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV UV_THREADPOOL_SIZE=32
COPY package.json package-lock.json ./
RUN npm install --omit=dev && npm install prisma dotenv tsx
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./
COPY --from=builder /app/tsconfig.json ./
RUN npx prisma generate
EXPOSE 3001
CMD ["sh", "-c", "npx prisma migrate deploy && node --max-old-space-size=768 dist/server.js"]
