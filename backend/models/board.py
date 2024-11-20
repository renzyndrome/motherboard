from pydantic import BaseModel
from typing import List, Dict, Optional
from datetime import datetime

class Subtask(BaseModel):
    text: str
    completed: bool = False

    def dict(self, *args, **kwargs):
        return {"text": self.text, "completed": self.completed}

class Activity(BaseModel):
    text: str
    timestamp: datetime
    file: Optional[dict] = None

    def dict(self, *args, **kwargs):
        return {
            "text": self.text,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "file": self.file
        }

class Item(BaseModel):
    id: str
    content: str
    stage_id: str
    description: Optional[str] = None
    status: Optional[str] = "In Progress"
    progress: Optional[int] = 0
    subtasks: List[Subtask] = []
    activities: List[Activity] = []

class Stage(BaseModel):
    id: str
    title: str
    position: int
    board_id: str
    items: List[Item] = []

class StageCreate(BaseModel):
    id: str
    title: str
    position: Optional[int] = None
    board_id: str

class Board(BaseModel):
    id: str
    user_id: str
    title: str
    stages: Dict[str, Stage] = {}
    created_at: Optional[datetime] = None

class BoardCreate(BaseModel):
    user_id: str
    title: str
