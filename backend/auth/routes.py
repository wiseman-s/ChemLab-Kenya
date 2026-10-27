# backend/auth/routes.py
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Response, Request
from sqlalchemy.orm import Session

from database import get_db
from rate_limit import limiter
from .models import User, PasswordReset
from .schemas import (
    SignupRequest,
    LoginRequest,
    UserResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest,
)
from .security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
    is_disposable_email,
    generate_reset_token,
    hash_token,
    reset_token_expiry,
)
from .email_service import send_password_reset_email

router = APIRouter(prefix="/api/auth", tags=["auth"])

COOKIE_NAME = "chemlab_session"
COOKIE_MAX_AGE = 60 * 60 * 24 * 7


def _set_session_cookie(response: Response, token: str):
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=COOKIE_MAX_AGE,
        path="/",
    )


# ============================================================
# SIGNUP — 3 per minute per IP (prevents spam accounts)
# ============================================================
@router.post("/signup", response_model=UserResponse, status_code=201)
@limiter.limit("3/minute")
def signup(request: Request, payload: SignupRequest, response: Response, db: Session = Depends(get_db)):
    if is_disposable_email(payload.email):
        raise HTTPException(
            status_code=400,
            detail="Temporary email addresses are not allowed. Please use a real email.",
        )

    existing = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="An account with this email already exists.",
        )

    user = User(
        email=payload.email.lower(),
        full_name=payload.full_name.strip(),
        hashed_password=hash_password(payload.password),
        is_verified=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id, user.email)
    _set_session_cookie(response, token)

    return user


# ============================================================
# LOGIN — 5 per minute per IP (brute-force protection)
# ============================================================
@router.post("/login", response_model=UserResponse)
@limiter.limit("5/minute")
def login(request: Request, payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower()).first()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user.last_login = datetime.now(timezone.utc)
    db.commit()

    token = create_access_token(user.id, user.email)
    _set_session_cookie(response, token)

    return user


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(COOKIE_NAME, path="/", samesite="none", secure=True)
    return {"success": True, "message": "Logged out"}


@router.get("/me", response_model=UserResponse)
def me(request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user


# ============================================================
# FORGOT PASSWORD — 3 per minute per IP
# ============================================================
@router.post("/forgot-password")
@limiter.limit("3/minute")
def forgot_password(request: Request, payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower()).first()

    generic_response = {
        "success": True,
        "message": "If that email is registered, you'll receive a reset link shortly.",
    }

    if not user:
        return generic_response

    twenty_four_hours_ago = datetime.now(timezone.utc) - timedelta(hours=24)
    recent_requests = (
        db.query(PasswordReset)
        .filter(
            PasswordReset.user_id == user.id,
            PasswordReset.created_at >= twenty_four_hours_ago,
        )
        .count()
    )

    if recent_requests >= 3:
        print(f"⚠️ Per-email rate limit hit for {user.email}", flush=True)
        return generic_response

    raw_token, token_hash = generate_reset_token()
    reset = PasswordReset(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=reset_token_expiry(),
    )
    db.add(reset)
    db.commit()

    send_password_reset_email(user.email, raw_token)

    return generic_response


# ============================================================
# RESET PASSWORD — 5 per minute per IP
# ============================================================
@router.post("/reset-password")
@limiter.limit("5/minute")
def reset_password(request: Request, payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    token_hash = hash_token(payload.token)

    reset = (
        db.query(PasswordReset)
        .filter(
            PasswordReset.token_hash == token_hash,
            PasswordReset.used == False,  # noqa: E712
        )
        .first()
    )

    if not reset:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link.")

    now = datetime.now(timezone.utc)
    expires = reset.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if now > expires:
        raise HTTPException(status_code=400, detail="This reset link has expired. Please request a new one.")

    user = db.query(User).filter(User.id == reset.user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="User not found.")

    user.hashed_password = hash_password(payload.new_password)
    reset.used = True
    db.commit()

    return {"success": True, "message": "Password reset successfully. You can now sign in."}
