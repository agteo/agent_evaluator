from __future__ import annotations

import argparse
import asyncio
import logging
from datetime import datetime

from app.config import get_settings
from app.database import async_session, init_db
from app.services import connection_service


logger = logging.getLogger(__name__)


async def run_once() -> int:
    await init_db()
    async with async_session() as db:
        due_connections = await connection_service.list_due_connections(db, datetime.utcnow())

    if not due_connections:
        logger.info("No scheduled connections due")
        return 0

    processed = 0
    for connection in due_connections:
        async with async_session() as db:
            fresh = await connection_service.get_connection(db, connection.id)
            if fresh is None:
                continue
            logger.info("Running scheduled sync for connection %s (%s)", fresh.id, fresh.name)
            await connection_service.run_connection_sync(db, fresh, trigger_mode="scheduled")
            processed += 1

    logger.info("Processed %d scheduled connection(s)", processed)
    return processed


async def run_forever() -> None:
    settings = get_settings()
    poll_interval = max(1, settings.sync_worker_poll_interval_seconds)
    logger.info("Starting scheduled sync worker (poll=%ss)", poll_interval)
    await init_db()
    while True:
        try:
            await run_once()
        except Exception:
            logger.exception("Scheduled sync worker iteration failed")
        await asyncio.sleep(poll_interval)


def main() -> None:
    parser = argparse.ArgumentParser(description="Run scheduled connection syncs")
    parser.add_argument("--once", action="store_true", help="Run one polling iteration and exit")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )

    if args.once:
        asyncio.run(run_once())
    else:
        asyncio.run(run_forever())


if __name__ == "__main__":
    main()
