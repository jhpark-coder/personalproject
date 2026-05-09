package backend.fitmate.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.util.ReflectionTestUtils;

import backend.fitmate.user.repository.UserRepository;

class JwtTokenProviderTests {

    private JwtTokenProvider provider;

    @BeforeEach
    void setUp() {
        provider = new JwtTokenProvider(mock(UserDetailsService.class), mock(UserRepository.class));
        ReflectionTestUtils.setField(provider, "secretKey", "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef");
        ReflectionTestUtils.setField(provider, "tokenValidTime", 60_000L);
    }

    @Test
    void createdTokenContainsExpectedClaimsAndValidates() {
        String token = provider.createToken(
                7L,
                "user@example.com",
                "Test User",
                "local",
                "oauth-id",
                "profile.png",
                "ROLE_USER");

        assertThat(provider.validateToken(token)).isTrue();
        assertThat(provider.getUserIdFromToken(token)).isEqualTo("7");
        assertThat(provider.getEmailFromToken(token)).isEqualTo("user@example.com");
        assertThat(provider.getNameFromToken(token)).isEqualTo("Test User");
        assertThat(provider.getProviderFromToken(token)).isEqualTo("local");
        assertThat(provider.getRoleFromToken(token)).isEqualTo("ROLE_USER");
    }

    @Test
    void invalidTokenDoesNotValidate() {
        assertThat(provider.validateToken("not-a-jwt")).isFalse();
    }

    @Test
    void shortSecretFailsClosed() {
        ReflectionTestUtils.setField(provider, "secretKey", "too-short");

        assertThatThrownBy(() -> provider.createToken(1L, "a@b.com", "A", "local", null, null, "ROLE_USER"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("JWT secret");
    }

    @Test
    void calendarTokenIsMarkedCalendarOnly() {
        String token = provider.generateCalendarToken("9", "calendar@example.com", "Calendar User", "google", "g-1", null);

        assertThat(provider.validateToken(token)).isTrue();
        assertThat(provider.isCalendarOnlyToken(token)).isTrue();
    }

    @Test
    void regularTokenIsNotCalendarOnly() {
        String token = provider.createToken(8L, "user@example.com", "Test User", "local", null, null, "ROLE_USER");

        assertThat(provider.isCalendarOnlyToken(token)).isFalse();
    }
}
