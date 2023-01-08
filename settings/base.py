from os.path import abspath, dirname

from pydantic import BaseSettings

BASE_DIR = dirname(dirname(abspath(__file__)))

__all__ = ["settings"]


class Settings(BaseSettings):
    host: str
    port: int
    reload: str


settings = Settings()
