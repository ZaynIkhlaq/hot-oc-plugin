#!/bin/bash

# HOT - High On Tokens
# Multi-Account GitHub Copilot Aggregator Plugin for OpenCode

set -e

echo ""
echo "🔥 HOT - High On Tokens Setup"
echo ""

# Ensure node_modules exists
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install > /dev/null 2>&1
fi

# Run TypeScript setup
npx tsx setup-hot.ts
