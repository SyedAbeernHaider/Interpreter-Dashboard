-- =============================================================
-- Interpreter Dashboard — Remaining Views (vw_completed_sessions already exists)
-- =============================================================

-- 2. vw_missed_calls
CREATE VIEW vw_missed_calls AS
SELECT
    inr.missed_call_id   AS response_id,
    inr.monitoring_id,
    inr.interpreter_id,
    inr.customer_id,
    inr.missed_call_time,
    inr.user_name,
    c.name               AS customer_name,
    c.email              AS customer_email,
    c.company_id         AS customer_company_id,
    i.name               AS interpreter_name,
    i.email              AS interpreter_email
FROM interpreter_notification_responses inr
LEFT JOIN customers   c ON c.customer_id    = inr.customer_id
LEFT JOIN interpreter i ON i.interpreter_id = inr.interpreter_id;

-- 3. vw_sessions_with_details
CREATE VIEW vw_sessions_with_details AS
SELECT
    ms.monitoring_id,
    ms.customer_id,
    ms.interpreter_id,
    ms.status,
    ms.duration,
    ms.is_chat,
    ms.created_at,
    c.name        AS customer_name,
    c.email       AS customer_email,
    i.name        AS interpreter_name,
    (
        SELECT COUNT(*)
        FROM interpreter_notification_responses inr
        WHERE inr.monitoring_id = ms.monitoring_id
    )             AS notification_count
FROM monitoring_sessions ms
LEFT JOIN customers   c ON c.customer_id    = ms.customer_id
LEFT JOIN interpreter i ON i.interpreter_id = ms.interpreter_id;

-- 4. vw_interpreter_list
CREATE VIEW vw_interpreter_list AS
SELECT
    interpreter_id,
    name,
    email,
    online_status,
    on_call_status,
    created_at
FROM interpreter;

-- 5. vw_customer_list
CREATE VIEW vw_customer_list AS
SELECT
    customer_id,
    name,
    email,
    company_id,
    created_at
FROM customers;

-- 6. vw_company_list
CREATE VIEW vw_company_list AS
SELECT
    company_id,
    name,
    created_at
FROM companies;
