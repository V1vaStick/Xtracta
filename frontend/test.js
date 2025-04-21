// xpath-demo.js
// ---------------------------------------------------------------
// Combines **FontoXPath** with **@xmldom/xmldom** to run the **same XPath 3.1**
// queries over *both* HTML *and* XML documents in Node.js.
// ---------------------------------------------------------------
// Installation (once):
//   npm install fontoxpath @xmldom/xmldom
// ---------------------------------------------------------------
// Run tests:
//   node xpath-demo.js
// ---------------------------------------------------------------

import { DOMParser } from '@xmldom/xmldom';
import fontoxpath from 'fontoxpath';

/**
 * Evaluate `xpath` against `doc` and return a compact array of strings that
 * identify the matched nodes (helpful for quick console inspection).
 * If a namespaceResolver is supplied it will be passed straight through to
 * FontoXPath.
 */
function evaluate(doc, xpath, namespaceResolver = null) {
  const opts = namespaceResolver ? { namespaceResolver } : {};
  const nodes = fontoxpath.evaluateXPathToNodes(xpath, doc, null, null, opts);
  return nodes.map(node => {
    switch (node.nodeType) {
      case 1: // ELEMENT_NODE
        return `<${node.nodeName.toLowerCase()}>`;
      case 3: // TEXT_NODE
        return `'${node.data.trim()}'`;
      default:
        return node.nodeName;
    }
  });
}

// ---------------------------------------------------------------
// 1. HTML TEST ---------------------------------------------------
// ---------------------------------------------------------------
const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>Sample XPath Playground Document</title>
  </head>
  <body>
    <div id="root" class="container">
      <header>
        <h1>Welcome to XPath Playground</h1>
        <nav>
          <ul>
            <li><a href="#home">Home</a></li>
            <li><a href="#about">About</a></li>
            <li><a href="#contact">Contact</a></li>
          </ul>
        </nav>
      </header>
      
      <main>
        <section id="content">
          <article class="post">
            <h2>Sample Article</h2>
            <p>This is a sample paragraph to demonstrate XPath querying.</p>
            <div class="metadata">
              <span class="author">John Doe</span>
              <span class="date">2023-06-15</span>
            </div>
          </article>
          
          <div class="sidebar">
            <h3>Related Links</h3>
            <ul>
              <li><a href="#">Link 1</a></li>
              <li><a href="#">Link 2</a></li>
              <li><a href="#">Link 3</a></li>
            </ul>
          </div>
        </section>
      </main>
      
      <footer>
        <p>&copy; 2023 XPath Playground</p>
      </footer>
    </div>
  </body>
</html>`;

// Parse with the HTML algorithm (puts elements in the XHTML namespace)
const htmlDoc = new DOMParser().parseFromString(html, 'text/html');

// Namespace resolver: map the *default* (empty) prefix AND an explicit "html"
// prefix to the HTML namespace so that unprefixed names in XPath match.
const HTML_NS = 'http://www.w3.org/1999/xhtml';
const htmlNSResolver = prefix => {
  if (!prefix || prefix === 'html') return HTML_NS;
  return null; // all other prefixes – let queries decide
};

console.log('\nHTML TESTS:');
['/html/body', '//body', '//main/*/div'].forEach(expr => {
  console.log(expr, evaluate(htmlDoc, expr, htmlNSResolver));
});

// ---------------------------------------------------------------
// 2. XML TEST ----------------------------------------------------
// ---------------------------------------------------------------
const xml = `<catalog>
  <book id="bk101">
    <author>Gambardella, Matthew</author>
    <title>XML Developer's Guide</title>
  </book>
  <book id="bk102">
    <author>Ralls, Kim</author>
    <title>Midnight Rain</title>
  </book>
</catalog>`;

// Parse with the XML algorithm (no implicit namespaces)
const xmlDoc = new DOMParser().parseFromString(xml, 'text/xml');

console.log('\nXML TEST: //book[@id="bk102"]/title');
console.log(fontoxpath.evaluateXPathToStrings('//book[@id="bk102"]/title', xmlDoc));
