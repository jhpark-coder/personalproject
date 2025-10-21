package backend.fitmate.common.filter;

import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Collections;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Component
public class RequestLoggingFilter extends OncePerRequestFilter {
    
    private static final Logger logger = LoggerFactory.getLogger(RequestLoggingFilter.class);

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        
        // OAuth 관련 요청만 로깅
        if (request.getRequestURI().contains("oauth2") || request.getRequestURI().contains("login")) {
            logger.info("===== OAuth Request Headers =====");
            logger.info("Request URI: {}", request.getRequestURI());
            logger.info("Request URL: {}", request.getRequestURL().toString());
            logger.info("Scheme: {}", request.getScheme());
            logger.info("Server Name: {}", request.getServerName());
            logger.info("Server Port: {}", request.getServerPort());
            
            // ALB가 추가하는 핵심 헤더들
            logger.info("Host: {}", request.getHeader("Host"));
            logger.info("X-Forwarded-For: {}", request.getHeader("X-Forwarded-For"));
            logger.info("X-Forwarded-Host: {}", request.getHeader("X-Forwarded-Host"));
            logger.info("X-Forwarded-Proto: {}", request.getHeader("X-Forwarded-Proto"));
            logger.info("X-Forwarded-Port: {}", request.getHeader("X-Forwarded-Port"));
            logger.info("X-Real-IP: {}", request.getHeader("X-Real-IP"));
            
            // 모든 헤더 출력
            logger.info("--- All Headers ---");
            Collections.list(request.getHeaderNames()).forEach(headerName -> 
                logger.info("{}: {}", headerName, request.getHeader(headerName))
            );
            logger.info("================================");
        }

        filterChain.doFilter(request, response);
    }
}