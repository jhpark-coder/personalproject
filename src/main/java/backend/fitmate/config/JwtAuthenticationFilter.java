package backend.fitmate.config;

import java.io.IOException;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.UnsupportedJwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String requestURI = request.getRequestURI();
        String token = resolveToken(request);
        
        logger.debug("JWT Filter - URI: " + requestURI);
        logger.debug("JWT Filter - Token present: " + (token != null));
        
        if (token != null) {
            try {
                if (jwtTokenProvider.validateToken(token)) {
                    Authentication authentication = jwtTokenProvider.getAuthentication(token);
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                    logger.debug("JWT Filter - 인증 성공, 사용자: " + authentication.getName());
                } else {
                    logger.debug("JWT Filter - 토큰 검증 실패");
                }
            } catch (io.jsonwebtoken.security.SecurityException | MalformedJwtException e) {
                logger.warn("잘못된 JWT 서명입니다.", e);
                request.setAttribute("exception", "Invalid-Token");
            } catch (ExpiredJwtException e) {
                logger.warn("만료된 JWT 토큰입니다.", e);
                request.setAttribute("exception", "Expired-Token");
            } catch (UnsupportedJwtException e) {
                logger.warn("지원되지 않는 JWT 토큰입니다.", e);
                request.setAttribute("exception", "Unsupported-Token");
            } catch (IllegalArgumentException e) {
                logger.warn("JWT 토큰이 잘못되었습니다.", e);
                request.setAttribute("exception", "Illegal-Argument");
            } catch (Exception e) {
                logger.error("JWT 필터 처리 중 예외 발생", e);
                request.setAttribute("exception", "Unknown-Error");
            }
        } else {
            logger.debug("JWT 토큰이 없어 인증 컨텍스트를 설정하지 않음");
        }
        filterChain.doFilter(request, response);
    }

    private String resolveToken(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
} 