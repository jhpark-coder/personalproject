# src/main/chatManager/Dockerfile

FROM node:18-alpine
WORKDIR /app

# package.json과 package-lock.json을 먼저 복사하여 불필요한 재설치를 방지합니다.
COPY package*.json ./
RUN npm install

# 나머지 소스 코드를 복사합니다.
COPY . .

# Vite 개발 서버는 기본적으로 0.0.0.0 호스트를 사용해야
# Docker 컨테이너 외부에서 접근할 수 있습니다.
# package.json의 "dev" 스크립트를 "vite --host"로 수정하거나,
# 여기서 직접 명령어를 실행합니다.
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"] 