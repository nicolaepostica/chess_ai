from loguru import logger
import os

LOGGING_LEVEL = os.getenv('LOGGING_LEVEL', 'INFO')

logger.add('logs/ai.log', format="{time} {level} {message}", level=LOGGING_LEVEL, rotation='2 MB', compression='tar.gz')

if __name__ == '__main__':
    logger.info("Chess AI")
