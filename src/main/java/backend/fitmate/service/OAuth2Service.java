package backend.fitmate.service;

import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import backend.fitmate.User.entity.User;
import backend.fitmate.User.service.UserService;

@Service
public class OAuth2Service {

    @Autowired
    private UserService userService;

    @Autowired
    private RestTemplate restTemplate;

    // OAuth2 클라이언트 설정
    @Value("${spring.security.oauth2.client.registration.google.client-id}")
    private String googleClientId;

    @Value("${spring.security.oauth2.client.registration.google.client-secret}")
    private String googleClientSecret;

    @Value("${spring.security.oauth2.client.registration.naver.client-id}")
    private String naverClientId;

    @Value("${spring.security.oauth2.client.registration.naver.client-secret}")
    private String naverClientSecret;

    @Value("${spring.security.oauth2.client.registration.kakao.client-id}")
    private String kakaoClientId;

    @Value("${spring.security.oauth2.client.registration.kakao.client-secret}")
    private String kakaoClientSecret;

    public OAuth2UserInfo processOAuth2Callback(String code, String provider, String redirectUri) {
        try {
            // 입력값 검증
            if (code == null || code.trim().isEmpty()) {
                throw new RuntimeException("인증 코드가 null이거나 비어있습니다.");
            }
            
            if (provider == null || provider.trim().isEmpty()) {
                throw new RuntimeException("OAuth2 제공자가 null이거나 비어있습니다.");
            }
            
            if (redirectUri == null || redirectUri.trim().isEmpty()) {
                throw new RuntimeException("리다이렉트 URI가 null이거나 비어있습니다.");
            }
            
            // OAuth2 토큰 교환
            String accessToken = exchangeCodeForToken(code, provider, redirectUri);
            if (accessToken == null || accessToken.trim().isEmpty()) {
                throw new RuntimeException("액세스 토큰을 받지 못했습니다.");
            }
            
            // 사용자 정보 조회
            OAuth2UserInfo oauthUserInfo = getUserInfoFromProvider(accessToken, provider);
            if (oauthUserInfo == null) {
                throw new RuntimeException("OAuth2 사용자 정보를 받지 못했습니다.");
            }
            
            // DB에 사용자 저장/업데이트
            User user = saveOrUpdateUser(oauthUserInfo, provider);
            if (user == null) {
                throw new RuntimeException("사용자 저장/업데이트에 실패했습니다.");
            }
            
            // 저장된 사용자 ID 확인
            if (user.getId() == null) {
                throw new RuntimeException("저장된 사용자의 ID가 null입니다.");
            }
            
            // 실제 DB ID를 사용하여 OAuth2UserInfo 반환
            OAuth2UserInfo result = new OAuth2UserInfo();
            String userId = user.getId() != null ? user.getId().toString() : user.getEmail();
            result.setId(userId);
            result.setEmail(user.getEmail());
            result.setName(user.getName());
            result.setProvider(provider);
            result.setPicture(user.getProfileImage());
            
            return result;
            
        } catch (Exception e) {
            System.err.println("OAuth2 처리 중 오류 발생: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("OAuth2 처리 실패: " + e.getMessage(), e);
        }
    }

    private String exchangeCodeForToken(String code, String provider, String redirectUri) {
        String tokenUrl = getTokenUrl(provider);
        String clientId = getClientId(provider);
        String clientSecret = getClientSecret(provider);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        String requestBody = String.format(
            "grant_type=authorization_code&client_id=%s&client_secret=%s&code=%s&redirect_uri=%s",
            clientId, clientSecret, code, redirectUri
        );

        HttpEntity<String> request = new HttpEntity<>(requestBody, headers);
        ResponseEntity<Map> response = restTemplate.postForEntity(tokenUrl, request, Map.class);

        if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
            Map<String, Object> tokenResponse = response.getBody();
            return (String) tokenResponse.get("access_token");
        } else {
            throw new RuntimeException("토큰 교환 실패");
        }
    }

    private OAuth2UserInfo getUserInfoFromProvider(String accessToken, String provider) {
        String userInfoUrl = getUserInfoUrl(provider);
        
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        
        HttpEntity<String> request = new HttpEntity<>(headers);
        ResponseEntity<Map> response = restTemplate.exchange(userInfoUrl, HttpMethod.GET, request, Map.class);

        if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
            return parseUserInfo(response.getBody(), provider);
        } else {
            throw new RuntimeException("사용자 정보 가져오기 실패");
        }
    }

    private OAuth2UserInfo parseUserInfo(Map<String, Object> userData, String provider) {
        OAuth2UserInfo userInfo = new OAuth2UserInfo();
        userInfo.setProvider(provider);

        switch (provider) {
            case "google":
                // Google OAuth2는 id 필드를 제공하지 않을 수 있으므로 email을 id로 사용
                String googleId = (String) userData.get("id");
                String googleEmail = (String) userData.get("email");
                String googleName = (String) userData.get("name");
                String googlePicture = (String) userData.get("picture");
                
                // 필수 필드 검증
                if (googleEmail == null || googleName == null) {
                    throw new RuntimeException("Google 응답에서 필수 정보(email, name)가 누락되었습니다.");
                }
                
                // id가 null이면 email을 id로 사용
                userInfo.setId(googleId != null ? googleId : googleEmail);
                userInfo.setEmail(googleEmail);
                userInfo.setName(googleName);
                userInfo.setPicture(googlePicture);
                break;
            case "naver":
                Map<String, Object> response = (Map<String, Object>) userData.get("response");
                if (response == null) {
                    throw new RuntimeException("Naver 응답에서 response 객체를 찾을 수 없습니다.");
                }
                
                String naverId = (String) response.get("id");
                String naverEmail = (String) response.get("email");
                String naverName = (String) response.get("name");
                String naverPicture = (String) response.get("profile_image");
                
                if (naverEmail == null || naverName == null) {
                    throw new RuntimeException("Naver 응답에서 필수 정보(email, name)가 누락되었습니다.");
                }
                
                // id가 null이면 email을 id로 사용
                userInfo.setId(naverId != null ? naverId : naverEmail);
                userInfo.setEmail(naverEmail);
                userInfo.setName(naverName);
                userInfo.setPicture(naverPicture);
                break;
            case "kakao":
                Object kakaoIdObj = userData.get("id");
                String kakaoId = kakaoIdObj != null ? String.valueOf(kakaoIdObj) : null;
                Map<String, Object> kakaoAccount = (Map<String, Object>) userData.get("kakao_account");
                
                if (kakaoAccount == null) {
                    throw new RuntimeException("Kakao 응답에서 kakao_account 객체를 찾을 수 없습니다.");
                }
                
                String kakaoEmail = (String) kakaoAccount.get("email");
                Map<String, Object> profile = (Map<String, Object>) kakaoAccount.get("profile");
                
                if (profile == null) {
                    throw new RuntimeException("Kakao 응답에서 profile 객체를 찾을 수 없습니다.");
                }
                
                String kakaoName = (String) profile.get("nickname");
                String kakaoPicture = (String) profile.get("profile_image_url");
                
                if (kakaoEmail == null || kakaoName == null) {
                    throw new RuntimeException("Kakao 응답에서 필수 정보(email, nickname)가 누락되었습니다.");
                }
                
                // id가 null이면 email을 id로 사용
                userInfo.setId(kakaoId != null ? kakaoId : kakaoEmail);
                userInfo.setEmail(kakaoEmail);
                userInfo.setName(kakaoName);
                userInfo.setPicture(kakaoPicture);
                break;
            default:
                throw new IllegalArgumentException("지원하지 않는 OAuth2 제공자: " + provider);
        }

        return userInfo;
    }

    private User saveOrUpdateUser(OAuth2UserInfo userInfo, String provider) {
        // null 값 검증
        if (userInfo == null) {
            throw new RuntimeException("OAuth2UserInfo가 null입니다.");
        }
        
        if (userInfo.getId() == null) {
            throw new RuntimeException("OAuth2 ID가 null입니다.");
        }
        
        if (userInfo.getEmail() == null) {
            throw new RuntimeException("이메일이 null입니다.");
        }
        
        if (userInfo.getName() == null) {
            throw new RuntimeException("이름이 null입니다.");
        }
        
        try {
            System.err.println("OAuth2 사용자 정보: " + userInfo.getEmail() + ", " + userInfo.getName() + ", " + userInfo.getId());
            
            // 1. OAuth2 제공자와 ID로 기존 사용자 찾기
            Optional<User> existingOAuth2User = userService.findByOAuth2ProviderAndOAuth2Id(provider, userInfo.getId());
            
            if (existingOAuth2User.isPresent()) {
                System.err.println("기존 OAuth2 사용자 발견");
                // OAuth2로 가입한 기존 사용자 업데이트
                User user = existingOAuth2User.get();
                user.setName(userInfo.getName());
                user.setEmail(userInfo.getEmail());
                if (userInfo.getPicture() != null) {
                    user.setProfileImage(userInfo.getPicture());
                }
                User savedUser = userService.save(user);
                System.err.println("기존 사용자 업데이트 완료, ID: " + savedUser.getId());
                return savedUser;
            }
            
            // 2. 이메일로 기존 사용자 찾기 (일반 회원가입으로 가입한 경우)
            Optional<User> existingUserByEmail = userService.findByEmail(userInfo.getEmail());
            
            if (existingUserByEmail.isPresent()) {
                System.err.println("이메일로 기존 사용자 발견");
                // 일반 회원가입으로 가입한 사용자에게 OAuth2 정보 추가
                User user = existingUserByEmail.get();
                user.setOauthProvider(provider);
                user.setOauthId(userInfo.getId());
                user.setName(userInfo.getName());
                if (userInfo.getPicture() != null) {
                    user.setProfileImage(userInfo.getPicture());
                }
                User savedUser = userService.save(user);
                System.err.println("기존 사용자 OAuth2 정보 추가 완료, ID: " + savedUser.getId());
                return savedUser;
            }
            
            // 3. 새 OAuth2 사용자 생성
            System.err.println("새 OAuth2 사용자 생성");
            User savedUser = userService.createOAuth2User(
                userInfo.getEmail(),
                userInfo.getName(),
                provider,
                userInfo.getId()
            );
            
            // 저장된 사용자의 ID가 null이면 이메일로 다시 조회
            if (savedUser.getId() == null) {
                System.err.println("저장된 사용자 ID가 null, 이메일로 다시 조회");
                Optional<User> foundUser = userService.findByEmail(userInfo.getEmail());
                if (foundUser.isPresent()) {
                    System.err.println("이메일로 조회된 사용자 ID: " + foundUser.get().getId());
                    return foundUser.get();
                }
            }
            
            System.err.println("새 사용자 생성 완료, ID: " + savedUser.getId());
            return savedUser;
        } catch (Exception e) {
            System.err.println("사용자 저장/업데이트 중 오류: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("사용자 저장/업데이트 중 오류 발생: " + e.getMessage(), e);
        }
    }

    private String getTokenUrl(String provider) {
        switch (provider) {
            case "google":
                return "https://oauth2.googleapis.com/token";
            case "naver":
                return "https://nid.naver.com/oauth2.0/token";
            case "kakao":
                return "https://kauth.kakao.com/oauth/token";
            default:
                throw new IllegalArgumentException("지원하지 않는 OAuth2 제공자: " + provider);
        }
    }

    private String getUserInfoUrl(String provider) {
        switch (provider) {
            case "google":
                return "https://www.googleapis.com/oauth2/v2/userinfo";
            case "naver":
                return "https://openapi.naver.com/v1/nid/me";
            case "kakao":
                return "https://kapi.kakao.com/v2/user/me";
            default:
                throw new IllegalArgumentException("지원하지 않는 OAuth2 제공자: " + provider);
        }
    }

    private String getClientId(String provider) {
        switch (provider) {
            case "google":
                return googleClientId;
            case "naver":
                return naverClientId;
            case "kakao":
                return kakaoClientId;
            default:
                throw new IllegalArgumentException("지원하지 않는 OAuth2 제공자: " + provider);
        }
    }

    private String getClientSecret(String provider) {
        switch (provider) {
            case "google":
                return googleClientSecret;
            case "naver":
                return naverClientSecret;
            case "kakao":
                return kakaoClientSecret;
            default:
                throw new IllegalArgumentException("지원하지 않는 OAuth2 제공자: " + provider);
        }
    }

    // OAuth2 사용자 정보를 담는 내부 클래스
    public static class OAuth2UserInfo {
        private String id;
        private String email;
        private String name;
        private String picture;
        private String provider;

        // Getters and Setters
        public String getId() { return id; }
        public void setId(String id) { this.id = id; }

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public String getPicture() { return picture; }
        public void setPicture(String picture) { this.picture = picture; }

        public String getProvider() { return provider; }
        public void setProvider(String provider) { this.provider = provider; }
    }
} 