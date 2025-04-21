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
    <div className="flex flex-col min-h-screen min-w-screen text-foreground p-4">
      <Header />
      <main className="flex flex-1 p-4">
        {children}
      </main>
      <Footer />
    </div>
  );
} 