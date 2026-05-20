-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create schema
SET search_path TO public;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE dispo_platform TO dispo_user;
