package backend.fitmate.config;

import java.io.IOException;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import backend.fitmate.service.CustomUserDetailsService;
import backend.fitmate.user.repository.UserRepository;
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
    private final CustomUserDetailsService customUserDetailsService;
    private final UserRepository userRepository;
    private final JwtCookieService jwtCookieService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String requestURI = request.getRequestURI();
        String token = resolveToken(request);

        logger.debug("JWT filter processing URI: " + requestURI + ", token present: " + (token != null));

        if (token != null) {
            try {
                if (jwtTokenProvider.validateToken(token)) {
                    Authentication authentication = jwtTokenProvider.getAuthentication(token);
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                    logger.debug("JWT authentication succeeded for user: " + authentication.getName());
                } else {
                    logger.debug("JWT validation failed");
                }
            } catch (io.jsonwebtoken.security.SecurityException | MalformedJwtException e) {
                logger.warn("Invalid JWT signature.", e);
                request.setAttribute("exception", "Invalid-Token");
            } catch (ExpiredJwtException e) {
                logger.warn("Expired JWT token.", e);
                request.setAttribute("exception", "Expired-Token");
            } catch (UnsupportedJwtException e) {
                logger.warn("Unsupported JWT token.", e);
                request.setAttribute("exception", "Unsupported-Token");
            } catch (IllegalArgumentException e) {
                logger.warn("JWT token is malformed.", e);
                request.setAttribute("exception", "Illegal-Argument");
            } catch (Exception e) {
                logger.error("JWT filter failed.", e);
                request.setAttribute("exception", "Unknown-Error");
            }
        } else {
            logger.debug("No JWT token found; leaving security context unchanged.");
        }
        filterChain.doFilter(request, response);
    }

    private String resolveToken(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            String token = bearerToken.substring(7).trim();
            if (!token.isBlank() && !"null".equalsIgnoreCase(token) && !"undefined".equalsIgnoreCase(token)) {
                return token;
            }
        }
        return jwtCookieService.resolveToken(request).orElse(null);
    }
}
