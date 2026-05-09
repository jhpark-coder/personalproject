package backend.fitmate.diet.service;

import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.NoSuchElementException;
import java.util.UUID;

import javax.imageio.ImageIO;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import backend.fitmate.diet.dto.DietDtos.DietEntryRequest;
import backend.fitmate.diet.dto.DietDtos.FoodPhotoAnalysisResponse;
import backend.fitmate.diet.dto.DietDtos.FoodPhotoCandidateResponse;
import backend.fitmate.diet.dto.DietDtos.NutritionTotalsResponse;
import backend.fitmate.diet.entity.FoodItem;
import backend.fitmate.diet.entity.MealType;
import backend.fitmate.diet.repository.FoodItemRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FoodPhotoAnalysisService {

    private static final long MAX_IMAGE_BYTES = 8L * 1024L * 1024L;

    private final FoodItemRepository foodItemRepository;

    public FoodPhotoAnalysisResponse analyze(MultipartFile image, MealType mealType, LocalDateTime eatenAt) {
        validateImage(image);
        BufferedImage bufferedImage = readImage(image);
        ImageFeatures features = extractFeatures(bufferedImage);
        FoodProfile profile = chooseFoodProfile(features);
        FoodItem foodItem = matchFood(profile);

        FoodPhotoCandidateResponse candidate = toCandidate(profile, foodItem);
        NutritionTotalsResponse totals = new NutritionTotalsResponse(
            candidate.calories(),
            candidate.protein(),
            candidate.carbs(),
            candidate.fat()
        );
        DietEntryRequest suggestedEntry = new DietEntryRequest(
            candidate.foodItemId(),
            candidate.foodName(),
            mealType != null ? mealType : inferMealType(eatenAt != null ? eatenAt : LocalDateTime.now()),
            eatenAt != null ? eatenAt : LocalDateTime.now(),
            null,
            candidate.estimatedServingGrams(),
            candidate.foodItemId() == null ? candidate.calories() : null,
            candidate.foodItemId() == null ? candidate.protein() : null,
            candidate.foodItemId() == null ? candidate.carbs() : null,
            candidate.foodItemId() == null ? candidate.fat() : null,
            "photo-analysis"
        );

        return new FoodPhotoAnalysisResponse(
            UUID.randomUUID().toString(),
            "local-color-portion-v1",
            bufferedImage.getWidth(),
            bufferedImage.getHeight(),
            candidate.confidence(),
            totals,
            List.of(candidate),
            suggestedEntry
        );
    }

    private void validateImage(MultipartFile image) {
        if (image == null || image.isEmpty()) {
            throw new IllegalArgumentException("Image file is required.");
        }
        if (image.getSize() > MAX_IMAGE_BYTES) {
            throw new IllegalArgumentException("Image file is too large.");
        }
        String contentType = image.getContentType();
        if (contentType != null && !contentType.toLowerCase(Locale.ROOT).startsWith("image/")) {
            throw new IllegalArgumentException("Only image files can be analyzed.");
        }
    }

    private BufferedImage readImage(MultipartFile image) {
        try {
            BufferedImage bufferedImage = ImageIO.read(image.getInputStream());
            if (bufferedImage == null) {
                throw new IllegalArgumentException("Image format is not supported.");
            }
            return bufferedImage;
        } catch (IOException ex) {
            throw new IllegalArgumentException("Image file could not be read.", ex);
        }
    }

    private ImageFeatures extractFeatures(BufferedImage image) {
        int width = image.getWidth();
        int height = image.getHeight();
        int stepX = Math.max(1, width / 120);
        int stepY = Math.max(1, height / 120);

        long total = 0;
        long red = 0;
        long green = 0;
        long white = 0;
        long brown = 0;
        long yellow = 0;
        long orange = 0;
        double redSum = 0;
        double greenSum = 0;
        double blueSum = 0;

        for (int y = 0; y < height; y += stepY) {
            for (int x = 0; x < width; x += stepX) {
                Color color = new Color(image.getRGB(x, y), true);
                if (color.getAlpha() < 32) {
                    continue;
                }

                int r = color.getRed();
                int g = color.getGreen();
                int b = color.getBlue();
                total++;
                redSum += r;
                greenSum += g;
                blueSum += b;

                if (r > 215 && g > 210 && b > 200) {
                    white++;
                }
                if (g > 95 && g > r * 1.12 && g > b * 1.08) {
                    green++;
                }
                if (r > 145 && g < 120 && b < 120 && r > g * 1.2) {
                    red++;
                }
                if (r > 95 && g > 45 && g < 165 && b < 125 && r > g * 1.05) {
                    brown++;
                }
                if (r > 180 && g > 145 && b < 125) {
                    yellow++;
                }
                if (r > 175 && g > 80 && g < 180 && b < 145) {
                    orange++;
                }
            }
        }

        if (total == 0) {
            throw new IllegalArgumentException("Image does not contain readable pixels.");
        }

        return new ImageFeatures(
            ratio(white, total),
            ratio(green, total),
            ratio(red, total),
            ratio(brown, total),
            ratio(yellow, total),
            ratio(orange, total),
            redSum / total,
            greenSum / total,
            blueSum / total
        );
    }

    private FoodProfile chooseFoodProfile(ImageFeatures features) {
        if (features.greenRatio() > 0.18) {
            return new FoodProfile("샐러드", "vegetable", 180.0, 0.78, "green vegetable-like area detected");
        }
        if (features.redRatio() > 0.14) {
            return new FoodProfile("김치", "side", 80.0, 0.72, "red fermented-side-dish color detected");
        }
        if (features.whiteRatio() > 0.38 && features.averageBlue() > 190) {
            return new FoodProfile("그릭요거트", "dairy", 170.0, 0.68, "bright dairy-like area detected");
        }
        if (features.whiteRatio() > 0.28) {
            return new FoodProfile("현미밥", "grain", 210.0, 0.67, "rice-like bright grain area detected");
        }
        if (features.orangeRatio() > 0.16) {
            return new FoodProfile("연어구이", "protein", 130.0, 0.66, "orange protein color detected");
        }
        if (features.yellowRatio() > 0.16) {
            return new FoodProfile("삶은 달걀", "protein", 100.0, 0.61, "yellow egg-like color detected");
        }
        if (features.brownRatio() > 0.18) {
            return new FoodProfile("닭가슴살", "protein", 140.0, 0.58, "brown cooked-protein color detected");
        }
        return new FoodProfile("닭가슴살", "protein", 120.0, 0.42, "fallback protein estimate");
    }

    private FoodItem matchFood(FoodProfile profile) {
        List<FoodItem> foods = foodItemRepository.search(null, profile.category(), PageRequest.of(0, 20));
        if (foods.isEmpty()) {
            foods = foodItemRepository.search(profile.name(), null, PageRequest.of(0, 20));
        }
        if (foods.isEmpty()) {
            throw new NoSuchElementException("No food catalog items are available for photo analysis.");
        }

        List<FoodItem> matchedFoods = foods;

        return matchedFoods.stream()
            .filter(food -> food.getName() != null && food.getName().contains(profile.name()))
            .findFirst()
            .orElseGet(() -> matchedFoods.stream()
                .min(Comparator.comparing(FoodItem::getName, Comparator.nullsLast(String::compareTo)))
                .orElseThrow());
    }

    private FoodPhotoCandidateResponse toCandidate(FoodProfile profile, FoodItem foodItem) {
        double multiplier = profile.servingGrams() / foodItem.getServingSizeGram();
        return new FoodPhotoCandidateResponse(
            foodItem.getId(),
            foodItem.getName(),
            roundTwo(profile.confidence()),
            roundOne(profile.servingGrams()),
            Math.toIntExact(Math.round(foodItem.getCalories() * multiplier)),
            roundOne(foodItem.getProtein() * multiplier),
            roundOne(foodItem.getCarbs() * multiplier),
            roundOne(foodItem.getFat() * multiplier),
            profile.reason()
        );
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

    private static double ratio(long value, long total) {
        return total == 0 ? 0.0 : (double) value / total;
    }

    private static double roundOne(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private static double roundTwo(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private record FoodProfile(
        String name,
        String category,
        Double servingGrams,
        Double confidence,
        String reason
    ) {
    }

    private record ImageFeatures(
        double whiteRatio,
        double greenRatio,
        double redRatio,
        double brownRatio,
        double yellowRatio,
        double orangeRatio,
        double averageRed,
        double averageGreen,
        double averageBlue
    ) {
    }
}
