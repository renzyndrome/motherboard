# database.py
from fastapi import HTTPException
from mysql.connector import Error
import mysql.connector
from config import Settings

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

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Create boards table first (if not exists)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS boards (
                id VARCHAR(50) PRIMARY KEY,
                user_id VARCHAR(50) NOT NULL,
                title VARCHAR(100) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)
        
        # Create stages table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS stages (
                id VARCHAR(50) PRIMARY KEY,
                board_id VARCHAR(50),
                title VARCHAR(100) NOT NULL,
                position INT NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (board_id) REFERENCES boards(id)
            )
        """)
        
        # Create items table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS items (
                id VARCHAR(50) PRIMARY KEY,
                content TEXT NOT NULL,
                stage_id VARCHAR(50),
                description TEXT,
                status VARCHAR(50) DEFAULT 'In Progress',
                progress INT DEFAULT 0,
                subtasks JSON,
                activities JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (stage_id) REFERENCES stages(id)
            )
        """)
        
        conn.commit()
    except Error as e:
        print(f"Error initializing database: {e}")
        raise HTTPException(status_code=500, detail="Database initialization error")
    finally:
        cursor.close()
        conn.close()