package backend.fitmate.domain.calendar.controller;

import backend.fitmate.domain.calendar.entity.CalendarEvent;
import backend.fitmate.domain.calendar.repository.CalendarEventRepository;
import backend.fitmate.infrastructure.security.jwt.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import backend.fitmate.domain.calendar.repository.CalendarEventRepository;

@RestController
@RequestMapping("/api/local-calendar")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class LocalCalendarController {
    
    private final CalendarEventRepository calendarEventRepository;
    private final JwtTokenProvider jwtTokenProvider;
    
    @GetMapping("/events")
    public ResponseEntity<?> getEvents(@RequestHeader("Authorization") String token) {
        String userId = jwtTokenProvider.getUserIdFromToken(token.replace("Bearer ", ""));
        List<CalendarEvent> events = calendarEventRepository.findByUserIdOrderByStartDateTimeDesc(userId);
        return ResponseEntity.ok(events);
    }
    
    @PostMapping("/events")
    public ResponseEntity<?> createEvent(
            @RequestHeader("Authorization") String token,
            @RequestBody Map<String, Object> request) {
        String userId = jwtTokenProvider.getUserIdFromToken(token.replace("Bearer ", ""));
        
        CalendarEvent event = CalendarEvent.builder()
                .userId(userId)
                .title((String) request.get("title"))
                .description((String) request.get("description"))
                .location((String) request.get("location"))
                .startDateTime(LocalDateTime.parse((String) request.get("startDateTime")))
                .endDateTime(LocalDateTime.parse((String) request.get("endDateTime")))
                .isAllDay(request.get("isAllDay") != null ? (Boolean) request.get("isAllDay") : false)
                .recurrence((String) request.get("recurrence"))
                .build();
        
        CalendarEvent saved = calendarEventRepository.save(event);
        return ResponseEntity.ok(saved);
    }
    
    @PutMapping("/events/{id}")
    public ResponseEntity<?> updateEvent(
            @PathVariable Long id,
            @RequestHeader("Authorization") String token,
            @RequestBody Map<String, Object> request) {
        String userId = jwtTokenProvider.getUserIdFromToken(token.replace("Bearer ", ""));
        
        CalendarEvent event = calendarEventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Event not found"));
        
        if (!event.getUserId().equals(userId)) {
            return ResponseEntity.status(403).body("Unauthorized");
        }
        
        event.setTitle((String) request.get("title"));
        event.setDescription((String) request.get("description"));
        event.setLocation((String) request.get("location"));
        event.setStartDateTime(LocalDateTime.parse((String) request.get("startDateTime")));
        event.setEndDateTime(LocalDateTime.parse((String) request.get("endDateTime")));
        event.setAllDay(request.get("isAllDay") != null ? (Boolean) request.get("isAllDay") : false);
        event.setRecurrence((String) request.get("recurrence"));
        
        CalendarEvent updated = calendarEventRepository.save(event);
        return ResponseEntity.ok(updated);
    }
    
    @DeleteMapping("/events/{id}")
    public ResponseEntity<?> deleteEvent(
            @PathVariable Long id,
            @RequestHeader("Authorization") String token) {
        String userId = jwtTokenProvider.getUserIdFromToken(token.replace("Bearer ", ""));
        
        CalendarEvent event = calendarEventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Event not found"));
        
        if (!event.getUserId().equals(userId)) {
            return ResponseEntity.status(403).body("Unauthorized");
        }
        
        calendarEventRepository.delete(event);
        return ResponseEntity.ok(Map.of("message", "Event deleted successfully"));
    }
}