package backend.fitmate.User.entity;

import java.io.Serializable;
import java.time.LocalDateTime;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "users", uniqueConstraints = {
    @UniqueConstraint(
        name = "UK_USERS_OAUTH_PROVIDER_ID", 
        columnNames = {"oauth_provider", "oauth_id"}
    )
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class User implements Serializable {
    
    private static final long serialVersionUID = 1L;
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, unique = false)
    private String email;
    
    @Column
    private String password; // OAuth2 사용자의 경우 null일 수 있음
    
    @Column
    private String nickname;
    
    @Column(nullable = false)
    private String name;
    
    @Column
    private String birthDate;
    
    @Column
    private String gender;
    
    @Column
    private String phoneNumber;
    
    @Column(nullable = false)
    private boolean emailVerified = false;
    
    // OAuth2 관련 필드
    @Column
    private String oauthProvider; // google, naver, kakao
    
    @Column
    private String oauthId; // OAuth2 제공자의 사용자 ID
    
    @Column(name = "profile_image")
    private String profileImage; // 프로필 이미지 URL

    // Google-specific fields
    @Column(name = "google_oauth_id")
    private String googleOAuthId;

    @Column(name = "google_email")
    private String googleEmail;

    @Column(name = "google_name")
    private String googleName;

    @Column(name = "google_picture")
    private String googlePicture;

    public String getGoogleOAuthId() {
        return googleOAuthId;
    }

    public void setGoogleOAuthId(String googleOAuthId) {
        this.googleOAuthId = googleOAuthId;
    }

    @Column
    private String goal; // 운동 목표: "general", "weight_loss", "muscle_gain", "strength", "endurance"
    
    // 기본 인적사항 필드들
    @Column
    private String height; // 키 (cm)
    
    @Column
    private String weight; // 몸무게 (kg)
    
    @Column
    private String age; // 나이
    
    @Column
    private String experience; // 운동 경험: "beginner", "intermediate", "advanced"
    
    // 상세 신체정보 필드들 (선택사항)
    @Column
    private String bodyFatPercentage; // 체지방률 (%)
    
    @Column
    private String muscleMass; // 근육량 (kg)
    
    @Column
    private String basalMetabolicRate; // 기초대사량 (kcal)
    
    @Column
    private String bodyWaterPercentage; // 체수분률 (%)
    
    @Column
    private String boneMass; // 골격근량 (kg)
    
    @Column
    private String visceralFatLevel; // 내장지방레벨
    
    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @LastModifiedDate
    @Column
    private LocalDateTime updatedAt;

    public User update(String name, String picture) {
        this.name = name;
        this.profileImage = picture;

        return this;
    }
} 