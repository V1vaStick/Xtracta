/**
 * Footer component for the application
 * Contains copyright and links
 */
export default function Footer() {
  return (
    <footer className="py-4 px-6 mt-2 transition-colors duration-200" style={{ backgroundColor: 'hsl(var(--muted))' }}>
      <div className="container mx-auto flex flex-col md:flex-row justify-between items-center text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
        <div>
          <p>© {new Date().getFullYear()} Xtracta - XPath Playground</p>
        </div>
        <div className="flex space-x-4 mt-2 md:mt-0">
          <a 
            href="https://github.com/mnhlt/xtracta" 
            target="_blank" 
            rel="noopener noreferrer"
            className="transition-colors duration-200 hover:opacity-80"
            style={{ color: 'hsl(var(--muted-foreground))' }}
          >
            GitHub
          </a>
          <a 
            href="https://developer.mozilla.org/en-US/docs/Web/XPath" 
            target="_blank" 
            rel="noopener noreferrer"
            className="transition-colors duration-200 hover:opacity-80"
            style={{ color: 'hsl(var(--muted-foreground))' }}
          >
            XPath Docs
          </a>
        </div>
      </div>
    </footer>
  );
} 