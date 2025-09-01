package backend.fitmate.config;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.DefaultOAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;

import backend.fitmate.User.entity.User;
import backend.fitmate.User.service.UserService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;

public class CustomAuthorizationRequestResolver implements OAuth2AuthorizationRequestResolver {

	private final DefaultOAuth2AuthorizationRequestResolver defaultResolver;
	private final RedisTemplate<String, Object> redisTemplate;
	private final UserService userService;

	public CustomAuthorizationRequestResolver(ClientRegistrationRepository clientRegistrationRepository,
			RedisTemplate<String, Object> redisTemplate,
			UserService userService) {
		this.defaultResolver = new DefaultOAuth2AuthorizationRequestResolver(clientRegistrationRepository, "/oauth2/authorization");
		this.redisTemplate = redisTemplate;
		this.userService = userService;
	}

	@Override
	public OAuth2AuthorizationRequest resolve(HttpServletRequest request) {
		OAuth2AuthorizationRequest authRequest = defaultResolver.resolve(request);
		return process(request, authRequest);
	}

	@Override
	public OAuth2AuthorizationRequest resolve(HttpServletRequest request, String clientRegistrationId) {
		OAuth2AuthorizationRequest authRequest = defaultResolver.resolve(request, clientRegistrationId);
		return process(request, authRequest);
	}

	private OAuth2AuthorizationRequest process(HttpServletRequest request, OAuth2AuthorizationRequest authRequest) {
		if (authRequest == null) {
			return null;
		}

		try {
			String state = authRequest.getState();
			Long userId = extractUserIdFromCookie(request);
			if (userId == null) {
				userId = extractCurrentUserId();
			}
			System.out.println("🛂 AuthorizationRequestResolver - State: " + state + ", UserId: " + userId);
			if (state != null && userId != null) {
				String stateKey = "oauth_state:" + state;
				redisTemplate.opsForValue().set(stateKey, String.valueOf(userId), Duration.ofMinutes(15));
			}
		} catch (Exception e) {
			System.err.println("🚨 AuthorizationRequestResolver state 매핑 실패: " + e.getMessage());
		}

		// 동적 redirect URI 생성 (HTTPS 프로토콜 처리)
		String originalRedirectUri = authRequest.getRedirectUri();
		String dynamicRedirectUri = buildDynamicRedirectUri(request, originalRedirectUri);
		
		System.out.println("🔗 Original Redirect URI: " + originalRedirectUri);
		System.out.println("🔗 Dynamic Redirect URI: " + dynamicRedirectUri);

		// 추가 파라미터 주입: refresh 토큰/권한 확장 유지
		Map<String, Object> additional = new HashMap<>(authRequest.getAdditionalParameters());
		additional.put("access_type", "offline");
		additional.put("prompt", "consent");
		additional.put("include_granted_scopes", "true");

		return OAuth2AuthorizationRequest.from(authRequest)
			.redirectUri(dynamicRedirectUri)
			.additionalParameters(additional)
			.build();
	}
	
	private String buildDynamicRedirectUri(HttpServletRequest request, String originalUri) {
		// 원래 도메인 정보를 Redis에 저장 (나중에 콜백에서 사용)
		String host = request.getHeader("Host");
		String xForwardedHost = request.getHeader("X-Forwarded-Host");
		String xForwardedProto = request.getHeader("X-Forwarded-Proto");
		String referer = request.getHeader("Referer");
		
		// 원본 도메인 감지 및 저장
		String originalDomain = null;
		if (xForwardedHost != null && xForwardedHost.contains("trycloudflare.com")) {
			originalDomain = "https://" + xForwardedHost;
		} else if (host != null && host.contains("trycloudflare.com")) {
			originalDomain = "https://" + host;
		} else if (referer != null && referer.contains("trycloudflare.com")) {
			// Referer에서 도메인 추출
			try {
				java.net.URL url = new java.net.URL(referer);
				originalDomain = url.getProtocol() + "://" + url.getHost();
			} catch (Exception e) {
				System.err.println("Referer 파싱 실패: " + e.getMessage());
			}
		}
		
		// 원본 도메인이 있으면 세션에 저장
		if (originalDomain != null) {
			try {
				request.getSession().setAttribute("oauth_original_domain", originalDomain);
				System.out.println("🔗 원본 도메인 저장: " + originalDomain);
				
				// Redis에도 저장 (state 파라미터와 연결)
				OAuth2AuthorizationRequest authRequest = defaultResolver.resolve(request);
				if (authRequest != null && authRequest.getState() != null) {
					String stateKey = "oauth_domain:" + authRequest.getState();
					redisTemplate.opsForValue().set(stateKey, originalDomain, java.time.Duration.ofMinutes(15));
					System.out.println("🔗 Redis에 도메인 저장: state=" + authRequest.getState() + ", domain=" + originalDomain);
				}
			} catch (Exception e) {
				System.err.println("도메인 저장 실패: " + e.getMessage());
			}
		}
		
		// OAuth 제공자에는 항상 localhost:8080으로 리다이렉트 (등록된 URI)
		String path = originalUri.substring(originalUri.indexOf("/", 8));
		return "http://localhost:8080" + path;
	}

	private Long extractUserIdFromCookie(HttpServletRequest request) {
		try {
			Cookie[] cookies = request.getCookies();
			if (cookies == null) return null;
			for (Cookie c : cookies) {
				if ("calendar_link_uid".equals(c.getName())) {
					return Long.parseLong(c.getValue());
				}
			}
		} catch (Exception ignored) {}
		return null;
	}

	private Long extractCurrentUserId() {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		if (authentication == null || !authentication.isAuthenticated()) {
			return null;
		}

		Object principal = authentication.getPrincipal();
		if (principal instanceof UserDetails) {
			String username = ((UserDetails) principal).getUsername();
			try { return Long.parseLong(username); } catch (NumberFormatException ignored) {}
		}
		if (principal instanceof String) {
			String principalStr = (String) principal;
			if (principalStr.contains(":")) {
				String[] parts = principalStr.split(":");
				if (parts.length >= 2) {
					String provider = parts[0];
					String oauthId = parts[1];
					return userService.findByProviderAndOAuthId(provider, oauthId).map(User::getId).orElse(null);
				}
			}
		}
		return null;
	}
} 