package backend.fitmate.config;

import java.lang.reflect.Method;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    private static final Logger log = LoggerFactory.getLogger(RateLimitAspect.class);

    @Autowired
    private ApplicationContext applicationContext;

    @Around("@annotation(backend.fitmate.config.RateLimit)")
    public Object rateLimit(ProceedingJoinPoint joinPoint) throws Throwable {
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attributes != null) {
            HttpServletRequest request = attributes.getRequest();
            if ("OPTIONS".equals(request.getMethod())) {
                return joinPoint.proceed();
            }
        }

        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        Method method = signature.getMethod();
        RateLimit rateLimitAnnotation = method.getAnnotation(RateLimit.class);

        ProxyManager<String> proxyManager = applicationContext.getBean(ProxyManager.class);
        String key = generateKey(rateLimitAnnotation.keyType());
        BucketConfiguration configuration = createBucketConfiguration(rateLimitAnnotation.bucketName());
        Bucket bucket = proxyManager.getProxy(key, () -> configuration);
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);

        if (probe.isConsumed()) {
            return joinPoint.proceed();
        }

        log.warn(
            "Rate limit exceeded: bucket={}, keyType={}",
            rateLimitAnnotation.bucketName(),
            rateLimitAnnotation.keyType()
        );
        return createRateLimitResponse();
    }

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
                return BucketConfiguration.builder()
                    .addLimit(limit -> limit.capacity(300).refillGreedy(300, Duration.ofMinutes(1)))
                    .build();
            case "profileBucket":
                return BucketConfiguration.builder()
                    .addLimit(limit -> limit.capacity(500).refillGreedy(500, Duration.ofMinutes(1)))
                    .build();
            case "profileUpdateBucket":
                return BucketConfiguration.builder()
                    .addLimit(limit -> limit.capacity(60).refillGreedy(60, Duration.ofMinutes(1)))
                    .build();
            case "ddosProtectionBucket":
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

    private String getUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated()
            && !"anonymousUser".equals(authentication.getName())) {
            return authentication.getName();
        }
        return "anonymous";
    }

    private String getSessionId() {
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attributes != null) {
            HttpServletRequest request = attributes.getRequest();
            return request.getSession().getId();
        }
        return "no-session";
    }

    private ResponseEntity<?> createRateLimitResponse() {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("message", "Too many requests. Try again later.");
        response.put("error", "RATE_LIMIT_EXCEEDED");
        response.put("retryAfter", "60");
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(response);
    }
}
