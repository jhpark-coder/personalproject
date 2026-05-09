package backend.fitmate.diet.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import backend.fitmate.diet.dto.DietDtos.DietDailySummaryResponse;
import backend.fitmate.diet.dto.DietDtos.DietEntryRequest;
import backend.fitmate.diet.dto.DietDtos.DietEntryResponse;
import backend.fitmate.diet.dto.DietDtos.DietGoalRequest;
import backend.fitmate.diet.dto.DietDtos.DietGoalResponse;
import backend.fitmate.diet.dto.DietDtos.DietMealSummaryResponse;
import backend.fitmate.diet.dto.DietDtos.DietRecommendationResponse;
import backend.fitmate.diet.dto.DietDtos.FoodItemResponse;
import backend.fitmate.diet.dto.DietDtos.NutritionTargetsResponse;
import backend.fitmate.diet.dto.DietDtos.NutritionTotalsResponse;
import backend.fitmate.diet.entity.DietEntry;
import backend.fitmate.diet.entity.DietGoal;
import backend.fitmate.diet.entity.FoodItem;
import backend.fitmate.diet.entity.MealType;
import backend.fitmate.diet.repository.DietEntryRepository;
import backend.fitmate.diet.repository.DietGoalRepository;
import backend.fitmate.diet.repository.FoodItemRepository;
import backend.fitmate.user.entity.User;
import backend.fitmate.user.repository.UserRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class DietService {

    private static final int FOOD_SEARCH_LIMIT = 20;
    private static final int RECENT_RECOMMENDATION_DAYS = 14;

    private final FoodItemRepository foodItemRepository;
    private final DietEntryRepository dietEntryRepository;
    private final DietGoalRepository dietGoalRepository;
    private final UserRepository userRepository;

    @PostConstruct
    void seedFoodCatalog() {
        if (foodItemRepository.count() > 0) {
            return;
        }

        foodItemRepository.saveAll(List.of(
            food("현미밥", 210.0, 321, 6.0, 68.0, 2.2, "grain"),
            food("닭가슴살", 100.0, 165, 31.0, 0.0, 3.6, "protein"),
            food("삶은 달걀", 50.0, 78, 6.3, 0.6, 5.3, "protein"),
            food("고구마", 150.0, 193, 2.4, 45.0, 0.2, "carb"),
            food("두부", 100.0, 84, 9.3, 2.0, 4.8, "protein"),
            food("연어구이", 100.0, 208, 20.4, 0.0, 13.4, "protein"),
            food("그릭요거트", 150.0, 120, 15.0, 7.5, 3.0, "dairy"),
            food("바나나", 120.0, 107, 1.3, 27.0, 0.4, "fruit"),
            food("사과", 180.0, 95, 0.5, 25.0, 0.3, "fruit"),
            food("오트밀", 40.0, 150, 5.0, 27.0, 3.0, "grain"),
            food("아보카도", 100.0, 160, 2.0, 8.5, 14.7, "fat"),
            food("김치", 50.0, 12, 1.0, 2.0, 0.2, "side"),
            food("샐러드", 150.0, 80, 3.0, 12.0, 2.0, "vegetable"),
            food("우유", 200.0, 122, 6.4, 9.6, 6.6, "dairy"),
            food("삼겹살", 100.0, 518, 9.3, 0.0, 53.0, "protein")
        ));
    }

    @Transactional(readOnly = true)
    public List<FoodItemResponse> searchFoods(String query, String category) {
        return foodItemRepository
            .search(trimToNull(query), trimToNull(category), PageRequest.of(0, FOOD_SEARCH_LIMIT))
            .stream()
            .map(this::toFoodResponse)
            .toList();
    }

    public DietEntryResponse createEntry(Long userId, DietEntryRequest request) {
        User user = loadUser(userId);
        EntryCalculation calculation = calculateEntry(request);

        DietEntry entry = new DietEntry();
        entry.setUser(user);
        applyCalculation(entry, calculation, request.memo());
        return toEntryResponse(dietEntryRepository.save(entry));
    }

    public DietEntryResponse updateEntry(Long userId, Long entryId, DietEntryRequest request) {
        DietEntry entry = dietEntryRepository.findByIdAndUserId(entryId, userId)
            .orElseThrow(() -> new NoSuchElementException("식단 기록을 찾을 수 없습니다."));

        DietEntryRequest mergedRequest = mergeRequest(entry, request);
        EntryCalculation calculation = calculateEntry(mergedRequest);
        applyCalculation(entry, calculation, mergedRequest.memo());
        return toEntryResponse(dietEntryRepository.save(entry));
    }

    public void deleteEntry(Long userId, Long entryId) {
        DietEntry entry = dietEntryRepository.findByIdAndUserId(entryId, userId)
            .orElseThrow(() -> new NoSuchElementException("식단 기록을 찾을 수 없습니다."));
        dietEntryRepository.delete(entry);
    }

    @Transactional(readOnly = true)
    public DietDailySummaryResponse getDailySummary(Long userId, LocalDate date) {
        LocalDate targetDate = date == null ? LocalDate.now() : date;
        LocalDateTime start = targetDate.atStartOfDay();
        LocalDateTime end = start.plusDays(1);

        List<DietEntryResponse> entries = dietEntryRepository
            .findByUserIdAndEatenAtBetweenOrderByEatenAtAscCreatedAtAsc(userId, start, end)
            .stream()
            .map(this::toEntryResponse)
            .toList();

        NutritionTotalsResponse totals = totals(entries);
        DietGoalResponse goal = getGoal(userId);
        NutritionTargetsResponse targets = targets(goal, totals);
        List<DietMealSummaryResponse> meals = mealSummaries(entries);
        List<DietRecommendationResponse> recommendations = recommendations(userId, entries, totals, goal);

        return new DietDailySummaryResponse(targetDate, totals, targets, meals, entries, recommendations);
    }

    @Transactional(readOnly = true)
    public DietGoalResponse getGoal(Long userId) {
        return dietGoalRepository.findByUserId(userId)
            .map(goal -> toGoalResponse(goal, false))
            .orElseGet(() -> estimateGoal(loadUser(userId)));
    }

    public DietGoalResponse updateGoal(Long userId, DietGoalRequest request) {
        User user = loadUser(userId);
        DietGoalResponse fallback = getGoal(userId);
        DietGoal goal = dietGoalRepository.findByUserId(userId).orElseGet(DietGoal::new);

        if (goal.getUser() == null) {
            goal.setUser(user);
        }

        goal.setDailyCalories(request.dailyCalories() != null ? request.dailyCalories() : fallback.dailyCalories());
        goal.setProtein(request.protein() != null ? roundOne(request.protein()) : fallback.protein());
        goal.setCarbs(request.carbs() != null ? roundOne(request.carbs()) : fallback.carbs());
        goal.setFat(request.fat() != null ? roundOne(request.fat()) : fallback.fat());

        return toGoalResponse(dietGoalRepository.save(goal), false);
    }

    private void applyCalculation(DietEntry entry, EntryCalculation calculation, String memo) {
        entry.setFoodItem(calculation.foodItem());
        entry.setFoodName(calculation.foodName());
        entry.setMealType(calculation.mealType());
        entry.setEatenAt(calculation.eatenAt());
        entry.setServingMultiplier(calculation.servingMultiplier());
        entry.setServingGrams(calculation.servingGrams());
        entry.setCalories(calculation.calories());
        entry.setProtein(calculation.protein());
        entry.setCarbs(calculation.carbs());
        entry.setFat(calculation.fat());
        entry.setMemo(trimToNull(memo));
    }

    private DietEntryRequest mergeRequest(DietEntry existing, DietEntryRequest request) {
        Long existingFoodId = existing.getFoodItem() != null ? existing.getFoodItem().getId() : null;

        return new DietEntryRequest(
            request.foodItemId() != null ? request.foodItemId() : existingFoodId,
            firstText(request.foodName(), existing.getFoodName()),
            request.mealType() != null ? request.mealType() : existing.getMealType(),
            request.eatenAt() != null ? request.eatenAt() : existing.getEatenAt(),
            request.servingMultiplier() != null ? request.servingMultiplier() : existing.getServingMultiplier(),
            request.servingGrams() != null ? request.servingGrams() : existing.getServingGrams(),
            request.calories() != null ? request.calories() : existing.getCalories(),
            request.protein() != null ? request.protein() : existing.getProtein(),
            request.carbs() != null ? request.carbs() : existing.getCarbs(),
            request.fat() != null ? request.fat() : existing.getFat(),
            request.memo() != null ? request.memo() : existing.getMemo()
        );
    }

    private EntryCalculation calculateEntry(DietEntryRequest request) {
        FoodItem foodItem = null;
        if (request.foodItemId() != null) {
            foodItem = foodItemRepository.findById(request.foodItemId())
                .orElseThrow(() -> new NoSuchElementException("음식 정보를 찾을 수 없습니다."));
        }

        LocalDateTime eatenAt = request.eatenAt() != null ? request.eatenAt() : LocalDateTime.now();
        MealType mealType = request.mealType() != null ? request.mealType() : inferMealType(eatenAt);
        String foodName = foodItem != null ? foodItem.getName() : trimToNull(request.foodName());

        if (foodName == null) {
            throw new IllegalArgumentException("음식 이름은 필수입니다.");
        }

        if (foodItem != null) {
            double multiplier = resolveMultiplier(request, foodItem);
            return new EntryCalculation(
                foodItem,
                foodName,
                mealType,
                eatenAt,
                roundTwo(multiplier),
                resolveServingGrams(request, foodItem, multiplier),
                Math.toIntExact(Math.round(foodItem.getCalories() * multiplier)),
                roundOne(foodItem.getProtein() * multiplier),
                roundOne(foodItem.getCarbs() * multiplier),
                roundOne(foodItem.getFat() * multiplier)
            );
        }

        if (request.calories() == null) {
            throw new IllegalArgumentException("직접 입력 음식은 칼로리가 필요합니다.");
        }

        double multiplier = valueOr(request.servingMultiplier(), 1.0);
        requirePositive(multiplier, "섭취 배율은 0보다 커야 합니다.");

        return new EntryCalculation(
            null,
            foodName,
            mealType,
            eatenAt,
            roundTwo(multiplier),
            request.servingGrams() != null ? roundOne(request.servingGrams()) : null,
            Math.toIntExact(Math.round(request.calories() * multiplier)),
            roundOne(valueOr(request.protein(), 0.0) * multiplier),
            roundOne(valueOr(request.carbs(), 0.0) * multiplier),
            roundOne(valueOr(request.fat(), 0.0) * multiplier)
        );
    }

    private double resolveMultiplier(DietEntryRequest request, FoodItem foodItem) {
        if (request.servingGrams() != null) {
            requirePositive(request.servingGrams(), "섭취량은 0보다 커야 합니다.");
            return request.servingGrams() / foodItem.getServingSizeGram();
        }

        double multiplier = valueOr(request.servingMultiplier(), 1.0);
        requirePositive(multiplier, "섭취 배율은 0보다 커야 합니다.");
        return multiplier;
    }

    private Double resolveServingGrams(DietEntryRequest request, FoodItem foodItem, double multiplier) {
        if (request.servingGrams() != null) {
            return roundOne(request.servingGrams());
        }
        return roundOne(foodItem.getServingSizeGram() * multiplier);
    }

    private List<DietMealSummaryResponse> mealSummaries(List<DietEntryResponse> entries) {
        Map<MealType, List<DietEntryResponse>> byMeal = new EnumMap<>(MealType.class);
        for (MealType mealType : MealType.values()) {
            byMeal.put(mealType, new ArrayList<>());
        }
        for (DietEntryResponse entry : entries) {
            byMeal.get(entry.mealType()).add(entry);
        }

        List<DietMealSummaryResponse> meals = new ArrayList<>();
        for (MealType mealType : MealType.values()) {
            List<DietEntryResponse> mealEntries = List.copyOf(byMeal.get(mealType));
            meals.add(new DietMealSummaryResponse(
                mealType,
                mealType.getLabel(),
                totals(mealEntries),
                mealEntries
            ));
        }
        return meals;
    }

    private List<DietRecommendationResponse> recommendations(
        Long userId,
        List<DietEntryResponse> entries,
        NutritionTotalsResponse totals,
        DietGoalResponse goal
    ) {
        List<DietRecommendationResponse> recommendations = new ArrayList<>();

        if (entries.isEmpty()) {
            recommendations.add(new DietRecommendationResponse(
                "first-log",
                "오늘 첫 식사를 기록해보세요",
                "식단 기록이 없으면 추천 정확도가 크게 떨어집니다. 첫 끼부터 남기면 하루 섭취량을 바로 계산할 수 있습니다.",
                "식사 추가",
                10,
                null
            ));
        }

        if (totals.calories() < goal.dailyCalories() * 0.55) {
            recommendations.add(new DietRecommendationResponse(
                "calorie-gap",
                "칼로리가 목표보다 낮습니다",
                "현재 섭취량이 목표의 절반 수준입니다. 운동이 있는 날이면 탄수화물과 단백질을 함께 보충하세요.",
                "균형식 추가",
                20,
                "현미밥"
            ));
        }

        if (totals.protein() < goal.protein() * 0.65) {
            recommendations.add(new DietRecommendationResponse(
                "protein-gap",
                "단백질 보충이 필요합니다",
                "오늘 단백질 섭취가 목표보다 부족합니다. 닭가슴살, 두부, 그릭요거트처럼 계산이 쉬운 음식을 추천합니다.",
                "단백질 추가",
                15,
                "닭가슴살"
            ));
        }

        if (totals.calories() > goal.dailyCalories() * 1.15) {
            recommendations.add(new DietRecommendationResponse(
                "calorie-over",
                "칼로리가 목표를 넘었습니다",
                "오늘은 추가 간식을 줄이고, 내일은 채소와 단백질 비중을 높이면 흐름을 회복하기 좋습니다.",
                "내일 계획",
                12,
                "샐러드"
            ));
        }

        Set<MealType> loggedMeals = new HashSet<>(entries.stream().map(DietEntryResponse::mealType).toList());
        if (!loggedMeals.contains(MealType.BREAKFAST)) {
            recommendations.add(missingMeal("breakfast-missing", MealType.BREAKFAST, "오트밀"));
        }
        if (!loggedMeals.contains(MealType.LUNCH)) {
            recommendations.add(missingMeal("lunch-missing", MealType.LUNCH, "닭가슴살"));
        }
        if (!loggedMeals.contains(MealType.DINNER)) {
            recommendations.add(missingMeal("dinner-missing", MealType.DINNER, "연어구이"));
        }

        Set<String> todayFoods = new HashSet<>(entries.stream().map(DietEntryResponse::foodName).toList());
        dietEntryRepository
            .findFrequentFoodNames(userId, LocalDateTime.now().minusDays(RECENT_RECOMMENDATION_DAYS))
            .stream()
            .map(row -> String.valueOf(row[0]))
            .filter(foodName -> !todayFoods.contains(foodName))
            .findFirst()
            .ifPresent(foodName -> recommendations.add(new DietRecommendationResponse(
                "recent-food",
                "최근 기록 기반 추천",
                "최근 자주 기록한 음식입니다. 실제로 먹었다면 빠르게 추가해서 누락을 줄일 수 있습니다.",
                "빠른 추가",
                30,
                foodName
            )));

        return recommendations.stream()
            .sorted(Comparator.comparing(DietRecommendationResponse::priority))
            .limit(4)
            .toList();
    }

    private DietRecommendationResponse missingMeal(String type, MealType mealType, String foodName) {
        return new DietRecommendationResponse(
            type,
            mealType.getLabel() + " 기록이 비어 있습니다",
            "빠진 끼니가 있으면 하루 총량과 추천이 흔들립니다. 먹었다면 기록하고, 아직이면 가볍게라도 채우세요.",
            mealType.getLabel() + " 추가",
            35,
            foodName
        );
    }

    private NutritionTotalsResponse totals(List<DietEntryResponse> entries) {
        int calories = entries.stream().mapToInt(DietEntryResponse::calories).sum();
        double protein = entries.stream().mapToDouble(DietEntryResponse::protein).sum();
        double carbs = entries.stream().mapToDouble(DietEntryResponse::carbs).sum();
        double fat = entries.stream().mapToDouble(DietEntryResponse::fat).sum();
        return new NutritionTotalsResponse(calories, roundOne(protein), roundOne(carbs), roundOne(fat));
    }

    private NutritionTargetsResponse targets(DietGoalResponse goal, NutritionTotalsResponse totals) {
        return new NutritionTargetsResponse(
            goal.dailyCalories(),
            goal.protein(),
            goal.carbs(),
            goal.fat(),
            percent(totals.calories(), goal.dailyCalories()),
            percent(totals.protein(), goal.protein()),
            percent(totals.carbs(), goal.carbs()),
            percent(totals.fat(), goal.fat())
        );
    }

    private DietGoalResponse estimateGoal(User user) {
        double weightKg = parseDouble(user.getWeight(), 70.0);
        double heightCm = parseDouble(user.getHeight(), 170.0);
        double age = parseDouble(user.getAge(), 30.0);
        boolean female = "female".equalsIgnoreCase(user.getGender());

        double bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + (female ? -161 : 5);
        int calories = Math.toIntExact(Math.round((bmr * 1.35) / 50.0) * 50);

        if ("weight_loss".equalsIgnoreCase(user.getGoal())) {
            calories -= 300;
        } else if ("muscle_gain".equalsIgnoreCase(user.getGoal())) {
            calories += 250;
        }
        calories = Math.max(1400, calories);

        double protein = roundOne(weightKg * 1.6);
        double fat = roundOne((calories * 0.25) / 9.0);
        double carbs = roundOne((calories - protein * 4 - fat * 9) / 4.0);

        return new DietGoalResponse(null, calories, protein, carbs, fat, true);
    }

    private FoodItemResponse toFoodResponse(FoodItem foodItem) {
        return new FoodItemResponse(
            foodItem.getId(),
            foodItem.getName(),
            foodItem.getServingSizeGram(),
            foodItem.getCalories(),
            foodItem.getProtein(),
            foodItem.getCarbs(),
            foodItem.getFat(),
            foodItem.getCategory(),
            foodItem.getSource()
        );
    }

    private DietEntryResponse toEntryResponse(DietEntry entry) {
        return new DietEntryResponse(
            entry.getId(),
            entry.getFoodItem() != null ? entry.getFoodItem().getId() : null,
            entry.getFoodName(),
            entry.getMealType(),
            entry.getMealType().getLabel(),
            entry.getEatenAt(),
            entry.getServingMultiplier(),
            entry.getServingGrams(),
            entry.getCalories(),
            entry.getProtein(),
            entry.getCarbs(),
            entry.getFat(),
            entry.getMemo()
        );
    }

    private DietGoalResponse toGoalResponse(DietGoal goal, boolean estimated) {
        return new DietGoalResponse(
            goal.getId(),
            goal.getDailyCalories(),
            goal.getProtein(),
            goal.getCarbs(),
            goal.getFat(),
            estimated
        );
    }

    private User loadUser(Long userId) {
        return userRepository.findById(userId)
            .orElseThrow(() -> new NoSuchElementException("사용자를 찾을 수 없습니다."));
    }

    private FoodItem food(
        String name,
        Double servingSizeGram,
        Integer calories,
        Double protein,
        Double carbs,
        Double fat,
        String category
    ) {
        FoodItem food = new FoodItem();
        food.setName(name);
        food.setServingSizeGram(servingSizeGram);
        food.setCalories(calories);
        food.setProtein(protein);
        food.setCarbs(carbs);
        food.setFat(fat);
        food.setCategory(category);
        food.setSource("seed");
        return food;
    }

    private MealType inferMealType(LocalDateTime eatenAt) {
        int hour = eatenAt.getHour();
        if (hour < 10) {
            return MealType.BREAKFAST;
        }
        if (hour < 15) {
            return MealType.LUNCH;
        }
        if (hour < 21) {
            return MealType.DINNER;
        }
        return MealType.SNACK;
    }

    private static String firstText(String candidate, String fallback) {
        String trimmed = trimToNull(candidate);
        return trimmed != null ? trimmed : fallback;
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static double valueOr(Double value, double fallback) {
        return value == null ? fallback : value;
    }

    private static double parseDouble(String value, double fallback) {
        try {
            return value == null || value.isBlank() ? fallback : Double.parseDouble(value);
        } catch (NumberFormatException ex) {
            return fallback;
        }
    }

    private static void requirePositive(double value, String message) {
        if (value <= 0) {
            throw new IllegalArgumentException(message);
        }
    }

    private static int percent(Number current, Number target) {
        double targetValue = target.doubleValue();
        if (targetValue <= 0) {
            return 0;
        }
        return Math.toIntExact(Math.round((current.doubleValue() / targetValue) * 100));
    }

    private static double roundOne(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private static double roundTwo(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private record EntryCalculation(
        FoodItem foodItem,
        String foodName,
        MealType mealType,
        LocalDateTime eatenAt,
        Double servingMultiplier,
        Double servingGrams,
        Integer calories,
        Double protein,
        Double carbs,
        Double fat
    ) {
    }
}
