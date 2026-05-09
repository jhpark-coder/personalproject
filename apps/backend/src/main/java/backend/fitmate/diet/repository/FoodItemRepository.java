package backend.fitmate.diet.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import backend.fitmate.diet.entity.FoodItem;

@Repository
public interface FoodItemRepository extends JpaRepository<FoodItem, Long> {

    Optional<FoodItem> findByNameIgnoreCase(String name);

    @Query("""
        SELECT food
        FROM FoodItem food
        WHERE (:query IS NULL OR :query = '' OR LOWER(food.name) LIKE LOWER(CONCAT('%', :query, '%')))
          AND (:category IS NULL OR :category = '' OR LOWER(food.category) = LOWER(:category))
        ORDER BY food.name ASC
        """)
    List<FoodItem> search(
        @Param("query") String query,
        @Param("category") String category,
        Pageable pageable
    );
}
