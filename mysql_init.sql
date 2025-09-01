-- MySQL 초기 설정 스크립트
-- root 계정으로 실행해야 합니다

-- 1. 데이터베이스 생성
CREATE DATABASE IF NOT EXISTS personalproject 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- 2. 사용자 생성 및 권한 부여
CREATE USER IF NOT EXISTS 'fitmate_user'@'%' IDENTIFIED BY 'fitmate_password';
CREATE USER IF NOT EXISTS 'fitmate_user'@'localhost' IDENTIFIED BY 'fitmate_password';

-- 3. 권한 부여
GRANT ALL PRIVILEGES ON personalproject.* TO 'fitmate_user'@'%';
GRANT ALL PRIVILEGES ON personalproject.* TO 'fitmate_user'@'localhost';

-- 4. 권한 적용
FLUSH PRIVILEGES;

-- 5. 데이터베이스 선택
USE personalproject;

-- 6. 한국 시간대 설정 (KST/UTC+9)
SET GLOBAL time_zone = '+09:00';
SET SESSION time_zone = '+09:00';

-- 7. 시간대 설정 확인
SELECT @@global.time_zone as global_tz, @@session.time_zone as session_tz;

-- 8. 테이블 생성 확인 (JPA가 자동으로 생성할 예정)
-- spring.jpa.hibernate.ddl-auto=update 설정으로 인해 자동 생성됨

-- 9. 현재 상태 확인
SHOW DATABASES;
SELECT User, Host FROM mysql.user WHERE User = 'fitmate_user';
SHOW GRANTS FOR 'fitmate_user'@'%';


