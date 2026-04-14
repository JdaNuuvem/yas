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
CMD ["node", "--max-old-space-size=768", "dist/server.js"]
