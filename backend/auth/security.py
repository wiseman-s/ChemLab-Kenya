# backend/auth/security.py
import os
import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from jose import JWTError, jwt
from dotenv import load_dotenv

load_dotenv()

# ============================================================
# CONFIG
# ============================================================

JWT_SECRET = os.getenv("JWT_SECRET", "dev-only-change-this-in-production")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days
RESET_TOKEN_EXPIRE_MINUTES = 60  # 1 hour
VERIFY_TOKEN_EXPIRE_HOURS = 24

ph = PasswordHasher()


# ============================================================
# PASSWORD HASHING (Argon2id)
# ============================================================

def hash_password(password: str) -> str:
    return ph.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    try:
        ph.verify(hashed, password)
        return True
    except VerifyMismatchError:
        return False
    except Exception:
        return False


# ============================================================
# JWT SESSION TOKENS
# ============================================================

def create_access_token(user_id: int, email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(user_id),
        "email": email,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        return None


# ============================================================
# RESET / VERIFY TOKENS (random, hashed before storing)
# ============================================================

def generate_reset_token() -> tuple[str, str]:
    """Returns (raw_token, token_hash). Send raw to user, store hash in DB."""
    raw = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw.encode()).hexdigest()
    return raw, token_hash


def hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def reset_token_expiry() -> datetime:
    return datetime.now(timezone.utc) + timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES)


def verify_token_expiry() -> datetime:
    return datetime.now(timezone.utc) + timedelta(hours=VERIFY_TOKEN_EXPIRE_HOURS)


# ============================================================
# TEMP EMAIL BLOCKING
# ============================================================

def is_disposable_email(email: str) -> bool:
    """
    Returns True if the email domain is a known disposable/temp email provider.
    If the check itself fails (package error, network), we fail open (return False)
    so a real user is never blocked by a broken third-party check.
    """
    try:
        from disposable_email_score import evaluate_email
        result = evaluate_email(email)
        return result.decision == "block"
    except Exception as e:
        print(f"⚠️ Temp email check failed for {email}: {e}", flush=True)
        return False
