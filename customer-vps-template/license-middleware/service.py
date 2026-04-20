"""License Middleware Service — runs on Customer VPS.

Polls VPS2 every 15 min:
- If license valid: log success, continue
- If license expired + in grace period: log warning, continue
- If license expired + past grace: POST emergency_pause to backend
"""
import asyncio
import sys

from client import check_license, notify_backend_pause
from config import Config
from logger import setup_logger


async def run_license_check_loop(config: Config, logger):
    """Main polling loop."""
    logger.info(f"License middleware started — customer: {config.customer_id}")
    logger.info(f"Check interval: {config.check_interval_seconds}s")

    while True:
        try:
            result = await check_license(
                customer_id=config.customer_id,
                vps2_url=config.vps2_license_url,
                hmac_secret=config.hmac_secret,
            )

            if result.error:
                logger.error(f"License check failed: {result.error}")
                # Don't take action on network errors (fail-safe)
            elif result.valid:
                if result.in_grace_period:
                    logger.warning(
                        f"License in grace period. Expires: {result.expires_at}, "
                        f"grace until: {result.grace_expires_at}"
                    )
                else:
                    logger.info(
                        f"License valid. Tier: {result.tier}, "
                        f"expires: {result.expires_at}"
                    )
            else:
                # License invalid
                logger.error(
                    "License INVALID. Past grace period. "
                    "Triggering backend emergency_pause"
                )
                paused = await notify_backend_pause(
                    backend_url=config.backend_url,
                    token=config.backend_token,
                    reason='LICENSE_EXPIRED',
                )
                if paused:
                    logger.info("Backend paused successfully")
                else:
                    logger.error("Failed to pause backend — manual intervention needed")

        except Exception as e:
            logger.exception(f"Unexpected error in license check: {e}")

        await asyncio.sleep(config.check_interval_seconds)


def main():
    try:
        config = Config.from_env()
    except ValueError as e:
        print(f"Config error: {e}", file=sys.stderr)
        sys.exit(1)

    logger = setup_logger(config.log_level)

    try:
        asyncio.run(run_license_check_loop(config, logger))
    except KeyboardInterrupt:
        logger.info("Shutting down")
    except Exception as e:
        logger.exception(f"Fatal error: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
