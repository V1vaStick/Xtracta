import { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  url?: string;
}

/**
 * Component for dynamically updating SEO metadata
 */
export default function SEO({
  title = 'Xtracta - XPath Playground',
  description = 'An open-source XPath playground for testing and validating XPath expressions against XML and HTML documents.',
  keywords = 'XPath, XML, HTML, playground, testing, validation, extraction, web scraping',
  ogImage = '/logo.png',
  url = 'https://xtracta.vercel.app/',
}: SEOProps) {
  useEffect(() => {
    // Update document title
    document.title = title;
    
    // Update meta tags
    const metaTags = {
      description,
      keywords,
      'og:title': title,
      'og:description': description,
      'og:image': ogImage,
      'og:url': url,
      'twitter:title': title,
      'twitter:description': description,
      'twitter:image': ogImage,
    };
    
    // Update existing meta tags or create new ones
    Object.entries(metaTags).forEach(([name, content]) => {
      let meta: HTMLMetaElement | null;
      
      if (name.startsWith('og:')) {
        meta = document.querySelector(`meta[property="${name}"]`);
        if (!meta) {
          meta = document.createElement('meta');
          meta.setAttribute('property', name);
          document.head.appendChild(meta);
        }
      } else {
        meta = document.querySelector(`meta[name="${name}"]`);
        if (!meta) {
          meta = document.createElement('meta');
          meta.setAttribute('name', name);
          document.head.appendChild(meta);
        }
      }
      
      meta.setAttribute('content', content);
    });
  }, [title, description, keywords, ogImage, url]);
  
  // This component doesn't render anything visible
  return null;
} 