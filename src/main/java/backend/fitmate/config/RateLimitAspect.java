package backend.fitmate.config;

import java.lang.reflect.Method;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import io.github.bucket4j.Bucket;
import io.github.bucket4j.BucketConfiguration;
import io.github.bucket4j.ConsumptionProbe;
import io.github.bucket4j.distributed.proxy.ProxyManager;
import jakarta.servlet.http.HttpServletRequest;

@Aspect
@Component
public class RateLimitAspect {

    @Autowired
    private ApplicationContext applicationContext;

    @Around("@annotation(backend.fitmate.config.RateLimit)")
    public Object rateLimit(ProceedingJoinPoint joinPoint) throws Throwable {
        System.out.println("=== RateLimitAspect 실행됨 ===");

        // OPTIONS 요청은 Rate Limiting에서 제외
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attributes != null) {
            HttpServletRequest request = attributes.getRequest();
            if ("OPTIONS".equals(request.getMethod())) {
                System.out.println("OPTIONS 요청 - Rate Limiting 제외");
                return joinPoint.proceed();
            }
        }

        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        Method method = signature.getMethod();
        RateLimit rateLimitAnnotation = method.getAnnotation(RateLimit.class);

        System.out.println("메서드: " + method.getName());
        System.out.println("버킷 이름: " + rateLimitAnnotation.bucketName());
        System.out.println("키 타입: " + rateLimitAnnotation.keyType());

        // ProxyManager 가져오기
        ProxyManager<String> proxyManager = applicationContext.getBean(ProxyManager.class);

        // Rate Limiting 키 생성
        String key = generateKey(rateLimitAnnotation.keyType());
        System.out.println("생성된 키: " + key);

        // 버킷 설정 생성
        BucketConfiguration configuration = createBucketConfiguration(rateLimitAnnotation.bucketName());

        // 동적으로 버킷 생성
        Bucket bucket = proxyManager.getProxy(key, () -> configuration);

        // 토큰 소비 시도 및 결과 확인
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);

        if (probe.isConsumed()) {
            // 허용된 경우 원래 메서드 실행
            Object result = joinPoint.proceed();
            
            // 토큰 수 표시 제거 - 부정확한 정보 제공 방지
            // 응답에 남은 토큰 수 추가하는 로직을 완전히 제거
            // if (result instanceof ResponseEntity) {
            //     ResponseEntity<?> response = (ResponseEntity<?>) result;
            //     if (response.getBody() instanceof Map) {
            //         @SuppressWarnings("unchecked")
            //         Map<String, Object> responseBody = (Map<String, Object>) response.getBody();
            //         responseBody.put("remainingTokens", actualRemainingTokens);
            //         responseBody.put("totalCapacity", getBucketCapacity(rateLimitAnnotation.bucketName()));
            //     }
            // }
            
            return result;
        } else {
            // 제한된 경우 에러 응답 반환
            System.out.println("요청 차단됨 - Rate Limit 초과");
            
            // ConsumptionProbe에서 retryAfter 정보도 가져올 수 있습니다.
            // long waitForRefillSeconds = probe.getNanosToWaitForRefill() / 1_000_000_000; // 나노초를 초로 변환
            return createRateLimitResponse(); // 기존 로직 유지
        }
        // === 핵심 변경 부분 끝 ===
    }

    /**
     * 버킷 이름에 따른 설정을 생성합니다.
     */
    private BucketConfiguration createBucketConfiguration(String bucketName) {
        switch (bucketName) {
            case "globalBucket":
                return BucketConfiguration.builder()
                    .addLimit(limit -> limit.capacity(100).refillGreedy(100, Duration.ofMinutes(1)))
                    .build();
            case "loginBucket":
                return BucketConfiguration.builder()
                    .addLimit(limit -> limit.capacity(5).refillGreedy(5, Duration.ofMinutes(1)))
                    .build();
            case "signupBucket":
                return BucketConfiguration.builder()
                    .addLimit(limit -> limit.capacity(3).refillGreedy(3, Duration.ofMinutes(1)))
                    .build();
            case "emailVerificationBucket":
                return BucketConfiguration.builder()
                    .addLimit(limit -> limit.capacity(2).refillGreedy(2, Duration.ofMinutes(1)))
                    .build();
            case "oauth2Bucket":
                return BucketConfiguration.builder()
                    .addLimit(limit -> limit.capacity(10).refillGreedy(10, Duration.ofMinutes(1)))
                    .build();
            case "apiBucket":
                return BucketConfiguration.builder()
                    .addLimit(limit -> limit.capacity(100).refillGreedy(100, Duration.ofMinutes(1)))
                    .build();
            case "testBucket":
                return BucketConfiguration.builder()
                    .addLimit(limit -> limit.capacity(5).refillGreedy(5, Duration.ofMinutes(1)))
                    .build();
            case "loginPageBucket":
                return BucketConfiguration.builder()
                    .addLimit(limit -> limit.capacity(10).refillGreedy(10, Duration.ofMinutes(1)))
                    .build();
            case "dashboardBucket":
                // 대시보드 API: 분당 300회 (매우 관대하게 설정)
                return BucketConfiguration.builder()
                    .addLimit(limit -> limit.capacity(300).refillGreedy(300, Duration.ofMinutes(1)))
                    .build();
            case "profileBucket":
                // 프로필 API: 분당 500회 (매우 관대하게 설정)
                return BucketConfiguration.builder()
                    .addLimit(limit -> limit.capacity(500).refillGreedy(500, Duration.ofMinutes(1)))
                    .build();
            case "ddosProtectionBucket":
                // DDoS 방지: 초당 10회, 분당 100회 (이중 제한)
                return BucketConfiguration.builder()
                    .addLimit(limit -> limit.capacity(10).refillGreedy(10, Duration.ofSeconds(1)))
                    .addLimit(limit -> limit.capacity(100).refillGreedy(100, Duration.ofMinutes(1)))
                    .build();
            default:
                return BucketConfiguration.builder()
                    .addLimit(limit -> limit.capacity(100).refillGreedy(100, Duration.ofMinutes(1)))
                    .build();
        }
    }

    /**
     * Rate Limiting 키를 생성합니다.
     */
    private String generateKey(RateLimit.KeyType keyType) {
        switch (keyType) {
            case IP:
                return getClientIpAddress();
            case USER_ID:
                return getUserId();
            case SESSION:
                return getSessionId();
            case CUSTOM:
                return "custom-" + System.currentTimeMillis();
            default:
                return getClientIpAddress();
        }
    }

    /**
     * 클라이언트 IP 주소를 가져옵니다.
     */
    private String getClientIpAddress() {
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attributes != null) {
            HttpServletRequest request = attributes.getRequest();
            String xForwardedFor = request.getHeader("X-Forwarded-For");
            if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
                return xForwardedFor.split(",")[0].trim();
            }
            return request.getRemoteAddr();
        }
        return "unknown";
    }

    /**
     * 현재 인증된 사용자 ID를 가져옵니다.
     */
    private String getUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated() && 
            !"anonymousUser".equals(authentication.getName())) {
            return authentication.getName();
        }
        return "anonymous";
    }

    /**
     * 세션 ID를 가져옵니다.
     */
    private String getSessionId() {
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attributes != null) {
            HttpServletRequest request = attributes.getRequest();
            return request.getSession().getId();
        }
        return "no-session";
    }

    /**
     * Rate Limit 초과 시 반환할 응답을 생성합니다.
     */
    private ResponseEntity<?> createRateLimitResponse() {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("message", "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.");
        response.put("error", "RATE_LIMIT_EXCEEDED");
        response.put("retryAfter", "60"); // 60초 후 재시도 가능
        
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(response);
    }

    /**
     * 버킷 이름에 따른 용량을 반환합니다.
     */
    private long getBucketCapacity(String bucketName) {
        switch (bucketName) {
            case "loginBucket":
                return 5;
            case "signupBucket":
                return 3;
            case "emailVerificationBucket":
                return 2;
            case "oauth2Bucket":
                return 10;
            case "testBucket":
                return 5;
            case "loginPageBucket":
                return 10;
            case "globalBucket":
                return 100;
            case "apiBucket":
                return 100;
            case "ddosProtectionBucket":
                return 10; // 초당 제한
            default:
                return 100;
        }
    }
} 