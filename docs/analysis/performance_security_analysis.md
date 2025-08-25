# FitMate 프로젝트 - 성능 최적화 및 보안 시스템 분석

## 개요
FitMate 프로젝트의 성능 최적화 전략과 다층 보안 시스템에 대한 상세 분석입니다. 프론트엔드 최적화부터 백엔드 성능 튜닝, 그리고 JWT 인증부터 데이터 보호까지 포괄적인 성능과 보안 아키텍처를 다룹니다.

## 성능 최적화 아키텍처

### 전체 성능 최적화 전략
```
┌─────────────────────────────────────────────────────────────────┐
│                    성능 최적화 계층                               │
├─────────────────┬─────────────────┬─────────────────────────────┤
│   Frontend      │    Backend      │        Database             │
│   최적화        │    최적화       │        최적화               │
│                 │                 │                             │
│ • 번들 최적화    │ • 캐싱 전략     │ • 인덱싱 최적화              │
│ • 코드 스플리팅  │ • 커넥션 풀     │ • 쿼리 최적화               │
│ • 이미지 최적화  │ • 비동기 처리   │ • 파티셔닝                  │
│ • 지연 로딩     │ • JVM 튜닝      │ • 읽기 복제본               │
└─────────────────┴─────────────────┴─────────────────────────────┘
         │                 │                     │
         ▼                 ▼                     ▼
┌─────────────────┬─────────────────┬─────────────────────────────┐
│   CDN 최적화    │   로드밸런싱     │       모니터링              │
│ • 정적 리소스   │ • 트래픽 분산   │ • APM 도구                  │
│ • 압축 전송     │ • 헬스체크      │ • 성능 지표 수집             │
└─────────────────┴─────────────────┴─────────────────────────────┘
```

## 프론트엔드 성능 최적화

### 1. 번들 최적화 및 코드 스플리팅
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  
  // 빌드 최적화
  build: {
    rollupOptions: {
      output: {
        // 청크 분할 전략
        manualChunks: {
          // 벤더 라이브러리 분리
          vendor: ['react', 'react-dom'],
          ui: ['lucide-react', 'recharts'],
          mediapipe: ['@mediapipe/pose', '@mediapipe/camera_utils'],
          
          // 페이지별 청크 분리
          auth: [
            './src/components/SignupForm.tsx',
            './src/components/authentication'
          ],
          motion: [
            './src/components/MotionCoach.tsx',
            './src/components/pose-detection'
          ],
          analytics: [
            './src/components/analytics'
          ]
        },
        
        // 청크 파일명 최적화
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    
    // 압축 및 최적화
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,      // 프로덕션에서 console.log 제거
        drop_debugger: true,     // debugger 제거
        pure_funcs: ['console.log']
      }
    },
    
    // 청크 크기 경고 임계값
    chunkSizeWarningLimit: 1000
  },
  
  // 개발 서버 최적화
  server: {
    hmr: {
      overlay: false           // HMR 오버레이 비활성화로 성능 향상
    }
  }
});
```

### 2. 라우트 기반 코드 스플리팅
```typescript
// src/App.tsx
import { lazy, Suspense } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import LoadingSpinner from './components/LoadingSpinner';

// 지연 로딩 컴포넌트
const Dashboard = lazy(() => import('./components/Dashboard'));
const MotionCoach = lazy(() => import('./components/MotionCoach'));
const Analytics = lazy(() => import('./components/analytics/Analytics'));
const Profile = lazy(() => import('./components/profile/Profile'));
const Settings = lazy(() => import('./components/settings/Settings'));

// 온보딩 페이지들도 개별 지연 로딩
const OnboardingExperience = lazy(() => import('./components/onboarding/OnboardingExperience'));
const OnboardingGoal = lazy(() => import('./components/onboarding/OnboardingGoal'));
const OnboardingBasicInfo = lazy(() => import('./components/onboarding/OnboardingBasicInfo'));
const OnboardingComplete = lazy(() => import('./components/onboarding/OnboardingComplete'));

function App() {
  return (
    <Router>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/motion" element={<MotionCoach />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          
          {/* 온보딩 라우트 */}
          <Route path="/onboarding" element={<OnboardingExperience />} />
          <Route path="/onboarding/goal" element={<OnboardingGoal />} />
          <Route path="/onboarding/basic-info" element={<OnboardingBasicInfo />} />
          <Route path="/onboarding/complete" element={<OnboardingComplete />} />
        </Routes>
      </Suspense>
    </Router>
  );
}
```

### 3. 이미지 최적화 및 지연 로딩
```typescript
// src/components/OptimizedImage.tsx
import { useState, useRef, useEffect } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  lazy?: boolean;
  placeholder?: string;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className,
  lazy = true,
  placeholder = '/images/placeholder.svg'
}) => {
  const [imageSrc, setImageSrc] = useState(lazy ? placeholder : src);
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!lazy) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setImageSrc(src);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [src, lazy]);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      className={`${className} ${isLoaded ? 'loaded' : 'loading'}`}
      onLoad={handleLoad}
      loading={lazy ? 'lazy' : 'eager'}
      // WebP 지원 여부에 따른 형식 선택
      srcSet={`${src.replace(/\.(jpg|jpeg|png)$/, '.webp')} 1x`}
    />
  );
};

// 운동 이미지 컴포넌트에서 사용
export const ExerciseImage: React.FC<{ exercise: Exercise }> = ({ exercise }) => {
  return (
    <OptimizedImage
      src={exercise.imageUrl}
      alt={exercise.name}
      className="exercise-image"
      lazy={true}
      placeholder="/images/exercise-placeholder.svg"
    />
  );
};
```

### 4. React 성능 최적화
```typescript
// src/hooks/useOptimizedCallback.ts
import { useCallback, useMemo } from 'react';

// 메모이제이션을 통한 불필요한 리렌더링 방지
export const useMemoizedWorkoutData = (workouts: WorkoutRecord[]) => {
  return useMemo(() => {
    const totalCalories = workouts.reduce((sum, workout) => sum + workout.calories, 0);
    const averageDuration = workouts.length > 0 
      ? workouts.reduce((sum, workout) => sum + workout.duration, 0) / workouts.length 
      : 0;
    
    const workoutsByType = workouts.reduce((acc, workout) => {
      const type = workout.exercise.category;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalCalories,
      averageDuration,
      workoutsByType,
      totalWorkouts: workouts.length
    };
  }, [workouts]);
};

// src/components/WorkoutStats.tsx
import React, { memo } from 'react';

interface WorkoutStatsProps {
  workouts: WorkoutRecord[];
  onStatsUpdate?: (stats: any) => void;
}

export const WorkoutStats = memo<WorkoutStatsProps>(({ workouts, onStatsUpdate }) => {
  const stats = useMemoizedWorkoutData(workouts);
  
  const handleStatsClick = useCallback((statType: string) => {
    onStatsUpdate?.(statType);
  }, [onStatsUpdate]);

  return (
    <div className="workout-stats">
      <div className="stat-card" onClick={() => handleStatsClick('calories')}>
        <h3>{stats.totalCalories}</h3>
        <p>총 소모 칼로리</p>
      </div>
      <div className="stat-card" onClick={() => handleStatsClick('duration')}>
        <h3>{Math.round(stats.averageDuration)}</h3>
        <p>평균 운동 시간</p>
      </div>
    </div>
  );
});
```

### 5. 가상화를 통한 대용량 리스트 최적화
```typescript
// src/components/VirtualizedExerciseList.tsx
import { FixedSizeList as List } from 'react-window';
import { Exercise } from '../types/Exercise';

interface VirtualizedExerciseListProps {
  exercises: Exercise[];
  onExerciseSelect: (exercise: Exercise) => void;
}

const ExerciseItem = memo<{
  index: number;
  style: React.CSSProperties;
  data: { exercises: Exercise[]; onSelect: (exercise: Exercise) => void };
}>(({ index, style, data }) => {
  const exercise = data.exercises[index];
  
  return (
    <div style={style} className="exercise-item">
      <div onClick={() => data.onSelect(exercise)}>
        <OptimizedImage
          src={exercise.imageUrl}
          alt={exercise.name}
          className="exercise-thumbnail"
          lazy={true}
        />
        <div className="exercise-info">
          <h4>{exercise.name}</h4>
          <p>{exercise.category}</p>
          <span className="met-value">{exercise.metValue} MET</span>
        </div>
      </div>
    </div>
  );
});

export const VirtualizedExerciseList: React.FC<VirtualizedExerciseListProps> = ({
  exercises,
  onExerciseSelect
}) => {
  const itemData = useMemo(() => ({
    exercises,
    onSelect: onExerciseSelect
  }), [exercises, onExerciseSelect]);

  return (
    <List
      height={600}           // 리스트 높이
      itemCount={exercises.length}
      itemSize={120}         // 각 아이템 높이
      itemData={itemData}
      overscanCount={5}      // 미리 렌더링할 아이템 수
    >
      {ExerciseItem}
    </List>
  );
};
```

## 백엔드 성능 최적화

### 1. Spring Boot 성능 튜닝
```yaml
# application-production.yml
server:
  tomcat:
    threads:
      max: 200              # 최대 스레드 수
      min-spare: 10         # 최소 유지 스레드 수
    connection-timeout: 20000 # 연결 타임아웃
    max-connections: 10000    # 최대 연결 수
    accept-count: 100         # 대기 큐 크기

spring:
  # 데이터베이스 최적화
  datasource:
    hikari:
      maximum-pool-size: 20   # 최대 커넥션 풀 크기
      minimum-idle: 5         # 최소 유지 커넥션
      idle-timeout: 300000    # 유휴 커넥션 타임아웃
      max-lifetime: 1800000   # 커넥션 최대 생존 시간
      connection-timeout: 30000 # 커넥션 타임아웃
      
  # JPA 최적화
  jpa:
    hibernate:
      ddl-auto: validate      # 프로덕션에서는 validate 사용
    properties:
      hibernate:
        jdbc:
          batch_size: 20      # 배치 크기
          fetch_size: 50      # 페치 크기
        cache:
          use_second_level_cache: true
          region:
            factory_class: org.hibernate.cache.ehcache.EhCacheRegionFactory
        order_inserts: true   # 삽입 순서 최적화
        order_updates: true   # 업데이트 순서 최적화
        
  # 캐시 설정
  cache:
    type: redis
    redis:
      time-to-live: 600000    # 기본 TTL (10분)
      
  # 압축 설정
  compression:
    enabled: true
    min-response-size: 1024   # 1KB 이상만 압축

# JVM 튜닝 (JAVA_OPTS)
# -Xms2g -Xmx4g -XX:+UseG1GC -XX:MaxGCPauseMillis=200
```

### 2. 캐싱 전략 구현
```java
// CacheConfig.java
@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CacheManager cacheManager(RedisConnectionFactory redisConnectionFactory) {
        RedisCacheConfiguration cacheConfiguration = RedisCacheConfiguration.defaultCacheConfig()
            .entryTtl(Duration.ofMinutes(10))  // 기본 TTL
            .serializeKeysWith(RedisSerializationContext.SerializationPair
                .fromSerializer(new StringRedisSerializer()))
            .serializeValuesWith(RedisSerializationContext.SerializationPair
                .fromSerializer(new GenericJackson2JsonRedisSerializer()));

        // 캐시별 다른 TTL 설정
        Map<String, RedisCacheConfiguration> cacheConfigurations = new HashMap<>();
        cacheConfigurations.put("exercises", cacheConfiguration.entryTtl(Duration.ofHours(2)));
        cacheConfigurations.put("users", cacheConfiguration.entryTtl(Duration.ofMinutes(30)));
        cacheConfigurations.put("recommendations", cacheConfiguration.entryTtl(Duration.ofHours(12)));
        cacheConfigurations.put("popular_exercises", cacheConfiguration.entryTtl(Duration.ofDays(1)));

        return RedisCacheManager.builder(redisConnectionFactory)
            .cacheDefaults(cacheConfiguration)
            .withInitialCacheConfigurations(cacheConfigurations)
            .build();
    }
}

// ExerciseService.java
@Service
@Transactional(readOnly = true)
public class ExerciseService {

    @Cacheable(value = "exercises", key = "#category + '_' + #intensity")
    public List<Exercise> findByCategory(String category, String intensity) {
        return exerciseRepository.findByCategoryAndIntensity(category, intensity);
    }

    @Cacheable(value = "popular_exercises", key = "'weekly_' + #week")
    public List<Exercise> getPopularExercises(int week) {
        return exerciseRepository.findPopularExercisesByWeek(week);
    }

    @CacheEvict(value = "exercises", allEntries = true)
    public Exercise saveExercise(Exercise exercise) {
        return exerciseRepository.save(exercise);
    }

    // 캐시 워밍업
    @EventListener(ApplicationReadyEvent.class)
    public void warmUpCache() {
        log.info("캐시 워밍업 시작");
        
        // 인기 운동 데이터 미리 로드
        getPopularExercises(getCurrentWeek());
        
        // 주요 카테고리 데이터 로드
        Arrays.stream(ExerciseCategory.values())
            .forEach(category -> findByCategory(category.name(), "MODERATE"));
        
        log.info("캐시 워밍업 완료");
    }
}
```

### 3. 비동기 처리 최적화
```java
// AsyncConfig.java
@Configuration
@EnableAsync
public class AsyncConfig implements AsyncConfigurer {

    @Override
    @Bean(name = "taskExecutor")
    public Executor getAsyncExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(10);      // 기본 스레드 수
        executor.setMaxPoolSize(50);       // 최대 스레드 수
        executor.setQueueCapacity(100);    // 큐 용량
        executor.setThreadNamePrefix("Async-");
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.initialize();
        return executor;
    }

    @Override
    public AsyncUncaughtExceptionHandler getAsyncUncaughtExceptionHandler() {
        return new SimpleAsyncUncaughtExceptionHandler();
    }
}

// RecommendationService.java
@Service
public class RecommendationService {

    @Async("taskExecutor")
    public CompletableFuture<List<Exercise>> generateRecommendationsAsync(Long userId) {
        try {
            List<Exercise> recommendations = generateRecommendations(userId);
            
            // 캐시에 저장
            cacheManager.getCache("recommendations")
                .put("user_" + userId, recommendations);
            
            return CompletableFuture.completedFuture(recommendations);
        } catch (Exception e) {
            log.error("추천 생성 실패: userId={}", userId, e);
            return CompletableFuture.failedFuture(e);
        }
    }

    @Async("taskExecutor")
    public CompletableFuture<Void> updateUserPreferencesAsync(Long userId, UserPreferences preferences) {
        try {
            // 사용자 선호도 업데이트
            userPreferenceRepository.save(preferences);
            
            // 기존 추천 캐시 무효화
            cacheManager.getCache("recommendations").evict("user_" + userId);
            
            // 새로운 추천 미리 생성
            generateRecommendationsAsync(userId);
            
            return CompletableFuture.completedFuture(null);
        } catch (Exception e) {
            log.error("사용자 선호도 업데이트 실패: userId={}", userId, e);
            return CompletableFuture.failedFuture(e);
        }
    }
}
```

### 4. 데이터베이스 최적화
```java
// 배치 처리 최적화
@Repository
public class WorkoutRecordRepository {

    @Modifying
    @Query(value = "INSERT INTO workout_records (user_id, exercise_id, duration_minutes, calories_burned, workout_date) " +
                   "VALUES (:#{#records})", nativeQuery = true)
    void saveAllInBatch(@Param("records") List<WorkoutRecord> records);

    // N+1 문제 해결
    @Query("SELECT w FROM WorkoutRecord w " +
           "JOIN FETCH w.exercise e " +
           "JOIN FETCH e.category " +
           "WHERE w.userId = :userId AND w.workoutDate BETWEEN :startDate AND :endDate")
    List<WorkoutRecord> findUserWorkoutsWithExercise(
        @Param("userId") Long userId,
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate
    );

    // 통계 쿼리 최적화
    @Query("SELECT new com.fitmate.dto.WorkoutStatsDTO(" +
           "COUNT(w), SUM(w.caloriesBurned), AVG(w.durationMinutes)) " +
           "FROM WorkoutRecord w " +
           "WHERE w.userId = :userId AND w.workoutDate >= :startDate")
    WorkoutStatsDTO getWorkoutStats(@Param("userId") Long userId, @Param("startDate") LocalDate startDate);
}

// 인덱스 최적화
@Entity
@Table(name = "workout_records", indexes = {
    @Index(name = "idx_user_date", columnList = "user_id, workout_date"),
    @Index(name = "idx_exercise_date", columnList = "exercise_id, workout_date"),
    @Index(name = "idx_calories", columnList = "calories_burned"),
    @Index(name = "idx_composite", columnList = "user_id, workout_date, exercise_id")
})
public class WorkoutRecord {
    // 엔티티 정의...
}
```

## 보안 시스템 아키텍처

### 다층 보안 전략
```
┌─────────────────────────────────────────────────────────────────┐
│                    보안 계층 아키텍처                             │
├─────────────────┬─────────────────┬─────────────────────────────┤
│   인증/인가     │    데이터 보호   │        네트워크 보안         │
│   (Authentication) │ (Data Protection) │    (Network Security)    │
│                 │                 │                             │
│ • JWT 토큰      │ • 데이터 암호화  │ • HTTPS/TLS                │
│ • OAuth2        │ • 입력 검증     │ • CORS 설정                │
│ • Rate Limiting │ • SQL Injection │ • API Gateway              │
│ • 세션 관리     │ • XSS 방지      │ • 방화벽 정책               │
└─────────────────┴─────────────────┴─────────────────────────────┘
         │                 │                     │
         ▼                 ▼                     ▼
┌─────────────────┬─────────────────┬─────────────────────────────┐
│   감사 및 모니터링 │   개인정보 보호   │      운영 보안              │
│ • 로그 수집     │ • GDPR 준수     │ • 보안 업데이트             │
│ • 침입 탐지     │ • 데이터 최소화  │ • 취약점 스캔               │
└─────────────────┴─────────────────┴─────────────────────────────┘
```

### 1. JWT 기반 인증 시스템
```java
// JwtTokenProvider.java
@Component
public class JwtTokenProvider {
    
    @Value("${jwt.secret}")
    private String secretKey;
    
    @Value("${jwt.access-token-validity}")
    private long accessTokenValidityInMilliseconds;
    
    @Value("${jwt.refresh-token-validity}")
    private long refreshTokenValidityInMilliseconds;
    
    private final RedisTemplate<String, String> redisTemplate;
    
    public TokenDTO createTokens(String email, Collection<? extends GrantedAuthority> authorities) {
        Claims claims = Jwts.claims().setSubject(email);
        claims.put("auth", authorities.stream()
            .map(GrantedAuthority::getAuthority)
            .collect(Collectors.toList()));
        
        Date now = new Date();
        Date accessTokenExpiry = new Date(now.getTime() + accessTokenValidityInMilliseconds);
        Date refreshTokenExpiry = new Date(now.getTime() + refreshTokenValidityInMilliseconds);
        
        // Access Token 생성
        String accessToken = Jwts.builder()
            .setClaims(claims)
            .setIssuedAt(now)
            .setExpiration(accessTokenExpiry)
            .signWith(SignatureAlgorithm.HS512, secretKey)
            .compact();
        
        // Refresh Token 생성
        String refreshToken = Jwts.builder()
            .setSubject(email)
            .setIssuedAt(now)
            .setExpiration(refreshTokenExpiry)
            .signWith(SignatureAlgorithm.HS512, secretKey)
            .compact();
        
        // Refresh Token을 Redis에 저장
        redisTemplate.opsForValue().set(
            "refresh_token:" + email,
            refreshToken,
            Duration.ofMilliseconds(refreshTokenValidityInMilliseconds)
        );
        
        return TokenDTO.builder()
            .accessToken(accessToken)
            .refreshToken(refreshToken)
            .accessTokenExpiry(accessTokenExpiry)
            .refreshTokenExpiry(refreshTokenExpiry)
            .build();
    }
    
    public boolean validateToken(String token) {
        try {
            // 블랙리스트 확인
            if (isTokenBlacklisted(token)) {
                return false;
            }
            
            Jwts.parser().setSigningKey(secretKey).parseClaimsJws(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            log.warn("Invalid JWT token: {}", e.getMessage());
            return false;
        }
    }
    
    public void blacklistToken(String token) {
        try {
            Claims claims = getClaimsFromToken(token);
            Date expiration = claims.getExpiration();
            long ttl = expiration.getTime() - System.currentTimeMillis();
            
            if (ttl > 0) {
                redisTemplate.opsForValue().set(
                    "blacklist:" + getTokenHash(token),
                    "true",
                    Duration.ofMilliseconds(ttl)
                );
            }
        } catch (Exception e) {
            log.error("Token blacklist 처리 실패", e);
        }
    }
    
    private boolean isTokenBlacklisted(String token) {
        return Boolean.TRUE.equals(redisTemplate.hasKey("blacklist:" + getTokenHash(token)));
    }
    
    private String getTokenHash(String token) {
        return DigestUtils.sha256Hex(token);
    }
}
```

### 2. Rate Limiting 구현
```java
// RateLimitingFilter.java
@Component
public class RateLimitingFilter implements Filter {
    
    private final RedisTemplate<String, String> redisTemplate;
    private final ObjectMapper objectMapper;
    
    // API별 제한 설정
    private final Map<String, RateLimitConfig> rateLimitConfigs = Map.of(
        "/api/auth/login", new RateLimitConfig(5, Duration.ofMinutes(15)),      // 15분에 5회
        "/sms/request-otp", new RateLimitConfig(3, Duration.ofHours(1)),        // 1시간에 3회
        "/api/workouts", new RateLimitConfig(100, Duration.ofMinutes(1)),       // 1분에 100회
        "default", new RateLimitConfig(1000, Duration.ofMinutes(1))             // 기본: 1분에 1000회
    );
    
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;
        
        String clientId = getClientIdentifier(httpRequest);
        String endpoint = httpRequest.getRequestURI();
        
        RateLimitConfig config = rateLimitConfigs.getOrDefault(endpoint, rateLimitConfigs.get("default"));
        
        if (!isRequestAllowed(clientId, endpoint, config)) {
            handleRateLimitExceeded(httpResponse);
            return;
        }
        
        chain.doFilter(request, response);
    }
    
    private boolean isRequestAllowed(String clientId, String endpoint, RateLimitConfig config) {
        String key = "rate_limit:" + endpoint + ":" + clientId;
        String currentCount = redisTemplate.opsForValue().get(key);
        
        if (currentCount == null) {
            // 첫 요청
            redisTemplate.opsForValue().set(key, "1", config.getWindow());
            return true;
        }
        
        int count = Integer.parseInt(currentCount);
        if (count >= config.getLimit()) {
            return false;
        }
        
        redisTemplate.opsForValue().increment(key);
        return true;
    }
    
    private String getClientIdentifier(HttpServletRequest request) {
        // 인증된 사용자의 경우 사용자 ID 사용
        String token = extractTokenFromRequest(request);
        if (token != null && jwtTokenProvider.validateToken(token)) {
            return jwtTokenProvider.getEmailFromToken(token);
        }
        
        // 미인증 사용자의 경우 IP 주소 사용
        return getClientIpAddress(request);
    }
    
    private void handleRateLimitExceeded(HttpServletResponse response) throws IOException {
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        
        ErrorResponse errorResponse = ErrorResponse.builder()
            .success(false)
            .error(ErrorDetail.builder()
                .code("RATE_LIMIT_EXCEEDED")
                .message("요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.")
                .build())
            .timestamp(LocalDateTime.now())
            .build();
        
        response.getWriter().write(objectMapper.writeValueAsString(errorResponse));
    }
}
```

### 3. 입력 검증 및 XSS 방지
```java
// InputValidationConfig.java
@Configuration
public class InputValidationConfig {

    @Bean
    public CommonsRequestLoggingFilter logFilter() {
        CommonsRequestLoggingFilter filter = new CommonsRequestLoggingFilter();
        filter.setIncludeQueryString(true);
        filter.setIncludePayload(true);
        filter.setMaxPayloadLength(10000);
        filter.setIncludeHeaders(false);
        filter.setAfterMessagePrefix("REQUEST DATA : ");
        return filter;
    }
}

// XSS 방지 필터
@Component
public class XSSFilter implements Filter {
    
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        
        XSSRequestWrapper wrappedRequest = new XSSRequestWrapper((HttpServletRequest) request);
        chain.doFilter(wrappedRequest, response);
    }
}

public class XSSRequestWrapper extends HttpServletRequestWrapper {
    
    private static final Pattern[] XSS_PATTERNS = {
        Pattern.compile("<script>(.*?)</script>", Pattern.CASE_INSENSITIVE),
        Pattern.compile("src[\r\n]*=[\r\n]*\\\'(.*?)\\\'", Pattern.CASE_INSENSITIVE | Pattern.MULTILINE | Pattern.DOTALL),
        Pattern.compile("</script>", Pattern.CASE_INSENSITIVE),
        Pattern.compile("<script(.*?)>", Pattern.CASE_INSENSITIVE | Pattern.MULTILINE | Pattern.DOTALL),
        Pattern.compile("eval\\((.*?)\\)", Pattern.CASE_INSENSITIVE | Pattern.MULTILINE | Pattern.DOTALL),
        Pattern.compile("expression\\((.*?)\\)", Pattern.CASE_INSENSITIVE | Pattern.MULTILINE | Pattern.DOTALL),
        Pattern.compile("javascript:", Pattern.CASE_INSENSITIVE),
        Pattern.compile("vbscript:", Pattern.CASE_INSENSITIVE),
        Pattern.compile("onload(.*?)=", Pattern.CASE_INSENSITIVE | Pattern.MULTILINE | Pattern.DOTALL)
    };
    
    public XSSRequestWrapper(HttpServletRequest servletRequest) {
        super(servletRequest);
    }
    
    @Override
    public String[] getParameterValues(String parameter) {
        String[] values = super.getParameterValues(parameter);
        if (values == null) {
            return null;
        }
        
        int count = values.length;
        String[] encodedValues = new String[count];
        for (int i = 0; i < count; i++) {
            encodedValues[i] = stripXSS(values[i]);
        }
        
        return encodedValues;
    }
    
    @Override
    public String getParameter(String parameter) {
        String value = super.getParameter(parameter);
        return stripXSS(value);
    }
    
    private String stripXSS(String value) {
        if (value != null) {
            // HTML 엔티티 인코딩
            value = HtmlUtils.htmlEscape(value);
            
            // XSS 패턴 제거
            for (Pattern pattern : XSS_PATTERNS) {
                value = pattern.matcher(value).replaceAll("");
            }
        }
        return value;
    }
}

// 입력 검증 어노테이션
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = NoXSSValidator.class)
public @interface NoXSS {
    String message() default "XSS 공격 패턴이 감지되었습니다.";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}

public class NoXSSValidator implements ConstraintValidator<NoXSS, String> {
    
    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null) {
            return true;
        }
        
        // XSS 패턴 검사
        for (Pattern pattern : XSSRequestWrapper.XSS_PATTERNS) {
            if (pattern.matcher(value).find()) {
                return false;
            }
        }
        
        return true;
    }
}
```

### 4. 데이터 암호화 및 민감정보 보호
```java
// EncryptionService.java
@Service
public class EncryptionService {
    
    @Value("${encryption.secret-key}")
    private String secretKey;
    
    private static final String ALGORITHM = "AES/GCB/PKCS5Padding";
    private static final String KEY_ALGORITHM = "AES";
    
    public String encrypt(String plainText) {
        try {
            SecretKeySpec secretKeySpec = new SecretKeySpec(secretKey.getBytes(), KEY_ALGORITHM);
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, secretKeySpec);
            
            byte[] encryptedBytes = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(encryptedBytes);
        } catch (Exception e) {
            throw new RuntimeException("암호화 실패", e);
        }
    }
    
    public String decrypt(String encryptedText) {
        try {
            SecretKeySpec secretKeySpec = new SecretKeySpec(secretKey.getBytes(), KEY_ALGORITHM);
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, secretKeySpec);
            
            byte[] decryptedBytes = cipher.doFinal(Base64.getDecoder().decode(encryptedText));
            return new String(decryptedBytes, StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new RuntimeException("복호화 실패", e);
        }
    }
}

// 데이터베이스 컬럼 암호화
@Converter
public class EncryptedStringConverter implements AttributeConverter<String, String> {
    
    @Autowired
    private EncryptionService encryptionService;
    
    @Override
    public String convertToDatabaseColumn(String attribute) {
        if (attribute == null) {
            return null;
        }
        return encryptionService.encrypt(attribute);
    }
    
    @Override
    public String convertToEntityAttribute(String dbData) {
        if (dbData == null) {
            return null;
        }
        return encryptionService.decrypt(dbData);
    }
}

// 엔티티에서 민감정보 암호화 적용
@Entity
public class User {
    
    @Convert(converter = EncryptedStringConverter.class)
    @Column(name = "phone_number")
    private String phoneNumber;      // 전화번호 암호화
    
    @Convert(converter = EncryptedStringConverter.class)
    @Column(name = "birth_date")
    private String birthDate;        // 생년월일 암호화
    
    // 일반 필드들은 암호화하지 않음
    private String name;
    private String email;
}
```

### 5. 보안 모니터링 및 감사
```java
// SecurityEventListener.java
@Component
@EventListener
public class SecurityEventListener {
    
    private final SecurityLogService securityLogService;
    private final AlertService alertService;
    
    @EventListener
    public void handleAuthenticationFailure(AbstractAuthenticationFailureEvent event) {
        String username = event.getAuthentication().getName();
        String reason = event.getException().getMessage();
        String ipAddress = getClientIpAddress();
        
        SecurityEvent securityEvent = SecurityEvent.builder()
            .eventType(SecurityEventType.AUTHENTICATION_FAILURE)
            .username(username)
            .ipAddress(ipAddress)
            .reason(reason)
            .timestamp(LocalDateTime.now())
            .build();
        
        securityLogService.logSecurityEvent(securityEvent);
        
        // 연속 실패 시 알림
        if (securityLogService.getFailureCount(username, Duration.ofMinutes(10)) > 5) {
            alertService.sendSecurityAlert("연속 로그인 실패", username + " 계정에 5회 이상 로그인 실패");
        }
    }
    
    @EventListener
    public void handleSuspiciousActivity(SuspiciousActivityEvent event) {
        SecurityEvent securityEvent = SecurityEvent.builder()
            .eventType(SecurityEventType.SUSPICIOUS_ACTIVITY)
            .username(event.getUsername())
            .ipAddress(event.getIpAddress())
            .description(event.getDescription())
            .timestamp(LocalDateTime.now())
            .build();
        
        securityLogService.logSecurityEvent(securityEvent);
        
        // 즉시 알림
        alertService.sendUrgentSecurityAlert("의심스러운 활동 감지", event.getDescription());
    }
}

// 보안 로그 서비스
@Service
public class SecurityLogService {
    
    private final MongoTemplate mongoTemplate;
    private final RedisTemplate<String, String> redisTemplate;
    
    public void logSecurityEvent(SecurityEvent event) {
        // MongoDB에 보안 이벤트 저장
        mongoTemplate.save(event, "security_events");
        
        // 실시간 모니터링을 위한 Redis 저장
        redisTemplate.opsForList().leftPush("recent_security_events", 
            objectMapper.writeValueAsString(event));
        redisTemplate.expire("recent_security_events", Duration.ofHours(24));
    }
    
    public long getFailureCount(String username, Duration duration) {
        LocalDateTime since = LocalDateTime.now().minus(duration);
        
        Query query = new Query()
            .addCriteria(Criteria.where("eventType").is(SecurityEventType.AUTHENTICATION_FAILURE))
            .addCriteria(Criteria.where("username").is(username))
            .addCriteria(Criteria.where("timestamp").gte(since));
        
        return mongoTemplate.count(query, SecurityEvent.class, "security_events");
    }
}
```

## 모니터링 및 성능 분석

### 1. APM 도구 통합
```java
// MicrometerConfig.java
@Configuration
public class MicrometerConfig {

    @Bean
    public MeterRegistry meterRegistry() {
        return new PrometheusMeterRegistry(PrometheusConfig.DEFAULT);
    }
    
    @Bean
    public TimedAspect timedAspect(MeterRegistry registry) {
        return new TimedAspect(registry);
    }
}

// 성능 메트릭 수집
@RestController
@Timed(name = "api.exercises", description = "Exercise API performance")
public class ExerciseController {
    
    private final Counter exerciseSearchCounter;
    private final Timer exerciseSearchTimer;
    
    public ExerciseController(MeterRegistry meterRegistry) {
        this.exerciseSearchCounter = Counter.builder("exercise.search.count")
            .description("Number of exercise searches")
            .register(meterRegistry);
            
        this.exerciseSearchTimer = Timer.builder("exercise.search.duration")
            .description("Exercise search duration")
            .register(meterRegistry);
    }
    
    @GetMapping("/search")
    public ResponseEntity<List<Exercise>> searchExercises(@RequestParam String query) {
        return exerciseSearchTimer.record(() -> {
            exerciseSearchCounter.increment();
            List<Exercise> results = exerciseService.searchExercises(query);
            return ResponseEntity.ok(results);
        });
    }
}
```

### 2. 헬스체크 및 모니터링
```java
// HealthCheckController.java
@RestController
@RequestMapping("/health")
public class HealthCheckController {
    
    private final DatabaseHealthIndicator databaseHealthIndicator;
    private final RedisHealthIndicator redisHealthIndicator;
    private final ExternalServiceHealthIndicator externalServiceHealthIndicator;
    
    @GetMapping
    public ResponseEntity<HealthStatus> getHealth() {
        Map<String, HealthStatus> healthChecks = new HashMap<>();
        
        healthChecks.put("database", databaseHealthIndicator.check());
        healthChecks.put("redis", redisHealthIndicator.check());
        healthChecks.put("twilio", externalServiceHealthIndicator.checkTwilio());
        
        boolean isHealthy = healthChecks.values().stream()
            .allMatch(status -> status.getStatus() == HealthStatus.Status.UP);
        
        HealthStatus overallHealth = HealthStatus.builder()
            .status(isHealthy ? HealthStatus.Status.UP : HealthStatus.Status.DOWN)
            .details(healthChecks)
            .timestamp(LocalDateTime.now())
            .build();
        
        return ResponseEntity.ok(overallHealth);
    }
}
```

## 면접 예상 질문 대비

### Q1: 성능 최적화에서 가장 효과적이었던 방법은?
**A:**
- **캐싱 전략**: Redis를 통한 다층 캐싱으로 응답 시간 70% 단축
- **데이터베이스 최적화**: 인덱스 최적화와 N+1 문제 해결로 쿼리 성능 향상
- **비동기 처리**: 추천 생성 등 무거운 작업의 비동기 처리로 사용자 경험 개선
- **번들 최적화**: 코드 스플리팅으로 초기 로딩 시간 50% 감소

### Q2: 보안 위협에 대한 대응 방안은?
**A:**
- **다층 방어**: 네트워크, 애플리케이션, 데이터 레벨의 다층 보안
- **실시간 모니터링**: 의심스러운 활동 실시간 감지 및 알림
- **최소 권한 원칙**: 사용자/시스템별 최소 필요 권한만 부여
- **정기 보안 점검**: 취약점 스캔, 침투 테스트, 보안 업데이트

### Q3: Rate Limiting 구현 시 고려사항은?
**A:**
- **공정한 제한**: 사용자별, API별 차별화된 제한 정책
- **유연한 설정**: 운영 중 동적 조정 가능한 설정
- **우회 방지**: IP 기반 + 사용자 기반 복합 식별
- **사용자 경험**: 명확한 에러 메시지와 재시도 안내

### Q4: 대용량 트래픽 시 성능 확보 방안은?
**A:**
- **수평 확장**: 로드 밸런서를 통한 인스턴스 확장
- **캐시 활용**: 읽기 부하를 캐시로 분산
- **데이터베이스 분산**: 읽기 복제본, 샤딩 전략
- **비동기 처리**: 동기적 처리 최소화

## 향후 개발 계획

### 1. 성능 고도화
- **마이크로서비스 분리**: 도메인별 서비스 독립화
- **CDN 도입**: 글로벌 콘텐츠 전송 최적화
- **GraphQL**: 클라이언트 맞춤형 데이터 전송

### 2. 보안 강화
- **Zero Trust**: 모든 접근을 검증하는 아키텍처
- **SIEM 도입**: 보안 정보 통합 관리
- **암호화 확대**: 전송/저장 데이터 전체 암호화

### 3. 모니터링 고도화
- **AI 기반 이상 탐지**: 머신러닝 기반 성능 이상 감지
- **예측적 스케일링**: 트래픽 예측 기반 자동 확장
- **통합 대시보드**: 비즈니스 + 기술 메트릭 통합

---

*이 문서는 FitMate 프로젝트의 성능 최적화 및 보안 시스템에 대한 상세 분석을 제공합니다.*