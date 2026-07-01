"""Email service for sending notifications and password reset links.
"""
from typing import Optional
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# GoDaddy Professional Email SMTP settings
SMTP_SERVER = os.environ.get("SMTP_SERVER") or os.environ.get("SMTP_HOST") or os.environ.get("SMTP_HOSTSMTP_HOST") or "smtp.secureserver.net"
SMTP_PORT = int(os.environ.get("SMTP_PORT", 587))
SMTP_USER = os.environ.get("SMTP_USER") or os.environ.get("SMTP_USERNAME") or "admin@smartdineai.co.in"
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")

def _send_email(to_email: str, subject: str, html_content: str) -> tuple[bool, str]:
    # Always log the email locally just in case SMTP is blocked by the cloud provider (e.g. Render Free Tier)
    print("=" * 60, flush=True)
    print(f"📧 EMAIL GENERATED (To: {to_email})", flush=True)
    print(f"Subject: {subject}", flush=True)
    import re
    text_content = re.sub(r'<[^>]+>', ' ', html_content)
    text_content = re.sub(r'\s+', ' ', text_content).strip()
    
    # Try to extract a 6 digit code for easy visibility
    otp_match = re.search(r'\b(\d{6})\b', text_content)
    if otp_match:
        print(f"🔑 FOUND VERIFICATION OTP: {otp_match.group(1)} 🔑", flush=True)
        
    print(f"Content: {text_content[:800]}...", flush=True)
    print("=" * 60, flush=True)

    if not SMTP_PASSWORD:
        print("⚠️ SMTP_PASSWORD not set. Mock email only.")
        return True, "Mock success"

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"SmartDine AI <{SMTP_USER}>"
    msg["To"] = to_email

    part = MIMEText(html_content, "html")
    msg.attach(part)

    try:
        if SMTP_PORT == 465:
            server = smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT, timeout=10)
            server.login(SMTP_USER, SMTP_PASSWORD)
        else:
            server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=10)
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            
        server.sendmail(SMTP_USER, to_email, msg.as_string())
        server.quit()
        print(f"✅ Successfully sent email to {to_email}")
        return True, "Success"
    except Exception as e:
        print(f"❌ Failed to send email to {to_email}: {str(e)}")
        return False, str(e)

def send_password_reset_email(to_email: str, reset_token: str, frontend_url: str = "http://localhost:3000"):
    """Send a password reset email."""
    reset_link = f"{frontend_url}/auth/forgot-password?token={reset_token}"
    
    # EXPLICITLY print the link so it is impossible to miss in the Render logs
    print(f"\n🔐 RESET LINK FOR {to_email}: {reset_link}\n", flush=True)
    
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

def send_verification_success_email(to_email: str, restaurant_name: str, creds: dict):
    """Send successful verification email with credentials."""
    subject = f"{restaurant_name} is now Verified on SmartDine AI!"
    
    html = f"""
    <html>
      <body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #8A1A2A; margin: 0;">SmartDine AI</h1>
        </div>
        
        <h2>Congratulations, {restaurant_name}! 🎉</h2>
        <p>Your restaurant has been successfully verified.</p>
        
        <div style="background-color: #f2fcf5; border-left: 4px solid #4CAF50; padding: 16px; margin: 24px 0;">
            <h3 style="margin-top: 0; color: #2E7D32;">Sandbox Mode Lifted</h3>
            <p>Your menus and tables are now live. You can start taking real customer orders immediately.</p>
        </div>

        <h3 style="margin-top: 30px;">Your Restaurant Credentials</h3>
        <p>Keep these credentials safe. You can use them to access different parts of the system:</p>
        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px;">
            <h4 style="margin-top: 0; color: #8A1A2A;">Admin Dashboard</h4>
            <p style="margin: 4px 0;"><strong>Email:</strong> {creds.get('admin', dict()).get('email', '')}</p>
            <p style="margin: 4px 0;"><strong>Password:</strong> {creds.get('admin', dict()).get('password', '')}</p>
            
            <h4 style="margin-top: 16px; color: #8A1A2A;">Kitchen Display System (KDS)</h4>
            <p style="margin: 4px 0;"><strong>Email:</strong> {creds.get('kitchen', dict()).get('email', '')}</p>
            <p style="margin: 4px 0;"><strong>Password:</strong> {creds.get('kitchen', dict()).get('password', '')}</p>
            
            <h4 style="margin-top: 16px; color: #8A1A2A;">Counter & Billing</h4>
            <p style="margin: 4px 0;"><strong>Email:</strong> {creds.get('counter', dict()).get('email', '')}</p>
            <p style="margin: 4px 0;"><strong>Password:</strong> {creds.get('counter', dict()).get('password', '')}</p>
        </div>

        <p style="margin-top: 30px;">If you need any help, reply to this email or contact us at <a href="mailto:admin@smartdineai.co.in">admin@smartdineai.co.in</a>.</p>
        
        <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="font-size: 12px; color: #999; text-align: center;">© 2026 SmartDine AI Platform. All rights reserved.</p>
      </body>
    </html>
    """
    return _send_email(to_email, subject, html)


import httpx

RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN", "")
TWILIO_PHONE_NUMBER = os.environ.get("TWILIO_PHONE_NUMBER", "")

def send_verification_otp(to_email: str, otp: str):
    subject = "Your SmartDine Verification Code"
    html = f'''
    <html>
      <body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Verify Your Email</h2>
        <p>Your verification code is:</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #8A1A2A; margin: 20px 0;">
            {otp}
        </div>
      </body>
    </html>
    '''
    if RESEND_API_KEY:
        try:
            httpx.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
                json={
                    "from": "SmartDine AI <onboarding@resend.dev>",
                    "to": [to_email],
                    "subject": subject,
                    "html": html
                },
                timeout=10
            )
            print(f"✅ Successfully sent Resend email to {to_email}")
        except Exception as e:
            print(f"❌ Failed to send Resend email to {to_email}: {str(e)}")
    else:
        _send_email(to_email, subject, html)

def send_sms_otp(phone: str, otp: str):
    message = f"Your SmartDine Verification Code is: {otp}"
    print("=" * 60, flush=True)
    print(f"📱 SMS GENERATED (To: {phone})", flush=True)
    print(f"Content: {message}")
    print("=" * 60, flush=True)
    
    if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
        try:
            auth = (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
            httpx.post(
                f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Messages.json",
                auth=auth,
                data={
                    "To": phone,
                    "From": TWILIO_PHONE_NUMBER,
                    "Body": message
                },
                timeout=10
            )
            print(f"✅ Successfully sent SMS to {phone}")
        except Exception as e:
            print(f"❌ Failed to send SMS to {phone}: {str(e)}")
