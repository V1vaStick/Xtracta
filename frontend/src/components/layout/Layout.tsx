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
    <div className="flex flex-col min-h-screen h-screen w-full overflow-hidden text-foreground p-4">
      <Header />
      <main className="flex flex-1 p-4 overflow-hidden">
        {children}
      </main>
      <Footer />
      <XPathClickLoadingIndicator />
    </div>
  );
} 