package backend.fitmate.exception;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;

import com.fasterxml.jackson.core.JsonProcessingException;

import io.jsonwebtoken.JwtException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    // JWT 관련 예외
    @ExceptionHandler(JwtException.class)
    public ResponseEntity<Map<String, Object>> handleJwtException(JwtException ex, WebRequest request) {
        logger.warn("JWT 예외 발생: {}, 요청: {}", ex.getMessage(), request.getDescription(false));
        
        Map<String, Object> response = createErrorResponse(
            HttpStatus.UNAUTHORIZED,
            "인증이 필요합니다",
            "JWT_ERROR"
        );
        
        return new ResponseEntity<>(response, HttpStatus.UNAUTHORIZED);
    }

    // 권한 부족 예외
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleAccessDeniedException(AccessDeniedException ex, WebRequest request) {
        logger.warn("권한 부족: {}, 요청: {}", ex.getMessage(), request.getDescription(false));
        
        Map<String, Object> response = createErrorResponse(
            HttpStatus.FORBIDDEN,
            "접근 권한이 없습니다",
            "ACCESS_DENIED"
        );
        
        return new ResponseEntity<>(response, HttpStatus.FORBIDDEN);
    }

    // JSON 처리 예외
    @ExceptionHandler(JsonProcessingException.class)
    public ResponseEntity<Map<String, Object>> handleJsonProcessingException(JsonProcessingException ex, WebRequest request) {
        logger.error("JSON 처리 오류: {}, 요청: {}", ex.getMessage(), request.getDescription(false));
        
        Map<String, Object> response = createErrorResponse(
            HttpStatus.BAD_REQUEST,
            "잘못된 데이터 형식입니다",
            "INVALID_JSON"
        );
        
        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    // 잘못된 파라미터 예외
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgumentException(IllegalArgumentException ex, WebRequest request) {
        logger.warn("잘못된 파라미터: {}, 요청: {}", ex.getMessage(), request.getDescription(false));
        
        Map<String, Object> response = createErrorResponse(
            HttpStatus.BAD_REQUEST,
            "잘못된 요청 파라미터입니다",
            "INVALID_PARAMETER"
        );
        
        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    // 일반적인 런타임 예외
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, Object>> handleRuntimeException(RuntimeException ex, WebRequest request) {
        logger.error("런타임 예외: {}, 요청: {}", ex.getMessage(), request.getDescription(false), ex);
        
        Map<String, Object> response = createErrorResponse(
            HttpStatus.INTERNAL_SERVER_ERROR,
            "서버에서 오류가 발생했습니다",
            "INTERNAL_ERROR"
        );
        
        return new ResponseEntity<>(response, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // 모든 예외의 최종 처리
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGenericException(Exception ex, WebRequest request) {
        logger.error("예상치 못한 오류: {}, 요청: {}", ex.getMessage(), request.getDescription(false), ex);
        
        Map<String, Object> response = createErrorResponse(
            HttpStatus.INTERNAL_SERVER_ERROR,
            "예상치 못한 오류가 발생했습니다",
            "UNEXPECTED_ERROR"
        );
        
        return new ResponseEntity<>(response, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    private Map<String, Object> createErrorResponse(HttpStatus status, String message, String errorCode) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("message", message);
        response.put("errorCode", errorCode);
        response.put("status", status.value());
        response.put("timestamp", LocalDateTime.now());
        return response;
    }
}