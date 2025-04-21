import { ReactNode } from 'react';
import Header from './Header';
import Footer from './Footer';

/**
 * Main layout component for the application
 */
interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header />
      <main className="flex-1 container mx-auto p-4">
        {children}
      </main>
      <Footer />
    </div>
  );
} 