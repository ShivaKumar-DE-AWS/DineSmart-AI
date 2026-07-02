"""Email service for sending notifications and password reset links.
Now fully async using aiosmtplib and AsyncClient.
"""
from typing import Optional
import os
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import httpx

# GoDaddy Professional Email SMTP settings
SMTP_SERVER = os.environ.get("SMTP_SERVER") or os.environ.get("SMTP_HOST") or "smtp.secureserver.net"
SMTP_PORT = int(os.environ.get("SMTP_PORT", 587))
SMTP_USER = os.environ.get("SMTP_USER") or os.environ.get("SMTP_USERNAME") or "admin@smartdineai.co.in"
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN", "")
TWILIO_PHONE_NUMBER = os.environ.get("TWILIO_PHONE_NUMBER", "")

async def _send_email(to_email: str, subject: str, html_content: str) -> tuple[bool, str]:
    """Send email asynchronously using Resend API (if available) with automatic fallback to aiosmtplib."""
    # Always log the email locally just in case SMTP is blocked by the cloud provider
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

    # 1. Try Resend API if key is present
    if RESEND_API_KEY:
        try:
            resend_from = os.environ.get("RESEND_FROM") or os.environ.get("RESEND_FROM_EMAIL") or f"SmartDine AI <{SMTP_USER}>"
            if "resend.dev" in resend_from and not os.environ.get("RESEND_FROM"):
                resend_from = "SmartDine AI <onboarding@resend.dev>"
            async with httpx.AsyncClient() as client:
                res = await client.post(
                    "https://api.resend.com/emails",
                    headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
                    json={
                        "from": resend_from,
                        "to": [to_email],
                        "subject": subject,
                        "html": html_content
                    },
                    timeout=10
                )
                if res.is_success:
                    print(f"✅ Successfully sent Resend email to {to_email}")
                    return True, "Success"
                else:
                    print(f"⚠️ Resend API Error ({res.status_code}): {res.text}. Falling back to SMTP...")
        except Exception as e:
            print(f"⚠️ Resend API request failed: {str(e)}. Falling back to SMTP...")

    # 2. Fallback to SMTP
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
        # Use aiosmtplib for async SMTP with proper TLS setting for port 465
        use_tls = (SMTP_PORT == 465)
        async with aiosmtplib.SMTP(hostname=SMTP_SERVER, port=SMTP_PORT, use_tls=use_tls, timeout=10) as smtp:
            if not use_tls:
                await smtp.starttls()
            await smtp.login(SMTP_USER, SMTP_PASSWORD)
            await smtp.send_message(msg)
        
        print(f"✅ Successfully sent SMTP email to {to_email}")
        return True, "Success"
    except Exception as e:
        print(f"❌ Failed to send SMTP email to {to_email}: {str(e)}")
        return False, str(e)

async def send_password_reset_email(to_email: str, reset_token: str, frontend_url: str = "http://localhost:3000"):
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
    return await _send_email(to_email, subject, html)

async def send_welcome_email(to_email: str, restaurant_name: str, creds: dict, otp: str):
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
    return await _send_email(to_email, subject, html)

async def send_verification_success_email(to_email: str, restaurant_name: str, creds: dict):
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
    return await _send_email(to_email, subject, html)

async def send_verification_otp(to_email: str, otp: str):
    """Send verification OTP using Resend or fallback to SMTP."""
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
    return await _send_email(to_email, subject, html)

async def send_sms_otp(phone: str, otp: str):
    """Send SMS OTP asynchronously using Twilio."""
    message = f"🔐 [SmartDine] {otp} is your verification code. Do not share this with anyone. Valid for 10 minutes."
    print("=" * 60, flush=True)
    print(f"📱 SMS GENERATED (To: {phone})", flush=True)
    print(f"Content: {message}")
    print("=" * 60, flush=True)
    
    if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
        try:
            async with httpx.AsyncClient() as client:
                auth = (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
                res = await client.post(
                    f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Messages.json",
                    auth=auth,
                    data={
                        "To": phone,
                        "From": TWILIO_PHONE_NUMBER,
                        "Body": message
                    },
                    timeout=10
                )
                if res.is_success:
                    print(f"✅ Successfully sent SMS to {phone}")
                else:
                    print(f"❌ Twilio API Error ({res.status_code}): {res.text}")
        except Exception as e:
            print(f"❌ Failed to connect to Twilio: {str(e)}")

async def send_whatsapp_otp(phone: str, otp: str):
    """Send WhatsApp OTP asynchronously using Twilio."""
    message = f"🔐 *[SmartDine]*\n\nYour verification code is: *{otp}*\n\n_Do not share this code with anyone. It is valid for 10 minutes._"
    print("=" * 60, flush=True)
    print(f"💬 WHATSAPP GENERATED (To: {phone})", flush=True)
    print(f"Content: {message}")
    print("=" * 60, flush=True)
    
    if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
        try:
            async with httpx.AsyncClient() as client:
                auth = (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
                res = await client.post(
                    f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Messages.json",
                    auth=auth,
                    data={
                        "To": f"whatsapp:{phone}",
                        "From": f"whatsapp:{TWILIO_PHONE_NUMBER}",
                        "Body": message
                    },
                    timeout=10
                )
                if res.is_success:
                    print(f"✅ Successfully sent WhatsApp to {phone}")
                else:
                    print(f"❌ Twilio API Error ({res.status_code}): {res.text}")
        except Exception as e:
            print(f"❌ Failed to connect to Twilio: {str(e)}")

async def send_voice_otp(phone: str, otp: str):
    """Send Voice OTP asynchronously using Twilio."""
    spaced_otp = " ".join(list(otp))
    twiml = f"<Response><Say voice='alice'>Hello from Smart Dine. Your secure verification code is {spaced_otp}. I repeat, {spaced_otp}. Please do not share this code. Goodbye.</Say></Response>"
    print("=" * 60, flush=True)
    print(f"📞 VOICE CALL GENERATED (To: {phone})", flush=True)
    print(f"Content: {otp}")
    print("=" * 60, flush=True)
    
    if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
        try:
            async with httpx.AsyncClient() as client:
                auth = (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
                res = await client.post(
                    f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Calls.json",
                    auth=auth,
                    data={
                        "To": phone,
                        "From": TWILIO_PHONE_NUMBER,
                        "Twiml": twiml
                    },
                    timeout=10
                )
                if res.is_success:
                    print(f"✅ Successfully initiated Voice Call to {phone}")
                else:
                    print(f"❌ Twilio API Error ({res.status_code}): {res.text}")
        except Exception as e:
            print(f"❌ Failed to connect to Twilio: {str(e)}")
