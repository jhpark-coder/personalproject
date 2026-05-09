package backend.fitmate.diet.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import backend.fitmate.diet.entity.MealType;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;

public final class DietDtos {

    private DietDtos() {
    }

    public record FoodItemResponse(
        Long id,
        String name,
        Double servingSizeGram,
        Integer calories,
        Double protein,
        Double carbs,
        Double fat,
        String category,
        String source
    ) {
    }

    public record DietEntryRequest(
        Long foodItemId,
        String foodName,
        MealType mealType,
        LocalDateTime eatenAt,
        @Positive Double servingMultiplier,
        @Positive Double servingGrams,
        @PositiveOrZero Integer calories,
        @PositiveOrZero Double protein,
        @PositiveOrZero Double carbs,
        @PositiveOrZero Double fat,
        String memo
    ) {
    }

    public record DietEntryResponse(
        Long id,
        Long foodItemId,
        String foodName,
        MealType mealType,
        String mealLabel,
        LocalDateTime eatenAt,
        Double servingMultiplier,
        Double servingGrams,
        Integer calories,
        Double protein,
        Double carbs,
        Double fat,
        String memo
    ) {
    }

    public record DietGoalRequest(
        @Positive Integer dailyCalories,
        @Positive Double protein,
        @Positive Double carbs,
        @Positive Double fat
    ) {
    }

    public record DietGoalResponse(
        Long id,
        Integer dailyCalories,
        Double protein,
        Double carbs,
        Double fat,
        boolean estimated
    ) {
    }

    public record NutritionTotalsResponse(
        Integer calories,
        Double protein,
        Double carbs,
        Double fat
    ) {
    }

    public record NutritionTargetsResponse(
        Integer dailyCalories,
        Double protein,
        Double carbs,
        Double fat,
        Integer caloriePercent,
        Integer proteinPercent,
        Integer carbsPercent,
        Integer fatPercent
    ) {
    }

    public record DietMealSummaryResponse(
        MealType mealType,
        String label,
        NutritionTotalsResponse totals,
        List<DietEntryResponse> entries
    ) {
    }

    public record DietRecommendationResponse(
        String type,
        String title,
        String message,
        String actionLabel,
        Integer priority,
        String foodName
    ) {
    }

    public record FoodPhotoCandidateResponse(
        Long foodItemId,
        String foodName,
        Double confidence,
        Double estimatedServingGrams,
        Integer calories,
        Double protein,
        Double carbs,
        Double fat,
        String reason
    ) {
    }

    public record FoodPhotoAnalysisResponse(
        String analysisId,
        String analyzer,
        Integer imageWidth,
        Integer imageHeight,
        Double confidence,
        NutritionTotalsResponse totals,
        List<FoodPhotoCandidateResponse> candidates,
        DietEntryRequest suggestedEntry
    ) {
    }

    public record DietDailySummaryResponse(
        LocalDate date,
        NutritionTotalsResponse totals,
        NutritionTargetsResponse targets,
        List<DietMealSummaryResponse> meals,
        List<DietEntryResponse> entries,
        List<DietRecommendationResponse> recommendations
    ) {
    }
}
