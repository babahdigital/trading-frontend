-- Seed CMS-driven landing sections: beta-program + products-showcase.
--
-- These sections appear on the public landing page. Admin can toggle on/off
-- via /admin/cms/landing (set isVisible=false) once beta ends or product
-- showcase positioning changes. Copy is editable via CMS — bullets stay in
-- code for simplicity.
--
-- ON CONFLICT (slug) DO NOTHING — re-running this migration is safe and
-- never overwrites edits made via the admin UI.

INSERT INTO "LandingSection" (
  "id", "slug", "title", "title_en", "subtitle", "subtitle_en",
  "content", "content_en", "sortOrder", "isVisible", "updatedAt"
) VALUES
(
  'seed-beta-program',
  'beta-program',
  'Akses awal — gratis untuk 100 trader pertama.',
  'Early access — free for the first 100 traders.',
  'Kami sedang fase beta. Track record live akan dipublikasi setelah 90 hari operasi produksi. Sebelum itu, founding members dapat akses penuh tanpa biaya — dengan imbal balik feedback langsung ke roadmap kami.',
  'We are in beta. Live track record publishes after 90 days of production operation. Until then, founding members get full access at no cost — in exchange for direct feedback into our roadmap.',
  '{"ctaLabel":"Daftar founding member","ctaHref":"/contact?subject=beta-founding-member","priceLabel":"Gratis","priceSubtext":"selama beta"}'::jsonb,
  '{"ctaLabel":"Apply as founding member","ctaHref":"/contact?subject=beta-founding-member","priceLabel":"Free","priceSubtext":"during beta"}'::jsonb,
  15,
  true,
  CURRENT_TIMESTAMP
),
(
  'seed-products-showcase',
  'products-showcase',
  'Dua robot, satu disiplin.',
  'Two robots, one discipline.',
  'Mesin trading otomatis untuk dua kelas aset, dibangun di atas framework risiko 12-layer yang sama. Pilih yang sesuai dengan modal dan profil risiko Anda.',
  'Automated trading engines for two asset classes, built on the same 12-layer risk framework. Pick the one that fits your capital and risk profile.',
  '{}'::jsonb,
  '{}'::jsonb,
  17,
  true,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO NOTHING;
