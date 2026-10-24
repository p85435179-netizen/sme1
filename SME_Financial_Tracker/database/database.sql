CREATE DATABASE IF NOT EXISTS sme_financial_tracker
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE sme_financial_tracker;

CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(160) NOT NULL,
    username VARCHAR(160) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    active TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (id),
    UNIQUE KEY users_username_unique (username)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS transactions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    date DATE NOT NULL,
    name VARCHAR(400) NOT NULL,
    category VARCHAR(32) NOT NULL,
    type VARCHAR(16) NOT NULL,
    amount DECIMAL(11, 2) NOT NULL,
    status VARCHAR(32) NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (id),
    KEY transactions_user_id_index (user_id),
    KEY transactions_date_index (date),
    CONSTRAINT transactions_user_id_foreign
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS orders (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(160) NOT NULL,
    amount DECIMAL(11, 2) NOT NULL,
    date DATE NOT NULL,
    status VARCHAR(32) NOT NULL,
    supplier_id BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (id),
    KEY orders_supplier_id_index (supplier_id),
    CONSTRAINT orders_supplier_id_foreign
        FOREIGN KEY (supplier_id) REFERENCES users (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS invoices (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    ref VARCHAR(160) NOT NULL,
    order_id BIGINT UNSIGNED NOT NULL,
    amount DECIMAL(11, 2) NOT NULL,
    status VARCHAR(32) NOT NULL,
    supplier_id BIGINT UNSIGNED NOT NULL,
    paid_date DATE DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY invoices_order_id_unique (order_id),
    UNIQUE KEY invoices_supplier_ref_unique (supplier_id, ref),
    CONSTRAINT invoices_order_id_foreign
        FOREIGN KEY (order_id) REFERENCES orders (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT invoices_supplier_id_foreign
        FOREIGN KEY (supplier_id) REFERENCES users (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS settings (
    `key` VARCHAR(64) NOT NULL,
    `value` LONGTEXT NOT NULL,
    PRIMARY KEY (`key`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS attempts (
    ip VARCHAR(45) NOT NULL,
    count INT UNSIGNED NOT NULL,
    started BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (ip)
) ENGINE=InnoDB;
