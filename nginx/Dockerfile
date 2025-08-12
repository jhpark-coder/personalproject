# Dockerfile for Nginx with Frontend Build

# 1. 프론트엔드 빌드 단계
FROM node:20-alpine AS frontend-builder
WORKDIR /app

# 의존성 파일만 먼저 복사하여 캐시 활용
COPY frontend/package*.json ./
RUN npm ci --legacy-peer-deps

# 소스 코드 복사
COPY frontend .

# 애플리케이션 빌드
RUN npm run build

# 2. Nginx 단계
FROM nginx:alpine

# 빌드된 프론트엔드 결과물 복사
COPY --from=frontend-builder /app/dist /usr/share/nginx/html

# nginx 설정 복사
COPY nginx/nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
