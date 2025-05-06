#!/bin/bash

# This script tests the Google Ads scraper diagnostic functionality with configurable parameters

# Default values
ADVERTISER="AR18054737239162880"  # Default advertiser ID (Google)
REGION="US"                      # Default region
MAX_ADS=3                        # Number of ads to retrieve
TIMEOUT=45000                    # Timeout in milliseconds
PORT=5000                        # Default port for the server
OPEN_BROWSER=true                # Whether to open the diagnostic viewer

# Function to print usage
print_usage() {
  echo "Usage: $0 [options]"
  echo "Options:"
  echo "  -a, --advertiser ADVERTISER  Advertiser ID or brand name to search for (default: $ADVERTISER)"
  echo "  -r, --region REGION          Region code (default: $REGION)"
  echo "  -m, --max-ads MAX_ADS        Maximum number of ads to retrieve (default: $MAX_ADS)"
  echo "  -t, --timeout TIMEOUT        Timeout in milliseconds (default: $TIMEOUT)"
  echo "  -p, --port PORT              Port number (default: $PORT)"
  echo "  -n, --no-browser             Don't open the browser for viewing results"
  echo "  -h, --help                   Show this help message"
  echo ""
  echo "Example:"
  echo "  $0 -a \"Apple\" -r \"US\" -m 5 -t 60000"
  echo "  $0 --advertiser \"AR4761532174297849856\" --region \"GB\" --max-ads 10"
}

# Parse command-line arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    -a|--advertiser)
      ADVERTISER="$2"
      shift 2
      ;;
    -r|--region)
      REGION="$2"
      shift 2
      ;;
    -m|--max-ads)
      MAX_ADS="$2"
      shift 2
      ;;
    -t|--timeout)
      TIMEOUT="$2"
      shift 2
      ;;
    -p|--port)
      PORT="$2"
      shift 2
      ;;
    -n|--no-browser)
      OPEN_BROWSER=false
      shift
      ;;
    -h|--help)
      print_usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      print_usage
      exit 1
      ;;
  esac
done

# Base URL
BASE_URL="http://localhost:$PORT"
DIAGNOSTIC_URL="$BASE_URL/api/ad-inspiration/diagnostic/google"
VIEWER_URL="$BASE_URL/google-ads-diagnostic"

# URL with query parameters
URL="$DIAGNOSTIC_URL?advertiser=$ADVERTISER&region=$REGION&maxAds=$MAX_ADS&timeout=$TIMEOUT"

echo "🔍 Testing Google Ads scraper with the following configuration:"
echo "- Advertiser: $ADVERTISER"
echo "- Region: $REGION"
echo "- Max Ads: $MAX_ADS"
echo "- Timeout: $TIMEOUT ms"
echo "- API Endpoint: $DIAGNOSTIC_URL"
echo "- Viewer URL: $VIEWER_URL"
echo ""
echo "🚀 Making request to: $URL"
echo ""

# Make the request and get output
echo "⏳ Starting diagnostic test... (this may take up to $((TIMEOUT/1000)) seconds)"
curl -s "$URL" | jq '.'

echo ""
echo "✅ Diagnostic test completed"
echo ""

# Check if we should open the browser
if [ "$OPEN_BROWSER" = true ]; then
  echo "🌐 Opening diagnostic viewer in your browser..."
  # Try to open the browser based on the platform
  if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    xdg-open "$VIEWER_URL" 2>/dev/null || echo "Could not open browser automatically. Please visit $VIEWER_URL manually."
  elif [[ "$OSTYPE" == "darwin"* ]]; then
    open "$VIEWER_URL" 2>/dev/null || echo "Could not open browser automatically. Please visit $VIEWER_URL manually."
  else
    echo "Please visit the diagnostic viewer at: $VIEWER_URL"
  fi
else
  echo "🌐 To view the results in the diagnostic viewer, visit: $VIEWER_URL"
fi

echo ""
echo "📁 Screenshots and diagnostic information are saved in the ./temp directory"