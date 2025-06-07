import fs from 'fs/promises';
import path from 'path';

interface Template {
  id: string;
  name: string;
  category: string;
  description: string;
  htmlContent: string;
  placeholders: string[];
  previewUrl?: string;
  thumbnailUrl?: string;
  features: {
    glassMorphism: boolean;
    neonEffects: boolean;
    animations: boolean;
    gradient: boolean;
  };
}

interface TemplateCategory {
  id: string;
  name: string;
  description: string;
}

interface BrandKit {
  id: string;
  name: string;
  logo?: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  isActive: boolean;
}

class TemplateManager {
  private templatesPath = path.join(process.cwd(), 'templates');
  private categoriesCache: TemplateCategory[] | null = null;
  private templatesCache: Map<string, Template> = new Map();

  /**
   * Load all available template categories
   */
  async getCategories(): Promise<TemplateCategory[]> {
    if (this.categoriesCache) {
      return this.categoriesCache;
    }

    try {
      const categoriesPath = path.join(this.templatesPath, 'categories.json');
      const categoriesData = await fs.readFile(categoriesPath, 'utf-8');
      const { categories } = JSON.parse(categoriesData);
      this.categoriesCache = categories;
      return categories;
    } catch (error) {
      console.error('Error loading categories:', error);
      return [];
    }
  }

  /**
   * List all templates in a specific category
   */
  async listTemplates(category?: string): Promise<Template[]> {
    try {
      const categories = await this.getCategories();
      const targetCategories = category ? [category] : categories.map(c => c.id);
      const templates: Template[] = [];

      for (const cat of targetCategories) {
        const categoryPath = path.join(this.templatesPath, cat);
        
        try {
          const files = await fs.readdir(categoryPath);
          const htmlFiles = files.filter(file => file.endsWith('.html'));

          for (const file of htmlFiles) {
            const templateId = `${cat}/${file.replace('.html', '')}`;
            const template = await this.loadTemplate(templateId);
            if (template) {
              templates.push(template);
            }
          }
        } catch (error) {
          console.warn(`Category ${cat} not found or inaccessible`);
        }
      }

      return templates;
    } catch (error) {
      console.error('Error listing templates:', error);
      return [];
    }
  }

  /**
   * Load a specific template by ID (category/name)
   */
  async loadTemplate(templateId: string): Promise<Template | null> {
    if (this.templatesCache.has(templateId)) {
      return this.templatesCache.get(templateId)!;
    }

    try {
      const templatePath = path.join(this.templatesPath, `${templateId}.html`);
      const htmlContent = await fs.readFile(templatePath, 'utf-8');
      
      const placeholders = this.extractPlaceholders(htmlContent);
      const features = this.analyzeFeatures(htmlContent);
      
      const [category, name] = templateId.split('/');
      
      const template: Template = {
        id: templateId,
        name: name.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        category,
        description: `${category} template with modern design`,
        htmlContent,
        placeholders,
        features
      };

      this.templatesCache.set(templateId, template);
      return template;
    } catch (error) {
      console.error(`Error loading template ${templateId}:`, error);
      return null;
    }
  }

  /**
   * Apply brand kit styling to a template
   */
  applyBrandKit(htmlContent: string, brandKit: BrandKit): string {
    let styledContent = htmlContent;

    // Replace color variables
    styledContent = styledContent.replace(/from-blue-600/g, `from-[${brandKit.primaryColor}]`);
    styledContent = styledContent.replace(/to-purple-600/g, `to-[${brandKit.secondaryColor}]`);
    styledContent = styledContent.replace(/bg-blue-600/g, `bg-[${brandKit.primaryColor}]`);
    styledContent = styledContent.replace(/text-blue-600/g, `text-[${brandKit.primaryColor}]`);
    
    // Apply font family if specified
    if (brandKit.fontFamily && brandKit.fontFamily !== 'Default') {
      styledContent = styledContent.replace(
        '<head>',
        `<head>\n    <link href="https://fonts.googleapis.com/css2?family=${brandKit.fontFamily.replace(' ', '+')}:wght@400;600;700&display=swap" rel="stylesheet">`
      );
      styledContent = styledContent.replace(
        '<style>',
        `<style>\n        body { font-family: '${brandKit.fontFamily}', sans-serif; }`
      );
    }

    return styledContent;
  }

  /**
   * Replace placeholders in template with actual content
   */
  replacePlaceholders(htmlContent: string, replacements: Record<string, string>): string {
    let result = htmlContent;
    
    Object.entries(replacements).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      result = result.replace(new RegExp(placeholder, 'g'), value || '');
    });

    return result;
  }

  /**
   * Generate content for template using AI prompt
   */
  async generateTemplateContent(templateId: string, prompt: string, brandKit?: BrandKit): Promise<{
    htmlContent: string;
    placeholders: Record<string, string>;
  } | null> {
    const template = await this.loadTemplate(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // Generate content based on prompt and template placeholders
    const placeholders = this.generatePlaceholdersFromPrompt(prompt, template.placeholders);
    
    let htmlContent = this.replacePlaceholders(template.htmlContent, placeholders);
    
    // Apply brand kit if provided
    if (brandKit) {
      htmlContent = this.applyBrandKit(htmlContent, brandKit);
    }

    return {
      htmlContent,
      placeholders
    };
  }

  /**
   * Extract placeholder variables from HTML content
   */
  private extractPlaceholders(htmlContent: string): string[] {
    const placeholderRegex = /\{\{([^}]+)\}\}/g;
    const placeholders: string[] = [];
    let match;

    while ((match = placeholderRegex.exec(htmlContent)) !== null) {
      if (!placeholders.includes(match[1])) {
        placeholders.push(match[1]);
      }
    }

    return placeholders;
  }

  /**
   * Analyze template features based on CSS classes and content
   */
  private analyzeFeatures(htmlContent: string): Template['features'] {
    return {
      glassMorphism: htmlContent.includes('glass-effect') || htmlContent.includes('backdrop-filter'),
      neonEffects: htmlContent.includes('neon-glow') || htmlContent.includes('shadow-glow'),
      animations: htmlContent.includes('animate-') || htmlContent.includes('transition'),
      gradient: htmlContent.includes('gradient') || htmlContent.includes('from-') || htmlContent.includes('to-')
    };
  }

  /**
   * Generate placeholder content from AI prompt
   */
  private generatePlaceholdersFromPrompt(prompt: string, placeholders: string[]): Record<string, string> {
    const result: Record<string, string> = {};
    
    // Basic AI-like content generation based on prompt
    // This would typically use Claude/OpenAI API for better results
    
    placeholders.forEach(placeholder => {
      switch (placeholder) {
        case 'HEADLINE':
        case 'AD_HEADLINE':
        case 'EVENT_NAME':
        case 'POST_HEADLINE':
          result[placeholder] = this.extractOrGenerate(prompt, 'headline', 'Amazing Offer');
          break;
        case 'CONTENT':
        case 'AD_DESCRIPTION':
        case 'EVENT_DESCRIPTION':
        case 'POST_CONTENT':
          result[placeholder] = this.extractOrGenerate(prompt, 'description', 'Discover something amazing with our premium service.');
          break;
        case 'CTA_TEXT':
          result[placeholder] = 'Get Started Now';
          break;
        case 'BRAND_NAME':
        case 'COMPANY_NAME':
          result[placeholder] = this.extractOrGenerate(prompt, 'brand', 'Your Brand');
          break;
        default:
          result[placeholder] = prompt.slice(0, 50) + '...';
      }
    });

    return result;
  }

  /**
   * Generate sample content for template previews
   */
  async generateSampleContent(placeholders: string[]): Promise<Record<string, string>> {
    const sampleData: Record<string, string> = {
      // Headlines and Titles
      'HEADLINE': 'Amazing Business Offer',
      'AD_HEADLINE': 'Limited Time Deal',
      'EVENT_NAME': 'Summer Music Festival',
      'EVENT_TITLE': 'Grand Opening Event',
      'POST_HEADLINE': 'New Product Launch',
      'PRODUCT_NAME': 'Premium Coffee Blend',
      'RESTAURANT_NAME': 'Bella Vista Café',
      'FULL_NAME': 'John Smith',
      'COMPANY_NAME': 'TechCorp Solutions',
      'BRAND_NAME': 'EliteDesigns',
      'VENUE_NAME': 'Central Plaza',
      'MAIN_HEADLINE': 'Transform Your Business Today',
      'PRIMARY_CTA': 'Get Started Now',
      'SECONDARY_CTA': 'Learn More',
      'PRICING_HEADLINE': 'Choose Your Plan',
      'TESTIMONIAL_HEADLINE': 'What Our Customers Say',
      'FEATURES_HEADLINE': 'Powerful Features',
      'CTA_HEADLINE': 'Join Thousands of Happy Users',
      
      // Descriptions and Content
      'CONTENT': 'Experience the finest quality with our premium products designed for modern lifestyle.',
      'AD_DESCRIPTION': 'Get 50% off on all premium items. Limited time offer for valued customers.',
      'EVENT_DESCRIPTION': 'Join us for an unforgettable evening of music, food, and entertainment.',
      'POST_CONTENT': 'Discover our latest innovation that will transform your daily routine.',
      'PRODUCT_DESCRIPTION': 'Crafted with the finest ingredients for the perfect taste experience.',
      'DISH_DESCRIPTION': 'Fresh ingredients prepared with traditional recipes and modern techniques.',
      'EVENT_SUBTITLE': 'Three Days of Music, Art & Culture',
      'SUBHEADLINE': 'Professional services you can trust',
      'COMPANY_TAGLINE': 'Innovation at its finest',
      
      // Pricing
      'ORIGINAL_PRICE': '$99.99',
      'SALE_PRICE': '$49.99',
      'TICKET_PRICE': '$25',
      'EARLY_BIRD_PRICE': '$20',
      'REGULAR_PRICE': '$30',
      'VIP_PRICE': '$75',
      'DISCOUNT_PERCENT': '50% OFF',
      'PRICE_DESCRIPTION': 'Best value in the market',
      
      // Contact and Location
      'CONTACT_INFO': 'Call: (555) 123-4567 | info@company.com',
      'EMAIL': 'contact@business.com',
      'PHONE': '(555) 123-4567',
      'PHONE_NUMBER': '(555) 123-4567',
      'WEBSITE': 'www.business.com',
      'ADDRESS': '123 Main Street, City, State 12345',
      'VENUE_ADDRESS': '456 Event Plaza, Downtown',
      
      // Features and Benefits
      'FEATURE_1': 'Premium Quality Materials',
      'FEATURE_2': 'Expert Craftsmanship',
      'FEATURE_3': '24/7 Customer Support',
      'FEATURE_1_VALUE': '99%',
      'FEATURE_1_LABEL': 'Satisfaction',
      'FEATURE_2_VALUE': '24/7',
      'FEATURE_2_LABEL': 'Support',
      
      // Event Details
      'EVENT_DATE': 'July 15-17, 2024',
      'EVENT_TIME': '7:00 PM - 11:00 PM',
      'EVENT_TYPE': 'SPECIAL EVENT',
      'OPENING_HOURS': 'Mon-Fri: 9AM-9PM',
      'SCHEDULE_1': '7:00 PM - Opening Act',
      'SCHEDULE_2': '8:30 PM - Main Event',
      'SCHEDULE_3': '10:00 PM - After Party',
      
      // Artists and People
      'ARTIST_1': 'DJ Sarah Williams',
      'ARTIST_2': 'The Midnight Band',
      'ARTIST_3': 'Local Talent Showcase',
      'ORGANIZER_NAME': 'EventPro Productions',
      
      // Categories and Types
      'CATEGORY': 'Business',
      'PRODUCT_CATEGORY': 'Electronics',
      'CUISINE_TYPE': 'Italian Cuisine',
      'POST_TYPE': 'ANNOUNCEMENT',
      'JOB_TITLE': 'Marketing Director',
      
      // Special Offers
      'SPECIAL_OFFER': 'GRAND OPENING',
      'OFFER_TEXT': 'Limited Time: Buy 2 Get 1 Free',
      'CTA_TEXT': 'Get Started Today',
      'TERMS_CONDITIONS': 'Terms and conditions apply',
      'SHIPPING_INFO': 'Free shipping on orders over $50',
      
      // Social and Reviews
      'HASHTAGS': '#premium #quality #lifestyle',
      'BRAND_HANDLE': '@brandname',
      'REVIEW_COUNT': '500+',
      'SOCIAL_MEDIA': '@eventpro',
      
      // Stats and Numbers
      'STAT_1_VALUE': '1000+',
      'STAT_1_LABEL': 'Happy Customers',
      'STAT_2_VALUE': '5 Star',
      'STAT_2_LABEL': 'Rating',
      
      // Pricing Plans
      'PLAN_1_NAME': 'Basic',
      'PLAN_1_PRICE': '$9',
      'PLAN_1_PERIOD': 'month',
      'PLAN_1_DESCRIPTION': 'Perfect for individuals',
      'PLAN_1_FEATURE_1': 'Up to 5 projects',
      'PLAN_1_FEATURE_2': 'Basic support',
      'PLAN_1_FEATURE_3': '5GB storage',
      'PLAN_1_CTA': 'Choose Basic',
      'PLAN_2_NAME': 'Pro',
      'PLAN_2_PRICE': '$29',
      'PLAN_2_PERIOD': 'month',
      'PLAN_2_DESCRIPTION': 'Best for growing teams',
      'PLAN_2_FEATURE_1': 'Unlimited projects',
      'PLAN_2_FEATURE_2': 'Priority support',
      'PLAN_2_FEATURE_3': '100GB storage',
      'PLAN_2_CTA': 'Choose Pro',
      'PLAN_3_NAME': 'Enterprise',
      'PLAN_3_PRICE': '$99',
      'PLAN_3_PERIOD': 'month',
      'PLAN_3_DESCRIPTION': 'For large organizations',
      'PLAN_3_FEATURE_1': 'Custom solutions',
      'PLAN_3_FEATURE_2': 'Dedicated support',
      'PLAN_3_FEATURE_3': 'Unlimited storage',
      'PLAN_3_CTA': 'Contact Sales',
      'FEATURED_BADGE': 'Most Popular',
      'PRICING_DESCRIPTION': 'Choose the perfect plan for your needs',
      
      // Testimonials
      'TESTIMONIAL_DESCRIPTION': 'See what our customers have to say',
      'TESTIMONIAL_1_TEXT': 'This service has completely transformed our business operations. Highly recommended!',
      'CUSTOMER_1_NAME': 'Sarah Johnson',
      'CUSTOMER_1_TITLE': 'CEO, TechStart Inc.',
      'CUSTOMER_1_INITIAL': 'SJ',
      'TESTIMONIAL_2_TEXT': 'Outstanding support and incredible features. Worth every penny.',
      'CUSTOMER_2_NAME': 'Michael Chen',
      'CUSTOMER_2_TITLE': 'Marketing Director',
      'CUSTOMER_2_INITIAL': 'MC',
      'TESTIMONIAL_3_TEXT': 'Easy to use and powerful. Our team productivity has increased significantly.',
      'CUSTOMER_3_NAME': 'Emma Wilson',
      'CUSTOMER_3_TITLE': 'Project Manager',
      'CUSTOMER_3_INITIAL': 'EW',
      
      // Features
      'FEATURES_DESCRIPTION': 'Discover the powerful features that make us different',
      'FEATURE_1_TITLE': 'Fast Performance',
      'FEATURE_1_DESCRIPTION': 'Lightning-fast processing speeds',
      'FEATURE_2_TITLE': 'Secure & Reliable',
      'FEATURE_2_DESCRIPTION': 'Enterprise-grade security',
      'FEATURE_3_TITLE': 'Easy Integration',
      'FEATURE_3_DESCRIPTION': 'Seamless workflow integration',
      'DETAILED_FEATURE_TITLE': 'Advanced Analytics Dashboard',
      'DETAILED_FEATURE_DESCRIPTION': 'Get deep insights into your business performance with our comprehensive analytics suite.',
      'BENEFIT_1_TITLE': 'Real-time Data',
      'BENEFIT_1_DESCRIPTION': 'Monitor your metrics in real-time',
      'BENEFIT_2_TITLE': 'Custom Reports',
      'BENEFIT_2_DESCRIPTION': 'Generate tailored reports',
      'BENEFIT_3_TITLE': 'Data Export',
      'BENEFIT_3_DESCRIPTION': 'Export data in multiple formats',
      'FEATURE_CTA': 'Explore Features',
      'VISUAL_FEATURE_TITLE': 'Smart Automation',
      'VISUAL_FEATURE_DESCRIPTION': 'Automate repetitive tasks and focus on what matters most',
      
      // CTA and Newsletter
      'CTA_BADGE': 'Limited Time Offer',
      'CTA_DESCRIPTION': 'Join thousands of satisfied customers and transform your business today',
      'EMAIL_PLACEHOLDER': 'Enter your email address',
      'SUBMIT_BUTTON_TEXT': 'Subscribe Now',
      'PRIVACY_TEXT': 'We respect your privacy. Unsubscribe anytime.',
      'VISUAL_HEADLINE': 'Stay Updated',
      'VISUAL_DESCRIPTION': 'Get the latest news and updates delivered to your inbox',
      
      // Hero Section Data
      'HERO_BADGE': 'New Release',
      'HERO_HEADLINE': 'Build Amazing Products Faster',
      'HERO_DESCRIPTION': 'Streamline your workflow with our powerful tools and features designed for modern teams',
      'TRUST_METRIC_1_VALUE': '10K+',
      'TRUST_METRIC_1_LABEL': 'Active Users',
      'TRUST_METRIC_2_VALUE': '99.9%',
      'TRUST_METRIC_2_LABEL': 'Uptime',
      'TRUST_METRIC_3_VALUE': '24/7',
      'TRUST_METRIC_3_LABEL': 'Support',
      'SOCIAL_PROOF_TEXT': 'Trusted by leading companies worldwide',
      
      // Newsletter Email Data
      'NEWSLETTER_TITLE': 'Weekly Updates',
      'NEWSLETTER_SUBTITLE': 'Stay informed with our latest news and insights',
      'MAIN_ARTICLE_TITLE': 'Product Launch: Revolutionary Features',
      'MAIN_ARTICLE_CONTENT': 'Discover the exciting new capabilities that will transform how you work.',
      'READ_MORE_CTA': 'Read Full Article',
      'SECONDARY_SECTION_TITLE': 'Latest News',
      'ARTICLE_2_TITLE': 'Industry Insights Report',
      'ARTICLE_2_EXCERPT': 'Key trends shaping the future of technology',
      'ARTICLE_3_TITLE': 'Customer Success Story',
      'ARTICLE_3_EXCERPT': 'How Company X achieved 300% growth',
      'CTA_SECTION_TITLE': 'Ready to Get Started?',
      'CTA_SECTION_DESCRIPTION': 'Join thousands of satisfied customers today',
      'CTA_BUTTON_TEXT': 'Start Free Trial',
      'FOOTER_TEXT': 'Thank you for being part of our community',
      'UNSUBSCRIBE_TEXT': 'Click here to unsubscribe from future emails'
    };

    const result: Record<string, string> = {};
    placeholders.forEach(placeholder => {
      result[placeholder] = sampleData[placeholder] || `Sample ${placeholder.toLowerCase()}`;
    });

    return result;
  }

  /**
   * Extract or generate content based on context
   */
  private extractOrGenerate(prompt: string, type: string, fallback: string): string {
    const words = prompt.toLowerCase().split(' ');
    
    switch (type) {
      case 'headline':
        return prompt.slice(0, 60).replace(/\b\w/g, l => l.toUpperCase());
      case 'description':
        return prompt.length > 100 ? prompt.slice(0, 150) + '...' : prompt;
      case 'brand':
        const brandKeywords = words.find(word => 
          word.length > 3 && !['with', 'from', 'this', 'that', 'will', 'have'].includes(word)
        );
        return brandKeywords ? brandKeywords.charAt(0).toUpperCase() + brandKeywords.slice(1) : fallback;
      default:
        return fallback;
    }
  }

  /**
   * Save a new custom template
   */
  async saveTemplate(template: Omit<Template, 'id'>, customId?: string): Promise<string> {
    const templateId = customId || `custom/${template.name.toLowerCase().replace(/\s+/g, '-')}`;
    const templatePath = path.join(this.templatesPath, `${templateId}.html`);
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(templatePath), { recursive: true });
    
    await fs.writeFile(templatePath, template.htmlContent, 'utf-8');
    
    // Update cache
    this.templatesCache.set(templateId, { ...template, id: templateId });
    
    return templateId;
  }
}

export const templateManager = new TemplateManager();
export type { Template, TemplateCategory, BrandKit };