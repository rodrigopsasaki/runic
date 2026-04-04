#!/bin/bash
# Generate a UUID
echo "uuid:$(uuidgen 2>/dev/null || echo 'mock-uuid-1234')"
