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

@Service
@RequiredArgsConstructor
public class CustomOidcUserService extends OidcUserService {

	private final UserService userService;
	private final UserRepository userRepository;
	private final RedisTemplate<String, Object> redisTemplate;

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
			System.out.println("[CAL-LINK][CALLBACK][OIDC] " + uri + (qs != null ? ("?" + qs) : ""));
			System.out.println("[CAL-LINK][SES][OIDC] sessionId=" + sessionId);
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
					calendarLinkingUserId = Long.parseLong(String.valueOf(userIdAttr));
					System.out.println("✅[OIDC] 세션으로 연동 사용자 확인: userId=" + calendarLinkingUserId);
				}
				if (calendarLinkingUserId == null) {
					String sessionKey = "calendar_session:" + session.getId();
					Object redisMapped = redisTemplate.opsForValue().get(sessionKey);
					if (redisMapped != null) {
						calendarLinkingUserId = Long.parseLong(String.valueOf(redisMapped));
						System.out.println("✅[OIDC] Redis 세션 매핑으로 연동 사용자 확인: userId=" + calendarLinkingUserId);
					}
				}
			}

			// 1.5) 쿠키
			if (calendarLinkingUserId == null && request.getCookies() != null) {
				for (jakarta.servlet.http.Cookie c : request.getCookies()) {
					if ("calendar_link_uid".equals(c.getName())) {
						try {
							calendarLinkingUserId = Long.parseLong(c.getValue());
							System.out.println("✅[OIDC] 쿠키로 연동 사용자 확인: userId=" + calendarLinkingUserId);
							break;
						} catch (NumberFormatException ignored) {}
					}
				}
			}

			// 2) state
			if (calendarLinkingUserId == null) {
				String state = request.getParameter("state");
				System.out.println("[CAL-LINK][STATE][OIDC] " + state);
				if (state != null && !state.isBlank()) {
					String stateKey = "oauth_state:" + state;
					Object mappedUserId = redisTemplate.opsForValue().get(stateKey);
					System.out.println("🛂[OIDC] Redis 조회 결과 '" + stateKey + "': " + mappedUserId);
					if (mappedUserId != null) {
						calendarLinkingUserId = Long.parseLong(String.valueOf(mappedUserId));
						redisTemplate.delete(stateKey);
						System.out.println("✅[OIDC] Redis state로 연동 사용자 확인: userId=" + calendarLinkingUserId);
					}
				}
			}
		} catch (Exception e) {
			System.err.println("🚨[OIDC] 연동 사용자 식별 중 오류: " + e.getMessage());
		}

		if (calendarLinkingUserId != null && ("google-connect".equals(registrationId) || "google".equals(registrationId))) {
			String googleOauthId = (String) oidcUser.getAttribute("sub");
			String googleEmail = (String) oidcUser.getAttribute("email");
			String googleName = (String) oidcUser.getAttribute("name");
			String googlePicture = (String) oidcUser.getAttribute("picture");

			System.out.println("[CAL-LINK][LINK][OIDC] userId=" + calendarLinkingUserId + ", email=" + googleEmail + ", name=" + googleName + ", sub=" + googleOauthId);
			User updatedUser = userService.addGoogleCalendarInfoByUserId(calendarLinkingUserId, googleEmail, googleName, googlePicture, googleOauthId);
			System.out.println("[CAL-LINK][LINK-DONE][OIDC] updatedUserId=" + updatedUser.getId());

			// OIDC 사용자 반환(속성 추가는 successHandler에서 보조 복구)
			OidcIdToken idToken = oidcUser.getIdToken();
			return new DefaultOidcUser(oidcUser.getAuthorities(), idToken, "sub");
		}

		// 일반 OIDC 로그인 흐름
		OidcIdToken idToken = oidcUser.getIdToken();
		return new DefaultOidcUser(oidcUser.getAuthorities(), idToken, "sub");
	}
} 