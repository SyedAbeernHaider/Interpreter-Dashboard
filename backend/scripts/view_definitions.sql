

--- vw_completed_sessions ---
CREATE ALGORITHM=UNDEFINED DEFINER=`connect7hear8org6_connect7hear8user`@`%` SQL SECURITY DEFINER VIEW `vw_completed_sessions` AS select `ms`.`monitoring_id` AS `monitoring_id`,`ms`.`customer_id` AS `customer_id`,`ms`.`interpreter_id` AS `interpreter_id`,`ms`.`status` AS `status`,`ms`.`duration` AS `duration`,`ms`.`is_chat` AS `is_chat`,`ms`.`created_at` AS `created_at`,`c`.`name` AS `customer_name`,`c`.`email` AS `customer_email`,`c`.`company_id` AS `customer_company_id`,`i`.`name` AS `interpreter_name`,`i`.`email` AS `interpreter_email` from ((`monitoring_sessions` `ms` left join `customers` `c` on(`c`.`customer_id` = `ms`.`customer_id`)) left join `interpreter` `i` on(`i`.`interpreter_id` = `ms`.`interpreter_id`))

--- vw_missed_calls ---
CREATE ALGORITHM=UNDEFINED DEFINER=`connect7hear8org6_connect7hear8user`@`%` SQL SECURITY DEFINER VIEW `vw_missed_calls` AS select `inr`.`missed_call_id` AS `response_id`,`inr`.`monitoring_id` AS `monitoring_id`,`inr`.`interpreter_id` AS `interpreter_id`,`inr`.`customer_id` AS `customer_id`,`inr`.`missed_call_time` AS `missed_call_time`,`inr`.`user_name` AS `user_name`,`c`.`name` AS `customer_name`,`c`.`email` AS `customer_email`,`c`.`company_id` AS `customer_company_id`,`i`.`name` AS `interpreter_name`,`i`.`email` AS `interpreter_email` from ((`interpreter_notification_responses` `inr` left join `customers` `c` on(`c`.`customer_id` = `inr`.`customer_id`)) left join `interpreter` `i` on(`i`.`interpreter_id` = `inr`.`interpreter_id`))

--- vw_sessions_with_details ---
CREATE ALGORITHM=UNDEFINED DEFINER=`connect7hear8org6_connect7hear8user`@`%` SQL SECURITY DEFINER VIEW `vw_sessions_with_details` AS select `ms`.`monitoring_id` AS `monitoring_id`,`ms`.`customer_id` AS `customer_id`,`ms`.`interpreter_id` AS `interpreter_id`,`ms`.`status` AS `status`,`ms`.`duration` AS `duration`,`ms`.`is_chat` AS `is_chat`,`ms`.`created_at` AS `created_at`,`c`.`name` AS `customer_name`,`c`.`email` AS `customer_email`,`i`.`name` AS `interpreter_name`,(select count(0) from `interpreter_notification_responses` `inr` where `inr`.`monitoring_id` = `ms`.`monitoring_id`) AS `notification_count` from ((`monitoring_sessions` `ms` left join `customers` `c` on(`c`.`customer_id` = `ms`.`customer_id`)) left join `interpreter` `i` on(`i`.`interpreter_id` = `ms`.`interpreter_id`))

--- vw_interpreter_list ---
CREATE ALGORITHM=UNDEFINED DEFINER=`connect7hear8org6_connect7hear8user`@`%` SQL SECURITY DEFINER VIEW `vw_interpreter_list` AS select `interpreter`.`interpreter_id` AS `interpreter_id`,`interpreter`.`name` AS `name`,`interpreter`.`email` AS `email`,`interpreter`.`online_status` AS `online_status`,`interpreter`.`on_call_status` AS `on_call_status`,`interpreter`.`created_at` AS `created_at` from `interpreter`

--- vw_customer_list ---
CREATE ALGORITHM=UNDEFINED DEFINER=`connect7hear8org6_connect7hear8user`@`%` SQL SECURITY DEFINER VIEW `vw_customer_list` AS select `customers`.`customer_id` AS `customer_id`,`customers`.`name` AS `name`,`customers`.`email` AS `email`,`customers`.`company_id` AS `company_id`,`customers`.`created_at` AS `created_at` from `customers`

--- vw_company_list ---
CREATE ALGORITHM=UNDEFINED DEFINER=`connect7hear8org6_connect7hear8user`@`%` SQL SECURITY DEFINER VIEW `vw_company_list` AS select `companies`.`company_id` AS `company_id`,`companies`.`name` AS `name`,`companies`.`created_at` AS `created_at` from `companies`