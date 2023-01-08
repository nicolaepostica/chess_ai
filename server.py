import pyautogui
import uvicorn
from fastapi import FastAPI, status
import os
from stockfish import Stockfish
from fastapi.responses import HTMLResponse
from schemas import Move
from constants import BOARD, INVERSED_BOARD
from settings import settings
from starlette.middleware.cors import CORSMiddleware
from time import sleep

html = """
<!DOCTYPE html>
<html>
    <head>
        <title>Chess</title>
    </head>
    <body>
        <textarea id="w3review" name="w3review" rows="20" cols="50">
%s
        </textarea>
    </body>
</html>
"""

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

file_path = os.path.dirname(os.path.realpath(__file__))
stockfish_engine_path = os.path.join(file_path, "engine/Stockfish_15.1/stockfish-ubuntu-20.04-x86-64")
app.stockfish = Stockfish(path=stockfish_engine_path)
# app.stockfish = 'Stockfish(path=stockfish_engine_path)'


@app.get("/reset")
async def reset():
    app.stockfish = Stockfish(path=stockfish_engine_path)
    return {'status': status.HTTP_200_OK}


@app.get("/board")
async def board():
    print(app.stockfish.get_board_visual())
    return HTMLResponse(html % app.stockfish.get_board_visual())


@app.get("/")
async def get():
    # print(app.stockfish.get_fen_position())
    print(app.stockfish.get_board_visual())
    best_move = app.stockfish.get_best_move(wtime=1000, btime=1000)
    app.stockfish.make_moves_from_current_position([best_move])
    print(app.stockfish.get_board_visual())
    best_move = app.stockfish.get_best_move(wtime=1000, btime=1000)
    app.stockfish.make_moves_from_current_position([best_move])
    print(best_move)

    return {'status': status.HTTP_200_OK}

def best_move(inversed_board):
    best_move = app.stockfish.get_best_move(wtime=1000, btime=1000)
    print('AI move:', best_move)
    app.stockfish.make_moves_from_current_position([best_move])

    board = BOARD
    if inversed_board:
        board = INVERSED_BOARD
    move_from = best_move[:2]
    move_to = best_move[2:4]
    x, y = board[move_from]
    pyautogui.click(x, y)
    # sleep(0.2)
    x, y = board[move_to]
    pyautogui.click(x, y)

@app.get("/first_move")
async def first_move():
    best_move(False)
    return {'status': status.HTTP_200_OK}


@app.post("/move")
async def move(data: Move):
    print(data)
    move_to = f'{data.move_from}{data.move_to}'
    print("Move to:", move_to)
    app.stockfish.set_position([move_to])
    print('Take AI move')
    best_move(data.inversed_board)

    return {'status': status.HTTP_200_OK}


if __name__ == "__main__":
    uvicorn.run("server:app", host=settings.host, port=settings.port, reload=settings.reload)
