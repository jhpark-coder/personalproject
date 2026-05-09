package backend.fitmate.config;

import java.util.HashMap;
import java.util.Map;

import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class CustomOAuth2UserService implements OAuth2UserService<OAuth2UserRequest, OAuth2User> {

    @Override
    @SuppressWarnings("unchecked")
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2UserService<OAuth2UserRequest, OAuth2User> delegate = new DefaultOAuth2UserService();
        OAuth2User oAuth2User = delegate.loadUser(userRequest);

        String registrationId = userRequest.getClientRegistration().getRegistrationId();
        Map<String, Object> attributes = new HashMap<>(oAuth2User.getAttributes());
        String nameAttributeKey;

        log.debug("OAuth2 user info loaded: provider={}, keys={}", registrationId, attributes.keySet());

        switch (registrationId) {
            case "google":
                attributes.put("provider", "google");
                nameAttributeKey = "sub";
                break;

            case "naver":
                Object responseObj = attributes.get("response");

                if (responseObj instanceof Map) {
                    Map<String, Object> naverResponse = (Map<String, Object>) responseObj;
                    attributes = new HashMap<>(naverResponse);
                    attributes.put("provider", "naver");
                    attributes.put("response", responseObj);
                    nameAttributeKey = "response";
                } else {
                    log.warn("OAuth2 Naver response has invalid shape");
                    throw new OAuth2AuthenticationException("Invalid Naver OAuth2 response shape.");
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
                throw new OAuth2AuthenticationException("Unsupported OAuth2 provider: " + registrationId);
        }

        if (!attributes.containsKey(nameAttributeKey)) {
            log.warn("OAuth2 name attribute missing: key={}, keys={}", nameAttributeKey, attributes.keySet());
            throw new OAuth2AuthenticationException("Missing OAuth2 name attribute: " + nameAttributeKey);
        }

        Object nameAttributeValue = attributes.get(nameAttributeKey);
        if (nameAttributeValue == null) {
            log.warn("OAuth2 name attribute value is null: key={}", nameAttributeKey);
            throw new OAuth2AuthenticationException("OAuth2 name attribute value is null: " + nameAttributeKey);
        }

        log.debug("OAuth2 attributes normalized: provider={}, nameAttributeKey={}, keys={}",
                registrationId, nameAttributeKey, attributes.keySet());

        return new DefaultOAuth2User(
                oAuth2User.getAuthorities(),
                attributes,
                nameAttributeKey);
    }
}
