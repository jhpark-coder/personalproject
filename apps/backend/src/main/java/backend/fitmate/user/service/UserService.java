package backend.fitmate.user.service;

import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    private static final Logger log = LoggerFactory.getLogger(UserService.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @PersistenceContext
    private EntityManager entityManager;

    public boolean isEmailExists(String email) {
        return userRepository.existsByEmail(email);
    }

    public boolean isNicknameExists(String nickname) {
        if (nickname == null || nickname.trim().isEmpty()) {
            return false;
        }
        return userRepository.existsByNickname(nickname);
    }

    public boolean isPhoneNumberExists(String phoneNumber) {
        return userRepository.existsByPhoneNumber(phoneNumber);
    }

    public User signup(String email, String password, String nickname,
                       String name, String birthDate, String gender, String phoneNumber, String goal) {
        if (nickname != null && !nickname.trim().isEmpty() && isNicknameExists(nickname)) {
            throw new RuntimeException("Nickname already exists.");
        }

        if (isPhoneNumberExists(phoneNumber)) {
            throw new RuntimeException("Phone number already exists.");
        }

        User user = new User();
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(password));
        user.setNickname(nickname);
        user.setName(name);
        user.setBirthDate(birthDate);
        user.setGender(gender);
        user.setPhoneNumber(phoneNumber);
        user.setGoal(goal);
        user.setEmailVerified(false);

        return userRepository.save(user);
    }

    @CacheEvict(value = "user", key = "#email")
    public void verifyEmail(String email) {
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            user.setEmailVerified(true);
            userRepository.save(user);
        }
    }

    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    @Cacheable(value = "user", key = "#id")
    public Optional<User> findById(Long id) {
        return userRepository.findById(id);
    }

    @Transactional(readOnly = true)
    public Optional<User> findByIdWithRefresh(Long id) {
        try {
            Optional<User> userOpt = userRepository.findById(id);
            if (userOpt.isPresent()) {
                User user = userOpt.get();
                entityManager.refresh(user);
                log.debug("Forced user refresh completed: userId={}", id);
                return Optional.of(user);
            }

            log.debug("User not found during forced refresh: userId={}", id);
            return Optional.empty();
        } catch (Exception e) {
            log.warn("Forced user refresh failed: userId={}", id, e);
            return userRepository.findById(id);
        }
    }

    @Cacheable(value = "user", key = "'verified:' + #email")
    public Optional<User> findByEmailAndVerified(String email) {
        return userRepository.findByEmailAndEmailVerifiedTrue(email);
    }

    public Optional<User> findByProviderAndOAuthId(String provider, String oauthId) {
        return userRepository.findByOauthProviderAndOauthId(provider, oauthId);
    }

    @Transactional
    public User saveOrUpdateOAuth2User(String email, String name, String picture, String provider, String oauthId) {
        Optional<User> userOptional = userRepository.findByOauthProviderAndOauthId(provider, oauthId);
        User user;

        if (userOptional.isPresent()) {
            user = userOptional.get();
            user.setName(name);
            user.setProfileImage(picture);
        } else {
            Optional<User> byEmail = userRepository.findByEmail(email);
            if (byEmail.isPresent()) {
                user = byEmail.get();
                user.setOauthProvider(provider);
                user.setOauthId(oauthId);
                user.setProfileImage(picture);
                applyGoogleOAuthFields(user, email, name, picture, provider, oauthId);
            } else {
                user = new User();
                user.setEmail(email);
                user.setName(name);
                user.setProfileImage(picture);
                user.setOauthProvider(provider);
                user.setOauthId(oauthId);
                user.setEmailVerified(true);
                applyGoogleOAuthFields(user, email, name, picture, provider, oauthId);
            }
        }

        User savedUser = userRepository.save(user);
        log.debug("OAuth2 user saved: userId={}, provider={}", savedUser.getId(), provider);
        return savedUser;
    }

    @Transactional
    public User addGoogleCalendarInfo(String email, String name, String picture, String googleOauthId) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Existing user required for calendar linking."));

        user.setGoogleOAuthId(googleOauthId);
        user.setGoogleEmail(email);
        user.setGoogleName(name);
        user.setGooglePicture(picture);

        User savedUser = userRepository.save(user);
        log.debug("Google calendar info linked: userId={}", savedUser.getId());
        return savedUser;
    }

    @Transactional
    public User addGoogleCalendarInfoByUserId(Long userId, String googleEmail, String googleName, String picture, String googleOauthId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Existing user required for calendar linking. userId=" + userId));

        user.setGoogleOAuthId(googleOauthId);
        user.setGoogleEmail(googleEmail);
        user.setGoogleName(googleName);
        user.setGooglePicture(picture);

        User savedUser = userRepository.saveAndFlush(user);
        log.debug("Google calendar info linked by user id: userId={}", savedUser.getId());
        return savedUser;
    }

    @CacheEvict(value = "user", key = "#result?.id")
    public User saveOrUpdateOAuth2UserWithNewUserFlag(String email, String name, String provider, String oauthId, String picture) {
        Optional<User> existingUser = userRepository.findByEmail(email);

        if (existingUser.isPresent()) {
            User user = existingUser.get();
            user.setName(name);
            user.setOauthProvider(provider);
            user.setOauthId(oauthId);
            user.setEmailVerified(true);
            if (picture != null) {
                user.setProfileImage(picture);
            }
            return userRepository.save(user);
        }

        User newUser = new User();
        newUser.setEmail(email);
        newUser.setName(name);
        newUser.setOauthProvider(provider);
        newUser.setOauthId(oauthId);
        newUser.setEmailVerified(true);
        newUser.setPassword(null);
        if (picture != null) {
            newUser.setProfileImage(picture);
        }
        return userRepository.save(newUser);
    }

    @CacheEvict(value = "user", allEntries = true)
    public User save(User user) {
        return userRepository.save(user);
    }

    public Optional<User> findByOAuth2ProviderAndOAuth2Id(String provider, String oauthId) {
        Optional<User> result = userRepository.findByOauthProviderAndOauthId(provider, oauthId);
        log.debug("OAuth2 user lookup: provider={}, found={}", provider, result.isPresent());
        return result;
    }

    @CacheEvict(value = "user", key = "#userId")
    public User updateUser(Long userId, User updatedUser) {
        Optional<User> existingUser = userRepository.findById(userId);
        if (existingUser.isPresent()) {
            User user = existingUser.get();
            if (updatedUser.getName() != null) user.setName(updatedUser.getName());
            if (updatedUser.getNickname() != null) user.setNickname(updatedUser.getNickname());
            if (updatedUser.getBirthDate() != null) user.setBirthDate(updatedUser.getBirthDate());
            if (updatedUser.getGender() != null) user.setGender(updatedUser.getGender());
            if (updatedUser.getPhoneNumber() != null) user.setPhoneNumber(updatedUser.getPhoneNumber());

            return userRepository.save(user);
        }
        throw new RuntimeException("User not found.");
    }

    @Transactional
    public User linkGoogleAccount(Long userId, String googleEmail, String googleName, String googlePicture, String googleOAuthId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + userId));

        user.setGoogleEmail(googleEmail);
        user.setGoogleName(googleName);
        user.setGooglePicture(googlePicture);
        user.setGoogleOAuthId(googleOAuthId);

        User linkedUser = userRepository.save(user);
        log.debug("Google account linked: userId={}", linkedUser.getId());
        return linkedUser;
    }

    private void applyGoogleOAuthFields(User user, String email, String name, String picture, String provider, String oauthId) {
        if ("google".equals(provider)) {
            user.setGoogleOAuthId(oauthId);
            user.setGoogleEmail(email);
            user.setGoogleName(name);
            user.setGooglePicture(picture);
        }
    }
}
