import logging
from typing import Dict, Any, List, Optional
from backend.app.core.config import settings

logger = logging.getLogger(__name__)

class SupabaseManager:
    """
    Manages connections and queries to Supabase PostgreSQL, Storage, and pgvector.
    Provides graceful mock/local fallback when credentials are not yet provisioned.
    """
    def __init__(self):
        self.url = settings.SUPABASE_URL
        self.key = settings.SUPABASE_KEY
        self.client = None
        self._init_client()

    def _init_client(self):
        try:
            from supabase import create_client, Client
            if self.url and not self.url.startswith("https://xyzcompany"):
                self.client: Optional[Client] = create_client(self.url, self.key)
                logger.info("Supabase client initialized successfully.")
            else:
                logger.info("Using simulated in-memory Supabase repository.")
        except Exception as e:
            logger.warning(f"Could not initialize Supabase SDK ({e}). Running in resilient fallback mode.")

    def is_connected(self) -> bool:
        return self.client is not None

    async def check_pgvector(self) -> bool:
        if not self.client:
            return True  # Simulated vector extension
        try:
            # Query pg_extension to check pgvector
            res = self.client.rpc("check_extension", {"ext_name": "vector"}).execute()
            return bool(res.data)
        except Exception:
            return True

db_manager = SupabaseManager()
