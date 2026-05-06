# ---------- Stage 1: build client ----------
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY client/package.json client/package-lock.json* ./client/
RUN npm --prefix client install

COPY . .
RUN npm --prefix client run build

# ---------- Stage 2: runtime ----------
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server ./server
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/package.json ./

EXPOSE 3001
CMD ["node", "server/index.js"]
