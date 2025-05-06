# Google Ads Transparency Scraper Diagnostics

This directory contains diagnostic information and screenshots captured during Google Ads Transparency Center scraping operations.

## Common Files

- `google-ads-page-source.txt` - Raw HTML content from the Google Ads page
- `google-ads-screenshot-*.png` - Screenshots captured during the scraping process
- `search-results-*.json` - Cached search results

## Troubleshooting

If you're experiencing issues with the Google Ads scraper:

1. Run a diagnostic test using the test script:
   ```
   ./test-google-ads-scraper.sh
   ```

2. View the diagnostic information using the built-in viewer:
   http://localhost:5000/google-ads-diagnostic

3. Check for common issues:
   - CAPTCHA or challenge pages in the screenshots
   - Network errors in the API response
   - Google bot detection system blocking requests

4. Try different advertiser IDs or search terms

## Advertisers for Testing

Here are some advertiser IDs known to work with Google's Ads Transparency Center:

- Google: `AR18054737239162880`
- Apple: `AR4761532174297849856`
- Nike: `AR09771356162633728` 
- Samsung: `AR16826329409044480`
- Microsoft: `AR11068383895265280`

## Browser Diagnostics

The diagnostic tools capture several types of information:

1. Screenshots of the webpage at different stages
2. Full HTML source of the page
3. Execution logs with timing information
4. Any extracted ad data

This information helps diagnose issues with:
- Selectors that need updating
- Google's anti-bot detection systems
- Network connectivity problems
- API response validation