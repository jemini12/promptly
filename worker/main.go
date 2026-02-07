package main

import (
	"bytes"
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/robfig/cron/v3"
)

const lockQuery = `WITH candidate AS (
  SELECT id
  FROM jobs
  WHERE enabled = true
    AND next_run_at <= now()
    AND (locked_at IS NULL OR locked_at < now() - interval '10 minutes')
  ORDER BY next_run_at
  LIMIT 1
  FOR UPDATE SKIP LOCKED
)
UPDATE jobs
SET locked_at = now()
FROM candidate
WHERE jobs.id = candidate.id
RETURNING jobs.id, jobs.name, jobs.prompt, jobs.allow_web_search,
          jobs.schedule_type, jobs.schedule_time, jobs.schedule_day_of_week,
          jobs.schedule_cron, jobs.channel_type, jobs.channel_config, jobs.fail_count;`

type Job struct {
	ID                string
	Name              string
	Prompt            string
	AllowWebSearch    bool
	ScheduleType      string
	ScheduleTime      string
	ScheduleDayOfWeek sql.NullInt32
	ScheduleCron      sql.NullString
	ChannelType       string
	ChannelConfig     []byte
	FailCount         int
}

func main() {
	databaseURL := os.Getenv("DATABASE_URL")
	openAIKey := os.Getenv("OPENAI_API_KEY")
	if databaseURL == "" || openAIKey == "" {
		log.Fatal("DATABASE_URL and OPENAI_API_KEY are required")
	}

	db, err := sql.Open("pgx", databaseURL)
	if err != nil {
		log.Fatalf("open db: %v", err)
	}
	defer db.Close()

	for {
		if err := processOnce(db, openAIKey); err != nil {
			log.Printf("worker cycle error: %v", err)
		}
		time.Sleep(10 * time.Second)
	}
}

func processOnce(db *sql.DB, openAIKey string) error {
	ctx := context.Background()
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	job, found, err := lockNextJob(ctx, tx)
	if err != nil {
		return err
	}
	if !found {
		return tx.Commit()
	}

	output, runErr := runPrompt(ctx, openAIKey, job.Prompt, job.AllowWebSearch)
	if runErr == nil {
		runErr = deliver(job, output)
	}

	nextRun, calcErr := computeNextRun(job)
	if calcErr != nil {
		runErr = fmt.Errorf("schedule calc error: %w", calcErr)
		nextRun = time.Now().Add(10 * time.Minute)
	}

	if runErr == nil {
		if err := insertHistory(ctx, tx, job.ID, "success", truncate(output, 1000), ""); err != nil {
			return err
		}
		if err := updateSuccess(ctx, tx, job.ID, nextRun); err != nil {
			return err
		}
	} else {
		if err := insertHistory(ctx, tx, job.ID, "fail", "", truncate(runErr.Error(), 500)); err != nil {
			return err
		}
		if err := updateFailure(ctx, tx, job.ID, nextRun); err != nil {
			return err
		}
		log.Printf("job failed: %s: %v", job.ID, runErr)
	}

	return tx.Commit()
}

func lockNextJob(ctx context.Context, tx *sql.Tx) (Job, bool, error) {
	row := tx.QueryRowContext(ctx, lockQuery)
	var job Job
	err := row.Scan(
		&job.ID,
		&job.Name,
		&job.Prompt,
		&job.AllowWebSearch,
		&job.ScheduleType,
		&job.ScheduleTime,
		&job.ScheduleDayOfWeek,
		&job.ScheduleCron,
		&job.ChannelType,
		&job.ChannelConfig,
		&job.FailCount,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return Job{}, false, nil
	}
	if err != nil {
		return Job{}, false, err
	}
	return job, true, nil
}

func runPrompt(ctx context.Context, apiKey, prompt string, allowWebSearch bool) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, 60*time.Second)
	defer cancel()

	type tool struct {
		Type string `json:"type"`
	}
	payload := map[string]any{
		"model": "gpt-5-mini",
		"input": prompt,
	}
	if allowWebSearch {
		payload["tools"] = []tool{{Type: "web_search_preview"}}
	}

	body, _ := json.Marshal(payload)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.openai.com/v1/responses", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return "", fmt.Errorf("openai %d: %s", resp.StatusCode, string(respBody))
	}

	var parsed struct {
		OutputText string `json:"output_text"`
	}
	if err := json.Unmarshal(respBody, &parsed); err != nil {
		return "", err
	}
	if strings.TrimSpace(parsed.OutputText) == "" {
		return "", errors.New("empty llm output")
	}

	return parsed.OutputText, nil
}

func deliver(job Job, output string) error {
	head := fmt.Sprintf("[%s] %s", job.Name, time.Now().Format("2006-01-02 15:04"))
	message := head + "\n\n" + output

	if job.ChannelType == "discord" {
		var cfg struct {
			WebhookURL string `json:"webhookUrlEnc"`
		}
		if err := json.Unmarshal(job.ChannelConfig, &cfg); err != nil {
			return err
		}
		webhookURL, err := decryptString(cfg.WebhookURL)
		if err != nil {
			return err
		}
		for _, chunk := range chunk(message, 1900) {
			if err := postJSON(webhookURL, map[string]string{"content": chunk}); err != nil {
				return err
			}
		}
		return nil
	}

	var cfg struct {
		BotToken string `json:"botTokenEnc"`
		ChatID   string `json:"chatIdEnc"`
	}
	if err := json.Unmarshal(job.ChannelConfig, &cfg); err != nil {
		return err
	}
	botToken, err := decryptString(cfg.BotToken)
	if err != nil {
		return err
	}
	chatID, err := decryptString(cfg.ChatID)
	if err != nil {
		return err
	}
	url := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", botToken)
	for _, chunk := range chunk(message, 4000) {
		if err := postJSON(url, map[string]string{"chat_id": chatID, "text": chunk}); err != nil {
			return err
		}
	}
	return nil
}

func postJSON(url string, payload any) error {
	body, _ := json.Marshal(payload)
	resp, err := http.Post(url, "application/json", bytes.NewReader(body))
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		resBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("channel post failed %d: %s", resp.StatusCode, string(resBody))
	}
	return nil
}

func insertHistory(ctx context.Context, tx *sql.Tx, jobID, status, outputPreview, errorMessage string) error {
	_, err := tx.ExecContext(ctx,
		`INSERT INTO run_histories (id, job_id, run_at, status, output_preview, error_message)
		 VALUES ($1, $2, now(), $3, $4, $5)`,
		uuid.NewString(), jobID, status, nullIfEmpty(outputPreview), nullIfEmpty(errorMessage),
	)
	return err
}

func updateSuccess(ctx context.Context, tx *sql.Tx, jobID string, nextRun time.Time) error {
	_, err := tx.ExecContext(ctx,
		`UPDATE jobs
		 SET fail_count = 0, locked_at = NULL, next_run_at = $2, updated_at = now()
		 WHERE id = $1`,
		jobID, nextRun,
	)
	return err
}

func updateFailure(ctx context.Context, tx *sql.Tx, jobID string, nextRun time.Time) error {
	_, err := tx.ExecContext(ctx,
		`UPDATE jobs
		 SET fail_count = fail_count + 1,
		     locked_at = NULL,
		     next_run_at = $2,
		     enabled = CASE WHEN fail_count + 1 >= 10 THEN false ELSE enabled END,
		     updated_at = now()
		 WHERE id = $1`,
		jobID, nextRun,
	)
	return err
}

func computeNextRun(job Job) (time.Time, error) {
	now := time.Now()
	switch job.ScheduleType {
	case "daily":
		h, m, err := parseHHMM(job.ScheduleTime)
		if err != nil {
			return time.Time{}, err
		}
		next := time.Date(now.Year(), now.Month(), now.Day(), h, m, 0, 0, now.Location())
		if !next.After(now) {
			next = next.Add(24 * time.Hour)
		}
		return next, nil
	case "weekly":
		h, m, err := parseHHMM(job.ScheduleTime)
		if err != nil {
			return time.Time{}, err
		}
		if !job.ScheduleDayOfWeek.Valid {
			return time.Time{}, errors.New("missing weekly day_of_week")
		}
		target := int(job.ScheduleDayOfWeek.Int32)
		delta := (target - int(now.Weekday()) + 7) % 7
		next := time.Date(now.Year(), now.Month(), now.Day(), h, m, 0, 0, now.Location()).AddDate(0, 0, delta)
		if !next.After(now) {
			next = next.AddDate(0, 0, 7)
		}
		return next, nil
	case "cron":
		if !job.ScheduleCron.Valid {
			return time.Time{}, errors.New("missing cron expression")
		}
		sched, err := cron.ParseStandard(job.ScheduleCron.String)
		if err != nil {
			return time.Time{}, err
		}
		return sched.Next(now), nil
	default:
		return time.Time{}, fmt.Errorf("unknown schedule type %s", job.ScheduleType)
	}
}

func parseHHMM(raw string) (int, int, error) {
	parts := strings.Split(raw, ":")
	if len(parts) != 2 {
		return 0, 0, fmt.Errorf("invalid time %s", raw)
	}
	hour, err := strconv.Atoi(parts[0])
	if err != nil {
		return 0, 0, err
	}
	minute, err := strconv.Atoi(parts[1])
	if err != nil {
		return 0, 0, err
	}
	if hour < 0 || hour > 23 || minute < 0 || minute > 59 {
		return 0, 0, fmt.Errorf("invalid time %s", raw)
	}
	return hour, minute, nil
}

func decryptString(value string) (string, error) {
	parts := strings.Split(value, ":")
	if len(parts) != 3 {
		return "", errors.New("invalid encrypted payload")
	}
	iv, err := base64.StdEncoding.DecodeString(parts[0])
	if err != nil {
		return "", err
	}
	tag, err := base64.StdEncoding.DecodeString(parts[1])
	if err != nil {
		return "", err
	}
	ciphertext, err := base64.StdEncoding.DecodeString(parts[2])
	if err != nil {
		return "", err
	}

	key := deriveKey()
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	full := append(ciphertext, tag...)
	plaintext, err := gcm.Open(nil, iv, full, nil)
	if err != nil {
		return "", err
	}
	return string(plaintext), nil
}

func deriveKey() []byte {
	raw := os.Getenv("CHANNEL_SECRET_KEY")
	if raw == "" {
		raw = os.Getenv("NEXTAUTH_SECRET")
	}
	sum := sha256.Sum256([]byte(raw))
	return sum[:]
}

func chunk(value string, size int) []string {
	if len(value) <= size {
		return []string{value}
	}
	out := []string{}
	for len(value) > size {
		out = append(out, value[:size])
		value = value[size:]
	}
	if value != "" {
		out = append(out, value)
	}
	return out
}

func nullIfEmpty(value string) any {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	return value
}

func truncate(value string, max int) string {
	if len(value) <= max {
		return value
	}
	return value[:max]
}
