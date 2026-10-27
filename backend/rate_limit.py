# backend/rate_limit.py
"""
Shared rate limiter for FastAPI.
Uses X-Forwarded-For to get the real client IP behind Render's proxy.
Without this, all users appear to have the same IP (Render's proxy),
and one user hitting the limit would block everyone.
"""
from slowapi import Limiter
from fastapi import Request


def get_real_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


limiter = Limiter(key_func=get_real_ip)
