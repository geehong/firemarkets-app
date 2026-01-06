# Backend Utility Scripts

This directory contains utility scripts for database maintenance, data migration, and manual collection triggers.

## Available Scripts

### `delete_empty_news.py`

**Description:**
Removes `raw_news` records that contain **only a title**. This implies that both the `content` and `description` fields are empty (or contain irrelevant empty structures). Use this to clean up low-quality news items.

**Usage:**

The recommended way to run this script is within the Docker container to ensure database connectivity.

```bash
# Run from project root
docker-compose exec backend python scripts/delete_empty_news.py
```

**Local Execution:**

If you wish to run it locally, ensure your environment is set up and `.env` file is in the project root containing `POSTGRES_DATABASE_URL`.

```bash
cd backend
python scripts/delete_empty_news.py
```

---
