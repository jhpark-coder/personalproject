package backend.fitmate.diet.controller;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import backend.fitmate.diet.dto.DietDtos.DietDailySummaryResponse;
import backend.fitmate.diet.dto.DietDtos.DietEntryRequest;
import backend.fitmate.diet.dto.DietDtos.DietEntryResponse;
import backend.fitmate.diet.dto.DietDtos.DietGoalRequest;
import backend.fitmate.diet.dto.DietDtos.DietGoalResponse;
import backend.fitmate.diet.dto.DietDtos.FoodItemResponse;
import backend.fitmate.diet.dto.DietDtos.FoodPhotoAnalysisResponse;
import backend.fitmate.diet.entity.MealType;
import backend.fitmate.diet.service.DietService;
import backend.fitmate.diet.service.FoodPhotoAnalysisService;
import backend.fitmate.service.CurrentUserAccessService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/diet")
@RequiredArgsConstructor
@Validated
@CrossOrigin(origins = "${app.frontend.url}", allowCredentials = "true")
public class DietController {

    private final DietService dietService;
    private final FoodPhotoAnalysisService foodPhotoAnalysisService;
    private final CurrentUserAccessService currentUserAccessService;

    @GetMapping("/foods")
    public ResponseEntity<List<FoodItemResponse>> searchFoods(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String category) {
        return ResponseEntity.ok(dietService.searchFoods(query, category));
    }

    @PostMapping(value = "/users/{userId}/photo-analysis", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<FoodPhotoAnalysisResponse> analyzePhoto(
            @PathVariable Long userId,
            @RequestParam("image") MultipartFile image,
            @RequestParam(required = false) MealType mealType,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime eatenAt) {
        if (!currentUserAccessService.canAccessUser(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        try {
            return ResponseEntity.ok(foodPhotoAnalysisService.analyze(image, mealType, eatenAt));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.notFound().build();
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/users/{userId}/summary")
    public ResponseEntity<DietDailySummaryResponse> getDailySummary(
            @PathVariable Long userId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        if (!currentUserAccessService.canAccessUser(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        try {
            return ResponseEntity.ok(dietService.getDailySummary(userId, date));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/users/{userId}/entries")
    public ResponseEntity<DietEntryResponse> createEntry(
            @PathVariable Long userId,
            @Valid @RequestBody DietEntryRequest request) {
        if (!currentUserAccessService.canAccessUser(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(dietService.createEntry(userId, request));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.notFound().build();
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/users/{userId}/entries/{entryId}")
    public ResponseEntity<DietEntryResponse> updateEntry(
            @PathVariable Long userId,
            @PathVariable Long entryId,
            @Valid @RequestBody DietEntryRequest request) {
        if (!currentUserAccessService.canAccessUser(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        try {
            return ResponseEntity.ok(dietService.updateEntry(userId, entryId, request));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.notFound().build();
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().build();
        }
    }

    @DeleteMapping("/users/{userId}/entries/{entryId}")
    public ResponseEntity<Void> deleteEntry(
            @PathVariable Long userId,
            @PathVariable Long entryId) {
        if (!currentUserAccessService.canAccessUser(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        try {
            dietService.deleteEntry(userId, entryId);
            return ResponseEntity.noContent().build();
        } catch (NoSuchElementException ex) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/users/{userId}/goal")
    public ResponseEntity<DietGoalResponse> getGoal(@PathVariable Long userId) {
        if (!currentUserAccessService.canAccessUser(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        try {
            return ResponseEntity.ok(dietService.getGoal(userId));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.notFound().build();
        }
    }

    @PutMapping("/users/{userId}/goal")
    public ResponseEntity<DietGoalResponse> updateGoal(
            @PathVariable Long userId,
            @Valid @RequestBody DietGoalRequest request) {
        if (!currentUserAccessService.canAccessUser(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        try {
            return ResponseEntity.ok(dietService.updateGoal(userId, request));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.notFound().build();
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().build();
        }
    }
}
