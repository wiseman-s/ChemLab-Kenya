# backend/auth/schemas.py
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator


def _check_password_strength(v: str) -> str:
    if len(v) < 8:
        raise ValueError("Password must be at least 8 characters")
    if not any(c.isdigit() for c in v):
        raise ValueError("Password must contain at least one number")
    if not any(c.isalpha() for c in v):
        raise ValueError("Password must contain at least one letter")
    return v


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=100)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v):
        return _check_password_strength(v)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v):
        return _check_password_strength(v)


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str] = None
    is_verified: bool

    class Config:
        from_attributes = True
