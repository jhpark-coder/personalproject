package backend.fitmate.service;

import java.util.concurrent.TimeUnit;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import backend.fitmate.User.entity.User;

@Service
@ConditionalOnProperty(name = "spring.data.redis.host")
public class CacheService {

    @Autowired(required = false)
    private RedisTemplate<String, Object> redisTemplate;

    private static final String USER_CACHE_PREFIX = "user:";
    private static final String OAUTH2_CACHE_PREFIX = "oauth2:";
    private static final String SESSION_CACHE_PREFIX = "session:";

    // 사용자 정보 캐싱
    @Cacheable(value = "user", key = "#userId")
    public User getUserById(Long userId) {
        // 실제로는 UserService에서 조회
        return null;
    }

    // OAuth2 토큰 캐싱
    public void cacheOAuth2Token(String provider, String code, String token) {
        if (redisTemplate != null) {
            String key = OAUTH2_CACHE_PREFIX + provider + ":" + code;
            redisTemplate.opsForValue().set(key, token, 5, TimeUnit.MINUTES);
        }
    }

    public String getOAuth2Token(String provider, String code) {
        if (redisTemplate != null) {
            String key = OAUTH2_CACHE_PREFIX + provider + ":" + code;
            return (String) redisTemplate.opsForValue().get(key);
        }
        return null;
    }

    // 세션 정보 캐싱
    public void cacheUserSession(String token, User user) {
        if (redisTemplate != null) {
            String key = SESSION_CACHE_PREFIX + token;
            redisTemplate.opsForValue().set(key, user, 30, TimeUnit.MINUTES);
        }
    }

    public User getUserSession(String token) {
        if (redisTemplate != null) {
            String key = SESSION_CACHE_PREFIX + token;
            return (User) redisTemplate.opsForValue().get(key);
        }
        return null;
    }

    // 캐시 삭제
    @CacheEvict(value = "user", key = "#userId")
    public void evictUserCache(Long userId) {
        // 사용자 캐시 삭제
    }

    public void evictOAuth2Token(String provider, String code) {
        if (redisTemplate != null) {
            String key = OAUTH2_CACHE_PREFIX + provider + ":" + code;
            redisTemplate.delete(key);
        }
    }

    public void evictUserSession(String token) {
        if (redisTemplate != null) {
            String key = SESSION_CACHE_PREFIX + token;
            redisTemplate.delete(key);
        }
    }

    // 전체 캐시 삭제
    public void clearAllCaches() {
        if (redisTemplate != null) {
            redisTemplate.getConnectionFactory().getConnection().flushAll();
        }
    }
} 