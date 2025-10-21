package backend.fitmate.domain.user.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import backend.fitmate.domain.user.entity.User;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    
    /**
     * 이메일로 사용자를 찾습니다.
     */
    Optional<User> findByEmail(String email);
    
    /**
     * 이메일 존재 여부 확인
     */
    boolean existsByEmail(String email);
    
    /**
     * 이메일과 인증 상태로 사용자 조회
     */
    Optional<User> findByEmailAndEmailVerifiedTrue(String email);
    
    /**
     * 닉네임으로 사용자 조회
     */
    Optional<User> findByNickname(String nickname);
    
    /**
     * 닉네임 존재 여부 확인
     */
    boolean existsByNickname(String nickname);
    
    /**
     * 휴대전화번호로 사용자 조회
     */
    Optional<User> findByPhoneNumber(String phoneNumber);
    
    /**
     * 휴대전화번호 존재 여부 확인
     */
    boolean existsByPhoneNumber(String phoneNumber);
    
    /**
     * OAuth2 제공자와 OAuth2 ID로 사용자 조회
     */
    Optional<User> findByOauthProviderAndOauthId(String oauthProvider, String oauthId);
    
    /**
     * OAuth2 제공자로 사용자 조회
     */
    Optional<User> findByOauthProvider(String oauthProvider);

    /**
     * 모든 사용자 조회 (알림 서비스용)
     * isActive 필드가 없으므로 전체 사용자 반환
     */
    java.util.List<User> findAll();
} 