"""Shared pytest fixtures + path setup so tests can import siblings."""
import os
import sys

# Add parent dir to sys.path so we can import hmac_signer, client, service, etc.
PARENT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if PARENT not in sys.path:
    sys.path.insert(0, PARENT)
