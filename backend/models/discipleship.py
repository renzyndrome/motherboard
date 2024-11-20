from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class Discipleship(BaseModel):
    id: str
    discipler_id: Optional[str]
    disciple_id: Optional[str]
    start_date: datetime = datetime.now()

class DiscipleshipCreate(BaseModel):
    discipler_id: str
    disciple_id: str

class DiscipleshipResponse(BaseModel):
    id: str
    discipler_id: str
    disciple_id: str
    start_date: datetime
