package backend.fitmate.user.service;

import java.util.Optional;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import backend.fitmate.user.entity.User;
import backend.fitmate.user.repository.UserRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    
    @PersistenceContext
    private EntityManager entityManager;

    /**
     * 이메일 중복 확인
     */
    public boolean isEmailExists(String email) {
        return userRepository.existsByEmail(email);
    }

    /**
     * 닉네임 중복 확인
     */
    public boolean isNicknameExists(String nickname) {
        if (nickname == null || nickname.trim().isEmpty()) {
            return false;
        }
        return userRepository.existsByNickname(nickname);
    }

    /**
     * 휴대전화번호 중복 확인
     */
    public boolean isPhoneNumberExists(String phoneNumber) {
        return userRepository.existsByPhoneNumber(phoneNumber);
    }

    /**
     * 사용자 회원가입
     */
    public User signup(String email, String password, String nickname, 
                      String name, String birthDate, String gender, String phoneNumber, String goal) {
        
        // 닉네임 중복 확인 (닉네임이 있는 경우)
        if (nickname != null && !nickname.trim().isEmpty() && isNicknameExists(nickname)) {
            throw new RuntimeException("이미 존재하는 닉네임입니다.");
        }
        
        // 휴대전화번호 중복 확인
        if (isPhoneNumberExists(phoneNumber)) {
            throw new RuntimeException("이미 존재하는 휴대전화번호입니다.");
        }
        
        // 비밀번호 암호화
        String encodedPassword = passwordEncoder.encode(password);
        
        // 사용자 생성
        User user = new User();
        user.setEmail(email);
        user.setPassword(encodedPassword);
        user.setNickname(nickname);
        user.setName(name);
        user.setBirthDate(birthDate);
        user.setGender(gender);
        user.setPhoneNumber(phoneNumber);
        user.setGoal(goal); // 운동 목표 설정
        user.setEmailVerified(false);
        
        return userRepository.save(user);
    }

    /**
     * 이메일 인증 완료 처리
     */
    @CacheEvict(value = "user", key = "#email")
    public void verifyEmail(String email) {
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            user.setEmailVerified(true);
            userRepository.save(user);
        }
    }

    /**
     * 이메일로 사용자를 찾습니다.
     */
    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    /**
     * ID로 사용자 조회
     */
    @Cacheable(value = "user", key = "#id")
    public Optional<User> findById(Long id) {
        return userRepository.findById(id);
    }
    
    /**
     * JPA 캐시를 우회하여 강제로 DB에서 최신 사용자 정보 조회
     */
    @Transactional(readOnly = true)
    public Optional<User> findByIdWithRefresh(Long id) {
        try {
            // 먼저 일반 조회
            Optional<User> userOpt = userRepository.findById(id);
            if (userOpt.isPresent()) {
                User user = userOpt.get();
                // EntityManager refresh로 강제 DB 조회
                entityManager.refresh(user);
                System.out.println("🔄 강제 DB 조회 완료: userId=" + id + ", googleOAuthId=" + user.getGoogleOAuthId());
                return Optional.of(user);
            } else {
                System.out.println("🔄 사용자 없음: userId=" + id);
                return Optional.empty();
            }
        } catch (Exception e) {
            System.err.println("🚨 강제 DB 조회 실패: " + e.getMessage());
            // 실패 시 일반 조회로 fallback
            return userRepository.findById(id);
        }
    }

    /**
     * 이메일 인증된 사용자 조회
     */
    @Cacheable(value = "user", key = "'verified:' + #email")
    public Optional<User> findByEmailAndVerified(String email) {
        return userRepository.findByEmailAndEmailVerifiedTrue(email);
    }

    public Optional<User> findByProviderAndOAuthId(String provider, String oauthId) {
        return userRepository.findByOauthProviderAndOauthId(provider, oauthId);
    }

    @Transactional
    public User saveOrUpdateOAuth2User(String email, String name, String picture, String provider, String oauthId) {
        System.out.println("=== OAuth2 사용자 저장/업데이트 시작 ===");
        System.out.println("Email: " + email + ", Provider: " + provider + ", OAuthId: " + oauthId);

        Optional<User> userOptional = userRepository.findByOauthProviderAndOauthId(provider, oauthId);
        User user;
        if (userOptional.isPresent()) {
            // 이미 가입된 소셜 계정이면 정보 업데이트
            user = userOptional.get();
            user.setName(name);
            user.setProfileImage(picture);
            System.out.println("기존 사용자 정보 업데이트: " + user.getId());
        } else {
            // 이메일로 기존 사용자인지 확인
            Optional<User> byEmail = userRepository.findByEmail(email);
            if(byEmail.isPresent()) {
                // 이미 다른 소셜로 가입된 이메일이면, 현재 소셜 정보 추가
                user = byEmail.get();
                user.setOauthProvider(provider);
                user.setOauthId(oauthId);
                user.setProfileImage(picture);
                if ("google".equals(provider)) {
                    user.setGoogleOAuthId(oauthId);
                    user.setGoogleEmail(email);
                    user.setGoogleName(name);
                    user.setGooglePicture(picture);
                }
                System.out.println("기존 이메일 사용자에 소셜 정보 추가: " + user.getId());
            } else {
                // 신규 사용자 생성
                System.out.println("새로운 사용자 생성");
                user = new User();
                user.setEmail(email);
                user.setName(name);
                user.setProfileImage(picture);
                user.setOauthProvider(provider);
                user.setOauthId(oauthId);
                user.setEmailVerified(true);
                if ("google".equals(provider)) {
                    user.setGoogleOAuthId(oauthId);
                    user.setGoogleEmail(email);
                    user.setGoogleName(name);
                    user.setGooglePicture(picture);
                }
            }
        }
        User savedUser = userRepository.save(user);
        System.out.println("사용자 저장/업데이트 완료: " + savedUser.getId());
        return savedUser;
    }

    /**
     * 캘린더 연동을 위한 Google 정보 추가 (기존 사용자 유지)
     */
    @Transactional
    public User addGoogleCalendarInfo(String email, String name, String picture, String googleOauthId) {
        System.out.println("=== Google 캘린더 연동 시작 ===");
        System.out.println("Email: " + email + ", GoogleOAuthId: " + googleOauthId);

        // 이메일로 기존 사용자 찾기
        Optional<User> userOptional = userRepository.findByEmail(email);
        
        if (userOptional.isEmpty()) {
            throw new RuntimeException("캘린더 연동을 위한 기존 사용자를 찾을 수 없습니다: " + email);
        }

        User user = userOptional.get();
        
        // Google 캘린더 정보만 추가/업데이트 (기본 OAuth provider는 유지)
        user.setGoogleOAuthId(googleOauthId);
        user.setGoogleEmail(email);
        user.setGoogleName(name);
        user.setGooglePicture(picture);
        
        System.out.println("기존 사용자 (" + user.getOauthProvider() + ")에 Google 캘린더 정보 추가: " + user.getId());
        
        User savedUser = userRepository.save(user);
        System.out.println("Google 캘린더 연동 완료: " + savedUser.getId());
        return savedUser;
    }

    /**
     * 사용자 ID로 Google 캘린더 정보 추가 (캘린더 연동 전용)
     */
    @Transactional
    public User addGoogleCalendarInfoByUserId(Long userId, String googleEmail, String googleName, String picture, String googleOauthId) {
        System.out.println("=== 사용자 ID로 Google 캘린더 연동 시작 ===");
        System.out.println("UserId: " + userId + ", GoogleEmail: " + googleEmail + ", GoogleOAuthId: " + googleOauthId);

        // 사용자 ID로 기존 사용자 찾기
        Optional<User> userOptional = userRepository.findById(userId);
        
        if (userOptional.isEmpty()) {
            throw new RuntimeException("캘린더 연동을 위한 기존 사용자를 찾을 수 없습니다. UserId: " + userId);
        }

        User user = userOptional.get();
        
        // Google 캘린더 정보만 추가/업데이트 (기본 OAuth provider는 유지)
        user.setGoogleOAuthId(googleOauthId);
        user.setGoogleEmail(googleEmail);
        user.setGoogleName(googleName);
        user.setGooglePicture(picture);
        
        System.out.println("기존 사용자 (" + user.getOauthProvider() + ", ID=" + user.getId() + ")에 Google 캘린더 정보 추가");
        System.out.println("기존 이메일: " + user.getEmail() + " → Google 이메일: " + googleEmail);
        
        User savedUser = userRepository.save(user);
        
        // 즉시 DB에 반영하고 JPA 캐시 비우기
        userRepository.flush();
        userRepository.saveAndFlush(savedUser);  // 추가 보장
        
        System.out.println("Google 캘린더 연동 완료: " + savedUser.getId());
        System.out.println("🔄 DB 즉시 반영 및 캐시 클리어 완료!");
        
        return savedUser;
    }

    /**
     * OAuth2 사용자 저장 또는 업데이트 (새 사용자 여부 반환)
     */
    @CacheEvict(value = "user", key = "#result?.id")
    public User saveOrUpdateOAuth2UserWithNewUserFlag(String email, String name, String provider, String oauthId, String picture) {
        // 기존 사용자 찾기 (이메일로)
        Optional<User> existingUser = userRepository.findByEmail(email);
        
        if (existingUser.isPresent()) {
            // 기존 사용자 업데이트
            User user = existingUser.get();
            user.setName(name);
            user.setOauthProvider(provider);
            user.setOauthId(oauthId);
            user.setEmailVerified(true);
            if (picture != null) {
                user.setProfileImage(picture);
            }
            return userRepository.save(user);
        } else {
            // 새 사용자 생성
            User newUser = new User();
            newUser.setEmail(email);
            newUser.setName(name);
            newUser.setOauthProvider(provider);
            newUser.setOauthId(oauthId);
            newUser.setEmailVerified(true);
            newUser.setPassword(null); // OAuth2 사용자는 비밀번호 없음
            if (picture != null) {
                newUser.setProfileImage(picture);
            }
            return userRepository.save(newUser);
        }
    }

    /**
     * 사용자 저장 (일반 저장)
     */
    @CacheEvict(value = "user", allEntries = true)
    public User save(User user) {
        return userRepository.save(user);
    }

    /**
     * OAuth2 제공자와 ID로 사용자 조회
     */
    public Optional<User> findByOAuth2ProviderAndOAuth2Id(String provider, String oauthId) {
        System.out.println("=== OAuth2 사용자 검색 ===");
        System.out.println("Provider: " + provider);
        System.out.println("OAuthId: " + oauthId);
        System.out.println("OAuthId 타입: " + (oauthId != null ? oauthId.getClass().getSimpleName() : "null"));
        
        Optional<User> result = userRepository.findByOauthProviderAndOauthId(provider, oauthId);
        
        if (result.isPresent()) {
            User user = result.get();
            System.out.println("사용자 찾음: ID=" + user.getId() + ", Email=" + user.getEmail() + ", Name=" + user.getName());
        } else {
            System.out.println("사용자를 찾을 수 없음");
        }
        
        return result;
    }

    /**
     * 사용자 정보 업데이트
     */
    @CacheEvict(value = "user", key = "#userId")
    public User updateUser(Long userId, User updatedUser) {
        Optional<User> existingUser = userRepository.findById(userId);
        if (existingUser.isPresent()) {
            User user = existingUser.get();
            // 업데이트할 필드들 설정
            if (updatedUser.getName() != null) user.setName(updatedUser.getName());
            if (updatedUser.getNickname() != null) user.setNickname(updatedUser.getNickname());
            if (updatedUser.getBirthDate() != null) user.setBirthDate(updatedUser.getBirthDate());
            if (updatedUser.getGender() != null) user.setGender(updatedUser.getGender());
            if (updatedUser.getPhoneNumber() != null) user.setPhoneNumber(updatedUser.getPhoneNumber());
            
            return userRepository.save(user);
        }
        throw new RuntimeException("사용자를 찾을 수 없습니다.");
    }

    @Transactional
    public User linkGoogleAccount(Long userId, String googleEmail, String googleName, String googlePicture, String googleOAuthId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UsernameNotFoundException("사용자를 찾을 수 없습니다: " + userId));

        System.out.println("기존 사용자 정보: ID=" + user.getId() + ", Email=" + user.getEmail() + ", Provider=" + user.getOauthProvider());

        // 구글 관련 정보만 업데이트합니다. 사용자의 기본 이메일은 변경하지 않습니다.
        user.setGoogleEmail(googleEmail);
        user.setGoogleName(googleName);
        user.setGooglePicture(googlePicture);
        user.setGoogleOAuthId(googleOAuthId);

        User linkedUser = userRepository.save(user);
        System.out.println("Google 계정 연동 완료: ID=" + linkedUser.getId() + ", Google Email=" + linkedUser.getGoogleEmail());
        return linkedUser;
    }
} 