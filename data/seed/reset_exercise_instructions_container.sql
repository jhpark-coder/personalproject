-- 1) Temp table for raw CSV
DROP TABLE IF EXISTS exercise_instructions_tmp;
CREATE TABLE exercise_instructions_tmp (
  exercise_name        VARCHAR(255),
  met_value            VARCHAR(32),
  target_areas         TEXT,
  primary_muscles      TEXT,
  secondary_muscles    TEXT,
  description          TEXT,
  exercise_id          VARCHAR(64),
  instructions_ko      LONGTEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2) Load CSV from container path
LOAD DATA LOCAL INFILE '/seed/exercises_seed.csv'
INTO TABLE exercise_instructions_tmp
CHARACTER SET utf8mb4
FIELDS TERMINATED BY ',' ENCLOSED BY '"' ESCAPED BY '\\'
LINES TERMINATED BY '\n'
IGNORE 1 LINES
(exercise_name, met_value, target_areas, primary_muscles, secondary_muscles, description, exercise_id, instructions_ko);

-- 3) Recreate target table
DROP TABLE IF EXISTS exercise_instructions;
CREATE TABLE exercise_instructions (
  id BIGINT NOT NULL AUTO_INCREMENT,
  exerciseId VARCHAR(64) NOT NULL,
  nameKo VARCHAR(255),
  instructionsKoJson LONGTEXT,
  updatedAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_exercise_instructions_exerciseId (exerciseId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4) Transform and insert JSON array from pipe-separated instructions
INSERT INTO exercise_instructions (exerciseId, nameKo, instructionsKoJson)
SELECT
  t.exercise_id,
  t.exercise_name,
  CONCAT(
    '["',
    REPLACE(
      REPLACE(COALESCE(t.instructions_ko, ''), '"', '\\"'),
      '|', '","'
    ),
    '"]'
  ) AS instructionsKoJson
FROM exercise_instructions_tmp t
WHERE t.exercise_id IS NOT NULL AND t.exercise_id <> ''
  AND t.instructions_ko IS NOT NULL AND t.instructions_ko <> '';

-- 5) Cleanup temp
DROP TABLE IF EXISTS exercise_instructions_tmp;

-- 6) Verify
SELECT exerciseId, nameKo, JSON_LENGTH(instructionsKoJson) AS steps
FROM exercise_instructions
ORDER BY exerciseId
LIMIT 20; 