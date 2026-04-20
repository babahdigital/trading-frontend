"""HTTP client for VPS2 license check endpoint + backend pause trigger."""
import logging
from dataclasses import dataclass

import httpx

from hmac_signer import sign_request

logger = logging.getLogger(__name__)


@dataclass
class LicenseCheckResult:
    valid: bool
    expires_at: str | None
    in_grace_period: bool
    grace_expires_at: str | None
    tier: str | None
    enabled_flags: dict[str, object] | None
    raw_response: dict[str, object]
    http_status: int
    error: str | None = None


async def check_license(
    customer_id: str,
    vps2_url: str,
    hmac_secret: str,
    timeout_sec: int = 10,
) -> LicenseCheckResult:
    """Call VPS2 license check endpoint."""
    signature, timestamp = sign_request(customer_id, hmac_secret)

    url = f"{vps2_url}?customer_id={customer_id}"
    headers = {
        'X-Signature': signature,
        'X-Timestamp': timestamp,
        'User-Agent': f'customer-license-mw/1.0 ({customer_id})',
    }

    try:
        async with httpx.AsyncClient(timeout=timeout_sec) as client:
            response = await client.get(url, headers=headers)
            data = response.json()

            return LicenseCheckResult(
                valid=data.get('valid', False),
                expires_at=data.get('expires_at'),
                in_grace_period=data.get('in_grace_period', False),
                grace_expires_at=data.get('grace_expires_at'),
                tier=data.get('tier'),
                enabled_flags=data.get('enabled_flags'),
                raw_response=data,
                http_status=response.status_code,
            )

    except httpx.TimeoutException:
        logger.error(f"License check timeout: {customer_id}")
        return LicenseCheckResult(
            valid=False, expires_at=None, in_grace_period=False,
            grace_expires_at=None, tier=None, enabled_flags=None,
            raw_response={}, http_status=0, error='timeout',
        )
    except Exception as e:
        logger.error(f"License check error: {e}")
        return LicenseCheckResult(
            valid=False, expires_at=None, in_grace_period=False,
            grace_expires_at=None, tier=None, enabled_flags=None,
            raw_response={}, http_status=0, error=str(e),
        )


async def notify_backend_pause(backend_url: str, token: str, reason: str) -> bool:
    """Tell trading-backend to stop (reuse existing /api/scalper/stop endpoint)."""
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            response = await client.post(
                f"{backend_url}/api/scalper/stop",
                headers={'X-API-Token': token},
                json={'reason': reason},
            )
            return response.status_code == 200
    except Exception as e:
        logger.error(f"Failed to notify backend pause: {e}")
        return False
