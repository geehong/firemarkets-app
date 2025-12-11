#!/bin/bash

# Configuration
SCAN_DIR="/home/geehong/firemarkets-app"
LOG_FILE="/home/geehong/firemarkets-app/clamav_scan.log"
DATE=$(date +%Y-%m-%d_%H:%M:%S)

echo "Starting ClamAV scan at $DATE" >> "$LOG_FILE"

# Update virus definitions (requires freshclam to be configured or run with permissions, 
# but usually managed by clamav-freshclam service. We'll skip forcing it here to avoid permission issues 
# if running as user, or rely on system daemon)
# If running as root or with sudo, one might uncomment:
# freshclam

# Run the scan
# -r: recursive
# -i: only print infected files
# --bell: sound bell on virus detection
clamscan -r -i "$SCAN_DIR" >> "$LOG_FILE"

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo "Scan completed at $(date +%Y-%m-%d_%H:%M:%S). No malware found." >> "$LOG_FILE"
elif [ $EXIT_CODE -eq 1 ]; then
    echo "WARNING: Malware found! Check log for details." >> "$LOG_FILE"
else
    echo "Scan error occurred. Exit code: $EXIT_CODE" >> "$LOG_FILE"
fi

echo "----------------------------------------" >> "$LOG_FILE"
