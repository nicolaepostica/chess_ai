import os

from stockfish import Stockfish

file_path = os.path.dirname(os.path.realpath(__file__))
stockfish_engine_path = os.path.join(file_path, "engine/Stockfish_15.1/stockfish-ubuntu-20.04-x86-64")
stockfish = Stockfish(path=stockfish_engine_path)
print(stockfish.get_board_visual())
stockfish.make_moves_from_current_position(['e2e4', 'd7d5', 'e4d5'])
print(stockfish.get_board_visual())
