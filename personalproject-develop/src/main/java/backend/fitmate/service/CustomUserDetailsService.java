package backend.fitmate.service;

import java.util.Collections;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import backend.fitmate.User.entity.User;
import backend.fitmate.User.service.UserService;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    @Autowired
    private UserService userService;

    @Override
    public UserDetails loadUserByUsername(String userId) throws UsernameNotFoundException {
        try {
            // 먼저 Long으로 변환 시도 (일반 사용자)
            try {
                Long id = Long.parseLong(userId);
                User user = userService.findById(id)
                        .orElseThrow(() -> new UsernameNotFoundException("User not found with id: " + userId));

                return org.springframework.security.core.userdetails.User.builder()
                        .username(userId)
                        .password("") // OAuth2 사용자는 비밀번호가 없음
                        .authorities(Collections.singletonList(new SimpleGrantedAuthority("USER")))
                        .accountExpired(false)
                        .accountLocked(false)
                        .credentialsExpired(false)
                        .disabled(!user.isEmailVerified())
                        .build();
            } catch (NumberFormatException e) {
                // Long으로 변환 실패 시 OAuth2 ID로 조회 시도
                User user = userService.findByOAuth2ProviderAndOAuth2Id("google", userId)
                        .orElseGet(() -> userService.findByOAuth2ProviderAndOAuth2Id("kakao", userId)
                                .orElseGet(() -> userService.findByOAuth2ProviderAndOAuth2Id("naver", userId)
                                        .orElseThrow(() -> new UsernameNotFoundException("User not found with oauth id: " + userId))));

                return org.springframework.security.core.userdetails.User.builder()
                        .username(user.getId().toString()) // 실제 DB ID를 username으로 사용
                        .password("") // OAuth2 사용자는 비밀번호가 없음
                        .authorities(Collections.singletonList(new SimpleGrantedAuthority("USER")))
                        .accountExpired(false)
                        .accountLocked(false)
                        .credentialsExpired(false)
                        .disabled(!user.isEmailVerified())
                        .build();
            }
        } catch (Exception e) {
            throw new UsernameNotFoundException("Invalid user id: " + userId, e);
        }
    }
} 