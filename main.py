#!/usr/bin/python3
import os
from time import sleep

import pyautogui
from flask import Flask, request
from flask_cors import CORS
from loguru import logger
from stockfish import Stockfish
import random
from constants import BOARD, FLIPPED_BOARD

LOGGING_LEVEL = os.getenv('LOGGING_LEVEL', 'INFO')
SKILL_LEVEL = int(os.getenv('SKILL_LEVEL', 20))
ELO = int(os.getenv('ELO', 1350))

logger.add('logs/ai.log', format="{time} {level} {message}", level=LOGGING_LEVEL, rotation='2 MB', compression='tar.gz')

app = Flask(__name__)
CORS(app)
file_path = os.path.dirname(os.path.realpath(__file__))
stockfish_engine_path = os.path.join(file_path, "engine/Stockfish_15.1/stockfish-ubuntu-20.04-x86-64")
app.stockfish = Stockfish(path=stockfish_engine_path)
# app.stockfish.update_engine_parameters({"Skill Level": SKILL_LEVEL})
# app.stockfish.set_skill_level(SKILL_LEVEL)
# app.stockfish.set_elo_rating(ELO)
# logger.debug()
app.history = []

html = """
<!DOCTYPE html>
<html>
    <head>
        <title>%s</title>
    </head>
    <body>
        <textarea id="w3review" name="w3review" rows="20" cols="50">
%s
        </textarea>
    </body>
</html>
"""


def best_move(flipped_board):
    current_best_move = app.stockfish.get_best_move(wtime=2000, btime=2000)
    print('AI move:', current_best_move)
    app.stockfish.make_moves_from_current_position([current_best_move])

    current_board = BOARD
    if flipped_board:
        current_board = FLIPPED_BOARD
    move_from = current_best_move[:2]
    move_to = current_best_move[2:4]
    x, y = current_board[move_from]
    pyautogui.click(x, y)
    sleep(random.choice([2, 3, 4, 5]))
    x, y = current_board[move_to]
    app.history.append(current_best_move)
    pyautogui.click(x, y)


@app.route('/board', methods=['GET', 'POST'])
def board():
    response = html % ('Board', app.stockfish.get_board_visual())
    return response


@app.route('/best_move', methods=['GET', 'POST'])
def take_best_move():
    current_best_move = app.stockfish.get_best_move(wtime=1000, btime=1000)
    app.stockfish.make_moves_from_current_position([current_best_move])
    response = html % ('Best Move', app.stockfish.get_board_visual())
    return response


@app.route("/first_move", methods=['GET', 'POST'])
def first_move():
    best_move(False)
    return {'status': 'ok'}


@app.route("/move", methods=['POST'])
def move():
    data = request.json
    move_to = f'{data["move_from"]}{data["move_to"]}'
    if move_to not in app.history[-2:]:
        app.history.append(move_to)
        print("---" * 30)
        print("Move to:", move_to)
        app.stockfish.make_moves_from_current_position([move_to])
        print('Take AI move')
        best_move(data["flipped_board"])
        print(app.stockfish.get_board_visual())
    return {'status': 'ok'}


@app.route("/reset", methods=['GET', 'POST'])
def reset():
    app.stockfish.set_fen_position("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1")
    app.history = []
    if request.method == "POST":
        return {'status': 'ok'}
    else:
        response = html % ('Reset', app.stockfish.get_board_visual())
        return response


if __name__ == '__main__':
    logger.info("Chess AI")
    app.run(debug=True, use_reloader=True)
