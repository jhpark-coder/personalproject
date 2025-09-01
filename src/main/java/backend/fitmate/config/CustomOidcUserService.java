package backend.fitmate.config;

import java.util.HashMap;
import java.util.Map;

import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.oidc.OidcIdToken;
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import backend.fitmate.User.entity.User;
import backend.fitmate.User.repository.UserRepository;
import backend.fitmate.User.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class CustomOidcUserService extends OidcUserService {

	private final UserService userService;
	@SuppressWarnings("unused")
	private final UserRepository userRepository;
	private final RedisTemplate<String, Object> redisTemplate;

	private Long parseLongSafely(Object value) {
		if (value == null) return null;
		if (value instanceof Number num) return num.longValue();
		if (value instanceof String s) {
			try {
				return Long.parseLong(s);
			} catch (NumberFormatException ignored) {
				return null;
			}
		}
		return null;
	}

	@Override
	public OidcUser loadUser(OidcUserRequest userRequest) throws OAuth2AuthenticationException {
		OidcUser oidcUser = super.loadUser(userRequest);

		String registrationId = userRequest.getClientRegistration().getRegistrationId();
		Map<String, Object> attributes = new HashMap<>(oidcUser.getAttributes());

		try {
			HttpServletRequest req0 = ((ServletRequestAttributes) RequestContextHolder.currentRequestAttributes()).getRequest();
			String uri = req0.getRequestURI();
			String qs = req0.getQueryString();
			String sessionId = (req0.getSession(false) != null) ? req0.getSession(false).getId() : "(no-session)";
			log.info("[CAL-LINK][CALLBACK][OIDC] {}{}", uri, (qs != null ? ("?" + qs) : ""));
			log.info("[CAL-LINK][SES][OIDC] sessionId={}", sessionId);
		} catch (Exception ignore) {}

		Long calendarLinkingUserId = null;
		try {
			HttpServletRequest request = ((ServletRequestAttributes) RequestContextHolder.currentRequestAttributes()).getRequest();

			// 1) 세션
			jakarta.servlet.http.HttpSession session = request.getSession(false);
			if (session != null) {
				Object marker = session.getAttribute("calendar_linking_active");
				Object userIdAttr = session.getAttribute("calendar_linking_user_id");
				if (Boolean.TRUE.equals(marker) && userIdAttr != null) {
					calendarLinkingUserId = parseLongSafely(userIdAttr);
					log.info("✅[OIDC] 세션으로 연동 사용자 확인: userId={}", calendarLinkingUserId);
				}
				if (calendarLinkingUserId == null) {
					String sessionKey = "calendar_session:" + session.getId();
					Object redisMapped = redisTemplate.opsForValue().get(sessionKey);
					if (redisMapped != null) {
						calendarLinkingUserId = parseLongSafely(redisMapped);
						log.info("✅[OIDC] Redis 세션 매핑으로 연동 사용자 확인: userId={}", calendarLinkingUserId);
					}
				}
			}

			// 1.5) 쿠키
			if (calendarLinkingUserId == null && request.getCookies() != null) {
				for (jakarta.servlet.http.Cookie c : request.getCookies()) {
					if ("calendar_link_uid".equals(c.getName())) {
						Long parsed = parseLongSafely(c.getValue());
						if (parsed != null) {
							calendarLinkingUserId = parsed;
							log.info("✅[OIDC] 쿠키로 연동 사용자 확인: userId={}", calendarLinkingUserId);
							break;
						}
					}
				}
			}

			// 2) state
			if (calendarLinkingUserId == null) {
				String state = request.getParameter("state");
				log.info("[CAL-LINK][STATE][OIDC] {}", state);
				if (state != null && !state.isBlank()) {
					String stateKey = "oauth_state:" + state;
					Object mappedUserId = redisTemplate.opsForValue().get(stateKey);
					log.info("🛂[OIDC] Redis 조회 결과 '{}': {}", stateKey, mappedUserId);
					if (mappedUserId != null) {
						calendarLinkingUserId = parseLongSafely(mappedUserId);
						redisTemplate.delete(stateKey);
						log.info("✅[OIDC] Redis state로 연동 사용자 확인: userId={}", calendarLinkingUserId);
					}
				}
			}
		} catch (Exception e) {
			log.error("🚨[OIDC] 연동 사용자 식별 중 오류: {}", e.getMessage(), e);
		}

		if (calendarLinkingUserId != null && ("google-connect".equals(registrationId) || "google".equals(registrationId))) {
			String googleOauthId = (String) attributes.get("sub");
			String googleEmail = (String) attributes.get("email");
			String googleName = (String) attributes.get("name");
			String googlePicture = (String) attributes.get("picture");

			log.info("[CAL-LINK][LINK][OIDC] userId={}, email={}, name={}, sub={}", calendarLinkingUserId, googleEmail, googleName, googleOauthId);
			User updatedUser = userService.addGoogleCalendarInfoByUserId(calendarLinkingUserId, googleEmail, googleName, googlePicture, googleOauthId);
			log.info("[CAL-LINK][LINK-DONE][OIDC] updatedUserId={}", updatedUser.getId());

			OidcIdToken idToken = oidcUser.getIdToken();
			return new DefaultOidcUser(oidcUser.getAuthorities(), idToken, "sub");
		}

		OidcIdToken idToken = oidcUser.getIdToken();
		return new DefaultOidcUser(oidcUser.getAuthorities(), idToken, "sub");
	}
} 