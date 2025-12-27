(function() {
  const createCopyButton = (codeBlock) => {
    const button = document.createElement('button');
    button.className = 'copy-code-button';
    button.type = 'button';
    button.ariaLabel = 'Copy code to clipboard';
    button.innerHTML = '<i class="fa-regular fa-copy"></i>';

    button.addEventListener('click', async () => {
      const code = codeBlock.querySelector('code').innerText;
      try {
        await navigator.clipboard.writeText(code);
        button.innerHTML = '<i class="fa-solid fa-check text-green-500"></i>';
        setTimeout(() => {
          button.innerHTML = '<i class="fa-regular fa-copy"></i>';
        }, 2000);
      } catch (err) {
        console.error('Failed to copy: ', err);
        button.innerHTML = '<i class="fa-solid fa-xmark text-red-500"></i>';
      }
    });

    return button;
  };

  const highlightBlocks = document.querySelectorAll('.highlight');
  highlightBlocks.forEach(block => {
    const pre = block.querySelector('pre');
    if (pre) {
      const button = createCopyButton(block);
      block.style.position = 'relative';
      block.appendChild(button);
    }
  });
})();