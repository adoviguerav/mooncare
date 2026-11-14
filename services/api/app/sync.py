"""Synchronisation between the MOON and EARTH servers.

The moon works on its own. When it chooses, it connects to earth and:
- push: sends the rows the moon writes (readings and check-ins) that earth does not have yet.
- pull: downloads the rows earth writes (configuration and crew) that changed since the last pull,
  replacing its own copy.

Each table is written on one server only, so a row never changes on both sides and there is nothing to
merge. Every change bumps the row's sync_seq (database/postgresql/schema/03_sync.sql), and a sync sends the
rows above the last sync_seq already sent. Applying a row is an upsert on its primary key, so sending the
same rows twice, for example after a dropped link, does no harm. Every sync is recorded in his.sync_operation,
on both servers, whether it worked or not. Deleted rows are not synchronised: the API never deletes.
"""

from collections.abc import Sequence
from datetime import UTC, date, datetime
from typing import Any, Literal, Protocol

from sqlalchemy import Date, DateTime, Table, literal_column, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app import models

Direction = Literal["push", "pull", "received_push", "served_pull"]
Row = dict[str, Any]
Changes = dict[str, list[Row]]  # "schema.table" -> rows, as JSON-friendly values

# Written on earth and downloaded by the moon, in foreign key order
EARTH_TABLES: list[Table] = [
    models.Source.__table__,  # type: ignore[list-item]
    models.Indicator.__table__,  # type: ignore[list-item]
    models.Rule.__table__,  # type: ignore[list-item]
    models.CrewMember.__table__,  # type: ignore[list-item]
    models.AppUser.__table__,  # type: ignore[list-item]  # users and PIN hashes: the crew signs in with no link
    models.DailyTask.__table__,  # type: ignore[list-item]
]
# Written on the moon and sent to earth
MOON_TABLES: list[Table] = [
    models.Reading.__table__,  # type: ignore[list-item]
    models.StationDose.__table__,  # type: ignore[list-item]  # the base's own dosimeters
    models.TaskCompletion.__table__,  # type: ignore[list-item]
]

ROWS_PER_PUSH = 5000  # one push request carries at most this many rows; the rest go in the next ones
ROWS_PER_INSERT = 1000
SYNC_SEQ = literal_column("sync_seq")


class SyncError(Exception):
    """The other server could not be reached or refused the sync. The message goes to the history."""


def table_key(table: Table) -> str:
    return f"{table.schema}.{table.name}"


def now() -> datetime:
    return datetime.now(UTC)


# --- Reading and writing changes ---


def to_json_value(value: Any) -> Any:
    # date covers datetime too: both travel as ISO 8601 text
    return value.isoformat() if isinstance(value, date) else value


def from_json_value(table: Table, column: str, value: Any) -> Any:
    if value is None:
        return value
    column_type = table.c[column].type
    if isinstance(column_type, DateTime):
        return datetime.fromisoformat(value)
    if isinstance(column_type, Date):
        return date.fromisoformat(value)
    return value


def collect_changes(
    session: Session, tables: Sequence[Table], since_seq: int, limit: int | None = None
) -> tuple[Changes, int]:
    """Rows changed after since_seq, oldest change first, and the sync_seq of the last one included.

    With a limit, it keeps the `limit` oldest changes across all the tables, so the returned sync_seq is a
    point everything before has been included, and the next call can start right there.
    """
    found: list[tuple[int, Table, Row]] = []
    for table in tables:
        query = select(*table.c, SYNC_SEQ).select_from(table).where(SYNC_SEQ > since_seq).order_by(SYNC_SEQ)
        if limit is not None:
            query = query.limit(limit)
        for row in session.execute(query).mappings():
            values = {column.name: to_json_value(row[column.name]) for column in table.c}
            found.append((row["sync_seq"], table, values))

    found.sort(key=lambda change: change[0])
    if limit is not None:
        found = found[:limit]

    changes: Changes = {}
    for _, table, values in found:
        changes.setdefault(table_key(table), []).append(values)
    to_seq = found[-1][0] if found else since_seq
    return changes, to_seq


def count_rows(changes: Changes) -> int:
    return sum(len(rows) for rows in changes.values())


def apply_changes(session: Session, tables: Sequence[Table], changes: Changes) -> int:
    """Upserts the rows into the given tables, in their order. Refuses any other table or column.

    Does not commit: the caller commits it together with the history record.
    """
    allowed = {table_key(table): table for table in tables}
    unknown = set(changes) - set(allowed)
    if unknown:
        raise ValueError(f"These tables cannot be synchronised in this direction: {sorted(unknown)}")

    applied = 0
    for key, table in allowed.items():
        rows = changes.get(key, [])
        if not rows:
            continue
        columns = {column.name for column in table.c}
        for row in rows:
            if set(row) != columns:
                raise ValueError(f"Rows of {key} must have exactly the columns {sorted(columns)}")
        primary_key = [column.name for column in table.primary_key]
        for start in range(0, len(rows), ROWS_PER_INSERT):
            batch = [
                {column: from_json_value(table, column, value) for column, value in row.items()}
                for row in rows[start : start + ROWS_PER_INSERT]
            ]
            statement = insert(table).values(batch)
            updated = {name: statement.excluded[name] for name in columns if name not in primary_key}
            statement = (
                statement.on_conflict_do_update(index_elements=primary_key, set_=updated)
                if updated
                else statement.on_conflict_do_nothing(index_elements=primary_key)
            )
            session.execute(statement)
        applied += len(rows)
    return applied


# --- History ---


def record_operation(
    session: Session,
    direction: Direction,
    peer: str,
    started_at: datetime,
    *,
    error: str | None = None,
    row_count: int = 0,
    from_seq: int | None = None,
    to_seq: int | None = None,
) -> models.SyncOperation:
    operation = models.SyncOperation(
        direction=direction,
        peer=peer,
        started_at=started_at,
        finished_at=now(),
        status="failed" if error else "ok",
        row_count=row_count,
        from_seq=from_seq,
        to_seq=None if error else to_seq,
        error=error,
    )
    session.add(operation)
    session.flush()
    return operation


def save(session: Session, operation: models.SyncOperation) -> models.SyncOperation:
    """Commits and detaches the record, so a later rollback in the same session cannot expire it."""
    session.commit()
    session.refresh(operation)
    session.expunge(operation)
    return operation


def last_synced_seq(session: Session, direction: Direction) -> int:
    """Where the next sync in this direction starts: the to_seq of the last successful one, or 0."""
    to_seq = session.scalar(
        select(models.SyncOperation.to_seq)
        .where(models.SyncOperation.direction == direction, models.SyncOperation.status == "ok")
        .order_by(models.SyncOperation.id.desc())
        .limit(1)
    )
    return to_seq or 0


def count_pending_push(session: Session) -> int:
    """Moon rows that earth does not have yet."""
    since_seq = last_synced_seq(session, "push")
    return sum(
        session.scalar(select(literal_column("count(*)")).select_from(table).where(SYNC_SEQ > since_seq)) or 0
        for table in MOON_TABLES
    )


# --- Earth side: what the moon calls ---


def receive_push(session: Session, changes: Changes, peer: str = "moon") -> int:
    """Applies the moon's rows. Only moon tables are accepted: the moon cannot overwrite configuration."""
    started_at = now()
    try:
        applied = apply_changes(session, MOON_TABLES, changes)
    except Exception as error:
        session.rollback()
        record_operation(session, "received_push", peer, started_at, error=describe_error(error))
        session.commit()
        raise
    record_operation(session, "received_push", peer, started_at, row_count=applied)
    session.commit()
    return applied


def serve_pull(session: Session, since_seq: int, peer: str = "moon") -> tuple[Changes, int]:
    started_at = now()
    changes, to_seq = collect_changes(session, EARTH_TABLES, since_seq)
    record_operation(
        session, "served_pull", peer, started_at, row_count=count_rows(changes), from_seq=since_seq, to_seq=to_seq
    )
    session.commit()
    return changes, to_seq


# --- Moon side: calling earth ---


class EarthServer(Protocol):
    """How the moon talks to earth. Over HTTP in the app (app/sync_client.py), in-process in the tests."""

    url: str

    def push(self, changes: Changes) -> int: ...

    def pull(self, since_seq: int) -> tuple[Changes, int]: ...


def describe_error(error: Exception) -> str:
    """A short reason for the history. Never the rows themselves: they may hold medical data."""
    if isinstance(error, SyncError):
        return str(error)
    return f"{type(error).__name__}: {str(error).splitlines()[0][:300] if str(error) else ''}"


def push_to_earth(session: Session, earth: EarthServer) -> models.SyncOperation:
    """Sends earth every moon row it does not have yet, in batches. Records the outcome."""
    started_at = now()
    since_seq = last_synced_seq(session, "push")
    sent_up_to = since_seq
    sent = 0
    try:
        while True:
            changes, batch_to_seq = collect_changes(session, MOON_TABLES, sent_up_to, limit=ROWS_PER_PUSH)
            # With nothing to send, earth is still called once: a push is also how the moon learns the link works,
            # and an "ok" in the history must mean earth was reached
            if not changes and sent_up_to != since_seq:
                break
            earth.push(changes)
            sent += count_rows(changes)
            sent_up_to = batch_to_seq
            if not changes:
                break
    except Exception as error:
        session.rollback()
        # Batches earth already applied are sent again next time; applying them twice changes nothing
        operation = record_operation(session, "push", earth.url, started_at, error=describe_error(error))
        return save(session, operation)
    operation = record_operation(
        session, "push", earth.url, started_at, row_count=sent, from_seq=since_seq, to_seq=sent_up_to
    )
    return save(session, operation)


def pull_from_earth(session: Session, earth: EarthServer) -> models.SyncOperation:
    """Downloads earth's rows changed since the last pull and replaces the moon's copy. All or nothing."""
    started_at = now()
    since_seq = last_synced_seq(session, "pull")
    try:
        changes, to_seq = earth.pull(since_seq)
        applied = apply_changes(session, EARTH_TABLES, changes)
    except Exception as error:
        session.rollback()
        operation = record_operation(session, "pull", earth.url, started_at, error=describe_error(error))
        return save(session, operation)
    operation = record_operation(
        session, "pull", earth.url, started_at, row_count=applied, from_seq=since_seq, to_seq=to_seq
    )
    return save(session, operation)
