package backend.fitmate.diet.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.Mockito.when;

import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.util.List;

import javax.imageio.ImageIO;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;
import org.springframework.mock.web.MockMultipartFile;

import backend.fitmate.diet.dto.DietDtos.FoodPhotoAnalysisResponse;
import backend.fitmate.diet.entity.FoodItem;
import backend.fitmate.diet.entity.MealType;
import backend.fitmate.diet.repository.FoodItemRepository;

@ExtendWith(MockitoExtension.class)
class FoodPhotoAnalysisServiceTests {

    @Mock
    private FoodItemRepository foodItemRepository;

    @InjectMocks
    private FoodPhotoAnalysisService foodPhotoAnalysisService;

    @Test
    void analyzesGreenPhotoAsVegetableAndEstimatesCalories() throws Exception {
        FoodItem salad = food(20L, "샐러드", 150.0, 80, 3.0, 12.0, 2.0, "vegetable");
        when(foodItemRepository.search(nullable(String.class), eq("vegetable"), any(Pageable.class)))
            .thenReturn(List.of(salad));

        FoodPhotoAnalysisResponse response = foodPhotoAnalysisService.analyze(
            image("salad.png", new Color(43, 170, 84)),
            MealType.DINNER,
            LocalDateTime.of(2026, 5, 9, 19, 0)
        );

        assertThat(response.analyzer()).isEqualTo("local-color-portion-v1");
        assertThat(response.candidates()).hasSize(1);
        assertThat(response.candidates().getFirst().foodName()).isEqualTo("샐러드");
        assertThat(response.candidates().getFirst().estimatedServingGrams()).isEqualTo(180.0);
        assertThat(response.candidates().getFirst().calories()).isEqualTo(96);
        assertThat(response.suggestedEntry().mealType()).isEqualTo(MealType.DINNER);
        assertThat(response.suggestedEntry().foodItemId()).isEqualTo(20L);
    }

    @Test
    void rejectsNonImageFiles() {
        MockMultipartFile file = new MockMultipartFile(
            "image",
            "note.txt",
            "text/plain",
            "not an image".getBytes()
        );

        assertThatThrownBy(() -> foodPhotoAnalysisService.analyze(file, null, null))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Only image");
    }

    private MockMultipartFile image(String name, Color color) throws Exception {
        BufferedImage image = new BufferedImage(32, 32, BufferedImage.TYPE_INT_RGB);
        for (int y = 0; y < image.getHeight(); y++) {
            for (int x = 0; x < image.getWidth(); x++) {
                image.setRGB(x, y, color.getRGB());
            }
        }

        ByteArrayOutputStream output = new ByteArrayOutputStream();
        ImageIO.write(image, "png", output);
        return new MockMultipartFile("image", name, "image/png", output.toByteArray());
    }

    private FoodItem food(
        Long id,
        String name,
        Double servingSizeGram,
        Integer calories,
        Double protein,
        Double carbs,
        Double fat,
        String category
    ) {
        FoodItem food = new FoodItem();
        food.setId(id);
        food.setName(name);
        food.setServingSizeGram(servingSizeGram);
        food.setCalories(calories);
        food.setProtein(protein);
        food.setCarbs(carbs);
        food.setFat(fat);
        food.setCategory(category);
        food.setSource("test");
        return food;
    }
}
