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
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AccessLevel;

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
	
	// OAuth2 관련 필드 (고유키: oauth_provider + oauth_id)
	@Column
	private String oauthProvider; // google, naver, kakao
	
	@Column
	private String oauthId; // OAuth2 제공자의 사용자 ID
	
	@Column(name = "profile_image")
	private String profileImage; // 프로필 이미지 URL

	// Google Calendar 연동 전용 필드들 (각 계정에서 독립적으로 구글 캘린더 연동 가능)
	// 주 로그인 방식과 무관하게 모든 계정(로컬/네이버/카카오)에서 구글 캘린더를 연동할 수 있음
	@Column(name = "google_oauth_id")
	private String googleOAuthId; // 구글 캘린더 연동용 OAuth ID
	
	@Column(name = "google_email") 
	private String googleEmail; // 구글 캘린더 연동용 이메일
	
	@Column(name = "google_name")
	private String googleName; // 구글 캘린더 연동용 사용자명
	
	@Column(name = "google_picture")
	private String googlePicture; // 구글 캘린더 연동용 프로필 이미지

	public String getGoogleOAuthId() {
		return googleOAuthId;
	}

	public void setGoogleOAuthId(String googleOAuthId) {
		this.googleOAuthId = googleOAuthId;
	}

	@Column
	private String goal; // 운동 목표: "general", "weight_loss", "muscle_gain", "strength", "endurance"
	
	// 기본 인적사항 필드들 (수정 가능): name, nickname, birthDate, gender, phoneNumber, height, weight, age, experience
	@Column
	private String height; // 키 (cm)
	
	@Column
	private String weight; // 몸무게 (kg)
	
	@Column
	private String age; // 나이
	
	@Column
	private String experience; // 운동 경험: "beginner", "intermediate", "advanced"
	
	@Column
	private Double fitnessLevel; // 적응형 운동을 위한 피트니스 레벨 (0.1 ~ 1.0)
	
	// 인바디 상세 정보 필드 제거

	@Column
	private String role = "ROLE_USER"; // 사용자 권한: ROLE_USER, ROLE_ADMIN

	@CreatedDate
	@Column(nullable = false, updatable = false)
	private LocalDateTime createdAt;
	
	@LastModifiedDate
	@Column
	private LocalDateTime updatedAt;

	// Builder를 위한 private 생성자
	@Builder(access = AccessLevel.PUBLIC)
	private User(
		String oauthProvider,
		String oauthId,
		String name,
		String email,
		String goal,
		String experience,
		String height,
		String weight,
		String age,
		String gender
	) {
		this.oauthProvider = oauthProvider;
		this.oauthId = oauthId;
		this.name = name;
		this.email = email;
		this.goal = goal;
		this.experience = experience;
		this.height = height;
		this.weight = weight;
		this.age = age;
		this.gender = gender;
	}

	public User update(String name, String picture) {
		this.name = name;
		this.profileImage = picture;

		return this;
	}
} 