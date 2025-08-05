package backend.fitmate.config;

import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

@Service
public class NaverOAuth2UserService implements OAuth2UserService<OAuth2UserRequest, OAuth2User> {

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        try {
            // 네이버 API에서 사용자 정보 직접 가져오기
            RestTemplate restTemplate = new RestTemplate();
            String userInfoUri = userRequest.getClientRegistration().getProviderDetails().getUserInfoEndpoint().getUri();
            
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(userRequest.getAccessToken().getTokenValue());
            
            HttpEntity<String> entity = new HttpEntity<>(headers);
            ResponseEntity<Map> response = restTemplate.exchange(userInfoUri, HttpMethod.GET, entity, Map.class);
            
            Map<String, Object> responseBody = response.getBody();
            System.out.println("네이버 API 응답: " + responseBody);
            
            Map<String, Object> userAttributes = (Map<String, Object>) responseBody.get("response");
            System.out.println("네이버 사용자 속성: " + userAttributes);
            
            // provider 정보 추가
            userAttributes.put("provider", "naver");
            
            return new DefaultOAuth2User(
                Collections.singleton(new SimpleGrantedAuthority("ROLE_USER")),
                userAttributes,
                "id"  // nameAttributeKey를 명시적으로 "id"로 지정
            );
        } catch (Exception e) {
            System.out.println("네이버 OAuth2 오류: " + e.getMessage());
            e.printStackTrace();
            throw new OAuth2AuthenticationException("네이버 사용자 정보를 가져오는데 실패했습니다.");
        }
    }
} 