#!/bin/bash

echo "Testing Google Ads Transparency Scraper..."
echo "Making request to diagnostic endpoint..."

curl -s http://localhost:5000/api/ad-inspiration/diagnostic/google | jq

echo "Check ./temp directory for screenshots if the scraper ran"