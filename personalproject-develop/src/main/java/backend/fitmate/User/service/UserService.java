package backend.fitmate.User.service;

import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import backend.fitmate.User.entity.User;
import backend.fitmate.User.repository.UserRepository;

@Service
@Transactional
public class UserService {

    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private PasswordEncoder passwordEncoder;

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
     * 이메일로 사용자 조회
     */
    @Cacheable(value = "user", key = "#email")
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
     * 이메일 인증된 사용자 조회
     */
    @Cacheable(value = "user", key = "'verified:' + #email")
    public Optional<User> findByEmailAndVerified(String email) {
        return userRepository.findByEmailAndEmailVerifiedTrue(email);
    }

    /**
     * OAuth2 사용자 저장 또는 업데이트
     */
    @CacheEvict(value = "user", allEntries = true)
    public User saveOrUpdateOAuth2User(String email, String name, String provider, String oauthId, String picture) {
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
    @Cacheable(value = "user", key = "'oauth:' + #provider + ':' + #oauthId")
    public Optional<User> findByOAuth2ProviderAndOAuth2Id(String provider, String oauthId) {
        return userRepository.findByOauthProviderAndOauthId(provider, oauthId);
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
} 