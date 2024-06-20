#!/bin/bash

# Stop all running Chrome processes
pkill chrome || true

# rm -rf ~/.config/chromium/Singleton*

node server.js