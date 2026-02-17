-- CreateTable
CREATE TABLE "public"."prompt_writer_templates" (
    "id" UUID NOT NULL,
    "key" VARCHAR(64) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "template" TEXT NOT NULL,
    "default_variables" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prompt_writer_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "prompt_writer_templates_key_key" ON "public"."prompt_writer_templates"("key");

INSERT INTO "public"."prompt_writer_templates" ("id", "key", "name", "description", "template", "default_variables")
VALUES
  (gen_random_uuid(), 'daily_brief', 'Daily Brief', 'A concise daily briefing with explicit output structure.',
   'Write a daily brief about {{topic}} for {{audience}}.\n\nContext\n- Date: {{date}}\n- Time: {{time}} {{timezone}}\n\nOutput requirements\n- Exactly 5 bullets: each <= 2 sentences\n- Then a section: "Contrarian insight" (1 bullet)\n- Then a section: "Action items" (3 bullets)\n',
   '{"topic":"AI news","audience":"busy engineers"}'::jsonb),
  (gen_random_uuid(), 'summarizer', 'Summarizer', 'Summarize input text with a stable structure.',
   'Summarize the following text.\n\nConstraints\n- Provide a title (1 line)\n- Provide 5 bullets (each <= 1 sentence)\n- Provide "Key quote" (exact quote from the text)\n\nText\n{{text}}\n',
   '{"text":"<paste text here>"}'::jsonb),
  (gen_random_uuid(), 'json_extractor', 'JSON Extractor', 'Extract structured data into strict JSON only.',
   'Extract structured information from the input and return JSON only.\n\nSchema (JSON)\n{{schema_json}}\n\nRules\n- Output must be valid JSON\n- Do not include markdown fences\n- Use null for unknown fields\n\nInput\n{{input}}\n',
   '{"schema_json":"{\\n  \\\"field\\\": \\\"string\\\"\\n}","input":"<paste input here>"}'::jsonb);
