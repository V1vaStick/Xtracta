import { useEffect } from 'react';

interface StructuredDataProps {
  type?: string;
}

/**
 * Component for adding structured data (JSON-LD) to improve SEO
 */
export default function StructuredData({ type = 'WebApplication' }: StructuredDataProps) {
  useEffect(() => {
    // Create the JSON-LD structured data
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': type,
      name: 'Xtracta',
      alternateName: 'XPath Playground',
      description: 'An open-source XPath playground for testing and validating XPath expressions against XML and HTML documents.',
      url: 'https://xtracta.vercel.app/',
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'All',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      ...(type === 'WebApplication' && {
        featureList: 'XPath testing, XML validation, HTML parsing',
        screenshot: '/logo.png',
      }),
    };

    // Add the script tag if it doesn't exist
    let script = document.querySelector('script[type="application/ld+json"]');
    if (!script) {
      script = document.createElement('script');
      script.setAttribute('type', 'application/ld+json');
      document.head.appendChild(script);
    }

    // Set the content
    script.textContent = JSON.stringify(structuredData);

    // Cleanup
    return () => {
      const scriptToRemove = document.querySelector('script[type="application/ld+json"]');
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
    };
  }, [type]);

  // This component doesn't render anything visible
  return null;
} 