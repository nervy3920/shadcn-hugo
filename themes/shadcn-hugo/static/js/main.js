document.addEventListener('DOMContentLoaded', () => {
  // Code block copy button
  const codeBlocks = document.querySelectorAll('pre');
  codeBlocks.forEach((block) => {
    // Check if already wrapped
    if (block.parentElement.classList.contains('code-wrapper')) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'code-wrapper relative group my-6';
    block.parentNode.insertBefore(wrapper, block);
    wrapper.appendChild(block);

    const button = document.createElement('button');
    // Use more explicit classes for visibility
    button.className = 'absolute right-4 top-4 z-20 p-2 rounded-md bg-white dark:bg-slate-800 border shadow-sm opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300';
    button.innerHTML = '<i class="fa-regular fa-copy text-xs"></i>';
    button.setAttribute('title', '复制代码');
    button.style.cursor = 'pointer';
    wrapper.appendChild(button);

    button.addEventListener('click', (e) => {
      e.preventDefault();
      const codeElement = block.querySelector('code');
      const code = codeElement ? codeElement.innerText : block.innerText;
      
      navigator.clipboard.writeText(code).then(() => {
        button.innerHTML = '<i class="fa-solid fa-check text-xs text-green-600"></i>';
        setTimeout(() => {
          button.innerHTML = '<i class="fa-regular fa-copy text-xs"></i>';
        }, 2000);
      }).catch(err => {
        console.error('Failed to copy: ', err);
      });
    });
  });

  // Back to top functionality
  const backToTop = document.getElementById('back-to-top');
  if (backToTop) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 300) {
        backToTop.classList.remove('opacity-0', 'invisible', 'translate-y-4');
        backToTop.classList.add('opacity-100', 'visible', 'translate-y-0');
      } else {
        backToTop.classList.add('opacity-0', 'invisible', 'translate-y-4');
        backToTop.classList.remove('opacity-100', 'visible', 'translate-y-0');
      }
    });

    backToTop.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }
});
