-- Fix landing PageMeta row: legacy seed had English text in the ID column
-- (title/description), so /id rendered English. Repopulate with proper
-- bilingual content and mark en_synced_at so the worker leaves it alone.

UPDATE "PageMeta"
SET
  "title" = 'BabahAlgo — Otonomi Cerdas. Presisi Institusional.',
  "description" = 'Platform Trading Kuantitatif Bertenaga AI dari BabahAlgo. Robot Forex MT5 dan Robot Crypto Binance dengan eksekusi sub-millisecond.',
  "title_en" = 'BabahAlgo — Autonomous Intelligence. Institutional Precision.',
  "description_en" = 'AI-Powered Quantitative Trading Platform by BabahAlgo. Forex MT5 Robot and Binance Crypto Robot with sub-millisecond execution.',
  "ogTitle" = 'BabahAlgo — Otonomi Cerdas. Presisi Institusional.',
  "ogDescription" = 'Platform Trading Kuantitatif Bertenaga AI dari BabahAlgo.',
  "ogTitle_en" = 'BabahAlgo — Autonomous Intelligence. Institutional Precision.',
  "ogDescription_en" = 'AI-Powered Quantitative Trading Platform by BabahAlgo.',
  "en_synced_at" = NOW(),
  "updatedAt" = NOW()
WHERE "path" = '/';
