-- =========================================================
-- PowerPlus-style Energy Monitoring System — Core Schema
-- Target: MySQL 8.0+
-- =========================================================

CREATE DATABASE IF NOT EXISTS powerplus
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE powerplus;

-- ---------------------------------------------------------
-- 1. TAG MASTER
-- Defines every parameter shown in the app: its name, which
-- section/group it belongs to, its unit, and how it should
-- be treated (instantaneous reading vs. cumulative meter).
-- ---------------------------------------------------------
CREATE TABLE tag_master (
    tag_id          INT PRIMARY KEY AUTO_INCREMENT,
    tag_name        VARCHAR(100) NOT NULL UNIQUE,   -- e.g. 'SMS-4 Fur-1 kW'
    equipment_group VARCHAR(100) NOT NULL,          -- e.g. 'SMS-4 Furnace Parameters'
    unit            VARCHAR(20)  NOT NULL,          -- kW, kWh, kVAh, %, etc.
    tag_type        ENUM('instant','cumulative') NOT NULL,
    display_order   INT DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------
-- 2. LIVE VALUES
-- One row per tag — always UPSERTed with the latest reading.
-- Powers the "Data Monitor" screen.
-- ---------------------------------------------------------
CREATE TABLE live_values (
    tag_id       INT PRIMARY KEY,
    value        DECIMAL(14,3),
    last_updated DATETIME,
    FOREIGN KEY (tag_id) REFERENCES tag_master(tag_id) ON DELETE CASCADE
);

-- ---------------------------------------------------------
-- 3. TAG HISTORY (time-series historian)
-- Every reading logged at fixed intervals (target: 15 min).
-- Powers "Trends" and the "15 Minutes" Report tab.
-- This is the largest table — indexed for range scans.
-- ---------------------------------------------------------
CREATE TABLE tag_history (
    id      BIGINT PRIMARY KEY AUTO_INCREMENT,
    tag_id  INT NOT NULL,
    ts      DATETIME NOT NULL,
    value   DECIMAL(14,3),
    FOREIGN KEY (tag_id) REFERENCES tag_master(tag_id) ON DELETE CASCADE,
    INDEX idx_tag_ts (tag_id, ts)
);

-- ---------------------------------------------------------
-- 4. DAILY ROLLUP
-- Pre-aggregated per tag per day. Powers "Consumption" and
-- the "Daily" Report tab without scanning raw history.
-- ---------------------------------------------------------
CREATE TABLE tag_rollup_daily (
    tag_id       INT NOT NULL,
    rollup_date  DATE NOT NULL,
    value        DECIMAL(14,3),   -- cumulative tags: end-of-day meter reading / day's delta
    min_value    DECIMAL(14,3),
    max_value    DECIMAL(14,3),
    avg_value    DECIMAL(14,3),
    PRIMARY KEY (tag_id, rollup_date),
    FOREIGN KEY (tag_id) REFERENCES tag_master(tag_id) ON DELETE CASCADE
);

-- ---------------------------------------------------------
-- 5. MONTHLY ROLLUP
-- Powers the "Monthly" Report tab.
-- ---------------------------------------------------------
CREATE TABLE tag_rollup_monthly (
    tag_id       INT NOT NULL,
    rollup_month DATE NOT NULL,   -- store as first-of-month, e.g. 2026-06-01
    value        DECIMAL(14,3),
    min_value    DECIMAL(14,3),
    max_value    DECIMAL(14,3),
    avg_value    DECIMAL(14,3),
    PRIMARY KEY (tag_id, rollup_month),
    FOREIGN KEY (tag_id) REFERENCES tag_master(tag_id) ON DELETE CASCADE
);
