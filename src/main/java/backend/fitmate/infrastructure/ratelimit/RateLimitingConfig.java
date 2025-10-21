package backend.fitmate.infrastructure.ratelimit;

import java.nio.ByteBuffer;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.github.bucket4j.distributed.proxy.ProxyManager;
import io.lettuce.core.RedisClient;
import io.lettuce.core.api.StatefulRedisConnection;
import io.lettuce.core.codec.RedisCodec;

@Configuration
@ConditionalOnProperty(name = "rate-limiting.enabled", havingValue = "true", matchIfMissing = true)
public class RateLimitingConfig {

    @Value("${spring.data.redis.host:localhost}")
    private String redisHost;

    @Value("${spring.data.redis.port:6379}")
    private int redisPort;

    @Bean
    public ProxyManager<String> proxyManager() {
        RedisClient redisClient = RedisClient.create("redis://" + redisHost + ":" + redisPort);
        
        // String 키와 byte[] 값을 위한 커스텀 코덱
        RedisCodec<String, byte[]> codec = new RedisCodec<String, byte[]>() {
            @Override
            public String decodeKey(ByteBuffer bytes) {
                return new String(bytes.array(), bytes.arrayOffset() + bytes.position(), bytes.remaining());
            }

            @Override
            public byte[] decodeValue(ByteBuffer bytes) {
                byte[] result = new byte[bytes.remaining()];
                bytes.get(result);
                return result;
            }

            @Override
            public ByteBuffer encodeKey(String key) {
                return ByteBuffer.wrap(key.getBytes());
            }

            @Override
            public ByteBuffer encodeValue(byte[] value) {
                return ByteBuffer.wrap(value);
            }
        };
        
        StatefulRedisConnection<String, byte[]> connection = redisClient.connect(codec);
        return io.github.bucket4j.redis.lettuce.Bucket4jLettuce.casBasedBuilder(connection)
            .build();
    }
} 