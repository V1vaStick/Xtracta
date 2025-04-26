import { ReactNode } from 'react';
import Header from './Header';
import Footer from './Footer';
import XPathClickLoadingIndicator from '../editor/XPathClickLoadingIndicator';
import SEO from '../seo/SEO';
import StructuredData from '../seo/StructuredData';

/**
 * Main layout component for the application
 */
interface LayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
}

export default function Layout({ 
  children, 
  title = 'Xtracta - XPath Playground',
  description = 'An open-source XPath playground for testing and validating XPath expressions against XML and HTML documents.'
}: LayoutProps) {
  return (
    <div className="flex flex-col min-h-screen h-screen w-screen overflow-hidden p-4 transition-colors duration-200" style={{ backgroundColor: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }}>
      <SEO title={title} description={description} />
      <StructuredData />
      <Header />
      <main className="flex flex-1 p-4 overflow-hidden">
        {children}
      </main>
      <Footer />
      <XPathClickLoadingIndicator />
    </div>
  );
} 