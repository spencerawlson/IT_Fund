from fastapi import FastAPI, Depends, HTTPException, status, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import Optional
import secrets
import time

app = FastAPI(title="ITFund Auth API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- in-memory stores for teaching/demo ----
USERS: dict[str, dict] = {}
TOKENS: dict[str, dict] = {}
OTPS: dict[str, dict] = {}
RESET_TOKENS: dict[str, dict] = {}

# ---- models ----
class RegisterReq(BaseModel):
    email: EmailStr
    password: str

class LoginReq(BaseModel):
    email: EmailStr
    password: str

class VerifyOtpReq(BaseModel):
    email: EmailStr
    otpCode: str

class ResendOtpReq(BaseModel):
    email: EmailStr

class ForgotPasswordReq(BaseModel):
    email: EmailStr

class ResetPasswordReq(BaseModel):
    resetToken: str
    newPassword: str

class TokenRes(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserOut(BaseModel):
    id: str
    email: EmailStr
    role: str = "user"

# ---- helpers ----
def _now() -> int:
    return int(time.time())

def _issue_token(user_id: str) -> str:
    token = secrets.token_urlsafe(32)
    TOKENS[token] = {"user_id": user_id, "created_at": _now()}
    return token

def _user_from_token(token: Optional[str]) -> Optional[dict]:
    if not token:
        return None
    rec = TOKENS.get(token)
    if not rec:
        return None
    user = USERS.get(rec["user_id"])
    return user

def _current_user(token: Optional[str] = None) -> dict:
    user = _user_from_token(token)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
    return user

# ---- routes ----
@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/auth/register", response_model=TokenRes)
def register(body: RegisterReq):
    for u in USERS.values():
        if u["email"] == body.email:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    user_id = secrets.token_urlsafe(12)
    USERS[user_id] = {"id": user_id, "email": body.email, "password": body.password, "role": "user"}

    # demo OTP flow
    otp = f"{secrets.randbelow(900000) + 100000}"
    OTPS[body.email] = {"code": otp, "created_at": _now(), "user_id": user_id}

    token = _issue_token(user_id)
    return TokenRes(access_token=token)

@app.post("/auth/verify-otp", response_model=TokenRes)
def verify_otp(body: VerifyOtpReq):
    rec = OTPS.get(body.email)
    if not rec or rec["code"] != body.otpCode:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired OTP")
    user_id = rec["user_id"]
    token = _issue_token(user_id)
    return TokenRes(access_token=token)

@app.post("/auth/resend-otp")
def resend_otp(body: ResendOtpReq):
    rec = OTPS.get(body.email)
    if not rec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email not found")
    otp = f"{secrets.randbelow(900000) + 100000}"
    OTPS[body.email] = {"code": otp, "created_at": _now(), "user_id": rec["user_id"]}
    return {"status": "ok"}

@app.post("/auth/login", response_model=TokenRes)
def login(body: LoginReq):
    for u in USERS.values():
        if u["email"] == body.email and u["password"] == body.password:
            token = _issue_token(u["id"])
            return TokenRes(access_token=token)
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

@app.post("/auth/forgot-password")
def forgot_password(body: ForgotPasswordReq):
    rec = next((u for u in USERS.values() if u["email"] == body.email), None)
    if rec:
        reset_token = secrets.token_urlsafe(24)
        RESET_TOKENS[reset_token] = {"user_id": rec["id"], "created_at": _now()}
    return {"status": "ok"}

@app.post("/auth/reset-password")
def reset_password(body: ResetPasswordReq):
    rec = RESET_TOKENS.get(body.resetToken)
    if not rec:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token")
    user = USERS.get(rec["user_id"])
    if user:
        user["password"] = body.newPassword
    return {"status": "ok"}

@app.get("/auth/me", response_model=UserOut)
def auth_me(authorization: Optional[str] = Header(None)):
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
    user = _current_user(token)
    return UserOut(id=user["id"], email=user["email"], role=user.get("role", "user"))

@app.post("/auth/logout")
def logout(authorization: Optional[str] = Header(None)):
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
    if token and token in TOKENS:
        del TOKENS[token]
    return {"status": "ok"}

@app.get("/api/auth/{provider}")
def auth_provider_redirect(provider: str, redirectTo: str = "/"):
    return HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail=f"{provider} redirect not implemented")

# dev-only: inspect users
@app.get("/api/dev/users")
def dev_users():
    return [{"id": u["id"], "email": u["email"]} for u in USERS.values()]
