import sqlite3
from collections.abc import Iterator
from typing import Annotated

from fastapi import Depends

from app.config import get_database_path


def get_connection() -> Iterator[sqlite3.Connection]:
    # check_same_thread=False: FastAPI runs the dependency and the handler in different worker threads
    connection = sqlite3.connect(get_database_path(), check_same_thread=False)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    try:
        yield connection
    finally:
        connection.close()


Connection = Annotated[sqlite3.Connection, Depends(get_connection)]
