# backend/auth/email_service.py
import os
import requests
from dotenv import load_dotenv

load_dotenv()

BREVO_API_KEY = os.getenv("BREVO_API_KEY", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", "noreply@chemlab.co.ke")
FROM_NAME = os.getenv("FROM_NAME", "ChemLab Kenya")
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://www.chemlab.co.ke")

BREVO_URL = "https://api.brevo.com/v3/smtp/email"


def send_password_reset_email(to_email: str, reset_token: str) -> bool:
    """
    Send password reset email via Brevo API.
    Returns True if sent, False otherwise.
    """
    if not BREVO_API_KEY:
        print("❌ BREVO_API_KEY not set", flush=True)
        return False

    reset_link = f"{FRONTEND_URL}/?reset_token={reset_token}"

    html_content = f"""
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #00695c; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0;">ChemLab Kenya</h1>
        </div>
        <div style="background: #f5f5f5; padding: 30px; border-radius: 0 0 8px 8px;">
            <h2 style="color: #00695c; margin-top: 0;">Reset your password</h2>
            <p>You requested a password reset for your ChemLab Kenya account.</p>
            <p>Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{reset_link}"
                   style="background: #00897b; color: white; padding: 14px 28px;
                          text-decoration: none; border-radius: 6px; font-weight: bold;
                          display: inline-block;">
                    Reset Password
                </a>
            </div>
            <p style="font-size: 13px; color: #666;">
                If the button doesn't work, copy this link into your browser:<br>
                <a href="{reset_link}" style="color: #00897b; word-break: break-all;">{reset_link}</a>
            </p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            <p style="font-size: 12px; color: #999;">
                If you didn't request this, you can safely ignore this email.
                Your password won't change until you click the link above.
            </p>
        </div>
    </body>
    </html>
    """

    text_content = f"""
ChemLab Kenya - Reset your password

You requested a password reset. Open this link to set a new password:
{reset_link}

This link expires in 1 hour.

If you didn't request this, ignore this email.
"""

    payload = {
        "sender": {"name": FROM_NAME, "email": FROM_EMAIL},
        "to": [{"email": to_email}],
        "subject": "Reset your ChemLab Kenya password",
        "htmlContent": html_content,
        "textContent": text_content,
    }

    headers = {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json",
    }

    try:
        response = requests.post(BREVO_URL, json=payload, headers=headers, timeout=15)
        if response.status_code in (200, 201, 202):
            print(f"✅ Password reset email sent to {to_email}", flush=True)
            return True
        else:
            print(f"❌ Brevo error {response.status_code}: {response.text[:300]}", flush=True)
            return False
    except Exception as e:
        print(f"❌ Brevo exception: {e}", flush=True)
        return False
