-- LANGKAH 1 — Jalankan file ini SAJA, lalu klik Run.
-- PostgreSQL mengharuskan nilai enum baru di-commit sebelum dipakai di query lain.
-- Setelah sukses, lanjut ke 002b_digital_guru.sql

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'guru';
