# 1. 의존성/빌더 단계 - Maven 이미지 사용 (Wrapper 불필요)
FROM maven:3.9.8-eclipse-temurin-21 AS builder
WORKDIR /app

# 의존성 캐시 최적화: pom.xml만 먼저 복사 후 캐시 사용
COPY pom.xml .
# BuildKit 캐시 마운트로 의존성 설치 가속
RUN --mount=type=cache,target=/root/.m2 mvn -B -DskipTests dependency:go-offline

# 소스 코드 복사 후 빌드 (테스트 스킵, 병렬 빌드)
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 mvn -B -DskipTests -T 1C clean package

# 2. 실행 단계 - 경량 JDK 런타임 사용
FROM openjdk:21-jdk-slim
WORKDIR /app

# JVM 최적화 설정
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -XX:+UseG1GC"

# 실행 가능한 JAR 파일만 복사
COPY --from=builder /app/target/*.jar /app/app.jar

EXPOSE 8080
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"] 