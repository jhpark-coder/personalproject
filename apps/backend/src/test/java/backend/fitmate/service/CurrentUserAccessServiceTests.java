package backend.fitmate.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;

class CurrentUserAccessServiceTests {

    private final CurrentUserAccessService service = new CurrentUserAccessService();

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void rejectsNullUserId() {
        authenticate("1", "ROLE_USER");

        assertThat(service.canAccessUser(null)).isFalse();
    }

    @Test
    void rejectsMissingAuthentication() {
        assertThat(service.canAccessUser(1L)).isFalse();
    }

    @Test
    void allowsSameUserId() {
        authenticate("42", "ROLE_USER");

        assertThat(service.canAccessUser(42L)).isTrue();
    }

    @Test
    void rejectsDifferentUserId() {
        authenticate("42", "ROLE_USER");

        assertThat(service.canAccessUser(7L)).isFalse();
    }

    @Test
    void rejectsNonNumericPrincipalForUserAccess() {
        authenticate("oauth:google:abc", "ROLE_USER");

        assertThat(service.canAccessUser(42L)).isFalse();
    }

    @Test
    void allowsAdminForAnyUserId() {
        authenticate("admin", "ROLE_ADMIN");

        assertThat(service.canAccessUser(42L)).isTrue();
    }

    private static void authenticate(String principalName, String role) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        principalName,
                        "n/a",
                        AuthorityUtils.createAuthorityList(role)));
    }
}
