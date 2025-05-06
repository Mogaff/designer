#!/bin/bash

# Script to test Google Ads Transparency scraper

# Default values
ADVERTISER="AR18054737239162880"  # Google's advertiser ID
REGION="US"
MAX_ADS=3
SEARCH_TYPE="brand"
TIMEOUT=45000

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --advertiser=*)
      ADVERTISER="${1#*=}"
      shift
      ;;
    --region=*)
      REGION="${1#*=}"
      shift
      ;;
    --max-ads=*)
      MAX_ADS="${1#*=}"
      shift
      ;;
    --search-type=*)
      SEARCH_TYPE="${1#*=}"
      shift
      ;;
    --timeout=*)
      TIMEOUT="${1#*=}"
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [options]"
      echo "Options:"
      echo "  --advertiser=ID    Advertiser ID or name to search for (default: $ADVERTISER)"
      echo "  --region=REGION    Region code (default: $REGION)"
      echo "  --max-ads=N        Maximum number of ads to retrieve (default: $MAX_ADS)"
      echo "  --search-type=TYPE Search type: brand, keyword, or industry (default: $SEARCH_TYPE)"
      echo "  --timeout=MS       Timeout in milliseconds (default: $TIMEOUT)"
      echo "  -h, --help         Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

echo "==== Testing Google Ads Transparency Scraper ===="
echo "Parameters:"
echo "  Advertiser: $ADVERTISER"
echo "  Region: $REGION"
echo "  Max ads: $MAX_ADS"
echo "  Search type: $SEARCH_TYPE"
echo "  Timeout: $TIMEOUT ms"
echo ""
echo "Making request to diagnostic endpoint..."
echo ""

# Construct the URL with query parameters
URL="http://localhost:5000/api/ad-inspiration/diagnostic/google?advertiser=$ADVERTISER&region=$REGION&maxAds=$MAX_ADS&searchType=$SEARCH_TYPE&timeout=$TIMEOUT"

# Make the request
curl -s "$URL" | jq

echo ""
echo "==== Test Complete ===="
echo ""
echo "Check ./temp directory for screenshots if the scraper ran"
echo "Screenshots taken during the test should be available there"