package backend.fitmate.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;

import jakarta.servlet.http.Cookie;

class JwtCookieServiceTests {

    private JwtCookieService cookieService;

    @BeforeEach
    void setUp() {
        cookieService = new JwtCookieService();
        ReflectionTestUtils.setField(cookieService, "tokenValidTimeMillis", 60_000L);
        ReflectionTestUtils.setField(cookieService, "secureCookie", true);
        ReflectionTestUtils.setField(cookieService, "sameSite", "Lax");
        ReflectionTestUtils.setField(cookieService, "cookieDomain", "");
    }

    @Test
    void authCookieIsHttpOnlyAndSecure() {
        MockHttpServletResponse response = new MockHttpServletResponse();

        cookieService.addAuthCookie(response, "jwt-token");

        String setCookie = response.getHeader("Set-Cookie");
        assertThat(setCookie).contains("fitmate_auth=jwt-token");
        assertThat(setCookie).contains("HttpOnly");
        assertThat(setCookie).contains("Secure");
        assertThat(setCookie).contains("SameSite=Lax");
    }

    @Test
    void resolvesAuthCookieFromRequest() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setCookies(new Cookie(JwtCookieService.AUTH_COOKIE_NAME, "jwt-token"));

        assertThat(cookieService.resolveToken(request)).contains("jwt-token");
    }

    @Test
    void clearAuthCookieExpiresCookie() {
        MockHttpServletResponse response = new MockHttpServletResponse();

        cookieService.clearAuthCookie(response);

        String setCookie = response.getHeader("Set-Cookie");
        assertThat(setCookie).contains("fitmate_auth=");
        assertThat(setCookie).contains("Max-Age=0");
    }
}
