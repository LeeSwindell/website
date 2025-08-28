// Blog post metadata - automatically populated from markdown files
const blogPosts = [
  {
    title: "Building a Type-Safe Redis Client in OCaml",
    filename: "building-redis-client-ocaml.md",
    date: "2025-08-27",
    description: "Exploring OCaml's type system by building a native Redis client with compile-time protocol correctness."
  },
  {
    title: "Welcome to My Blog",
    filename: "welcome-to-my-blog.md",
    date: "2025-08-27",
    description: "My first blog post introducing what you can expect from this blog."
  }
];

// Simple markdown to HTML converter
function markdownToHtml(markdown) {
  // First, handle code blocks to protect them from other replacements
  const codeBlocks = [];
  let codeIndex = 0;
  
  // Store code blocks temporarily
  markdown = markdown.replace(/```([\s\S]*?)```/g, (match, code) => {
    codeBlocks.push(`<pre><code>${escapeHtml(code.trim())}</code></pre>`);
    return `__CODE_BLOCK_${codeIndex++}__`;
  });
  
  // Process other markdown
  let html = markdown
    // Headers
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // Horizontal rules
    .replace(/^---$/gm, '<hr>')
    // Bold and italic
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Lists
    .replace(/^\* (.+)$/gm, '<li>$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // Paragraphs
    .split('\n\n')
    .map(para => {
      if (para.match(/^<[h|l|h|u|o]/)) return para;
      if (para.match(/^__CODE_BLOCK_/)) return para;
      if (para.trim()) return `<p>${para}</p>`;
      return '';
    })
    .join('\n');
  
  // Restore code blocks
  codeBlocks.forEach((block, i) => {
    html = html.replace(`__CODE_BLOCK_${i}__`, block);
  });
  
  // Wrap consecutive <li> tags in <ul>
  html = html.replace(/(<li>.*<\/li>\n?)+/g, match => `<ul>${match}</ul>`);
  
  return html;
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Load and display blog posts list
function loadBlogPosts() {
  const container = document.getElementById('blog-posts');
  container.innerHTML = '';
  
  // Sort posts by date (newest first)
  const sortedPosts = blogPosts.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  sortedPosts.forEach(post => {
    const postItem = document.createElement('div');
    postItem.className = 'blog-item';
    
    postItem.innerHTML = `
      <h3>${post.title}</h3>
      <div class="date">${formatDate(post.date)}</div>
      <p class="description">${post.description}</p>
    `;
    
    postItem.addEventListener('click', () => loadPost(post));
    container.appendChild(postItem);
  });
}

// Format date nicely
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Load individual post
async function loadPost(post) {
  try {
    const response = await fetch(`posts/${post.filename}`);
    const markdown = await response.text();
    const html = markdownToHtml(markdown);
    
    const container = document.getElementById('blog-posts');
    container.innerHTML = `
      <button class="back-button" onclick="loadBlogPosts()">← Back to all posts</button>
      <article>${html}</article>
    `;
    
    // Scroll to top
    window.scrollTo(0, 0);
    
  } catch (error) {
    console.error('Error loading post:', error);
    document.getElementById('blog-posts').innerHTML = '<p>Error loading post.</p>';
  }
}

// Check for direct link to post (via hash)
function checkForDirectLink() {
  const hash = window.location.hash.slice(1);
  if (hash) {
    const post = blogPosts.find(p => p.filename.replace('.md', '') === hash);
    if (post) {
      loadPost(post);
      return;
    }
  }
  loadBlogPosts();
}

// Initialize
document.addEventListener('DOMContentLoaded', checkForDirectLink);

// Handle browser back/forward
window.addEventListener('popstate', checkForDirectLink);