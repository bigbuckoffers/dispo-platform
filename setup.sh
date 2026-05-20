#!/bin/bash
echo "🚀 Setting up Dispo Platform..."

# Copy pre-filled env files into place
cp apps/api/.env.ready apps/api/.env
cp apps/web/.env.local.ready apps/web/.env.local
echo "✅ Env files ready"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Start docker
echo "🐳 Starting database + Redis..."
npm run docker:up

# Wait for postgres to be ready
echo "⏳ Waiting for database..."
sleep 12

# Run migrations + seed
echo "🗄️  Running migrations..."
npm run db:migrate

echo "🌱 Seeding sample data..."
npm run db:seed

echo ""
echo "✅ Setup complete! Now run:"
echo "   Terminal 1: npm run dev:api"
echo "   Terminal 2: npm run dev:web"
echo ""
echo "   Then open: http://localhost:3000"
