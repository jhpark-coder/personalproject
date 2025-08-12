package backend.fitmate.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import backend.fitmate.User.entity.User;
import backend.fitmate.User.repository.UserRepository;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;

    @GetMapping("/search")
    public ResponseEntity<?> search(
            @RequestParam(name = "q", required = false) String q,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "10") int size) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of(
                "success", false,
                "message", "인증이 필요합니다"
            ));
        }

        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority() != null && a.getAuthority().contains("ROLE_ADMIN"));
        if (!isAdmin) {
            return ResponseEntity.status(403).body(Map.of(
                "success", false,
                "message", "관리자만 접근 가능합니다"
            ));
        }

        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(size, 1));

        Page<User> src = userRepository.findAll(pageable);
        List<User> filtered;
        if (!StringUtils.hasText(q)) {
            filtered = src.getContent();
        } else {
            String query = q.toLowerCase();
            filtered = src.getContent().stream()
                .filter(u -> (u.getEmail() != null && u.getEmail().toLowerCase().contains(query))
                          || (u.getName() != null && u.getName().toLowerCase().contains(query)))
                .collect(Collectors.toList());
        }

        List<Map<String, Object>> content = filtered.stream().map(u -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", u.getId());
            m.put("email", u.getEmail());
            m.put("name", u.getName());
            m.put("birthDate", u.getBirthDate());
            return m;
        }).collect(Collectors.toList());

        Map<String, Object> body = new HashMap<>();
        body.put("content", content);
        body.put("page", src.getNumber());
        body.put("size", src.getSize());
        body.put("totalElements", src.getTotalElements());
        body.put("totalPages", src.getTotalPages());
        body.put("success", true);
        return ResponseEntity.ok(body);
    }

    // ===== 전체 사용자 ID 목록 (관리자 전용) =====
    @GetMapping("/ids")
    public ResponseEntity<?> getAllUserIds() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of(
                "success", false,
                "message", "인증이 필요합니다"
            ));
        }

        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority() != null && a.getAuthority().contains("ROLE_ADMIN"));
        if (!isAdmin) {
            return ResponseEntity.status(403).body(Map.of(
                "success", false,
                "message", "관리자만 접근 가능합니다"
            ));
        }

        List<Map<String, Object>> result = userRepository.findAll().stream().map(u -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", u.getId());
            m.put("email", u.getEmail());
            m.put("name", u.getName());
            return m;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }
} 