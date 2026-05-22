-- AddUserLocale: persist user locale preference across devices.
-- Default 'id' (primary market). FE/login auto-set NEXT_LOCALE cookie from this.
ALTER TABLE "User" ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'id';
