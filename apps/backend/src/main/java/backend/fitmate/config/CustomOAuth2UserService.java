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

@Service
public class CustomOAuth2UserService implements OAuth2UserService<OAuth2UserRequest, OAuth2User> {

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2UserService<OAuth2UserRequest, OAuth2User> delegate = new DefaultOAuth2UserService();
        OAuth2User oAuth2User = delegate.loadUser(userRequest);

        String registrationId = userRequest.getClientRegistration().getRegistrationId();
        Map<String, Object> attributes = new HashMap<>(oAuth2User.getAttributes());
        String nameAttributeKey;

        // 강력한 디버깅 - 모든 경우에 출력
        System.err.println("===========================================");
        System.err.println("🔥 FORCE DEBUG - Provider: " + registrationId);
        System.err.println("🔥 FORCE DEBUG - ALL Original attributes: " + attributes);
        System.err.println("🔥 FORCE DEBUG - Attributes size: " + attributes.size());
        System.err.println("🔥 FORCE DEBUG - Attributes keys: " + attributes.keySet());
        for (Map.Entry<String, Object> entry : attributes.entrySet()) {
            System.err.println("🔥 FORCE DEBUG - Key: '" + entry.getKey() + "' = Value: '" + entry.getValue() + "' (Type: " + (entry.getValue() != null ? entry.getValue().getClass().getSimpleName() : "null") + ")");
        }
        System.err.println("===========================================");

        switch (registrationId) {
            case "google":
                // provider 정보 추가 (일관성을 위해)
                attributes.put("provider", "google");
                System.err.println("Google processed attributes: " + attributes);
                nameAttributeKey = "sub";
                break;
                
            case "naver":
                System.err.println("🔥 네이버 처리 시작!");
                
                // Naver의 경우 user-name-attribute가 'response'로 설정되어 있음
                // 즉, Spring Security가 이미 response 객체를 nameAttribute로 설정했음
                // 하지만 우리는 내부의 사용자 정보를 사용하고 싶음
                Object responseObj = attributes.get("response");
                System.err.println("🔥 Naver raw response object: " + responseObj);
                System.err.println("🔥 Naver response object type: " + (responseObj != null ? responseObj.getClass().getSimpleName() : "null"));
                
                if (responseObj instanceof Map) {
                    Map<String, Object> naverResponse = (Map<String, Object>) responseObj;
                    System.err.println("🔥 Naver response Map: " + naverResponse);
                    System.err.println("🔥 Naver response Map size: " + naverResponse.size());
                    System.err.println("🔥 Naver response Map keys: " + naverResponse.keySet());
                    
                    for (Map.Entry<String, Object> entry : naverResponse.entrySet()) {
                        System.err.println("🔥 Naver response - Key: '" + entry.getKey() + "' = Value: '" + entry.getValue() + "'");
                    }
                    
                    // response 객체를 attributes로 교체 (초창기 버전과 동일)
                    attributes = new HashMap<>(naverResponse);
                    // provider 정보 추가 (초창기 버전과 동일)
                    attributes.put("provider", "naver");
                    // nameAttribute로 사용할 수 있도록 response 객체도 유지
                    attributes.put("response", responseObj);
                    System.err.println("🔥 Naver final processed attributes: " + attributes);
                    
                    // nameAttributeKey는 id 대신 response를 사용 (Spring Security 설정과 일치)
                    nameAttributeKey = "response";
                } else {
                    System.err.println("🔥 Naver response is NOT a Map! Type: " + (responseObj != null ? responseObj.getClass() : "null"));
                    throw new OAuth2AuthenticationException("네이버 OAuth2 응답의 response 객체가 Map이 아닙니다: " + responseObj);
                }
                break;
                
            case "kakao":
                // Kakao 응답 구조에 맞게 처리 (초창기 버전 방식)
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
                
                // provider 정보 추가 (초창기 버전과 동일)
                kakaoAttributes.put("provider", "kakao");
                attributes = kakaoAttributes;
                System.err.println("Kakao processed attributes: " + attributes);
                
                nameAttributeKey = "id";
                break;
                
            default:
                throw new OAuth2AuthenticationException("지원하지 않는 OAuth2 제공자입니다: " + registrationId);
        }

        System.err.println("🔥 Final nameAttributeKey: '" + nameAttributeKey + "'");
        System.err.println("🔥 Final nameAttributeKey value: '" + attributes.get(nameAttributeKey) + "'");
        System.err.println("🔥 Final attributes: " + attributes);

        // nameAttributeKey가 실제로 attributes에 있는지 확인
        if (!attributes.containsKey(nameAttributeKey)) {
            System.err.println("🔥 ERROR: nameAttributeKey '" + nameAttributeKey + "' NOT FOUND in attributes!");
            System.err.println("🔥 Available keys: " + attributes.keySet());
            throw new OAuth2AuthenticationException("속성에 nameAttributeKey '" + nameAttributeKey + "'가 없습니다. 사용 가능한 키: " + attributes.keySet());
        }

        Object nameAttributeValue = attributes.get(nameAttributeKey);
        if (nameAttributeValue == null) {
            System.err.println("🔥 ERROR: nameAttributeKey '" + nameAttributeKey + "' value is NULL!");
            throw new OAuth2AuthenticationException("nameAttributeKey '" + nameAttributeKey + "'의 값이 null입니다. attributes: " + attributes);
        }

        return new DefaultOAuth2User(
                oAuth2User.getAuthorities(),
                attributes,
                nameAttributeKey);
    }
} 