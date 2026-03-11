package backend.fitmate.service;

// 이메일 인증 기능을 문자 인증으로 대체하여 주석처리
/*
import java.security.SecureRandom;
import java.time.Duration;
import java.util.concurrent.TimeUnit;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailVerificationService {

    @Autowired
    private StringRedisTemplate redisTemplate;

    @Autowired
    private JavaMailSender mailSender;

    private static final String VERIFICATION_PREFIX = "email_verification:";
    private static final int VERIFICATION_CODE_LENGTH = 6;
    private static final int VERIFICATION_EXPIRE_MINUTES = 5;

    public boolean sendVerificationEmail(String email) {
        try {
            String verificationCode = generateVerificationCode();
            String key = VERIFICATION_PREFIX + email;
            redisTemplate.opsForValue().set(key, verificationCode, Duration.ofMinutes(VERIFICATION_EXPIRE_MINUTES));
            sendEmail(email, verificationCode);
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    public boolean verifyCode(String email, String code) {
        try {
            String key = VERIFICATION_PREFIX + email;
            String storedCode = redisTemplate.opsForValue().get(key);
            
            if (storedCode != null && storedCode.equals(code)) {
                redisTemplate.delete(key);
                return true;
            }
            return false;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    public boolean resendVerificationEmail(String email) {
        String key = VERIFICATION_PREFIX + email;
        redisTemplate.delete(key);
        return sendVerificationEmail(email);
    }

    private String generateVerificationCode() {
        SecureRandom random = new SecureRandom();
        StringBuilder code = new StringBuilder();
        
        for (int i = 0; i < VERIFICATION_CODE_LENGTH; i++) {
            code.append(random.nextInt(10));
        }
        return code.toString();
    }

    private void sendEmail(String email, String code) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(email);
        message.setSubject("[FitMate] 이메일 인증 코드");
        message.setText(String.format(
            "안녕하세요! FitMate 회원가입을 위한 이메일 인증 코드입니다.\n\n" +
            "인증 코드: %s\n\n" +
            "이 코드는 5분간 유효합니다.\n" +
            "본인이 요청하지 않은 경우 이 메일을 무시하세요.\n\n" +
            "감사합니다.\n" +
            "FitMate 팀", code
        ));
        mailSender.send(message);
    }

    public Long getExpirationTime(String email) {
        String key = VERIFICATION_PREFIX + email;
        return redisTemplate.getExpire(key, TimeUnit.SECONDS);
    }

    public boolean hasVerificationCode(String email) {
        String key = VERIFICATION_PREFIX + email;
        return Boolean.TRUE.equals(redisTemplate.hasKey(key));
    }
}
*/ 