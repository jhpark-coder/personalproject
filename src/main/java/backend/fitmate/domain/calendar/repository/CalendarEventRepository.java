package backend.fitmate.domain.calendar.repository;

import backend.fitmate.domain.calendar.entity.CalendarEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CalendarEventRepository extends JpaRepository<CalendarEvent, Long> {
    List<CalendarEvent> findByUserIdOrderByStartDateTimeDesc(String userId);
    List<CalendarEvent> findByUserId(String userId);
}