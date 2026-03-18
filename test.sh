#!/usr/bin/env bash
set -uo pipefail

BASE_URL=http://localhost:3000
TS=$(date +%s)   # timestamp suffix — makes emails unique on every run

# Verify the server is reachable before running anything
if ! curl -s --max-time 3 "$BASE_URL/users" > /dev/null 2>&1; then
  echo "ERROR: Cannot reach $BASE_URL — is the server running? (npm start)" >&2
  exit 1
fi

# Helper: assert an ID variable is non-empty and numeric
assert_id() {
  local name="$1"
  local value="$2"
  if [[ -z "$value" || "$value" == "null" ]]; then
    echo "ERROR: $name is empty or null. Aborting." >&2
    exit 1
  fi
  echo "  -> $name = $value"
}

# Helper: extract a numeric field value from JSON by key name
extract_id() {
  echo "$1" | grep -oE "\"id\":[0-9]+" | grep -oE '[0-9]+'
}

echo ""
echo "=========================================="
echo "  LMS API Integration Test"
echo "=========================================="

# ------------------------------------------------------------------
echo ""
echo "=== CREATE INSTRUCTOR ==="
INSTRUCTOR=$(curl -s -X POST "$BASE_URL/users" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Test Instructor\",\"email\":\"instructor_${TS}@example.com\",\"role\":\"instructor\"}")
echo "$INSTRUCTOR"
INSTRUCTOR_ID=$(extract_id "$INSTRUCTOR")
assert_id "INSTRUCTOR_ID" "$INSTRUCTOR_ID"

# ------------------------------------------------------------------
echo ""
echo "=== CREATE STUDENT ==="
STUDENT=$(curl -s -X POST "$BASE_URL/users" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Test Student\",\"email\":\"student_${TS}@example.com\",\"role\":\"student\"}")
echo "$STUDENT"
STUDENT_ID=$(extract_id "$STUDENT")
assert_id "STUDENT_ID" "$STUDENT_ID"

# ------------------------------------------------------------------
echo ""
echo "=== CREATE COURSE ==="
COURSE=$(curl -s -X POST "$BASE_URL/courses" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Test Course\",\"description\":\"A course for testing.\",\"instructor_id\":$INSTRUCTOR_ID}")
echo "$COURSE"
COURSE_ID=$(extract_id "$COURSE")
assert_id "COURSE_ID" "$COURSE_ID"

# ------------------------------------------------------------------
echo ""
echo "=== CREATE TOPIC 1 ==="
TOPIC_1=$(curl -s -X POST "$BASE_URL/topics" \
  -H "Content-Type: application/json" \
  -d "{\"course_id\":$COURSE_ID,\"title\":\"Topic One\",\"order_index\":1}")
echo "$TOPIC_1"
TOPIC_1_ID=$(extract_id "$TOPIC_1")
assert_id "TOPIC_1_ID" "$TOPIC_1_ID"

echo ""
echo "=== CREATE TOPIC 2 ==="
TOPIC_2=$(curl -s -X POST "$BASE_URL/topics" \
  -H "Content-Type: application/json" \
  -d "{\"course_id\":$COURSE_ID,\"title\":\"Topic Two\",\"order_index\":2}")
echo "$TOPIC_2"
TOPIC_2_ID=$(extract_id "$TOPIC_2")
assert_id "TOPIC_2_ID" "$TOPIC_2_ID"

echo ""
echo "=== CREATE TOPIC 3 ==="
TOPIC_3=$(curl -s -X POST "$BASE_URL/topics" \
  -H "Content-Type: application/json" \
  -d "{\"course_id\":$COURSE_ID,\"title\":\"Topic Three\",\"order_index\":3}")
echo "$TOPIC_3"
TOPIC_3_ID=$(extract_id "$TOPIC_3")
assert_id "TOPIC_3_ID" "$TOPIC_3_ID"

# ------------------------------------------------------------------
echo ""
echo "=== CREATE 5 CARDS FOR TOPIC 1 ==="
CARD_IDS=()
for i in 1 2 3 4 5; do
  CARD=$(curl -s -X POST "$BASE_URL/cards" \
    -H "Content-Type: application/json" \
    -d "{\"topic_id\":$TOPIC_1_ID,\"front\":\"Question $i\",\"back\":\"Answer $i\"}")
  echo "$CARD"
  CARD_ID=$(extract_id "$CARD")
  assert_id "CARD_$i ID" "$CARD_ID"
  CARD_IDS+=("$CARD_ID")
done

CARD_1_ID="${CARD_IDS[0]}"
CARD_2_ID="${CARD_IDS[1]}"
CARD_3_ID="${CARD_IDS[2]}"
CARD_4_ID="${CARD_IDS[3]}"
CARD_5_ID="${CARD_IDS[4]}"

# ------------------------------------------------------------------
echo ""
echo "=== ENROLL STUDENT IN COURSE ==="
ENROLLMENT=$(curl -s -X POST "$BASE_URL/enrollments" \
  -H "Content-Type: application/json" \
  -d "{\"user_id\":$STUDENT_ID,\"course_id\":$COURSE_ID}")
echo "$ENROLLMENT"
ENROLLMENT_ID=$(extract_id "$ENROLLMENT")
assert_id "ENROLLMENT_ID" "$ENROLLMENT_ID"

# ------------------------------------------------------------------
echo ""
echo "=== GET STUDENT ENROLLMENTS ==="
ENROLLMENTS=$(curl -s "$BASE_URL/enrollments/$STUDENT_ID")
echo "$ENROLLMENTS"
ENROLLED_COURSE_COUNT=$(echo "$ENROLLMENTS" | grep -oE "\"course_id\":$COURSE_ID" | wc -l | tr -d ' ')
if [[ "$ENROLLED_COURSE_COUNT" -lt 1 ]]; then
  echo "ERROR: The enrolled course was not found in GET /enrollments/$STUDENT_ID" >&2
  exit 1
fi
echo "  -> Verified: course $COURSE_ID appears in student enrollments"

# ------------------------------------------------------------------
echo ""
echo "=== START QUIZ SESSION ==="
SESSION=$(curl -s -X POST "$BASE_URL/quiz-sessions" \
  -H "Content-Type: application/json" \
  -d "{\"user_id\":$STUDENT_ID,\"topic_id\":$TOPIC_1_ID}")
echo "$SESSION"
SESSION_ID=$(extract_id "$SESSION")
assert_id "SESSION_ID" "$SESSION_ID"

# ------------------------------------------------------------------
echo ""
echo "=== SUBMIT CARD REVIEWS ==="
# Submit reviews for all 5 cards — mix of correct and incorrect
declare -A WAS_CORRECT=( ["$CARD_1_ID"]=true ["$CARD_2_ID"]=false ["$CARD_3_ID"]=true ["$CARD_4_ID"]=true ["$CARD_5_ID"]=false )

for CID in "${CARD_IDS[@]}"; do
  CORRECT="${WAS_CORRECT[$CID]}"
  echo "  Reviewing card $CID (was_correct: $CORRECT)"
  REVIEW=$(curl -s -X POST "$BASE_URL/quiz-sessions/$SESSION_ID/reviews" \
    -H "Content-Type: application/json" \
    -d "{\"card_id\":$CID,\"user_id\":$STUDENT_ID,\"was_correct\":$CORRECT}")
  echo "$REVIEW"
  REVIEW_ID=$(extract_id "$REVIEW")
  assert_id "REVIEW_ID (card $CID)" "$REVIEW_ID"
done

# ------------------------------------------------------------------
echo ""
echo "=== COMPLETE QUIZ SESSION ==="
COMPLETED=$(curl -s -X PATCH "$BASE_URL/quiz-sessions/$SESSION_ID/complete")
echo "$COMPLETED"
COMPLETED_AT=$(echo "$COMPLETED" | grep -oE '"completed_at":"[^"]*"' | grep -oE '"[^"]*"$' | tr -d '"')
if [[ -z "$COMPLETED_AT" || "$COMPLETED_AT" == "null" ]]; then
  echo "ERROR: completed_at is null after PATCH /quiz-sessions/$SESSION_ID/complete" >&2
  exit 1
fi
echo "  -> Session completed at: $COMPLETED_AT"

# ------------------------------------------------------------------
echo ""
echo "=== GET REVIEWS FOR SESSION ==="
REVIEWS=$(curl -s "$BASE_URL/quiz-sessions/$SESSION_ID/reviews")
echo "$REVIEWS"
REVIEW_COUNT=$(echo "$REVIEWS" | grep -oE '"id":[0-9]+' | wc -l | tr -d ' ')
if [[ "$REVIEW_COUNT" -ne 5 ]]; then
  echo "ERROR: Expected 5 reviews for session $SESSION_ID, got $REVIEW_COUNT" >&2
  exit 1
fi
echo "  -> Verified: $REVIEW_COUNT reviews returned"

# ------------------------------------------------------------------
echo ""
echo "=== LOG STUDY SESSION ==="
STUDY_LOG=$(curl -s -X POST "$BASE_URL/study-logs" \
  -H "Content-Type: application/json" \
  -d "{\"user_id\":$STUDENT_ID,\"topic_id\":$TOPIC_1_ID,\"duration_minutes\":30}")
echo "$STUDY_LOG"
STUDY_LOG_ID=$(extract_id "$STUDY_LOG")
assert_id "STUDY_LOG_ID" "$STUDY_LOG_ID"

# ------------------------------------------------------------------
echo ""
echo "=== GET STUDY LOGS FOR STUDENT ==="
STUDY_LOGS=$(curl -s "$BASE_URL/study-logs/$STUDENT_ID")
echo "$STUDY_LOGS"
STUDY_LOG_COUNT=$(echo "$STUDY_LOGS" | grep -oE "\"id\":$STUDY_LOG_ID" | wc -l | tr -d ' ')
if [[ "$STUDY_LOG_COUNT" -lt 1 ]]; then
  echo "ERROR: The created study log was not found in GET /study-logs/$STUDENT_ID" >&2
  exit 1
fi
echo "  -> Verified: study log $STUDY_LOG_ID appears in student logs"

# ------------------------------------------------------------------
echo ""
echo "=========================================="
echo "  === ALL TESTS PASSED ==="
echo "=========================================="
echo ""
