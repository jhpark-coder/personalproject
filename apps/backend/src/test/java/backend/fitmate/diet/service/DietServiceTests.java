package backend.fitmate.diet.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import backend.fitmate.diet.dto.DietDtos.DietDailySummaryResponse;
import backend.fitmate.diet.dto.DietDtos.DietEntryRequest;
import backend.fitmate.diet.dto.DietDtos.DietEntryResponse;
import backend.fitmate.diet.entity.DietEntry;
import backend.fitmate.diet.entity.DietGoal;
import backend.fitmate.diet.entity.FoodItem;
import backend.fitmate.diet.entity.MealType;
import backend.fitmate.diet.repository.DietEntryRepository;
import backend.fitmate.diet.repository.DietGoalRepository;
import backend.fitmate.diet.repository.FoodItemRepository;
import backend.fitmate.user.entity.User;
import backend.fitmate.user.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
class DietServiceTests {

    @Mock
    private FoodItemRepository foodItemRepository;

    @Mock
    private DietEntryRepository dietEntryRepository;

    @Mock
    private DietGoalRepository dietGoalRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private DietService dietService;

    @Test
    void createEntryCalculatesCatalogNutritionFromServingGrams() {
        User user = user(1L);
        FoodItem chicken = food(10L, "닭가슴살", 100.0, 165, 31.0, 0.0, 3.6);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(foodItemRepository.findById(10L)).thenReturn(Optional.of(chicken));
        when(dietEntryRepository.save(any(DietEntry.class))).thenAnswer(invocation -> {
            DietEntry entry = invocation.getArgument(0);
            entry.setId(77L);
            return entry;
        });

        DietEntryResponse response = dietService.createEntry(
            1L,
            new DietEntryRequest(
                10L,
                null,
                MealType.LUNCH,
                LocalDateTime.of(2026, 5, 9, 12, 30),
                null,
                150.0,
                null,
                null,
                null,
                null,
                "운동 후 식사"
            )
        );

        ArgumentCaptor<DietEntry> captor = ArgumentCaptor.forClass(DietEntry.class);
        verify(dietEntryRepository).save(captor.capture());
        DietEntry persisted = captor.getValue();

        assertThat(response.id()).isEqualTo(77L);
        assertThat(persisted.getFoodItem()).isEqualTo(chicken);
        assertThat(persisted.getFoodName()).isEqualTo("닭가슴살");
        assertThat(persisted.getServingMultiplier()).isEqualTo(1.5);
        assertThat(persisted.getCalories()).isEqualTo(248);
        assertThat(persisted.getProtein()).isEqualTo(46.5);
        assertThat(persisted.getFat()).isEqualTo(5.4);
    }

    @Test
    void dailySummaryBuildsMealTotalsTargetsAndRecentRecommendation() {
        DietGoal goal = new DietGoal();
        goal.setId(3L);
        goal.setUser(user(1L));
        goal.setDailyCalories(2200);
        goal.setProtein(120.0);
        goal.setCarbs(250.0);
        goal.setFat(60.0);

        DietEntry lunch = entry(
            1L,
            "현미밥",
            MealType.LUNCH,
            LocalDateTime.of(2026, 5, 9, 12, 10),
            321,
            6.0,
            68.0,
            2.2
        );

        when(dietGoalRepository.findByUserId(1L)).thenReturn(Optional.of(goal));
        when(dietEntryRepository.findByUserIdAndEatenAtBetweenOrderByEatenAtAscCreatedAtAsc(
            1L,
            LocalDateTime.of(2026, 5, 9, 0, 0),
            LocalDateTime.of(2026, 5, 10, 0, 0)
        )).thenReturn(List.of(lunch));
        when(dietEntryRepository.findFrequentFoodNames(any(Long.class), any(LocalDateTime.class)))
            .thenReturn(List.<Object[]>of(new Object[] { "그릭요거트", 4L }));

        DietDailySummaryResponse summary = dietService.getDailySummary(1L, LocalDate.of(2026, 5, 9));

        assertThat(summary.totals().calories()).isEqualTo(321);
        assertThat(summary.targets().caloriePercent()).isEqualTo(15);
        assertThat(summary.meals()).hasSize(4);
        assertThat(summary.meals().stream()
            .filter(meal -> meal.mealType() == MealType.LUNCH)
            .findFirst()
            .orElseThrow()
            .entries()).hasSize(1);
        assertThat(summary.recommendations())
            .extracting("type")
            .contains("protein-gap", "recent-food");
    }

    private User user(Long id) {
        User user = new User();
        user.setId(id);
        user.setEmail("member" + id + "@fitmate.test");
        user.setName("Member " + id);
        user.setWeight("70");
        user.setHeight("175");
        user.setAge("29");
        user.setGender("male");
        return user;
    }

    private FoodItem food(
        Long id,
        String name,
        Double servingSizeGram,
        Integer calories,
        Double protein,
        Double carbs,
        Double fat
    ) {
        FoodItem food = new FoodItem();
        food.setId(id);
        food.setName(name);
        food.setServingSizeGram(servingSizeGram);
        food.setCalories(calories);
        food.setProtein(protein);
        food.setCarbs(carbs);
        food.setFat(fat);
        food.setCategory("protein");
        food.setSource("test");
        return food;
    }

    private DietEntry entry(
        Long id,
        String foodName,
        MealType mealType,
        LocalDateTime eatenAt,
        Integer calories,
        Double protein,
        Double carbs,
        Double fat
    ) {
        DietEntry entry = new DietEntry();
        entry.setId(id);
        entry.setFoodName(foodName);
        entry.setMealType(mealType);
        entry.setEatenAt(eatenAt);
        entry.setServingMultiplier(1.0);
        entry.setServingGrams(100.0);
        entry.setCalories(calories);
        entry.setProtein(protein);
        entry.setCarbs(carbs);
        entry.setFat(fat);
        return entry;
    }
}
