"""merge_heads

Revision ID: 1e4cb05459f1
Revises: d8102f502733, drop_metrics_001
Create Date: 2026-01-28 09:11:10.474736

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1e4cb05459f1'
down_revision: Union[str, None] = ('d8102f502733', 'drop_metrics_001')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
