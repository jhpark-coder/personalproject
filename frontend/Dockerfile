# 프론트엔드 빌드용 Dockerfile

# 1. 빌드 단계 - 경량 이미지
FROM node:20-alpine AS builder
WORKDIR /app

# 의존성 파일만 먼저 복사하여 캐시 활용
COPY package.json package-lock.json ./

# NPM 캐시 마운트로 빠른 설치 (BuildKit 필요)
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund --legacy-peer-deps

# 소스 코드 복사
COPY . .

# 애플리케이션 빌드
RUN npm run build

# 2. 정적 파일 서빙 단계 (nginx 사용)
FROM nginx:alpine
WORKDIR /usr/share/nginx/html

# 빌드된 결과물만 복사
COPY --from=builder /app/dist/ .

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"] 