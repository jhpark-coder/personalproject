package backend.fitmate.User.entity;

import java.io.Serializable;
import java.util.Objects;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 복합 키 클래스 - UserExercisePreference 엔티티용
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserExercisePreferenceId implements Serializable {
    
    private static final long serialVersionUID = 1L;
    
    private User user;
    private String exerciseName;
    
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        
        UserExercisePreferenceId that = (UserExercisePreferenceId) o;
        
        return Objects.equals(user, that.user) && 
               Objects.equals(exerciseName, that.exerciseName);
    }
    
    @Override
    public int hashCode() {
        return Objects.hash(user, exerciseName);
    }
}