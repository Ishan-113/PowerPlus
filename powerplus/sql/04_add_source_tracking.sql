-- =========================================================
-- Adds a 'source' column to tag_rollup_daily so real data
-- (imported from actual client reports) can never be silently
-- overwritten by the test-data simulator again.
--
-- Existing rows default to 'simulated' since we can't know
-- retroactively which were real — re-run import_pdf_report.py
-- on any real report PDFs you've already imported to correctly
-- mark those specific rows as 'real' again.
-- =========================================================
USE powerplus;

ALTER TABLE tag_rollup_daily
  ADD COLUMN source ENUM('real', 'simulated') NOT NULL DEFAULT 'simulated';
