"""Email service for sending notifications and password reset links.
Currently mocks sending by printing to console. Ready to be plugged into SendGrid/Resend.
"""
from typing import Optional
import os

def send_password_reset_email(to_email: str, reset_token: str, frontend_url: str = "http://localhost:3000"):
    """Send a password reset email."""
    reset_link = f"{frontend_url}/auth/forgot-password?token={reset_token}"
    
    # In production, integrate with Resend or SendGrid here:
    # resend.api_key = os.environ["RESEND_API_KEY"]
    # resend.Emails.send({ ... })
    
    print("\n" + "="*50)
    print(f"📧 EMAIL MOCK (To: {to_email})")
    print("Subject: Reset your SmartDine Password")
    print(f"Body: Click the link below to reset your password:\n{reset_link}")
    print("="*50 + "\n")
    
    return True
