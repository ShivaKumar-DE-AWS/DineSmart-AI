"""Email service for sending notifications and password reset links.
"""
from typing import Optional
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# GoDaddy Professional Email SMTP settings
SMTP_SERVER = os.environ.get("SMTP_SERVER", "smtp.secureserver.net")
SMTP_PORT = int(os.environ.get("SMTP_PORT", 587))
SMTP_USER = os.environ.get("SMTP_USER", "admin@smartdineai.co.in")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")

def _send_email(to_email: str, subject: str, html_content: str) -> bool:
    if not SMTP_PASSWORD:
        print("⚠️ SMTP_PASSWORD not set in environment. Falling back to mock email.")
        print(f"\n📧 EMAIL MOCK (To: {to_email})\nSubject: {subject}\nBody:\n{html_content}\n")
        return True

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"SmartDine AI <{SMTP_USER}>"
    msg["To"] = to_email

    part = MIMEText(html_content, "html")
    msg.attach(part)

    try:
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.sendmail(SMTP_USER, to_email, msg.as_string())
        server.quit()
        print(f"✅ Successfully sent email to {to_email}")
        return True
    except Exception as e:
        print(f"❌ Failed to send email to {to_email}: {str(e)}")
        return False

def send_password_reset_email(to_email: str, reset_token: str, frontend_url: str = "http://localhost:3000"):
    """Send a password reset email."""
    reset_link = f"{frontend_url}/auth/forgot-password?token={reset_token}"
    subject = "Reset your SmartDine Password"
    
    html = f"""
    <html>
      <body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #8A1A2A;">Password Reset Request</h2>
        <p>We received a request to reset your password for your SmartDine AI account.</p>
        <p>Click the button below to set a new password:</p>
        <a href="{reset_link}" style="display: inline-block; padding: 12px 24px; background-color: #8A1A2A; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 16px 0;">Reset Password</a>
        <p style="font-size: 14px; color: #666;">If you didn't request this, you can safely ignore this email.</p>
        <hr style="border: 1px solid #eee; margin: 30px 0;" />
        <p style="font-size: 12px; color: #999;">SmartDine AI • <a href="https://smartdineai.co.in">smartdineai.co.in</a></p>
      </body>
    </html>
    """
    return _send_email(to_email, subject, html)

def send_welcome_email(to_email: str, restaurant_name: str, creds: dict, otp: str):
    """Send welcome email with credentials and OTP."""
    subject = f"Welcome to SmartDine AI, {restaurant_name}!"
    
    html = f"""
    <html>
      <body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #8A1A2A; margin: 0;">SmartDine AI</h1>
        </div>
        
        <h2>Welcome aboard, {restaurant_name}! 🎉</h2>
        <p>Your 14-day Pro Trial is officially active. We are thrilled to have you.</p>
        
        <div style="background-color: #fcf8f2; border-left: 4px solid #C9A348; padding: 16px; margin: 24px 0;">
            <h3 style="margin-top: 0; color: #8A1A2A;">Action Required: Verify Your Restaurant</h3>
            <p>Your menus are currently in <b>Sandbox Mode</b>. To start taking live customer orders, you must verify your account using the code below:</p>
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; color: #8A1A2A; margin: 20px 0;">
                {otp}
            </div>
            <p style="margin-bottom: 0;">Enter this code in your Admin Dashboard -> Settings page.</p>
        </div>

        <h3 style="margin-top: 30px;">Your Admin Credentials</h3>
        <p>Use these credentials to log in to your dashboard:</p>
        <ul style="list-style-type: none; padding-left: 0; background: #f5f5f5; padding: 16px; border-radius: 8px;">
            <li><strong>Email:</strong> {creds['admin']['email']}</li>
            <li><strong>Password:</strong> {creds['admin']['password']}</li>
        </ul>

        <p style="margin-top: 30px;">If you need any help, reply to this email or contact us at <a href="mailto:admin@smartdineai.co.in">admin@smartdineai.co.in</a>.</p>
        
        <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="font-size: 12px; color: #999; text-align: center;">© 2026 SmartDine AI Platform. All rights reserved.</p>
      </body>
    </html>
    """
    return _send_email(to_email, subject, html)
