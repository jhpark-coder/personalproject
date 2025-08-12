@echo off
chcp 65001 >nul
echo 🚀 FitMate 최적화된 빌드 시작...

REM 1. 기존 이미지 캐시 정리 (선택사항)
set /p cleanup="기존 이미지 캐시를 정리하시겠습니까? (y/N): "
if /i "%cleanup%"=="y" (
    echo 🧹 기존 이미지 캐시 정리 중...
    docker system prune -f
)

REM 2. 백엔드 빌드 (Maven 의존성 캐싱 활용)
echo 🔨 백엔드 빌드 중...
docker build -t fitmate-backend:latest --target builder .

REM 3. Communication Server 빌드
echo 📡 Communication Server 빌드 중...
cd communication-server
docker build -t fitmate-communication:latest .
cd ..

REM 4. 프론트엔드 빌드
echo 🎨 프론트엔드 빌드 중...
cd frontend
docker build -t fitmate-frontend:latest .
cd ..

REM 5. Nginx 빌드 (프론트엔드 결과물 포함)
echo 🌐 Nginx 빌드 중...
docker build -t fitmate-nginx:latest ./nginx

REM 6. 전체 서비스 시작
echo 🚀 전체 서비스 시작 중...
docker-compose up -d

echo ✅ 빌드 완료! 서비스가 시작되었습니다.
echo 📊 서비스 상태 확인: docker-compose ps
echo 📝 로그 확인: docker-compose logs -f

pause 