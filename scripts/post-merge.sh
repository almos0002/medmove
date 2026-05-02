#!/bin/bash
set -e

echo "[post-merge] installing dependencies..."
npm install --no-audit --no-fund

echo "[post-merge] pushing drizzle schema to database..."
npm run db:push -- --force

echo "[post-merge] done."
