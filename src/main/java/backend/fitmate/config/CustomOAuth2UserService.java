package backend.fitmate.config;

import java.util.HashMap;
import java.util.Map;

import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
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
public class CustomOAuth2UserService implements OAuth2UserService<OAuth2UserRequest, OAuth2User> {

    private final UserService userService;
    private final UserRepository userRepository;
    private final RedisTemplate<String, Object> redisTemplate;

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2UserService<OAuth2UserRequest, OAuth2User> delegate = new DefaultOAuth2UserService();
        OAuth2User oAuth2User = delegate.loadUser(userRequest);

        String registrationId = userRequest.getClientRegistration().getRegistrationId();
        Map<String, Object> attributes = new HashMap<>(oAuth2User.getAttributes());
        String nameAttributeKey;

        System.out.println("--- [CustomOAuth2UserService] loadUser 진입 ---");
        System.out.println("🛂 Registration ID: " + registrationId);
        try {
            HttpServletRequest req0 = ((ServletRequestAttributes) RequestContextHolder.currentRequestAttributes()).getRequest();
            String uri = req0.getRequestURI();
            String qs = req0.getQueryString();
            String cookies = req0.getCookies() != null ? java.util.Arrays.stream(req0.getCookies()).map(c -> c.getName() + "=" + c.getValue()).collect(java.util.stream.Collectors.joining("; ")) : "(no-cookies)";
            String sessionId = (req0.getSession(false) != null) ? req0.getSession(false).getId() : "(no-session)";
            System.out.println("[CAL-LINK][CALLBACK] " + uri + (qs != null ? ("?" + qs) : ""));
            System.out.println("[CAL-LINK][SES] sessionId=" + sessionId);
            System.out.println("[CAL-LINK][CK ] " + cookies);
        } catch (Exception ignore) {}

        // ================== 캘린더 연동 처리 로직 ==================
        HttpServletRequest request = ((ServletRequestAttributes) RequestContextHolder.currentRequestAttributes()).getRequest();

        Long calendarLinkingUserId = null;

        try {
            // 1) 세션 기반 식별 (권장)
            jakarta.servlet.http.HttpSession session = request.getSession(false);
            if (session != null) {
                Object marker = session.getAttribute("calendar_linking_active");
                Object userIdAttr = session.getAttribute("calendar_linking_user_id");
                if (Boolean.TRUE.equals(marker) && userIdAttr != null) {
                    calendarLinkingUserId = Long.parseLong(String.valueOf(userIdAttr));
                    System.out.println("✅ 세션으로 캘린더 연동 사용자 확인: userId=" + calendarLinkingUserId + ", sessionId=" + session.getId());
                }

                // Redis 세션 키 보조 확인
                if (calendarLinkingUserId == null) {
                    String sessionKey = "calendar_session:" + session.getId();
                    Object redisMapped = redisTemplate.opsForValue().get(sessionKey);
                    if (redisMapped != null) {
                        calendarLinkingUserId = Long.parseLong(String.valueOf(redisMapped));
                        System.out.println("✅ Redis 세션 매핑으로 캘린더 연동 사용자 확인: userId=" + calendarLinkingUserId);
                    } else {
                        System.out.println("[CAL-LINK][REDIS] not found: " + sessionKey);
                    }
                }
            } else {
                System.out.println("[CAL-LINK][SES] no session");
            }

            // 1.5) HttpOnly 쿠키 보조 확인
            if (calendarLinkingUserId == null && request.getCookies() != null) {
                for (jakarta.servlet.http.Cookie c : request.getCookies()) {
                    if ("calendar_link_uid".equals(c.getName())) {
                        try {
                            calendarLinkingUserId = Long.parseLong(c.getValue());
                            System.out.println("✅ 쿠키로 캘린더 연동 사용자 확인: userId=" + calendarLinkingUserId);
                            break;
                        } catch (NumberFormatException ignored) {}
                    }
                }
            }

            // 2) 하위 호환: state 파라미터 기반 (이전 방식)
            if (calendarLinkingUserId == null) {
                String state = request.getParameter("state");
                System.out.println("[CAL-LINK][STATE] " + state);
                if (state != null && !state.isBlank()) {
                    String stateKey = "oauth_state:" + state;
                    Object mappedUserId = redisTemplate.opsForValue().get(stateKey);
                    System.out.println("🛂 Redis 조회 결과 for key '" + stateKey + "': " + mappedUserId);
                    if (mappedUserId != null) {
                        calendarLinkingUserId = Long.parseLong(String.valueOf(mappedUserId));
                        redisTemplate.delete(stateKey); // 일회성 사용 후 즉시 삭제
                        System.out.println("✅ Redis state 매핑으로 캘린더 연동 사용자 확인: userId=" + calendarLinkingUserId);
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("🚨 캘린더 연동 사용자 식별 중 오류: " + e.getMessage());
        }

        // 캘린더 연동 사용자가 확인된 경우 (google-connect 전용 registration)
        if (calendarLinkingUserId != null && ("google-connect".equals(registrationId) || "google".equals(registrationId))) {
            try {
                String googleOauthId = oAuth2User.getAttribute("sub");
                String googleEmail = oAuth2User.getAttribute("email");
                String googleName = oAuth2User.getAttribute("name");
                String googlePicture = oAuth2User.getAttribute("picture");

                System.out.println("[CAL-LINK][LINK] userId=" + calendarLinkingUserId + ", email=" + googleEmail + ", name=" + googleName + ", sub=" + googleOauthId);
                User updatedUser = userService.addGoogleCalendarInfoByUserId(
                    calendarLinkingUserId, googleEmail, googleName, googlePicture, googleOauthId);

                System.out.println("[CAL-LINK][LINK-DONE] updatedUserId=" + updatedUser.getId());
                attributes.put("provider", "google-connect");
                attributes.put("userId", updatedUser.getId().toString());
                attributes.put("calendarLinking", true);
                nameAttributeKey = "sub";

                return new DefaultOAuth2User(oAuth2User.getAuthorities(), attributes, nameAttributeKey);
            } catch (Exception e) {
                System.err.println("🚨 캘린더 연동 처리 실패: " + e.getMessage());
                e.printStackTrace();
                throw new OAuth2AuthenticationException("캘린더 연동 처리 중 오류가 발생했습니다: " + e.getMessage());
            }
        }

        // 일반 소셜 로그인 분기
        System.out.println("🔀 [CustomOAuth2UserService] 일반 소셜 로그인 분기 실행");
        switch (registrationId) {
            case "google":
            case "google-connect":
                attributes.put("provider", "google");
                nameAttributeKey = "sub";
                break;
            case "naver":
                Object responseObj = attributes.get("response");
                if (responseObj instanceof Map) {
                    attributes = new HashMap<>((Map<String, Object>) responseObj);
                    attributes.put("provider", "naver");
                    attributes.put("response", responseObj);
                    nameAttributeKey = "response";
                } else {
                    throw new OAuth2AuthenticationException("네이버 OAuth2 응답의 response 객체가 Map이 아닙니다: " + responseObj);
                }
                break;
            case "kakao":
                Map<String, Object> kakaoAttributes = new HashMap<>();
                kakaoAttributes.put("id", attributes.get("id"));
                Map<String, Object> kakaoAccount = (Map<String, Object>) attributes.get("kakao_account");
                if (kakaoAccount != null) {
                    kakaoAttributes.put("email", kakaoAccount.get("email"));
                    Map<String, Object> profile = (Map<String, Object>) kakaoAccount.get("profile");
                    if (profile != null) {
                        kakaoAttributes.put("name", profile.get("nickname"));
                        kakaoAttributes.put("picture", profile.get("profile_image_url"));
                    }
                }
                kakaoAttributes.put("provider", "kakao");
                attributes = kakaoAttributes;
                nameAttributeKey = "id";
                break;
            default:
                throw new OAuth2AuthenticationException("지원하지 않는 OAuth2 제공자입니다: " + registrationId);
        }

        return new DefaultOAuth2User(
                oAuth2User.getAuthorities(),
                attributes,
                nameAttributeKey);
    }
} 