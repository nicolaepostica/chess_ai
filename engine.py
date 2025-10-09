import os

from stockfish import Stockfish

current_path = os.path.dirname(os.path.realpath(__file__))
v15_engine_path = "engine/Stockfish_15.1/stockfish-ubuntu-20.04-x86-64"
v17_engine_path = "engine/Stockfish_17.1/stockfish-ubuntu-x86-64-avx2"


stockfish = Stockfish(path=v17_engine_path)
print(stockfish.get_board_visual())
stockfish.make_moves_from_current_position(['e2e4', 'd7d5', 'e4d5'])
print(stockfish.get_board_visual())

class Engine:
    def __init__(self):
        self.core = Stockfish(path=os.path.join(current_path, v17_engine_path))

