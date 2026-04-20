"""Test HMAC signing."""
from hmac_signer import sign_request, verify_signature


def test_sign_produces_64_char_hex():
    signature, timestamp = sign_request('CUST-001', 'secret-key-32chars-abcdefghijkl')
    assert len(signature) == 64
    assert all(c in '0123456789abcdef' for c in signature)
    assert timestamp.isdigit()


def test_sign_verify_roundtrip():
    secret = 'secret-key-32chars-abcdefghijkl'
    signature, timestamp = sign_request('CUST-001', secret)
    assert verify_signature('CUST-001', timestamp, signature, secret)


def test_tampered_signature_fails():
    secret = 'secret-key-32chars-abcdefghijkl'
    _, timestamp = sign_request('CUST-001', secret)
    bad_signature = 'a' * 64
    assert not verify_signature('CUST-001', timestamp, bad_signature, secret)


def test_different_customer_different_signature():
    secret = 'secret-key-32chars-abcdefghijkl'
    sig1, _ = sign_request('CUST-001', secret, timestamp=1000)
    sig2, _ = sign_request('CUST-002', secret, timestamp=1000)
    assert sig1 != sig2


def test_different_secret_different_signature():
    sig1, _ = sign_request('CUST-001', 'secret-a', timestamp=1000)
    sig2, _ = sign_request('CUST-001', 'secret-b', timestamp=1000)
    assert sig1 != sig2


def test_fixed_timestamp_deterministic():
    """Same inputs → same signature (deterministic)."""
    secret = 'secret-key'
    sig1, ts1 = sign_request('CUST-001', secret, timestamp=1700000000000)
    sig2, ts2 = sign_request('CUST-001', secret, timestamp=1700000000000)
    assert sig1 == sig2
    assert ts1 == ts2 == '1700000000000'


def test_wrong_secret_verification_fails():
    sig, ts = sign_request('CUST-001', 'secret-a')
    assert not verify_signature('CUST-001', ts, sig, 'secret-b')
