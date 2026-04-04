#!/usr/bin/env python3
# Generate a SHA-256 hash
import hashlib, sys
data = sys.argv[1] if len(sys.argv) > 1 else "default"
print(hashlib.sha256(data.encode()).hexdigest())
