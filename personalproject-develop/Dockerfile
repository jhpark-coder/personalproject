FROM openjdk:21-jdk-slim

WORKDIR /app

# Maven wrapper와 pom.xml 복사
COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .

# Maven 의존성 다운로드
RUN chmod +x ./mvnw
RUN ./mvnw dependency:go-offline -B

# 소스 코드 복사
COPY src ./src

# 애플리케이션 빌드
RUN ./mvnw clean package -DskipTests

# 실행 가능한 JAR 파일만 복사
FROM openjdk:21-jdk-slim
WORKDIR /app
COPY --from=0 /app/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"] 