#!/bin/bash
cd "$(dirname "$0")"
PORT=9999
python3 -m http.server $PORT 2>&1 &
PID=$!
sleep 1
echo "🧪 Opening test in browser..."
echo "Visit: http://localhost:$PORT/test-dom.html"
sleep 3
kill $PID 2>/dev/null
