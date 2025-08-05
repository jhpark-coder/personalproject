package backend.fitmate.controller;

import java.util.Arrays;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import backend.fitmate.config.RateLimit;

@RestController
@RequestMapping("/api/analytics")
@CrossOrigin(origins = "*")
public class AnalyticsController {

    @GetMapping("/body")
    @RateLimit(bucketName = "analyticsBucket", keyType = RateLimit.KeyType.IP)
    public ResponseEntity<?> getBodyData() {
        // 임시 데이터 - 실제로는 데이터베이스에서 가져와야 함
        Map<String, Object> bodyData = Map.of(
            "muscleMass", Map.of(
                "current", 27.5,
                "change", 0.5,
                "min", 27.0,
                "max", 27.5,
                "data", Arrays.asList(
                    Map.of("date", "25-05-12", "value", 27.0),
                    Map.of("date", "05-19", "value", 27.2),
                    Map.of("date", "05-26", "value", 27.5)
                )
            ),
            "bodyFat", Map.of(
                "current", 16.3,
                "change", -0.7,
                "min", 16.3,
                "max", 17.0,
                "data", Arrays.asList(
                    Map.of("date", "25-05-12", "value", 17.0),
                    Map.of("date", "05-19", "value", 16.8),
                    Map.of("date", "05-26", "value", 16.3)
                )
            )
        );

        return ResponseEntity.ok(Map.of(
            "success", true,
            "data", bodyData
        ));
    }

    @GetMapping("/stats")
    @RateLimit(bucketName = "analyticsBucket", keyType = RateLimit.KeyType.IP)
    public ResponseEntity<?> getWorkoutStats() {
        // 임시 데이터 - 실제로는 데이터베이스에서 가져와야 함
        Map<String, Object> stats = Map.of(
            "time", "7시간 51분",
            "volume", "27.4 ton",
            "count", "6회",
            "averageTime", "78분",
            "totalWeight", "27,408kg",
            "history", Arrays.asList(
                Map.of("type", "트레드밀", "count", 2)
            )
        );

        return ResponseEntity.ok(Map.of(
            "success", true,
            "stats", stats
        ));
    }
} 