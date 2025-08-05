package backend.fitmate.config;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Rate Limiting을 적용하기 위한 커스텀 어노테이션
 * 
 * @param bucketName 사용할 Bucket의 이름 (Bean 이름과 일치해야 함)
 * @param keyGenerator Rate Limiting 키를 생성하는 방법 (기본값: IP 기반)
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface RateLimit {
    
    /**
     * 사용할 Bucket의 이름
     * RateLimitingConfig에서 정의한 Bean 이름과 일치해야 함
     */
    String bucketName();
    
    /**
     * Rate Limiting 키 생성 방법
     * 기본값은 IP 기반
     */
    KeyType keyType() default KeyType.IP;
    
    /**
     * Rate Limiting 키 생성 방법을 정의하는 enum
     */
    enum KeyType {
        IP,        // IP 주소 기반
        USER_ID,   // 사용자 ID 기반 (인증된 사용자)
        SESSION,   // 세션 기반
        CUSTOM     // 커스텀 키 (별도 구현 필요)
    }
} 