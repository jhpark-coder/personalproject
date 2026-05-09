package backend.fitmate.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

import backend.fitmate.service.CustomUserDetailsService;
import backend.fitmate.user.repository.UserRepository;
import jakarta.servlet.http.Cookie;

class JwtAuthenticationFilterTests {

    private JwtTokenProvider jwtTokenProvider;
    private JwtAuthenticationFilter filter;

    @BeforeEach
    void setUp() {
        jwtTokenProvider = mock(JwtTokenProvider.class);

        JwtCookieService cookieService = new JwtCookieService();
        ReflectionTestUtils.setField(cookieService, "tokenValidTimeMillis", 60_000L);
        ReflectionTestUtils.setField(cookieService, "secureCookie", false);
        ReflectionTestUtils.setField(cookieService, "sameSite", "Lax");
        ReflectionTestUtils.setField(cookieService, "cookieDomain", "");

        filter = new JwtAuthenticationFilter(
                jwtTokenProvider,
                mock(CustomUserDetailsService.class),
                mock(UserRepository.class),
                cookieService);

        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void authenticatesWithCookieWhenBearerHeaderIsUndefined() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/auth/profile");
        request.addHeader("Authorization", "Bearer undefined");
        request.setCookies(new Cookie(JwtCookieService.AUTH_COOKIE_NAME, "cookie-token"));
        MockHttpServletResponse response = new MockHttpServletResponse();
        Authentication authentication = new UsernamePasswordAuthenticationToken("7", null);

        when(jwtTokenProvider.validateToken("cookie-token")).thenReturn(true);
        when(jwtTokenProvider.getAuthentication("cookie-token")).thenReturn(authentication);

        filter.doFilter(request, response, new MockFilterChain());

        assertThat(SecurityContextHolder.getContext().getAuthentication().getName()).isEqualTo("7");
        verify(jwtTokenProvider).validateToken("cookie-token");
        verify(jwtTokenProvider, never()).validateToken("undefined");
    }

    @Test
    void validBearerTokenTakesPrecedenceOverCookieToken() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/auth/profile");
        request.addHeader("Authorization", "Bearer bearer-token");
        request.setCookies(new Cookie(JwtCookieService.AUTH_COOKIE_NAME, "cookie-token"));
        MockHttpServletResponse response = new MockHttpServletResponse();
        Authentication authentication = new UsernamePasswordAuthenticationToken("8", null);

        when(jwtTokenProvider.validateToken("bearer-token")).thenReturn(true);
        when(jwtTokenProvider.getAuthentication("bearer-token")).thenReturn(authentication);

        filter.doFilter(request, response, new MockFilterChain());

        assertThat(SecurityContextHolder.getContext().getAuthentication().getName()).isEqualTo("8");
        verify(jwtTokenProvider).validateToken("bearer-token");
        verify(jwtTokenProvider, never()).validateToken("cookie-token");
    }

    @Test
    void requestWithoutTokenLeavesSecurityContextUnchanged() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/auth/profile");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }
}
