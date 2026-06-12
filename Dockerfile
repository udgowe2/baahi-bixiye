# ---- Stufe 1: Frontend bauen ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Stufe 2: schlankes Laufzeit-Image ----
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY api ./api
COPY public ./public
COPY --from=build /app/dist ./dist
EXPOSE 3001
CMD ["npx", "tsx", "api/server.ts"]
