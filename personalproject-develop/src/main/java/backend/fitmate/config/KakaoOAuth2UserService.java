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
public class KakaoOAuth2UserService implements OAuth2UserService<OAuth2UserRequest, OAuth2User> {

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        try {
            System.out.println("=== 카카오 OAuth2 사용자 정보 요청 시작 ===");
            System.out.println("Client Registration ID: " + userRequest.getClientRegistration().getRegistrationId());
            System.out.println("Client ID: " + userRequest.getClientRegistration().getClientId());
            System.out.println("Client Secret: " + (userRequest.getClientRegistration().getClientSecret() != null ? "있음" : "없음"));
            System.out.println("Access Token: " + (userRequest.getAccessToken() != null ? "토큰 있음" : "토큰 없음"));
            System.out.println("Token Value: " + (userRequest.getAccessToken() != null ? userRequest.getAccessToken().getTokenValue().substring(0, Math.min(20, userRequest.getAccessToken().getTokenValue().length())) + "..." : "없음"));
            
            // 카카오 API에서 사용자 정보 직접 가져오기
            RestTemplate restTemplate = new RestTemplate();
            String userInfoUri = userRequest.getClientRegistration().getProviderDetails().getUserInfoEndpoint().getUri();
            
            System.out.println("사용자 정보 URI: " + userInfoUri);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(userRequest.getAccessToken().getTokenValue());
            
            System.out.println("요청 헤더: " + headers);
            
            HttpEntity<String> entity = new HttpEntity<>(headers);
            ResponseEntity<Map> response = restTemplate.exchange(userInfoUri, HttpMethod.GET, entity, Map.class);
            
            Map<String, Object> responseBody = response.getBody();
            System.out.println("카카오 API 응답: " + responseBody);
            
            // 카카오 응답 구조에 맞게 처리
            Map<String, Object> userAttributes = new HashMap<>();
            userAttributes.put("id", responseBody.get("id"));
            
            Map<String, Object> kakaoAccount = (Map<String, Object>) responseBody.get("kakao_account");
            if (kakaoAccount != null) {
                userAttributes.put("email", kakaoAccount.get("email"));
                
                Map<String, Object> profile = (Map<String, Object>) kakaoAccount.get("profile");
                if (profile != null) {
                    userAttributes.put("name", profile.get("nickname"));
                    userAttributes.put("picture", profile.get("profile_image_url"));
                }
            }
            
            // provider 정보 추가
            userAttributes.put("provider", "kakao");
            
            System.out.println("카카오 사용자 속성: " + userAttributes);
            
            return new DefaultOAuth2User(
                Collections.singleton(new SimpleGrantedAuthority("ROLE_USER")),
                userAttributes,
                "id"
            );
        } catch (Exception e) {
            System.out.println("카카오 OAuth2 오류: " + e.getMessage());
            System.out.println("오류 타입: " + e.getClass().getSimpleName());
            e.printStackTrace();
            
            // 더 구체적인 오류 메시지 제공
            String errorMessage = "카카오 사용자 정보를 가져오는데 실패했습니다.";
            if (e.getMessage() != null && e.getMessage().contains("401")) {
                errorMessage = "카카오 인증 토큰이 유효하지 않습니다. 다시 로그인해주세요.";
            } else if (e.getMessage() != null && e.getMessage().contains("403")) {
                errorMessage = "카카오 API 접근 권한이 없습니다.";
            }
            
            throw new OAuth2AuthenticationException(errorMessage);
        }
    }
} 