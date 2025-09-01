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
import backend.fitmate.User.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class CustomOAuth2UserService implements OAuth2UserService<OAuth2UserRequest, OAuth2User> {

    private final UserService userService;
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

    private String maskToken(String raw) {
        if (raw == null || raw.isBlank()) return "(empty)";
        int keep = Math.min(6, raw.length());
        String visible = raw.substring(0, keep);
        return visible + "****";
    }

    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) return "(none)";
        String[] parts = email.split("@", 2);
        String local = parts[0];
        String domain = parts[1];
        String maskedLocal = local.length() <= 2 ? local.charAt(0) + "*" : local.substring(0, 2) + "***";
        return maskedLocal + "@" + domain;
    }

    private String maskSub(String sub) {
        return maskToken(sub);
    }

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2UserService<OAuth2UserRequest, OAuth2User> delegate = new DefaultOAuth2UserService();
        OAuth2User oAuth2User = delegate.loadUser(userRequest);

        String registrationId = userRequest.getClientRegistration().getRegistrationId();
        Map<String, Object> attributes = new HashMap<>(oAuth2User.getAttributes());
        String nameAttributeKey;

        log.info("--- [CustomOAuth2UserService] loadUser 진입 ---");
        log.info("🛂 Registration ID: {}", registrationId);
        try {
            HttpServletRequest req0 = ((ServletRequestAttributes) RequestContextHolder.currentRequestAttributes()).getRequest();
            String uri = req0.getRequestURI();
            String qs = req0.getQueryString();
            String sessionId = (req0.getSession(false) != null) ? req0.getSession(false).getId() : null;
            String maskedSession = sessionId != null ? maskToken(sessionId) : "(no-session)";
            String cookieNames = (req0.getCookies() != null)
                ? java.util.Arrays.stream(req0.getCookies()).map(c -> c.getName()).collect(java.util.stream.Collectors.joining(","))
                : "(no-cookies)";
            log.debug("[CAL-LINK][CALLBACK] {}{}", uri, (qs != null ? ("?" + qs) : ""));
            log.debug("[CAL-LINK][SES] sessionId(masked)={}", maskedSession);
            log.debug("[CAL-LINK][CKN] names={} ", cookieNames);
        } catch (IllegalStateException ignore) {}

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
                    calendarLinkingUserId = parseLongSafely(userIdAttr);
                    log.info("✅ 세션으로 캘린더 연동 사용자 확인: userId={}, sessionId(masked)={}", calendarLinkingUserId, maskToken(session.getId()));
                }

                // Redis 세션 키 보조 확인
                if (calendarLinkingUserId == null) {
                    String sessionKey = "calendar_session:" + session.getId();
                    Object redisMapped = redisTemplate.opsForValue().get(sessionKey);
                    if (redisMapped != null) {
                        calendarLinkingUserId = parseLongSafely(redisMapped);
                        log.info("✅ Redis 세션 매핑으로 캘린더 연동 사용자 확인: userId={}", calendarLinkingUserId);
                    } else {
                        log.debug("[CAL-LINK][REDIS] not found: {}", sessionKey);
                    }
                }
            } else {
                log.debug("[CAL-LINK][SES] no session");
            }

            // 1.5) HttpOnly 쿠키 보조 확인
            if (calendarLinkingUserId == null && request.getCookies() != null) {
                for (jakarta.servlet.http.Cookie c : request.getCookies()) {
                    if ("calendar_link_uid".equals(c.getName())) {
                        Long parsed = parseLongSafely(c.getValue());
                        if (parsed != null) {
                            calendarLinkingUserId = parsed;
                            log.info("✅ 쿠키로 캘린더 연동 사용자 확인: userId={}", calendarLinkingUserId);
                            break;
                        }
                    }
                }
            }

            // 2) 하위 호환: state 파라미터 기반 (이전 방식)
            if (calendarLinkingUserId == null) {
                String state = request.getParameter("state");
                log.debug("[CAL-LINK][STATE] (masked) {}", state != null ? maskToken(state) : null);
                if (state != null && !state.isBlank()) {
                    String stateKey = "oauth_state:" + state;
                    Object mappedUserId = redisTemplate.opsForValue().get(stateKey);
                    log.debug("🛂 Redis 조회 결과 for key '{}': {}", stateKey, mappedUserId != null ? "(hit)" : "(miss)");
                    if (mappedUserId != null) {
                        calendarLinkingUserId = parseLongSafely(mappedUserId);
                        redisTemplate.delete(stateKey); // 일회성 사용 후 즉시 삭제
                        log.info("✅ Redis state 매핑으로 캘린더 연동 사용자 확인: userId={}", calendarLinkingUserId);
                    }
                }
            }
        } catch (IllegalStateException e) {
            log.error("🚨 캘린더 연동 사용자 식별 중 오류: {}", e.getMessage(), e);
        }

        // 캘린더 연동 사용자가 확인된 경우 (google-connect 전용 registration)
        if (calendarLinkingUserId != null && ("google-connect".equals(registrationId) || "google".equals(registrationId))) {
            try {
                String googleOauthId = oAuth2User.getAttribute("sub");
                String googleEmail = oAuth2User.getAttribute("email");
                String googleName = oAuth2User.getAttribute("name");
                String googlePicture = oAuth2User.getAttribute("picture");

                log.info("[CAL-LINK][LINK] userId={}, email(masked)={}, name={}, sub(masked)={}", calendarLinkingUserId, maskEmail(googleEmail), googleName, maskSub(googleOauthId));
                User updatedUser = userService.addGoogleCalendarInfoByUserId(
                    calendarLinkingUserId, googleEmail, googleName, googlePicture, googleOauthId);

                log.info("[CAL-LINK][LINK-DONE] updatedUserId={}", updatedUser.getId());
                attributes.put("provider", "google-connect");
                attributes.put("userId", updatedUser.getId().toString());
                attributes.put("calendarLinking", true);
                nameAttributeKey = "sub";

                return new DefaultOAuth2User(oAuth2User.getAuthorities(), attributes, nameAttributeKey);
            } catch (RuntimeException e) {
                log.error("🚨 캘린더 연동 처리 실패: {}", e.getMessage(), e);
                throw new OAuth2AuthenticationException("캘린더 연동 처리 중 오류가 발생했습니다: " + e.getMessage());
            }
        }

        // 일반 소셜 로그인 분기
        log.info("🔀 [CustomOAuth2UserService] 일반 소셜 로그인 분기 실행");
        switch (registrationId) {
            case "google":
            case "google-connect":
                attributes.put("provider", "google");
                nameAttributeKey = "sub";
                break;
            case "naver":
                Object responseObj = attributes.get("response");
                if (responseObj instanceof Map<?, ?> respRaw) {
                    Map<String, Object> resp = new HashMap<>();
                    respRaw.forEach((k, v) -> resp.put(String.valueOf(k), v));
                    // 표준 키로 정규화
                    Map<String, Object> normalized = new HashMap<>();
                    normalized.putAll(resp);
                    normalized.put("provider", "naver");
                    // Naver 표준화: id/email/name/picture
                    if (!normalized.containsKey("id") && resp.get("id") != null) normalized.put("id", resp.get("id"));
                    if (!normalized.containsKey("email") && resp.get("email") != null) normalized.put("email", resp.get("email"));
                    if (!normalized.containsKey("name") && resp.get("name") != null) normalized.put("name", resp.get("name"));
                    Object profileImage = resp.get("profile_image");
                    if (profileImage != null) normalized.put("picture", profileImage);
                    attributes = normalized;
                    nameAttributeKey = "id";
                } else {
                    throw new OAuth2AuthenticationException("네이버 OAuth2 응답의 response 객체가 Map이 아닙니다: " + responseObj);
                }
                break;
            case "kakao":
                log.info("[KAKAO-DEBUG] Raw attributes: {}", attributes);
                Map<String, Object> kakaoAttributes = new HashMap<>();
                kakaoAttributes.put("id", attributes.get("id"));
                Object kakaoAccountObj = attributes.get("kakao_account");
                log.info("[KAKAO-DEBUG] kakao_account object: {}", kakaoAccountObj);
                if (kakaoAccountObj instanceof Map<?, ?> kakaoAccount) {
                    Object emailObj = kakaoAccount.get("email");
                    log.info("[KAKAO-DEBUG] email from kakao_account: {}", emailObj);
                    kakaoAttributes.put("email", emailObj);
                    Object profileObj = kakaoAccount.get("profile");
                    log.info("[KAKAO-DEBUG] profile object: {}", profileObj);
                    if (profileObj instanceof Map<?, ?> profile) {
                        Object nickname = profile.get("nickname");
                        Object profileImageUrl = profile.get("profile_image_url");
                        if (nickname != null) kakaoAttributes.put("name", nickname);
                        if (profileImageUrl != null) kakaoAttributes.put("picture", profileImageUrl);
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