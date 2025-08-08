# notification-server/Dockerfile

# 1. 빌드 단계
FROM node:18-alpine AS builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

# 2. 프로덕션 단계
FROM node:18-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --legacy-peer-deps --omit=dev
COPY --from=builder /usr/src/app/dist ./dist
CMD ["node", "dist/main"] 