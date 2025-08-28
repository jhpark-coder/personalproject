# 프론트엔드 빌드용 Dockerfile

# 1. 빌드 단계 - Debian 기반 사용 (Alpine 대신)
FROM node:20-slim AS builder
WORKDIR /app

# 시스템 의존성 설치
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# 의존성 파일만 먼저 복사하여 캐시 활용
COPY package*.json ./

# npm 캐시 정리 및 의존성 설치 (모든 의존성 포함)
RUN npm cache clean --force && \
    rm -rf node_modules package-lock.json && \
    npm install --legacy-peer-deps

# 소스 코드 복사
COPY . .

# 누락된 의존성 확인 및 설치
RUN npm install react-is --legacy-peer-deps && \
    npm install @types/react-is --save-dev --legacy-peer-deps

# 애플리케이션 빌드
RUN npm run build

# 2. 정적 파일 서빙 단계 (nginx 없이)
FROM nginx:alpine
WORKDIR /usr/share/nginx/html

# 빌드된 결과물만 복사
COPY --from=builder /app/dist/ .

# nginx 설정은 루트 nginx에서 통합 관리
# COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

# nginx 기본 설정 사용 (정적 파일 서빙만)
CMD ["nginx", "-g", "daemon off;"] 