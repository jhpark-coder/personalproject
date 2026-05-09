package backend.fitmate.service;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class CurrentUserAccessService {

    public boolean canAccessUser(Long userId) {
        if (userId == null) {
            return false;
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }

        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority()));
        if (isAdmin) {
            return true;
        }

        try {
            return userId.equals(Long.parseLong(authentication.getName()));
        } catch (NumberFormatException ex) {
            return false;
        }
    }
}
