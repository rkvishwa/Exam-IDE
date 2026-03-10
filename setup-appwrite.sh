#!/usr/bin/env bash

# Setup Appwrite Settings Collection
# Ensure you are logged in to the Appwrite CLI before running this:
# > appwrite login

# Load environment variables
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

DB_ID="devwatch_db"
COLLECTION_ID="settings"
COLLECTION_NAME="Settings"
PROJECT_ID="${VITE_APPWRITE_PROJECT_ID}"

if [ -z "$PROJECT_ID" ]; then
  echo "Error: VITE_APPWRITE_PROJECT_ID not found in .env file."
  exit 1
fi

echo "Configuring Appwrite CLI for project '$PROJECT_ID'..."
appwrite client --project-id "$PROJECT_ID"

echo "Creating '$COLLECTION_NAME' collection in database '$DB_ID'..."

# Create the collection
appwrite databases create-collection \
  --database-id "$DB_ID" \
  --collection-id "$COLLECTION_ID" \
  --name "$COLLECTION_NAME" \
  --permissions 'read("any")' 'write("any")' \
  --document-security false

if [ $? -ne 0 ]; then
  echo "Failed to create collection. Make sure the database exists and you are logged in."
  exit 1
fi

echo "Adding 'featureToggles' attribute..."
appwrite databases create-string-attribute \
  --database-id "$DB_ID" \
  --collection-id "$COLLECTION_ID" \
  --key "featureToggles" \
  --size 10000 \
  --required true

echo "----------------------------------------"
echo "Collection created! Please note:"
echo "String attributes may take a few seconds to process in Appwrite."
echo "Wait a moment before the app tries to read or write to the collection."
echo "Done!"
