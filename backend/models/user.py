from pydantic import BaseModel
from typing import List, Optional
from enum import Enum

class UserRole(str, Enum):
    DISCIPLER = "Discipler"
    DISCIPLE = "Disciple"

class User(BaseModel):
    id: str
    name: str
    role: UserRole
    age: int
    location: str
    interests: List[str]
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    name: str
    role: UserRole
    age: int
    location: str
    interests: List[str]
    email: str
