import fs from 'fs/promises';
import path from 'path';

interface Template {
  id: string;
  name: string;
  category: string;
  description: string;
  htmlContent: string;
  placeholders: string[];
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
   * Extract or generate content based on context
   */
  private extractOrGenerate(prompt: string, type: string, fallback: string): string {
    // Simple extraction logic - in real implementation, use AI
    const words = prompt.toLowerCase().split(' ');
    
    switch (type) {
      case 'headline':
        return prompt.slice(0, 60).replace(/\b\w/g, l => l.toUpperCase());
      case 'description':
        return prompt.length > 100 ? prompt.slice(0, 150) + '...' : prompt;
      case 'brand':
        // Look for brand-related keywords
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