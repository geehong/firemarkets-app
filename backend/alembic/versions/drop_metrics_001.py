"""drop unnecessary metrics columns

Revision ID: drop_metrics_001
Revises: expand_onchain_metrics_001
Create Date: 2026-01-12 10:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'drop_metrics_001'
down_revision: Union[str, None] = 'expand_onchain_metrics_001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop columns from crypto_metrics
    op.drop_column('crypto_metrics', 'miner_reserves')
    op.drop_column('crypto_metrics', 'nrpl_btc')
    op.drop_column('crypto_metrics', 'open_interest_futures')


def downgrade() -> None:
    op.add_column('crypto_metrics', sa.Column('open_interest_futures', sa.JSON(), nullable=True))
    op.add_column('crypto_metrics', sa.Column('nrpl_btc', sa.DECIMAL(precision=24, scale=10), nullable=True))
    op.add_column('crypto_metrics', sa.Column('miner_reserves', sa.DECIMAL(precision=24, scale=10), nullable=True))
