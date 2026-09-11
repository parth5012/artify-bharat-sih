"""
Import every model here so `Base.metadata` is fully populated for Alembic
autogenerate and for `Base.metadata.create_all()` in tests.
"""
from app.models.artisan import Artisan  # noqa: F401
from app.models.product import Product  # noqa: F401
from app.models.pricing import ProductPricing  # noqa: F401
from app.models.passport import HeritagePassport  # noqa: F401
from app.models.channel_export import ChannelExport  # noqa: F401
from app.models.jury import JuryTicket, JuryVote, AntiFraudReport  # noqa: F401
from app.models.payout import PayoutTransaction  # noqa: F401
from app.models.logistics import LogisticsDispatch  # noqa: F401

__all__ = [
    "Artisan",
    "Product",
    "ProductPricing",
    "HeritagePassport",
    "ChannelExport",
    "JuryTicket",
    "JuryVote",
    "AntiFraudReport",
    "PayoutTransaction",
    "LogisticsDispatch",
]
