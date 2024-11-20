
from fastapi import APIRouter, Depends, HTTPException
from models.user import User, UserResponse
from models.discipleship import Discipleship, DiscipleshipCreate
from typing import List
import mysql.connector
from mysql.connector import Error
from config import Settings
from datetime import datetime
from .auth import get_current_user
import json

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

@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: str):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user
    finally:
        cursor.close()
        conn.close()

@router.get("/opposite-role", response_model=List[UserResponse])
async def get_users_by_opposite_role(current_user: UserResponse = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        opposite_role = "Discipler" if current_user["role"] == "Disciple" else "Disciple"

        cursor.execute("SELECT * FROM users WHERE role = %s", (opposite_role,))
        users = cursor.fetchall()

        # Decode interests for each user
        for user in users:
            if user.get("interests") and isinstance(user["interests"], str):
                user["interests"] = json.loads(user["interests"])

        return users
    finally:
        cursor.close()
        conn.close()

@router.get("/suggested-matches")
async def suggested_matches(current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # Fetch all users except the current user
        cursor.execute("SELECT * FROM users WHERE id != %s", (current_user["id"],))
        all_users = cursor.fetchall()

        suggestions = []

        for user in all_users:
            # Decode interests if it's stored as a JSON string
            if isinstance(user["interests"], str):
                user["interests"] = json.loads(user["interests"])

            # Calculate common interests
            common_interests = set(current_user["interests"]) & set(user["interests"])

            # Calculate age difference
            age_difference = abs(current_user["age"] - user["age"])
            within_age_range = age_difference <= 5  # Example: within 5 years

            # Check location similarity
            same_location = current_user["location"].lower() == user["location"].lower()

            # Add match score
            match_score = len(common_interests)
            if within_age_range:
                match_score += 1
            if same_location:
                match_score += 1

            suggestions.append({
                "id": user["id"],
                "name": user["name"],
                "email": user["email"],
                "location": user["location"],
                "common_interests": list(common_interests),
                "within_age_range": within_age_range,
                "same_location": same_location,
                "match_score": match_score,
            })

        # Sort suggestions by match score, descending
        suggestions.sort(key=lambda x: x["match_score"], reverse=True)

        return suggestions
    finally:
        cursor.close()
        conn.close()




@router.get("/discipler/{discipler_id}/disciples")
async def get_disciples(discipler_id: str):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute("""
            SELECT u.* FROM users u
            JOIN discipleship d ON u.id = d.disciple_id
            WHERE d.discipler_id = %s
        """, (discipler_id,))
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()

@router.get("/disciple/{disciple_id}/discipler")
async def get_discipler(disciple_id: str):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute("""
            SELECT u.* FROM users u
            JOIN discipleship d ON u.id = d.discipler_id
            WHERE d.disciple_id = %s
        """, (disciple_id,))
        return cursor.fetchone()
    finally:
        cursor.close()
        conn.close()

@router.post("/discipleship")
async def create_discipleship(discipleship: DiscipleshipCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute(
            "INSERT INTO discipleship (id, discipler_id, disciple_id) VALUES (%s, %s, %s)",
            (f"disc_{datetime.now().timestamp()}", discipleship.discipler_id, discipleship.disciple_id)
        )
        conn.commit()
        return {"message": "Discipleship relationship created"}
    finally:
        cursor.close()
        conn.close()

@router.get("/{user_id}/boards")
async def get_user_boards(user_id: str):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute("""
            SELECT b.*, 
                   COUNT(DISTINCT s.id) as stage_count, 
                   COUNT(DISTINCT i.id) as item_count
            FROM boards b
            LEFT JOIN stages s ON b.id = s.board_id
            LEFT JOIN items i ON s.id = i.stage_id
            WHERE b.user_id = %s
            GROUP BY b.id
            ORDER BY b.created_at DESC
        """, (user_id,))
        
        boards = cursor.fetchall()
        return boards if boards else []
    finally:
        cursor.close()
        conn.close()
