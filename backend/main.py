from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from routes import auth, boards, users
import mysql.connector
from mysql.connector import Error
from config import settings
import os
from datetime import datetime
from routes.users import router as users_router

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

def get_db_connection():
    try:
        conn = mysql.connector.connect(
            host=settings.DB_HOST,
            user=settings.DB_USER,
            password=settings.DB_PASSWORD,
            database=settings.DB_NAME
        )
        return conn
    except Error as e:
        print(f"Error connecting to MySQL: {e}")
        raise HTTPException(status_code=500, detail="Database connection error")

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Create users table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                role VARCHAR(50) NOT NULL,
                age INT NOT NULL,
                location VARCHAR(100) NOT NULL,
                interests JSON,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create boards table
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
                board_id VARCHAR(50) NOT NULL,
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
                FOREIGN KEY (stage_id) REFERENCES stages(id)
            )
        """)
        
        # Create discipleship table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS discipleship (
                id VARCHAR(50) PRIMARY KEY,
                discipler_id VARCHAR(50),
                disciple_id VARCHAR(50) UNIQUE,
                start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (discipler_id) REFERENCES users(id),
                FOREIGN KEY (disciple_id) REFERENCES users(id)
            )
        """)
        
        conn.commit()
    except Error as e:
        print(f"Error initializing database: {e}")
        raise HTTPException(status_code=500, detail="Database initialization error")
    finally:
        cursor.close()
        conn.close()

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    init_db()

# Include routers
app.include_router(auth.router, prefix="/auth")
app.include_router(boards.router)
app.include_router(users.router, prefix="/users", tags=["Users"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=settings.API_PORT)
