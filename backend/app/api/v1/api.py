from fastapi import APIRouter
from app.api.v1.endpoints import users, backups, logs, gateways, split_recipients, products, checkout, webhooks, product_webhooks, coupons, recovery, affiliates, subscriptions, sales, proposals

api_router = APIRouter()
api_router.include_router(users.router)
api_router.include_router(backups.router)
api_router.include_router(logs.router)
api_router.include_router(gateways.router)
api_router.include_router(split_recipients.router)
api_router.include_router(products.router, prefix="/products", tags=["products"])
api_router.include_router(product_webhooks.router, prefix="/products", tags=["product_webhooks"])
api_router.include_router(checkout.router, prefix="/checkout", tags=["checkout"])
api_router.include_router(webhooks.router, prefix="/webhooks", tags=["webhooks"])
api_router.include_router(coupons.router, prefix="/coupons", tags=["coupons"])
api_router.include_router(recovery.router, prefix="/recovery", tags=["recovery"])
api_router.include_router(affiliates.router, prefix="/affiliates", tags=["affiliates"])
api_router.include_router(subscriptions.router, prefix="/subscriptions", tags=["subscriptions"])
api_router.include_router(sales.router, prefix="/sales", tags=["sales"])
api_router.include_router(proposals.router, prefix="/proposals", tags=["proposals"])



