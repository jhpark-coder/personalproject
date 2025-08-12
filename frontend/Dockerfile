# 프론트엔드 빌드용 Dockerfile

# 1. 빌드 단계
FROM node:20-alpine AS builder
WORKDIR /app

# 의존성 파일만 먼저 복사하여 캐시 활용
COPY package*.json ./
RUN npm ci --only=production --legacy-peer-deps

# 소스 코드 복사
COPY . .

# 애플리케이션 빌드
RUN npm run build

# 2. nginx 서빙 단계
FROM nginx:alpine
WORKDIR /usr/share/nginx/html

# 빌드된 결과물만 복사
COPY --from=builder /app/dist .

# nginx 설정 복사
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"] 