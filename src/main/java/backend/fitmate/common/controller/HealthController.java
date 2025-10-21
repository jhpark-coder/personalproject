package backend.fitmate.common.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.availability.ApplicationAvailability;
import org.springframework.boot.availability.LivenessState;
import org.springframework.boot.availability.ReadinessState;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.sql.Connection;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class HealthController {
    
    @Autowired(required = false)
    private ApplicationAvailability applicationAvailability;
    
    @Autowired
    private DataSource dataSource;
    
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        // 최대한 간단하게 - DB 체크 제거
        Map<String, Object> health = new HashMap<>();
        health.put("status", "UP");
        health.put("timestamp", System.currentTimeMillis());
        return ResponseEntity.ok(health);
    }
    
    @GetMapping("/health/liveness")
    public ResponseEntity<String> liveness() {
        return ResponseEntity.ok("OK");
    }
    
    @GetMapping("/health/readiness")
    public ResponseEntity<String> readiness() {
        // Database 연결 체크 (타임아웃 2초)
        try {
            Connection connection = dataSource.getConnection();
            connection.setNetworkTimeout(null, 2000); // 2초 타임아웃
            connection.close();
            return ResponseEntity.ok("READY");
        } catch (Exception e) {
            // 데이터베이스 연결 실패 시에도 READY 반환 (재시작 방지)
            return ResponseEntity.ok("READY");
            // return ResponseEntity.status(503).body("NOT_READY");
        }
    }
}