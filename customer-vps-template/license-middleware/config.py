"""Configuration via environment variables."""
import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Config:
    customer_id: str
    vps2_license_url: str
    hmac_secret: str
    backend_url: str
    backend_token: str
    check_interval_seconds: int
    grace_period_seconds: int
    log_level: str

    @classmethod
    def from_env(cls) -> 'Config':
        required = [
            'CUSTOMER_ID',
            'VPS2_LICENSE_URL',
            'LICENSE_HMAC_SECRET',
            'BACKEND_URL',
            'BACKEND_TOKEN',
        ]
        missing = [k for k in required if not os.environ.get(k)]
        if missing:
            raise ValueError(f"Missing required env vars: {', '.join(missing)}")

        return cls(
            customer_id=os.environ['CUSTOMER_ID'],
            vps2_license_url=os.environ['VPS2_LICENSE_URL'],
            hmac_secret=os.environ['LICENSE_HMAC_SECRET'],
            backend_url=os.environ['BACKEND_URL'],
            backend_token=os.environ['BACKEND_TOKEN'],
            check_interval_seconds=int(os.environ.get('CHECK_INTERVAL_MIN', '15')) * 60,
            grace_period_seconds=int(os.environ.get('GRACE_PERIOD_HOURS', '72')) * 3600,
            log_level=os.environ.get('LOG_LEVEL', 'INFO'),
        )
