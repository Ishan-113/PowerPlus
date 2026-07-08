-- =========================================================
-- Seed data for tag_master
-- Based on the parameter groups visible in the reference app:
-- SMS-2 Furnace, SMS-4 Furnace, Auxiliary, Distribution, Cumulative
-- Extend/rename freely to match your actual plant tag list.
-- =========================================================
USE powerplus;

-- ---- Distribution Parameters ----
INSERT INTO tag_master (tag_name, equipment_group, unit, tag_type, display_order) VALUES
('CB5214 kW', 'Distribution Parameters', 'kW', 'instant', 1),
('CB14 kW', 'Distribution Parameters', 'kW', 'instant', 2),
('CB52G4 kW', 'Distribution Parameters', 'kW', 'instant', 3),
('CB52G14 kW', 'Distribution Parameters', 'kW', 'instant', 4),
('CB52G24 kW', 'Distribution Parameters', 'kW', 'instant', 5),
('SMS Allocated Power', 'Distribution Parameters', 'kW', 'instant', 6),
('SMS Run. Power', 'Distribution Parameters', 'kW', 'instant', 7),
('SMS-1 Max Set', 'Distribution Parameters', 'kW', 'instant', 8),
('SMS-1 Min Set', 'Distribution Parameters', 'kW', 'instant', 9),
('SMS-2 Max Set', 'Distribution Parameters', 'kW', 'instant', 10),
('SMS-2 Min Set', 'Distribution Parameters', 'kW', 'instant', 11),
('SMS-4 Max Set', 'Distribution Parameters', 'kW', 'instant', 12),
('SMS-4 Min Set', 'Distribution Parameters', 'kW', 'instant', 13);

-- ---- SMS-2 Furnace Parameters (furnaces 1-12) ----
INSERT INTO tag_master (tag_name, equipment_group, unit, tag_type, display_order)
SELECT CONCAT('SMS-2 Fur-', n, ' SP'), 'SMS-2 Furnace Parameters', 'A', 'instant', 100 + n*4 - 3 FROM
  (SELECT 1 n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6
   UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION SELECT 11 UNION SELECT 12) t;

INSERT INTO tag_master (tag_name, equipment_group, unit, tag_type, display_order)
SELECT CONCAT('SMS-2 Fur-', n, ' kW'), 'SMS-2 Furnace Parameters', 'kW', 'instant', 100 + n*4 - 2 FROM
  (SELECT 1 n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6
   UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION SELECT 11 UNION SELECT 12) t;

INSERT INTO tag_master (tag_name, equipment_group, unit, tag_type, display_order)
SELECT CONCAT('SMS-2 Fur-', n, ' PP%'), 'SMS-2 Furnace Parameters', '%', 'instant', 100 + n*4 - 1 FROM
  (SELECT 1 n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6
   UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION SELECT 11 UNION SELECT 12) t;

INSERT INTO tag_master (tag_name, equipment_group, unit, tag_type, display_order)
SELECT CONCAT('SMS-2 Fur-', n, ' PR'), 'SMS-2 Furnace Parameters', 'count', 'instant', 100 + n*4 FROM
  (SELECT 1 n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6
   UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION SELECT 11 UNION SELECT 12) t;

-- ---- SMS-4 Furnace Parameters (furnaces 1-4) ----
INSERT INTO tag_master (tag_name, equipment_group, unit, tag_type, display_order)
SELECT CONCAT('SMS-4 Fur-', n, ' SP'), 'SMS-4 Furnace Parameters', 'A', 'instant', 200 + n*4 - 3 FROM
  (SELECT 1 n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4) t;

INSERT INTO tag_master (tag_name, equipment_group, unit, tag_type, display_order)
SELECT CONCAT('SMS-4 Fur-', n, ' kW'), 'SMS-4 Furnace Parameters', 'kW', 'instant', 200 + n*4 - 2 FROM
  (SELECT 1 n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4) t;

INSERT INTO tag_master (tag_name, equipment_group, unit, tag_type, display_order)
SELECT CONCAT('SMS-4 Fur-', n, ' PP%'), 'SMS-4 Furnace Parameters', '%', 'instant', 200 + n*4 - 1 FROM
  (SELECT 1 n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4) t;

INSERT INTO tag_master (tag_name, equipment_group, unit, tag_type, display_order)
SELECT CONCAT('SMS-4 Fur-', n, ' PR'), 'SMS-4 Furnace Parameters', 'count', 'instant', 200 + n*4 FROM
  (SELECT 1 n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4) t;

-- ---- Auxiliary Parameters ----
INSERT INTO tag_master (tag_name, equipment_group, unit, tag_type, display_order) VALUES
('SAF-1(2x9Mva) kW', 'Auxiliary Parameters', 'kW', 'instant', 300),
('SAF-2(2x9Mva) kW', 'Auxiliary Parameters', 'kW', 'instant', 301),
('SAF-3(2x4.5Mva) kW', 'Auxiliary Parameters', 'kW', 'instant', 302),
('RMD kW', 'Auxiliary Parameters', 'kW', 'instant', 303),
('SRM kW', 'Auxiliary Parameters', 'kW', 'instant', 304),
('WRM kW', 'Auxiliary Parameters', 'kW', 'instant', 305),
('SMS-4 TR2MVA kW', 'Auxiliary Parameters', 'kW', 'instant', 306),
('SMS-4 TR6MVA kW', 'Auxiliary Parameters', 'kW', 'instant', 307),
('SMS-4 TR3.6MVA kW', 'Auxiliary Parameters', 'kW', 'instant', 308),
('SMS-4 TR5MVA kW', 'Auxiliary Parameters', 'kW', 'instant', 309),
('SMS-4 Aux kW', 'Auxiliary Parameters', 'kW', 'instant', 310),
('SMS-2 Aux-1 kW', 'Auxiliary Parameters', 'kW', 'instant', 311),
('SMS-4 Sint-1 kW', 'Auxiliary Parameters', 'kW', 'instant', 312),
('SMS-4 Sint-2 kW', 'Auxiliary Parameters', 'kW', 'instant', 313);

-- ---- Cumulative (24 Hours) ----
INSERT INTO tag_master (tag_name, equipment_group, unit, tag_type, display_order) VALUES
('Grid Import kWh', 'Cumulative (24 Hours)', 'kWh', 'cumulative', 400),
('Grid Import kVah', 'Cumulative (24 Hours)', 'kVAh', 'cumulative', 401),
('Grid Export kWh', 'Cumulative (24 Hours)', 'kWh', 'cumulative', 402),
('Grid Export kVah', 'Cumulative (24 Hours)', 'kVAh', 'cumulative', 403),
('30MW TG-1 kWh', 'Cumulative (24 Hours)', 'kWh', 'cumulative', 404),
('30MW TG-2 kWh', 'Cumulative (24 Hours)', 'kWh', 'cumulative', 405),
('33MW TG-3 kWh', 'Cumulative (24 Hours)', 'kWh', 'cumulative', 406),
('30MW TG-4 kWh', 'Cumulative (24 Hours)', 'kWh', 'cumulative', 407),
('40MW TG-5 kWh', 'Cumulative (24 Hours)', 'kWh', 'cumulative', 408);
