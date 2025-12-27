(function() {
    const searchInput = document.querySelector('input[placeholder="搜索文章..."]');
    if (!searchInput) return;

    const searchContainer = searchInput.parentElement;
    const resultsContainer = document.createElement('div');
    resultsContainer.className = 'absolute top-full left-0 z-50 mt-2 w-full rounded-md border bg-background text-popover-foreground shadow-md outline-none hidden max-h-[300px] overflow-y-auto p-1 custom-scrollbar';
    searchContainer.appendChild(resultsContainer);

    let searchIndex = null;

    async function loadSearchIndex() {
        if (searchIndex) return searchIndex;
        try {
            const response = await fetch('/index.json');
            searchIndex = await response.json();
            return searchIndex;
        } catch (e) {
            console.error('Failed to load search index:', e);
            return null;
        }
    }

    function search(query, index) {
        if (!query) return [];
        const lowQuery = query.toLowerCase();
        return index.filter(item => {
            return (item.title && item.title.toLowerCase().includes(lowQuery)) ||
                   (item.contents && item.contents.toLowerCase().includes(lowQuery)) ||
                   (item.tags && item.tags.some(t => t.toLowerCase().includes(lowQuery))) ||
                   (item.categories && item.categories.some(c => c.toLowerCase().includes(lowQuery)));
        }).slice(0, 10);
    }

    function renderResults(results, query) {
        if (results.length === 0) {
            resultsContainer.innerHTML = '<div class="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none">未找到结果</div>';
        } else {
            let html = results.map(result => `
                <a href="${result.permalink}" class="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground">
                    <div class="flex flex-col">
                        <span class="font-medium">${result.title}</span>
                        <span class="text-xs text-muted-foreground line-clamp-1">${result.contents.substring(0, 100)}...</span>
                    </div>
                </a>
            `).join('');
            
            html += `
                <div class="border-t my-1"></div>
                <a href="/search/?q=${encodeURIComponent(query)}" class="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm font-medium outline-none hover:bg-accent hover:text-accent-foreground text-primary">
                    查看全部搜索结果
                    <i class="fa-solid fa-arrow-right ml-auto text-xs"></i>
                </a>
            `;
            resultsContainer.innerHTML = html;
        }
        resultsContainer.classList.remove('hidden');
    }

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const query = e.target.value.trim();
            if (query) {
                window.location.href = `/search/?q=${encodeURIComponent(query)}`;
            }
        }
    });

    searchInput.addEventListener('input', async (e) => {
        const query = e.target.value.trim();
        if (!query) {
            resultsContainer.classList.add('hidden');
            return;
        }

        const index = await loadSearchIndex();
        if (index) {
            const results = search(query, index);
            renderResults(results, query);
        }
    });

    // 点击外部关闭结果
    document.addEventListener('click', (e) => {
        if (!searchContainer.contains(e.target)) {
            resultsContainer.classList.add('hidden');
        }
    });
})();