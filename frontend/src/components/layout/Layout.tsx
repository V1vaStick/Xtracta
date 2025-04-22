import { ReactNode } from 'react';
import Header from './Header';
import Footer from './Footer';
import XPathClickLoadingIndicator from '../editor/XPathClickLoadingIndicator';

/**
 * Main layout component for the application
 */
interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="flex flex-col min-h-screen h-screen w-screen overflow-hidden p-4 transition-colors duration-200" style={{ backgroundColor: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }}>
      <Header />
      <main className="flex flex-1 p-4 overflow-hidden">
        {children}
      </main>
      <Footer />
      <XPathClickLoadingIndicator />
    </div>
  );
} 