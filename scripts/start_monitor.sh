#!/bin/bash
# Start the real-time monitor in the background using nohup

LOG_FILE="/home/geehong/firemarkets-app/logs/realtime_monitor.log"
SCRIPT="/home/geehong/firemarkets-app/scripts/realtime_monitor.py"

# Check if already running
if pgrep -f "python3 $SCRIPT" > /dev/null; then
    echo "Monitor is already running."
    exit 0
fi

nohup python3 "$SCRIPT" >> "$LOG_FILE" 2>&1 &
echo "Real-time monitor started (PID: $!). Logs at $LOG_FILE"
