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
COPY prisma ./prisma
RUN npx prisma generate
ENV NODE_ENV=production
ENV UV_THREADPOOL_SIZE=32
EXPOSE 3001
CMD ["node", "--max-old-space-size=768", "--max-semi-space-size=64", "dist/server.js"]
