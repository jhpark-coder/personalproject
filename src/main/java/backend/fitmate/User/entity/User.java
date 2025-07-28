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
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class User implements Serializable {
    
    private static final long serialVersionUID = 1L;
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(unique = true, nullable = false)
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
    
    @Column
    private String profileImage; // 프로필 이미지 URL
    
    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @LastModifiedDate
    @Column
    private LocalDateTime updatedAt;
} 