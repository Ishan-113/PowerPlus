-- =========================================================
-- Additional cumulative (kWh) tags confirmed from a REAL
-- CrystalEView Daily Report export from the client system.
-- These are daily energy totals per furnace/aux/transformer —
-- distinct from the instant kW readings already seeded.
-- Run this after 01_schema.sql + 02_seed_tags.sql.
-- =========================================================
USE powerplus;

INSERT IGNORE INTO tag_master (tag_name, equipment_group, unit, tag_type, display_order) VALUES
('40MW TG-5 kWh', 'Cumulative (24 Hours)', 'kWh', 'cumulative', 409),

('SMS-1 Fur-1 kWh', 'Cumulative (24 Hours)', 'kWh', 'cumulative', 410),
('SMS-1 Fur-2 kWh', 'Cumulative (24 Hours)', 'kWh', 'cumulative', 411),
('SMS-1 Fur-3 kWh', 'Cumulative (24 Hours)', 'kWh', 'cumulative', 412),
('SMS-1 Fur-4 kWh', 'Cumulative (24 Hours)', 'kWh', 'cumulative', 413),
('SMS-1 Fur-5 kWh', 'Cumulative (24 Hours)', 'kWh', 'cumulative', 414),
('SMS-1 Aux-1 kWh', 'Cumulative (24 Hours)', 'kWh', 'cumulative', 415),
('SMS-1 Aux-2 kWh', 'Cumulative (24 Hours)', 'kWh', 'cumulative', 416),
('SMS-1 Sint kWh', 'Cumulative (24 Hours)', 'kWh', 'cumulative', 417),

('SMS-2 Fur-1 kWh', 'Cumulative (24 Hours)', 'kWh', 'cumulative', 420),
('SMS-2 Fur-2 kWh', 'Cumulative (24 Hours)', 'kWh', 'cumulative', 421),
('SMS-2 Fur-3 kWh', 'Cumulative (24 Hours)', 'kWh', 'cumulative', 422),
('SMS-2 Fur-4 kWh', 'Cumulative (24 Hours)', 'kWh', 'cumulative', 423),
('SMS-2 Fur-5 kWh', 'Cumulative (24 Hours)', 'kWh', 'cumulative', 424),
('SMS-2 Fur-6 kWh', 'Cumulative (24 Hours)', 'kWh', 'cumulative', 425),
('SMS-2 Fur-7 kWh', 'Cumulative (24 Hours)', 'kWh', 'cumulative', 426),
('SMS-2 Fur-8 kWh', 'Cumulative (24 Hours)', 'kWh', 'cumulative', 427),
('SMS-2 Fur-9 kWh', 'Cumulative (24 Hours)', 'kWh', 'cumulative', 428),
('SMS-2 Fur-10 kWh', 'Cumulative (24 Hours)', 'kWh', 'cumulative', 429),
('SMS-2 Fur-11 kWh', 'Cumulative (24 Hours)', 'kWh', 'cumulative', 430),
('SMS-2 Fur-12 kWh', 'Cumulative (24 Hours)', 'kWh', 'cumulative', 431),
('SMS-2 Aux-1 kWh', 'Cumulative (24 Hours)', 'kWh', 'cumulative', 432),
('SMS-2 Aux-2 kWh', 'Cumulative (24 Hours)', 'kWh', 'cumulative', 433),

('SMS-4 Fur-1 kWh', 'Cumulative (24 Hours)', 'kWh', 'cumulative', 440),
('SMS-4 Fur-2 kWh', 'Cumulative (24 Hours)', 'kWh', 'cumulative', 441),
('SMS-4 Fur-3 kWh', 'Cumulative (24 Hours)', 'kWh', 'cumulative', 442),
('SMS-4 Fur-4 kWh', 'Cumulative (24 Hours)', 'kWh', 'cumulative', 443),
('SMS-4 Aux kWh', 'Cumulative (24 Hours)', 'kWh', 'cumulative', 444),
('SMS-4 Sint-1 kWh', 'Cumulative (24 Hours)', 'kWh', 'cumulative', 445),
('SMS-4 Sint-2 kWh', 'Cumulative (24 Hours)', 'kWh', 'cumulative', 446),
('SMS-4 TR2MVA kWh', 'Cumulative (24 Hours)', 'kWh', 'cumulative', 447),
('SMS-4 TR3.6MVA kWh', 'Cumulative (24 Hours)', 'kWh', 'cumulative', 448),
('SMS-4 TR5MVA kWh', 'Cumulative (24 Hours)', 'kWh', 'cumulative', 449),
('SMS-4 TR6MVA kWh', 'Cumulative (24 Hours)', 'kWh', 'cumulative', 450),

('SAF-1(2x9Mva) kWh', 'Cumulative (24 Hours)', 'kWh', 'cumulative', 460),
('SAF-2(2x9Mva) kWh', 'Cumulative (24 Hours)', 'kWh', 'cumulative', 461),
('SAF-3(2x4.5Mva) kWh', 'Cumulative (24 Hours)', 'kWh', 'cumulative', 462),
('RMD kWh', 'Cumulative (24 Hours)', 'kWh', 'cumulative', 463),
('SRM kWh', 'Cumulative (24 Hours)', 'kWh', 'cumulative', 464),
('WRM kWh', 'Cumulative (24 Hours)', 'kWh', 'cumulative', 465);
