/**
 * Footer component for the application
 * Contains copyright and links
 */
export default function Footer() {
  return (
    <footer className="bg-muted py-4 px-6 mt-2">
      <div className="container mx-auto flex flex-col md:flex-row justify-between items-center text-muted-foreground text-sm">
        <div>
          <p>© {new Date().getFullYear()} Xtracta - XPath Playground</p>
        </div>
        <div className="flex space-x-4 mt-2 md:mt-0">
          <a 
            href="https://github.com/mnhlt/xtracta" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors"
          >
            GitHub
          </a>
          <a 
            href="https://developer.mozilla.org/en-US/docs/Web/XPath" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors"
          >
            XPath Docs
          </a>
        </div>
      </div>
    </footer>
  );
} 