#!/bin/bash
cd /home/z/my-project
rm -f .zscripts/dev.pid
nohup npx next dev --port 3000 > .zscripts/dev.log 2>&1 &
echo $! > .zscripts/dev.pid
echo "Dev server started with PID $(cat .zscripts/dev.pid)"