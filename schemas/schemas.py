from pydantic import BaseModel

__all__ = ["Move"]


class Move(BaseModel):
    move_from: str
    move_to: str
    inversed_board: bool
