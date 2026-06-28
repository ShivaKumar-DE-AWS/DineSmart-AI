import os
import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from deps import db, require_roles
from datetime import datetime, timezone

router = APIRouter(prefix="/api/billing", tags=["billing"])

stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")
webhook_secret = os.environ.get("STRIPE_WEBHOOK_SECRET")
# E.g., price_1N... for the Pro plan
STRIPE_PRICE_ID_PRO = os.environ.get("STRIPE_PRICE_ID_PRO")

# URL to return to after checkout or portal
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

@router.get("/status")
async def get_billing_status(user=Depends(require_roles("admin", "manager", "staff"))):
    """Get the current restaurant's billing status."""
    restaurant_id = user.get("restaurant_id")
    restaurant = await db.restaurants.find_one({"id": restaurant_id})
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
        
    return {
        "subscription_status": restaurant.get("subscription_status", "unknown"),
        "plan_tier": restaurant.get("plan_tier", "starter"),
        "trial_ends_at": restaurant.get("trial_ends_at"),
        "has_payment_method": bool(restaurant.get("stripe_customer_id"))
    }

@router.post("/create-checkout-session")
async def create_checkout_session(user=Depends(require_roles("admin"))):
    """Create a Stripe checkout session to subscribe to the Pro plan."""
    restaurant_id = user.get("restaurant_id")
    restaurant = await db.restaurants.find_one({"id": restaurant_id})
    
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
        
    # MOCK MODE: If Stripe isn't configured, simulate a successful payment instantly.
    if not stripe.api_key or not STRIPE_PRICE_ID_PRO:
        await db.restaurants.update_one(
            {"id": restaurant_id},
            {"$set": {
                "stripe_customer_id": f"mock_cus_{restaurant_id}",
                "stripe_subscription_id": f"mock_sub_{restaurant_id}",
                "subscription_status": "active",
                "plan_tier": "pro"
            }}
        )
        return {"url": f"{FRONTEND_URL}/admin/billing?success=true&mock=true"}
        
    customer_id = restaurant.get("stripe_customer_id")
    
    try:
        session_params = {
            "payment_method_types": ["card"],
            "line_items": [{"price": STRIPE_PRICE_ID_PRO, "quantity": 1}],
            "mode": "subscription",
            "success_url": f"{FRONTEND_URL}/admin/billing?success=true",
            "cancel_url": f"{FRONTEND_URL}/admin/billing?canceled=true",
            "metadata": {"restaurant_id": restaurant_id}
        }
        
        # Attach to existing customer if they have one
        if customer_id:
            session_params["customer"] = customer_id
        else:
            session_params["customer_email"] = user.get("email")
            
        checkout_session = stripe.checkout.Session.create(**session_params)
        return {"url": checkout_session.url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/create-portal-session")
async def create_portal_session(user=Depends(require_roles("admin"))):
    """Create a Stripe customer portal session to manage billing."""
    restaurant_id = user.get("restaurant_id")
    restaurant = await db.restaurants.find_one({"id": restaurant_id})
    
    customer_id = restaurant.get("stripe_customer_id")
    if not customer_id:
        raise HTTPException(status_code=400, detail="No active billing record found.")
        
    # MOCK MODE fallback
    if not stripe.api_key or customer_id.startswith("mock_cus_"):
        # Just redirect back, maybe simulate cancellation if we wanted to
        return {"url": f"{FRONTEND_URL}/admin/billing?mock_portal=true"}
        
    try:
        portal_session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=f"{FRONTEND_URL}/admin/billing"
        )
        return {"url": portal_session.url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks."""
    if not webhook_secret:
        raise HTTPException(status_code=501, detail="Webhook secret not configured.")
        
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    # Handle the event
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        restaurant_id = session["metadata"].get("restaurant_id")
        if restaurant_id:
            await db.restaurants.update_one(
                {"id": restaurant_id},
                {"$set": {
                    "stripe_customer_id": session.get("customer"),
                    "stripe_subscription_id": session.get("subscription"),
                    "subscription_status": "active",
                    "plan_tier": "pro"
                }}
            )
            
    elif event["type"] == "customer.subscription.deleted":
        subscription = event["data"]["object"]
        await db.restaurants.update_one(
            {"stripe_subscription_id": subscription["id"]},
            {"$set": {
                "subscription_status": "canceled",
                "plan_tier": "starter"
            }}
        )
        
    elif event["type"] == "invoice.payment_failed":
        subscription_id = event["data"]["object"].get("subscription")
        if subscription_id:
            await db.restaurants.update_one(
                {"stripe_subscription_id": subscription_id},
                {"$set": {"subscription_status": "past_due"}}
            )
            
    elif event["type"] == "invoice.payment_succeeded":
        subscription_id = event["data"]["object"].get("subscription")
        if subscription_id:
            # Optionally update status back to active if it was past_due
            await db.restaurants.update_one(
                {"stripe_subscription_id": subscription_id},
                {"$set": {"subscription_status": "active"}}
            )

    return {"status": "success"}