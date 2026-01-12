"""add expanded onchain metrics

Revision ID: expand_onchain_metrics_001
Revises: d8f15d289531
Create Date: 2026-01-12 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'expand_onchain_metrics_001'
down_revision: Union[str, None] = 'd8f15d289531'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add new columns to crypto_metrics
    op.add_column('crypto_metrics', sa.Column('mvrv', sa.DECIMAL(precision=18, scale=10), nullable=True))
    op.add_column('crypto_metrics', sa.Column('lth_mvrv', sa.DECIMAL(precision=18, scale=10), nullable=True))
    op.add_column('crypto_metrics', sa.Column('sth_mvrv', sa.DECIMAL(precision=18, scale=10), nullable=True))
    op.add_column('crypto_metrics', sa.Column('puell_multiple', sa.DECIMAL(precision=18, scale=10), nullable=True))
    op.add_column('crypto_metrics', sa.Column('reserve_risk', sa.DECIMAL(precision=18, scale=10), nullable=True))
    op.add_column('crypto_metrics', sa.Column('rhodl_ratio', sa.DECIMAL(precision=18, scale=10), nullable=True))
    op.add_column('crypto_metrics', sa.Column('terminal_price', sa.DECIMAL(precision=24, scale=10), nullable=True))
    op.add_column('crypto_metrics', sa.Column('delta_price_usd', sa.DECIMAL(precision=24, scale=10), nullable=True))
    op.add_column('crypto_metrics', sa.Column('lth_nupl', sa.DECIMAL(precision=18, scale=10), nullable=True))
    op.add_column('crypto_metrics', sa.Column('sth_nupl', sa.DECIMAL(precision=18, scale=10), nullable=True))
    op.add_column('crypto_metrics', sa.Column('utxos_in_profit_pct', sa.DECIMAL(precision=10, scale=4), nullable=True))
    op.add_column('crypto_metrics', sa.Column('utxos_in_loss_pct', sa.DECIMAL(precision=10, scale=4), nullable=True))
    op.add_column('crypto_metrics', sa.Column('nvts', sa.DECIMAL(precision=18, scale=10), nullable=True))
    op.add_column('crypto_metrics', sa.Column('market_cap', sa.DECIMAL(precision=30, scale=2), nullable=True))


def downgrade() -> None:
    op.drop_column('crypto_metrics', 'market_cap')
    op.drop_column('crypto_metrics', 'nvts')
    op.drop_column('crypto_metrics', 'utxos_in_loss_pct')
    op.drop_column('crypto_metrics', 'utxos_in_profit_pct')
    op.drop_column('crypto_metrics', 'sth_nupl')
    op.drop_column('crypto_metrics', 'lth_nupl')
    op.drop_column('crypto_metrics', 'delta_price_usd')
    op.drop_column('crypto_metrics', 'terminal_price')
    op.drop_column('crypto_metrics', 'rhodl_ratio')
    op.drop_column('crypto_metrics', 'reserve_risk')
    op.drop_column('crypto_metrics', 'puell_multiple')
    op.drop_column('crypto_metrics', 'sth_mvrv')
    op.drop_column('crypto_metrics', 'lth_mvrv')
    op.drop_column('crypto_metrics', 'mvrv')
