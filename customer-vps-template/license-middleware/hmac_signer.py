"""HMAC-SHA256 signing for license check requests."""
import hashlib
import hmac
import time


def sign_request(customer_id: str, secret: str, timestamp: int | None = None) -> tuple[str, str]:
    """
    Sign a license check request.

    Returns: (signature_hex, timestamp_ms_str)
    """
    if timestamp is None:
        timestamp = int(time.time() * 1000)

    timestamp_str = str(timestamp)
    payload = f"{customer_id}:{timestamp_str}".encode('utf-8')

    signature = hmac.new(
        secret.encode('utf-8'),
        payload,
        hashlib.sha256,
    ).hexdigest()

    return signature, timestamp_str


def verify_signature(customer_id: str, timestamp: str, signature: str, secret: str) -> bool:
    """Verify HMAC signature (for testing + VPS2 side)."""
    expected, _ = sign_request(customer_id, secret, int(timestamp))
    return hmac.compare_digest(expected, signature)
