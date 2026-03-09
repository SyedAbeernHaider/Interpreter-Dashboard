-- ==========================================
-- 1. DROP EXISTING INDEXES
-- ==========================================
-- (If any of these fail because the index "doesn't exist", just ignore the error and keep going)

DROP INDEX `idx_ms_created_at` ON `monitoring_sessions`;
DROP INDEX `idx_ms_customer_id` ON `monitoring_sessions`;
DROP INDEX `idx_ms_interpreter_id` ON `monitoring_sessions`;
DROP INDEX `idx_ms_status` ON `monitoring_sessions`;

DROP INDEX `idx_inr_missed_call_time` ON `interpreter_notification_responses`;
DROP INDEX `idx_inr_customer_id` ON `interpreter_notification_responses`;
DROP INDEX `idx_inr_interpreter_id` ON `interpreter_notification_responses`;
DROP INDEX `idx_inr_monitoring_id` ON `interpreter_notification_responses`;

DROP INDEX `idx_customers_company_id` ON `customers`;
DROP INDEX `idx_customers_email` ON `customers`;
DROP INDEX `idx_interpreter_email` ON `interpreter`;

-- ==========================================
-- 2. CREATE NEW INDEXES
-- ==========================================

CREATE INDEX `idx_ms_created_at` ON `monitoring_sessions`(`created_at`);
CREATE INDEX `idx_ms_customer_id` ON `monitoring_sessions`(`customer_id`);
CREATE INDEX `idx_ms_interpreter_id` ON `monitoring_sessions`(`interpreter_id`);
CREATE INDEX `idx_ms_status` ON `monitoring_sessions`(`status`);

CREATE INDEX `idx_inr_missed_call_time` ON `interpreter_notification_responses`(`missed_call_time`);
CREATE INDEX `idx_inr_customer_id` ON `interpreter_notification_responses`(`customer_id`);
CREATE INDEX `idx_inr_interpreter_id` ON `interpreter_notification_responses`(`interpreter_id`);
CREATE INDEX `idx_inr_monitoring_id` ON `interpreter_notification_responses`(`monitoring_id`);

CREATE INDEX `idx_customers_company_id` ON `customers`(`company_id`);
CREATE INDEX `idx_customers_email` ON `customers`(`email`);
CREATE INDEX `idx_interpreter_email` ON `interpreter`(`email`);
