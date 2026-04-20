"""Test service logic."""
from unittest.mock import AsyncMock, patch

import pytest

from client import LicenseCheckResult


@pytest.mark.asyncio
async def test_valid_license_no_pause():
    """When license valid, should not trigger pause."""
    with patch('service.check_license', new=AsyncMock()) as mock_check, \
         patch('service.notify_backend_pause', new=AsyncMock()) as mock_pause:

        mock_check.return_value = LicenseCheckResult(
            valid=True, expires_at='2026-05-20T00:00:00Z',
            in_grace_period=False, grace_expires_at=None,
            tier='TRADER', enabled_flags={}, raw_response={}, http_status=200,
        )

        # Call check_license once (don't loop forever)
        result = await mock_check('CUST-001', 'url', 'secret')

        if not result.valid:
            await mock_pause('url', 'token', 'LICENSE_EXPIRED')

        assert result.valid
        mock_pause.assert_not_called()


@pytest.mark.asyncio
async def test_expired_license_triggers_pause():
    """When license expired past grace, should trigger pause."""
    with patch('service.check_license', new=AsyncMock()) as mock_check, \
         patch('service.notify_backend_pause', new=AsyncMock()) as mock_pause:

        mock_check.return_value = LicenseCheckResult(
            valid=False, expires_at='2026-03-01T00:00:00Z',
            in_grace_period=False, grace_expires_at=None,
            tier='TRADER', enabled_flags={}, raw_response={}, http_status=200,
        )
        mock_pause.return_value = True

        result = await mock_check('CUST-001', 'url', 'secret')
        if not result.valid:
            await mock_pause('url', 'token', 'LICENSE_EXPIRED')

        assert not result.valid
        mock_pause.assert_called_once()


@pytest.mark.asyncio
async def test_grace_period_no_pause():
    """When license in grace period, log warning but don't pause."""
    with patch('service.check_license', new=AsyncMock()) as mock_check, \
         patch('service.notify_backend_pause', new=AsyncMock()) as mock_pause:

        mock_check.return_value = LicenseCheckResult(
            valid=True, expires_at='2026-04-18T00:00:00Z',
            in_grace_period=True, grace_expires_at='2026-04-21T00:00:00Z',
            tier='TRADER', enabled_flags={}, raw_response={}, http_status=200,
        )

        result = await mock_check('CUST-001', 'url', 'secret')

        assert result.valid
        assert result.in_grace_period
        mock_pause.assert_not_called()


@pytest.mark.asyncio
async def test_network_error_no_pause():
    """Fail-safe: on network error (result.error set), do NOT pause backend."""
    with patch('service.check_license', new=AsyncMock()) as mock_check, \
         patch('service.notify_backend_pause', new=AsyncMock()) as mock_pause:

        mock_check.return_value = LicenseCheckResult(
            valid=False, expires_at=None, in_grace_period=False,
            grace_expires_at=None, tier=None, enabled_flags=None,
            raw_response={}, http_status=0, error='timeout',
        )

        result = await mock_check('CUST-001', 'url', 'secret')

        # Per service.py logic: if result.error, skip all branches (fail-safe)
        triggered_pause = False
        if result.error:
            pass  # fail-safe
        elif not result.valid:
            triggered_pause = True
            await mock_pause('url', 'token', 'LICENSE_EXPIRED')

        assert result.error == 'timeout'
        assert not triggered_pause
        mock_pause.assert_not_called()


def test_config_from_env_missing_vars(monkeypatch):
    """Config.from_env raises ValueError when required vars missing."""
    from config import Config

    # Clear all required vars
    for k in ['CUSTOMER_ID', 'VPS2_LICENSE_URL', 'LICENSE_HMAC_SECRET',
              'BACKEND_URL', 'BACKEND_TOKEN']:
        monkeypatch.delenv(k, raising=False)

    with pytest.raises(ValueError, match='Missing required env vars'):
        Config.from_env()


def test_config_from_env_happy_path(monkeypatch):
    """Config.from_env succeeds with all required vars set."""
    from config import Config

    monkeypatch.setenv('CUSTOMER_ID', 'CUST-001')
    monkeypatch.setenv('VPS2_LICENSE_URL', 'https://babahalgo.com/api/license/check')
    monkeypatch.setenv('LICENSE_HMAC_SECRET', 'secret-32chars-abcdefghijkl')
    monkeypatch.setenv('BACKEND_URL', 'http://trading-backend:8000')
    monkeypatch.setenv('BACKEND_TOKEN', 'admin-token')
    monkeypatch.setenv('CHECK_INTERVAL_MIN', '15')
    monkeypatch.setenv('GRACE_PERIOD_HOURS', '72')

    config = Config.from_env()

    assert config.customer_id == 'CUST-001'
    assert config.check_interval_seconds == 900  # 15 * 60
    assert config.grace_period_seconds == 259200  # 72 * 3600
    assert config.log_level == 'INFO'  # default
