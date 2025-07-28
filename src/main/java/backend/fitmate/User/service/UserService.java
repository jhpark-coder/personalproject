package backend.fitmate.User.service;

import backend.fitmate.User.entity.User;
import backend.fitmate.User.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

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
                      String name, String birthDate, String gender, String phoneNumber) {
        
        // 이메일 중복 확인
        if (isEmailExists(email)) {
            throw new RuntimeException("이미 존재하는 이메일입니다.");
        }
        
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
        user.setEmailVerified(false);
        
        return userRepository.save(user);
    }

    /**
     * 이메일 인증 완료 처리
     */
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
    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    /**
     * 인증된 이메일로 사용자 조회
     */
    public Optional<User> findByEmailAndVerified(String email) {
        return userRepository.findByEmailAndEmailVerifiedTrue(email);
    }

    /**
     * 사용자 정보 업데이트
     */
    public User updateUser(Long userId, User updatedUser) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            user.setNickname(updatedUser.getNickname());
            user.setName(updatedUser.getName());
            user.setGender(updatedUser.getGender());
            user.setPhoneNumber(updatedUser.getPhoneNumber());
            return userRepository.save(user);
        }
        throw new RuntimeException("사용자를 찾을 수 없습니다.");
    }
} 