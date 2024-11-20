
from fastapi import APIRouter, HTTPException, Depends
from models.user import User, UserResponse
import bcrypt
import jwt
import json
from datetime import datetime, timedelta
from config import Settings
import mysql.connector
from mysql.connector import Error
from fastapi.security import OAuth2PasswordBearer

router = APIRouter()

def get_db_connection():
    try:
        conn = mysql.connector.connect(
            host=Settings.DB_HOST,
            user=Settings.DB_USER,
            password=Settings.DB_PASSWORD,
            database=Settings.DB_NAME
        )
        return conn
    except Error as e:
        raise HTTPException(status_code=500, detail="Database connection error")

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=Settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, Settings.SECRET_KEY, algorithm=Settings.ALGORITHM)
    return encoded_jwt

@router.post("/signup", response_model=UserResponse)
async def signup(user: User):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        hashed_password = bcrypt.hashpw(user.password.encode(), bcrypt.gensalt())
        cursor.execute(
            """INSERT INTO users (id, name, role, age, location, interests, email, password) 
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
            (user.id, user.name, user.role, user.age, user.location, 
             json.dumps(user.interests), user.email, hashed_password)
        )
        conn.commit()
        return {**user.dict(exclude={'password'})}
    finally:
        cursor.close()
        conn.close()
from pydantic import BaseModel

class LoginData(BaseModel):
    email: str
    password: str

@router.post("/login")
async def login(login_data: LoginData):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute("SELECT * FROM users WHERE email = %s", (login_data.email,))
        user = cursor.fetchone()
        
        if not user or not bcrypt.checkpw(login_data.password.encode(), user['password'].encode()):
            raise HTTPException(status_code=401, detail="Invalid credentials")
            
        access_token = create_access_token({"sub": user['email'], "user_id": user['id']})
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {**user, 'password': None}
        }
    finally:
        cursor.close()
        conn.close()

from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, Settings.SECRET_KEY, algorithms=[Settings.ALGORITHM])
        email = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()

        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        
        # Decode interests if it exists and is a string
        if user.get("interests") and isinstance(user["interests"], str):
            user["interests"] = json.loads(user["interests"])
        
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.JWTError as e:
        raise HTTPException(status_code=401, detail="Could not validate credentials")





