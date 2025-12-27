(function() {
  const tocLinks = document.querySelectorAll('.toc a');
  const headings = Array.from(document.querySelectorAll('article h2, article h3, article h4'));
  
  if (tocLinks.length === 0 || headings.length === 0) return;

  const observerOptions = {
    root: null,
    rootMargin: '0px 0px -80% 0px',
    threshold: 0
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        if (!id) return;

        tocLinks.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === `#${id}`) {
            link.classList.add('active');
            // Optional: Scroll TOC to keep active link in view
            // link.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        });
      }
    });
  }, observerOptions);

  headings.forEach(heading => observer.observe(heading));
})();