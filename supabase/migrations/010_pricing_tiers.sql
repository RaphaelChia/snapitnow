CREATE TABLE IF NOT EXISTS pricing_tiers (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roll_preset       int NOT NULL UNIQUE CHECK (roll_preset IN (8, 12, 24, 36)),
  base_amount_cents int NOT NULL,
  discount_cents    int NOT NULL DEFAULT 0,
  discount_label    text,
  currency          text NOT NULL DEFAULT 'sgd',
  active            boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

INSERT INTO pricing_tiers (roll_preset, base_amount_cents, currency) VALUES
  (8,  5900, 'sgd'),
  (12, 6500, 'sgd'),
  (24, 7200, 'sgd'),
  (36, 7900, 'sgd');
