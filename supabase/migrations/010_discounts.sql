CREATE TABLE IF NOT EXISTS discounts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roll_preset       int NOT NULL CHECK (roll_preset IN (8, 12, 24, 36)),
  discount_percent  int NOT NULL DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
  label             text,
  active            boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_discounts_active_per_tier
  ON discounts (roll_preset) WHERE active = true;
