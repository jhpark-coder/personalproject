package backend.fitmate.service;

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

    /**
     * 이메일 인증 코드 생성 및 발송
     */
    public boolean sendVerificationEmail(String email) {
        try {
            // 랜덤 6자리 코드 생성
            String verificationCode = generateVerificationCode();
            
            // Redis에 저장 (5분 유지)
            String key = VERIFICATION_PREFIX + email;
            redisTemplate.opsForValue().set(key, verificationCode, Duration.ofMinutes(VERIFICATION_EXPIRE_MINUTES));
            
            // 이메일 발송
            sendEmail(email, verificationCode);
            
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    /**
     * 인증 코드 검증
     */
    public boolean verifyCode(String email, String code) {
        try {
            String key = VERIFICATION_PREFIX + email;
            String storedCode = redisTemplate.opsForValue().get(key);
            
            if (storedCode != null && storedCode.equals(code)) {
                // 인증 성공 시 Redis에서 삭제
                redisTemplate.delete(key);
                return true;
            }
            
            return false;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    /**
     * 인증 코드 재발송
     */
    public boolean resendVerificationEmail(String email) {
        // 기존 코드 삭제
        String key = VERIFICATION_PREFIX + email;
        redisTemplate.delete(key);
        
        // 새 코드 발송
        return sendVerificationEmail(email);
    }

    /**
     * 6자리 랜덤 숫자 코드 생성
     */
    private String generateVerificationCode() {
        SecureRandom random = new SecureRandom();
        StringBuilder code = new StringBuilder();
        
        for (int i = 0; i < VERIFICATION_CODE_LENGTH; i++) {
            code.append(random.nextInt(10));
        }
        
        return code.toString();
    }

    /**
     * 이메일 발송
     */
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

    /**
     * 인증 코드 만료 시간 확인
     */
    public Long getExpirationTime(String email) {
        String key = VERIFICATION_PREFIX + email;
        return redisTemplate.getExpire(key, TimeUnit.SECONDS);
    }

    /**
     * 인증 코드 존재 여부 확인
     */
    public boolean hasVerificationCode(String email) {
        String key = VERIFICATION_PREFIX + email;
        return Boolean.TRUE.equals(redisTemplate.hasKey(key));
    }
} 