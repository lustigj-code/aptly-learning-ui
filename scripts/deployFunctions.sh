#!/bin/bash

set -e

echo "==============================================="
echo "APTLY Learning App - Cloud Functions Deployment"
echo "==============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Navigate to functions directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( dirname "$SCRIPT_DIR" )"
FUNCTIONS_DIR="$PROJECT_ROOT/functions"

if [ ! -d "$FUNCTIONS_DIR" ]; then
    echo -e "${RED}Error: Functions directory not found at $FUNCTIONS_DIR${NC}"
    exit 1
fi

cd "$FUNCTIONS_DIR"

# Step 1: Install dependencies
echo -e "${YELLOW}Step 1: Installing dependencies...${NC}"
if npm install; then
    echo -e "${GREEN}✓ Dependencies installed successfully${NC}"
else
    echo -e "${RED}✗ Failed to install dependencies${NC}"
    exit 1
fi
echo ""

# Step 2: Build TypeScript
echo -e "${YELLOW}Step 2: Building TypeScript...${NC}"
if npm run build; then
    echo -e "${GREEN}✓ TypeScript compiled successfully${NC}"
else
    echo -e "${RED}✗ Failed to compile TypeScript${NC}"
    exit 1
fi
echo ""

# Step 3: Deploy functions
echo -e "${YELLOW}Step 3: Deploying Cloud Functions...${NC}"
cd "$PROJECT_ROOT"

if firebase deploy --only functions; then
    echo -e "${GREEN}✓ Cloud Functions deployed successfully${NC}"
else
    echo -e "${RED}✗ Failed to deploy Cloud Functions${NC}"
    exit 1
fi
echo ""

# Step 4: List deployed functions
echo -e "${YELLOW}Step 4: Verifying deployment...${NC}"
if firebase functions:list; then
    echo -e "${GREEN}✓ Deployment verification complete${NC}"
else
    echo -e "${YELLOW}! Could not list functions (this is normal if not logged in)${NC}"
fi
echo ""

echo -e "${GREEN}==============================================="
echo "Deployment completed successfully!"
echo "===============================================${NC}"
echo ""
echo "Deployed Functions:"
echo "  1. dailyStreakCheck (scheduled: 00:01 UTC daily)"
echo "  2. onUserCreate (auth trigger: on user creation)"
echo ""
echo "To view logs:"
echo "  firebase functions:log"
echo ""
