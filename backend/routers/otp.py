import random
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, EmailStr
from datetime import datetime, timezone, timedelta
from deps import db
from email_service import send_verification_otp, send_sms_otp

router = APIRouter()

class SendOtpRequest(BaseModel):
    email: str = None
    phone: str = None

class VerifyOtpRequest(BaseModel):
    email: str = None
    phone: str = None
    otp: str

@router.post("/api/otp/send")
async def send_otp(req: SendOtpRequest, background_tasks: BackgroundTasks):
    if not req.email and not req.phone:
        raise HTTPException(status_code=400, detail="Must provide email or phone")

    otp = str(random.randint(100000, 999999))
    expires = datetime.now(timezone.utc) + timedelta(minutes=10)

    # Store OTP in a general collection for pre-registration
    if req.email:
        await db.otps.update_one(
            {"target": req.email, "type": "email"},
            {"$set": {"otp": otp, "expires_at": expires.isoformat()}},
            upsert=True
        )
        background_tasks.add_task(send_verification_otp, req.email, otp)
        
    if req.phone:
        await db.otps.update_one(
            {"target": req.phone, "type": "phone"},
            {"$set": {"otp": otp, "expires_at": expires.isoformat()}},
            upsert=True
        )
        background_tasks.add_task(send_sms_otp, req.phone, otp)

    return {"status": "success", "message": "OTP sent"}

@router.post("/api/otp/verify")
async def verify_otp(req: VerifyOtpRequest):
    if not req.email and not req.phone:
        raise HTTPException(status_code=400, detail="Must provide email or phone")
        
    target = req.email if req.email else req.phone
    target_type = "email" if req.email else "phone"
    
    record = await db.otps.find_one({"target": target, "type": target_type})
    if not record:
        raise HTTPException(status_code=400, detail="OTP not requested")
        
    if record.get("verified"):
        return {"status": "success", "message": f"{target_type.capitalize()} already verified"}
        
    if record["otp"] != req.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
        
    if datetime.fromisoformat(record["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="OTP expired")
        
    # Mark as verified
    await db.otps.update_one(
        {"_id": record["_id"]},
        {"$set": {"verified": True}}
    )
    
    return {"status": "success", "message": f"{target_type.capitalize()} verified successfully"}
