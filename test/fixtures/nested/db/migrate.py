#!/usr/bin/env python3
# Run database migrations
import os
print(f"migrate:{os.environ.get('RC_COMMAND', 'unknown')}")
