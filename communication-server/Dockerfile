# communication-server/Dockerfile

# 1. 빌드 단계
FROM node:20-alpine AS builder
WORKDIR /usr/src/app

# 의존성 파일만 먼저 복사하여 캐시 활용 극대화
COPY package*.json ./
# 재현 가능하고 빠른 설치를 위해 npm ci 사용 (peer deps 이슈 대비 옵션 유지)
RUN npm ci --legacy-peer-deps

# 애플리케이션 소스 복사
COPY . .

# 애플리케이션 빌드
RUN npm run build

# 2. 프로덕션 단계
FROM node:20-alpine
WORKDIR /usr/src/app
ENV NODE_ENV=production

# 프로덕션 의존성만 설치
COPY --from=builder /usr/src/app/package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps

# 빌드 결과물만 복사
COPY --from=builder /usr/src/app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/main"] 