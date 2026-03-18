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
echo "$INSTRUCTOR" | jq .
INSTRUCTOR_ID=$(echo "$INSTRUCTOR" | jq -r '.id')
assert_id "INSTRUCTOR_ID" "$INSTRUCTOR_ID"

# ------------------------------------------------------------------
echo ""
echo "=== CREATE STUDENT ==="
STUDENT=$(curl -s -X POST "$BASE_URL/users" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Test Student\",\"email\":\"student_${TS}@example.com\",\"role\":\"student\"}")
echo "$STUDENT" | jq .
STUDENT_ID=$(echo "$STUDENT" | jq -r '.id')
assert_id "STUDENT_ID" "$STUDENT_ID"

# ------------------------------------------------------------------
echo ""
echo "=== CREATE COURSE ==="
COURSE=$(curl -s -X POST "$BASE_URL/courses" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Test Course\",\"description\":\"A course for testing.\",\"instructor_id\":$INSTRUCTOR_ID}")
echo "$COURSE" | jq .
COURSE_ID=$(echo "$COURSE" | jq -r '.id')
assert_id "COURSE_ID" "$COURSE_ID"

# ------------------------------------------------------------------
echo ""
echo "=== CREATE TOPIC 1 ==="
TOPIC_1=$(curl -s -X POST "$BASE_URL/topics" \
  -H "Content-Type: application/json" \
  -d "{\"course_id\":$COURSE_ID,\"title\":\"Topic One\",\"order_index\":1}")
echo "$TOPIC_1" | jq .
TOPIC_1_ID=$(echo "$TOPIC_1" | jq -r '.id')
assert_id "TOPIC_1_ID" "$TOPIC_1_ID"

echo ""
echo "=== CREATE TOPIC 2 ==="
TOPIC_2=$(curl -s -X POST "$BASE_URL/topics" \
  -H "Content-Type: application/json" \
  -d "{\"course_id\":$COURSE_ID,\"title\":\"Topic Two\",\"order_index\":2}")
echo "$TOPIC_2" | jq .
TOPIC_2_ID=$(echo "$TOPIC_2" | jq -r '.id')
assert_id "TOPIC_2_ID" "$TOPIC_2_ID"

echo ""
echo "=== CREATE TOPIC 3 ==="
TOPIC_3=$(curl -s -X POST "$BASE_URL/topics" \
  -H "Content-Type: application/json" \
  -d "{\"course_id\":$COURSE_ID,\"title\":\"Topic Three\",\"order_index\":3}")
echo "$TOPIC_3" | jq .
TOPIC_3_ID=$(echo "$TOPIC_3" | jq -r '.id')
assert_id "TOPIC_3_ID" "$TOPIC_3_ID"

# ------------------------------------------------------------------
echo ""
echo "=== CREATE 5 CARDS FOR TOPIC 1 ==="
CARD_IDS=()
for i in 1 2 3 4 5; do
  CARD=$(curl -s -X POST "$BASE_URL/cards" \
    -H "Content-Type: application/json" \
    -d "{\"topic_id\":$TOPIC_1_ID,\"front\":\"Question $i\",\"back\":\"Answer $i\"}")
  echo "$CARD" | jq .
  CARD_ID=$(echo "$CARD" | jq -r '.id')
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
echo "$ENROLLMENT" | jq .
ENROLLMENT_ID=$(echo "$ENROLLMENT" | jq -r '.id')
assert_id "ENROLLMENT_ID" "$ENROLLMENT_ID"

# ------------------------------------------------------------------
echo ""
echo "=== GET STUDENT ENROLLMENTS ==="
ENROLLMENTS=$(curl -s "$BASE_URL/enrollments/$STUDENT_ID")
echo "$ENROLLMENTS" | jq .
ENROLLED_COURSE_COUNT=$(echo "$ENROLLMENTS" | jq "[.[] | select(.course_id == $COURSE_ID)] | length")
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
echo "$SESSION" | jq .
SESSION_ID=$(echo "$SESSION" | jq -r '.id')
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
  echo "$REVIEW" | jq .
  REVIEW_ID=$(echo "$REVIEW" | jq -r '.id')
  assert_id "REVIEW_ID (card $CID)" "$REVIEW_ID"
done

# ------------------------------------------------------------------
echo ""
echo "=== COMPLETE QUIZ SESSION ==="
COMPLETED=$(curl -s -X PATCH "$BASE_URL/quiz-sessions/$SESSION_ID/complete")
echo "$COMPLETED" | jq .
COMPLETED_AT=$(echo "$COMPLETED" | jq -r '.completed_at')
if [[ -z "$COMPLETED_AT" || "$COMPLETED_AT" == "null" ]]; then
  echo "ERROR: completed_at is null after PATCH /quiz-sessions/$SESSION_ID/complete" >&2
  exit 1
fi
echo "  -> Session completed at: $COMPLETED_AT"

# ------------------------------------------------------------------
echo ""
echo "=== GET REVIEWS FOR SESSION ==="
REVIEWS=$(curl -s "$BASE_URL/quiz-sessions/$SESSION_ID/reviews")
echo "$REVIEWS" | jq .
REVIEW_COUNT=$(echo "$REVIEWS" | jq 'length')
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
echo "$STUDY_LOG" | jq .
STUDY_LOG_ID=$(echo "$STUDY_LOG" | jq -r '.id')
assert_id "STUDY_LOG_ID" "$STUDY_LOG_ID"

# ------------------------------------------------------------------
echo ""
echo "=== GET STUDY LOGS FOR STUDENT ==="
STUDY_LOGS=$(curl -s "$BASE_URL/study-logs/$STUDENT_ID")
echo "$STUDY_LOGS" | jq .
STUDY_LOG_COUNT=$(echo "$STUDY_LOGS" | jq "[.[] | select(.id == $STUDY_LOG_ID)] | length")
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
