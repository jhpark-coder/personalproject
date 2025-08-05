package backend.fitmate.config;

import java.io.IOException;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.filter.OncePerRequestFilter;

import io.github.bucket4j.Bucket;
import io.github.bucket4j.BucketConfiguration;
import io.github.bucket4j.distributed.proxy.ProxyManager;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

// @Component // 개발 환경에서는 전역 Rate Limit을 비활성화하여 테스트 용이성 확보
public class GlobalRateLimitFilter extends OncePerRequestFilter {

    @Autowired
    private ProxyManager<String> proxyManager;

    @Override
    protected void doFilterInternal(HttpServletRequest request, 
                                  HttpServletResponse response, 
                                  FilterChain filterChain) 
            throws ServletException, IOException {
        
        // OPTIONS 요청은 Rate Limiting에서 제외
        if ("OPTIONS".equals(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }
        
        // 정적 리소스는 제외
        String requestURI = request.getRequestURI();
        if (requestURI.startsWith("/static/") || 
            requestURI.startsWith("/css/") || 
            requestURI.startsWith("/js/") || 
            requestURI.startsWith("/images/")) {
            filterChain.doFilter(request, response);
            return;
        }

        // @RateLimit 어노테이션이 있는 요청은 GlobalRateLimitFilter에서 제외
        // (AOP에서 처리하므로 중복 방지)
        if (requestURI.startsWith("/test/")) {
            filterChain.doFilter(request, response);
            return;
        }

        // IP 기반 전역 Rate Limiting
        String clientIp = getClientIpAddress(request);
        BucketConfiguration configuration = BucketConfiguration.builder()
            .addLimit(limit -> limit.capacity(100).refillGreedy(100, Duration.ofMinutes(1)))
            .build();

        Bucket bucket = proxyManager.getProxy(clientIp, () -> configuration);
        
        if (bucket.tryConsume(1)) {
            // 요청 허용
            filterChain.doFilter(request, response);
        } else {
            // 요청 차단
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType("application/json");
            
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "전역 Rate Limit 초과. 잠시 후 다시 시도해주세요.");
            errorResponse.put("error", "GLOBAL_RATE_LIMIT_EXCEEDED");
            errorResponse.put("retryAfter", "60");
            
            response.getWriter().write(new com.fasterxml.jackson.databind.ObjectMapper()
                .writeValueAsString(errorResponse));
        }
    }

    private String getClientIpAddress(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
} 