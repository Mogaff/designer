# Template Library System

## Overview
A comprehensive template management system using Tailwind CSS, DaisyUI, and Flowbite for AI-powered design generation.

## Template Structure

### Categories
- **flyers/** - Business and event flyers
- **ads/** - Social media and display advertisements  
- **social-posts/** - Instagram and social media content
- **business-cards/** - Professional business card designs
- **posters/** - Large format promotional materials

### Template Features
Each template includes:
- **Placeholders** - Dynamic content areas ({{VARIABLE_NAME}})
- **Brand Kit Integration** - Color and font customization
- **Responsive Design** - Mobile-first approach
- **Modern Effects** - Glass morphism, gradients, animations

## Usage

### API Endpoints
- `GET /api/templates/categories` - List all categories
- `GET /api/templates` - List all templates (optional ?category filter)
- `GET /api/templates/:id` - Get specific template
- `POST /api/templates/:id/generate` - Generate with AI content
- `POST /api/templates/render` - Convert HTML to image

### Frontend Integration
Access through the Template Library page (`/templates`) which provides:
- Category browsing
- Template preview
- AI content generation
- Brand kit application
- HTML/image export

### Template Variables
Common placeholders used across templates:
- `{{HEADLINE}}` - Main title
- `{{CONTENT}}` - Description text
- `{{CTA_TEXT}}` - Call-to-action button
- `{{BRAND_NAME}}` - Company/brand name
- `{{CONTACT_INFO}}` - Contact details

### Adding New Templates
1. Create HTML file in appropriate category folder
2. Use Tailwind CSS, DaisyUI, and Flowbite classes
3. Include placeholder variables with {{VARIABLE_NAME}} syntax
4. Ensure responsive design and proper styling
5. Test with template management system

## Technical Implementation
- **Backend**: Express.js with template management service
- **Frontend**: React with TypeScript
- **Styling**: Tailwind CSS + DaisyUI + Flowbite
- **AI Integration**: Claude, OpenAI, and Gemini APIs
- **Rendering**: Puppeteer for HTML-to-image conversion