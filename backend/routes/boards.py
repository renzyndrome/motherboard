from fastapi import APIRouter, HTTPException, Depends
from models.board import Board, BoardCreate, Stage, Item, StageCreate
from typing import List, Dict
from datetime import datetime
import json
import mysql.connector
from mysql.connector import Error
from config import Settings
from .auth import get_current_user
from slugify import slugify

router = APIRouter(
    prefix="/boards",
    tags=["boards"]
)

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

@router.post("/")
async def create_board(board: BoardCreate, current_user = Depends(get_current_user)):
    board.user_id = current_user['id']
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Create board with authenticated user as owner
        board_id = slugify(board.title)
        cursor.execute("SELECT id FROM boards WHERE id = %s", (board_id,))
        if cursor.fetchone():
            board_id = f"{board_id}-{int(datetime.now().timestamp())}"
            
        cursor.execute(
            "INSERT INTO boards (id, user_id, title) VALUES (%s, %s, %s)",
            (board_id, board.user_id, board.title)
        )
        
        # Create default stage
        stage_id = f"newbie_{board_id}"
        cursor.execute(
            "INSERT INTO stages (id, board_id, title, position) VALUES (%s, %s, %s, %s)",
            (stage_id, board_id, "Newbie", 1)
        )
        
        # Create default item
        item_id = f"item_{datetime.now().timestamp()}"
        cursor.execute(
            """INSERT INTO items 
               (id, content, stage_id, description, status, progress, subtasks, activities) 
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
            (
                item_id,
                "Welcome to your spiritual journey!",
                stage_id,
                "This is your first step",
                "In Progress",
                0,
                "[]",
                "[]"
            )
        )
            
        conn.commit()
        return {"id": board_id, "title": board.title, "user_id": board.user_id}
    finally:
        cursor.close()
        conn.close()

@router.get("/")
async def get_boards(current_user = Depends(get_current_user)):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
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
        """, (current_user['id'],))
        
        boards = cursor.fetchall()
        return boards
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

from .auth import get_current_user

@router.get("/{board_id}")
async def get_board(board_id: str, current_user = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        # First verify board ownership
        cursor.execute("SELECT user_id FROM boards WHERE id = %s", (board_id,))
        board = cursor.fetchone()
        
        if not board:
            raise HTTPException(status_code=404, detail="Board not found")
        
        if board['user_id'] != current_user['id']:
            raise HTTPException(status_code=403, detail="Not authorized to access this board")
        
        # Get stages ordered by position and created_at
        cursor.execute("""
            SELECT * FROM stages 
            WHERE board_id = %s 
            ORDER BY position ASC, created_at ASC
        """, (board_id,))
        stages = cursor.fetchall()
        
        # Get items with all their data
        cursor.execute("""
            SELECT * FROM items 
            WHERE stage_id IN (SELECT id FROM stages WHERE board_id = %s)
            ORDER BY created_at ASC
        """, (board_id,))
        items = cursor.fetchall()
        
        # Process JSON fields
        for item in items:
            item['subtasks'] = json.loads(item['subtasks'] or '[]')
            item['activities'] = json.loads(item['activities'] or '[]')
        
        # Organize data
        board = {}
        for stage in stages:
            stage_items = [item for item in items if item['stage_id'] == stage['id']]
            board[stage['id']] = {
                "id": stage['id'],
                "title": stage['title'],
                "position": stage['position'],
                "created_at": stage['created_at'].isoformat() if stage['created_at'] else None,
                "items": stage_items
            }
        
        return {"stages": board}
    finally:
        cursor.close()
        conn.close()

@router.post("/{board_id}/stages")
async def create_stage(board_id: str, stage: StageCreate, current_user = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get the maximum position
        cursor.execute(
            "SELECT MAX(position) FROM stages WHERE board_id = %s",
            (board_id,)
        )
        max_position = cursor.fetchone()[0] or 0
        
        # Generate stage ID
        stage_id = f"{stage.id}_{board_id}"
        
        # Insert with next position
        cursor.execute(
            """INSERT INTO stages (id, board_id, title, position) 
               VALUES (%s, %s, %s, %s)""",
            (stage_id, board_id, stage.title, max_position + 1)
        )
        conn.commit()
        return {"id": stage_id, "title": stage.title, "board_id": board_id}
    finally:
        cursor.close()
        conn.close()

# Add these endpoints at the end of your boards.py file

@router.delete("/{board_id}/stages/{stage_id}")
async def delete_stage(board_id: str, stage_id: str, current_user = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # First verify board ownership
        cursor.execute("SELECT user_id FROM boards WHERE id = %s", (board_id,))
        board = cursor.fetchone()
        
        if not board or board['user_id'] != current_user['id']:
            raise HTTPException(status_code=403, detail="Not authorized")

        # Delete all items in the stage first
        cursor.execute("DELETE FROM items WHERE stage_id = %s", (stage_id,))
        
        # Then delete the stage
        cursor.execute("DELETE FROM stages WHERE id = %s AND board_id = %s", (stage_id, board_id))
        
        # Reorder remaining stages
        cursor.execute("""
            UPDATE stages 
            SET position = position - 1 
            WHERE board_id = %s AND position > (
                SELECT position FROM (
                    SELECT position FROM stages WHERE id = %s
                ) AS p
            )
        """, (board_id, stage_id))
        
        conn.commit()
        return {"message": "Stage deleted successfully"}
    except Error as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@router.post("/{board_id}/items")
async def create_item(board_id: str, item: Item, current_user = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        # Verify board ownership
        cursor.execute("SELECT user_id FROM boards WHERE id = %s", (board_id,))
        board = cursor.fetchone()
        
        if not board or board['user_id'] != current_user['id']:
            raise HTTPException(status_code=403, detail="Not authorized")

        cursor.execute(
            """INSERT INTO items 
               (id, content, stage_id, description, status, progress, subtasks, activities) 
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
            (
                item.id,
                item.content,
                item.stage_id,
                item.description,
                item.status,
                item.progress,
                json.dumps(item.subtasks),
                json.dumps(item.activities)
            )
        )
        conn.commit()
        return {"message": "Item created successfully"}
    finally:
        cursor.close()
        conn.close()

@router.put("/{board_id}/items/{item_id}")
async def update_item(board_id: str, item_id: str, item: Item, current_user = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        # Verify board ownership
        cursor.execute("""
            SELECT b.user_id 
            FROM boards b
            JOIN stages s ON b.id = s.board_id
            JOIN items i ON s.id = i.stage_id
            WHERE b.id = %s AND i.id = %s
        """, (board_id, item_id))
        result = cursor.fetchone()
        
        if not result or result['user_id'] != current_user['id']:
            raise HTTPException(status_code=403, detail="Not authorized")

        # Convert subtasks and activities to JSON-serializable format
        subtasks_json = json.dumps([subtask.dict() for subtask in item.subtasks])
        activities_json = json.dumps([activity.dict() for activity in item.activities])

        cursor.execute(
            """UPDATE items 
               SET content=%s, stage_id=%s, description=%s, status=%s, 
                   progress=%s, subtasks=%s, activities=%s 
               WHERE id=%s""",
            (
                item.content,
                item.stage_id,
                item.description,
                item.status,
                item.progress,
                subtasks_json,
                activities_json,
                item_id
            )
        )
        conn.commit()
        return {"message": "Item updated successfully"}
    except Error as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()
        
@router.delete("/{board_id}/items/{item_id}")
async def delete_item(board_id: str, item_id: str, current_user = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Verify board ownership
        cursor.execute("""
            SELECT b.user_id 
            FROM boards b
            JOIN stages s ON b.id = s.board_id
            JOIN items i ON s.id = i.stage_id
            WHERE b.id = %s AND i.id = %s
        """, (board_id, item_id))
        result = cursor.fetchone()
        
        if not result or result['user_id'] != current_user['id']:
            raise HTTPException(status_code=403, detail="Not authorized")

        cursor.execute("DELETE FROM items WHERE id = %s", (item_id,))
        conn.commit()
        return {"message": "Item deleted successfully"}
    finally:
        cursor.close()
        conn.close()




        