#!/usr/bin/env python3
# Greet someone by name
import sys
name = sys.argv[1] if len(sys.argv) > 1 else "stranger"
print(f"Greetings, {name}!")
