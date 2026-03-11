package backend.fitmate;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientService;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;

import io.github.bucket4j.distributed.proxy.ProxyManager;

@SpringBootTest
class FitmateApplicationTests {

	@MockBean
	private RedisTemplate<String, Object> redisTemplate;

	@MockBean
	private StringRedisTemplate stringRedisTemplate;

	@MockBean
	private OAuth2AuthorizedClientService authorizedClientService;

	@MockBean
	private ClientRegistrationRepository clientRegistrationRepository;

	@MockBean
	private ProxyManager<String> proxyManager;

	@Test
	void contextLoads() {
	}

}
