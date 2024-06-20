#!/bin/bash

# Stop all running Chrome processes
pkill chrome || true

rm -rf tokens/*/SingletonLock

node server.js