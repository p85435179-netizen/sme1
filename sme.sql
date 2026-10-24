-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Oct 24, 2026 at 05:47 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.35

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `sme`
--

-- --------------------------------------------------------

--
-- Table structure for table `activity_logs`
--

CREATE TABLE `activity_logs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `workspace_id` bigint(20) UNSIGNED DEFAULT NULL,
  `actor_name` varchar(160) NOT NULL,
  `action` varchar(160) NOT NULL,
  `details` varchar(1000) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `activity_logs`
--

INSERT INTO `activity_logs` (`id`, `user_id`, `workspace_id`, `actor_name`, `action`, `details`, `created_at`) VALUES
(1, 2, 1, 'System Administrator', 'Login', 'Signed in', '2026-10-24 03:23:11'),
(2, 2, 1, 'System Administrator', 'Login', 'Signed in', '2026-10-24 03:25:21'),
(3, 2, 1, 'System Administrator', 'Login', 'Signed in', '2026-10-24 03:28:56'),
(4, NULL, 2, 'Registration', 'Registration submitted', 'cjjj registered as Business Owner', '2026-10-24 03:30:30'),
(5, 3, 2, 'cjjj', 'Login', 'Signed in', '2026-10-24 03:30:47'),
(6, 4, NULL, 'Super Administrator', 'Login', 'Signed in', '2026-10-24 03:39:48'),
(7, 4, NULL, 'Super Administrator', 'Login', 'Signed in', '2026-10-24 03:42:16'),
(8, 4, NULL, 'Super Administrator', 'Login', 'Signed in', '2026-10-24 03:44:02'),
(9, 2, 1, 'System Administrator', 'Login', 'Signed in', '2026-10-24 03:44:03');

-- --------------------------------------------------------

--
-- Table structure for table `attempts`
--

CREATE TABLE `attempts` (
  `ip` varchar(160) NOT NULL,
  `count` int(11) NOT NULL,
  `started` bigint(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `billing_invoices`
--

CREATE TABLE `billing_invoices` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `workspace_id` bigint(20) UNSIGNED NOT NULL,
  `created_by` bigint(20) UNSIGNED NOT NULL,
  `invoice_number` varchar(100) NOT NULL,
  `customer` varchar(160) NOT NULL,
  `date` date NOT NULL,
  `due_date` date NOT NULL,
  `amount` decimal(11,2) NOT NULL,
  `paid_amount` decimal(11,2) NOT NULL DEFAULT 0.00,
  `status` varchar(160) NOT NULL DEFAULT 'Unpaid',
  `notes` varchar(1000) NOT NULL DEFAULT '',
  `version` int(11) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `invoice_payments`
--

CREATE TABLE `invoice_payments` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `invoice_id` bigint(20) UNSIGNED NOT NULL,
  `transaction_id` bigint(20) UNSIGNED NOT NULL,
  `amount` decimal(11,2) NOT NULL,
  `date` date NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `settings`
--

CREATE TABLE `settings` (
  `key` varchar(160) NOT NULL,
  `value` varchar(1000) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `settings`
--

INSERT INTO `settings` (`key`, `value`) VALUES
('finance_version', '1'),
('schema_version', '2'),
('workspace', '\"Sari-Sari Store ni Aling Tessa\"');

-- --------------------------------------------------------

--
-- Table structure for table `transactions`
--

CREATE TABLE `transactions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `date` date NOT NULL,
  `name` varchar(400) NOT NULL,
  `category` varchar(160) NOT NULL,
  `source` varchar(160) NOT NULL DEFAULT '',
  `type` varchar(160) NOT NULL,
  `amount` decimal(11,2) NOT NULL,
  `status` varchar(160) NOT NULL DEFAULT 'Pending',
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `workspace_id` bigint(20) UNSIGNED DEFAULT NULL,
  `version` int(11) NOT NULL DEFAULT 1,
  `reviewed_by` bigint(20) UNSIGNED DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `review_note` varchar(1000) NOT NULL DEFAULT '',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(400) NOT NULL,
  `username` varchar(160) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` varchar(160) NOT NULL,
  `active` int(11) NOT NULL DEFAULT 0,
  `session_version` int(11) NOT NULL DEFAULT 1,
  `workspace_id` bigint(20) UNSIGNED DEFAULT NULL,
  `approval_status` varchar(160) NOT NULL DEFAULT 'Pending',
  `approved_by` bigint(20) UNSIGNED DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `username`, `password`, `role`, `active`, `session_version`, `workspace_id`, `approval_status`, `approved_by`, `approved_at`, `created_at`) VALUES
(1, 'Contessa Vidad', 'contessa', '$2y$10$ZLKGUkPqlVkzt/.nBV732OdMQELgDjfQjDoqTwijG4DbervX74BQW', 'Business Owner', 1, 1, 1, 'Approved', NULL, NULL, '2026-10-24 02:52:27'),
(2, 'System Administrator', 'admin', '$2y$10$yQpxBSJZ6LbGEuEA56zKQelWd44QgiUy66B9tUn0XMZI4EuazkHpq', 'Business Owner', 1, 1, 1, 'Approved', NULL, NULL, '2026-10-24 03:25:03'),
(3, 'cjjj', 'cjjj', '$2y$10$ORf0YSvLAwezaOoFaQpNtu4NZCPiTDz06OaIOXJd9Bu/IpkHVWFvK', 'Business Owner', 1, 1, 2, 'Approved', NULL, NULL, '2026-10-24 03:30:30'),
(4, 'Super Administrator', 'superadmin', '$2y$10$VhnvCGpKc.uW8kOpdDj1HOwOMmJI/Hnw4FUFGqH.pXNe4PIw2id66', 'Super Admin', 1, 1, NULL, 'Approved', NULL, NULL, '2026-10-24 03:38:12');

-- --------------------------------------------------------

--
-- Table structure for table `workspaces`
--

CREATE TABLE `workspaces` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(400) NOT NULL,
  `opening_balance` decimal(11,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `workspaces`
--

INSERT INTO `workspaces` (`id`, `name`, `opening_balance`, `created_at`) VALUES
(1, 'Sari-Sari Store ni Aling Tessa', 0.00, '2026-10-24 02:52:27'),
(2, 'cjjj', 0.00, '2026-10-24 03:30:30');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `activity_logs`
--
ALTER TABLE `activity_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `workspace_id` (`workspace_id`);

--
-- Indexes for table `attempts`
--
ALTER TABLE `attempts`
  ADD PRIMARY KEY (`ip`);

--
-- Indexes for table `billing_invoices`
--
ALTER TABLE `billing_invoices`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `workspace_id` (`workspace_id`,`invoice_number`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `invoice_payments`
--
ALTER TABLE `invoice_payments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `transaction_id` (`transaction_id`),
  ADD KEY `invoice_id` (`invoice_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `settings`
--
ALTER TABLE `settings`
  ADD PRIMARY KEY (`key`);

--
-- Indexes for table `transactions`
--
ALTER TABLE `transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `workspace_id` (`workspace_id`),
  ADD KEY `reviewed_by` (`reviewed_by`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD KEY `workspace_id` (`workspace_id`),
  ADD KEY `approved_by` (`approved_by`);

--
-- Indexes for table `workspaces`
--
ALTER TABLE `workspaces`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `activity_logs`
--
ALTER TABLE `activity_logs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `billing_invoices`
--
ALTER TABLE `billing_invoices`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `invoice_payments`
--
ALTER TABLE `invoice_payments`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `transactions`
--
ALTER TABLE `transactions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `workspaces`
--
ALTER TABLE `workspaces`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `activity_logs`
--
ALTER TABLE `activity_logs`
  ADD CONSTRAINT `activity_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `activity_logs_ibfk_2` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`);

--
-- Constraints for table `billing_invoices`
--
ALTER TABLE `billing_invoices`
  ADD CONSTRAINT `billing_invoices_ibfk_1` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`),
  ADD CONSTRAINT `billing_invoices_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `invoice_payments`
--
ALTER TABLE `invoice_payments`
  ADD CONSTRAINT `invoice_payments_ibfk_1` FOREIGN KEY (`invoice_id`) REFERENCES `billing_invoices` (`id`),
  ADD CONSTRAINT `invoice_payments_ibfk_2` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`),
  ADD CONSTRAINT `invoice_payments_ibfk_3` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `transactions`
--
ALTER TABLE `transactions`
  ADD CONSTRAINT `transactions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `transactions_ibfk_2` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`),
  ADD CONSTRAINT `transactions_ibfk_3` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `users_ibfk_1` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`),
  ADD CONSTRAINT `users_ibfk_2` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
