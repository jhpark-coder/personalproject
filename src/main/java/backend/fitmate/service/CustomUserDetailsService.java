package backend.fitmate.service;

import java.util.Collections;

import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import backend.fitmate.User.entity.User;
import backend.fitmate.User.service.UserService;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserService userService;

    @Override
    public UserDetails loadUserByUsername(String userId) throws UsernameNotFoundException {
        // userId는 Long 타입의 DB PK라고 가정
        try {
            Long id = Long.parseLong(userId);
            User user = userService.findById(id)
                    .orElseThrow(() -> new UsernameNotFoundException("User not found with id: " + userId));

            // 사용자의 실제 role 사용 (기본값: ROLE_USER)
            String userRole = user.getRole() != null ? user.getRole() : "ROLE_USER";

            return new org.springframework.security.core.userdetails.User(
                    String.valueOf(user.getId()),
                    user.getPassword() != null ? user.getPassword() : "", // 비밀번호가 없는 소셜 로그인을 고려
                    Collections.singletonList(new SimpleGrantedAuthority(userRole))
            );
        } catch (NumberFormatException e) {
            throw new UsernameNotFoundException("Invalid user ID format: " + userId);
        }
    }
} 