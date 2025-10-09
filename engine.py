import os

from stockfish import Stockfish

ENGINE_PATH = os.getenv('ENGINE_PATH', False)

stockfish = Stockfish(path=ENGINE_PATH)
print(stockfish.get_board_visual())
stockfish.make_moves_from_current_position(['e2e4', 'd7d5', 'e4d5'])
print(stockfish.get_board_visual())


class Engine:
    def __init__(self):
        self.core = Stockfish(path=ENGINE_PATH)
