let allArticles = [];

document.addEventListener('DOMContentLoaded', function() {
    // Set issue date (2 days ago)
    const issueDate = new Date();
    issueDate.setDate(issueDate.getDate() - 2);
    const formattedDate = formatDate(issueDate);
    document.getElementById('current-date').textContent = `${formattedDate}`;

    // Fetch and display articles
    fetchArticles(formattedDate);

    document.getElementById('search-button').addEventListener('click', handleSearch);
    document.getElementById('search-input').addEventListener('keyup', function(event) {
        if (event.key === 'Enter') {
            handleSearch();
        }
    });
    document.querySelectorAll('.sentiment-btn').forEach(button => {
        button.addEventListener('click', function() {
            handleSentimentFilter(this.dataset.sentiment);
        });
    });
});

document.addEventListener('scroll', () => {
    const articles = document.querySelectorAll('.article');
    articles.forEach(article => {
        const rect = article.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
            article.classList.add('in-view');
        } else {
            article.classList.remove('in-view');
        }
    });
});

function formatDate(date) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}


// async function fetchArticles() {
//     try {
//         const response = await fetch('articles.json');
//         allArticles = await response.json();
//         displayArticles(allArticles);
//     } catch (error) {
//         console.error('Error fetching articles:', error);
//     }
// }

// async function fetchArticles(date) {
//     try {
//         date='2024-09-11';
//         const response = await fetch(`sql_to_json.php?date=${encodeURIComponent(date)}`);
//         allArticles = await response.json();
//         displayArticles(allArticles);
//     } catch (error) {
//         console.error('Error fetching articles:', error);
//         document.getElementById('articles-container').innerHTML = '<p>Error loading articles. Please try again later.</p>';
//     }
// }

async function fetchArticles(date, limit = 100, offset = 0) {
    try {
        date='2024-09-09';
        const response = await fetch(`sql_to_json.php?date=${encodeURIComponent(date)}&limit=${limit}&offset=${offset}`);
        const jsonData = await response.json();

        if (jsonData.success) {
            allArticles = [...allArticles, ...jsonData.data]; // Append new articles
            displayArticles(allArticles);

            if (jsonData.data.length === limit) {
                // Fetch the next batch
                fetchArticles(date, limit, offset + limit);
            }
        } else {
            throw new Error(jsonData.message || 'Unknown error');
        }
    } catch (error) {
        console.error('Error fetching articles:', error);
        document.getElementById('articles-container').innerHTML = '<p>Error loading articles. Please try again later.</p>';
    }
}

function displayArticles(articles) {
    const container = document.getElementById('articles-container');
    container.innerHTML = ''; // Clear existing articles
    
    articles.forEach(article => {
        const articleElement = createArticleElement(article);
        container.appendChild(articleElement);
    });
}

function addArticle(title, summary) {
    const container = document.getElementById('articles-container');
    const article = document.createElement('div');
    article.classList.add('article');
    article.innerHTML = `
        <h2>${title}</h2>
        <p class="article-summary">${summary}</p>
        <div class="article-meta">
            <span class="keywords">Keyword1, Keyword2</span>
            <span class="sentiment">Positive</span>
        </div>
    `;
    container.appendChild(article);
    article.classList.add('in-view');
}


function createArticleElement(article) {
    const articleDiv = document.createElement('div');
    articleDiv.className = 'article';

    const title = document.createElement('h2');
    title.textContent = article.title;
    title.addEventListener('click', () => {
        //window.location.href = article.link;
        window.open(article.link, '_blank')
    });

    const summary = document.createElement('p');
    summary.className = 'article-summary';
    summary.textContent = article.summary;

    const meta = document.createElement('div');
    meta.className = 'article-meta';

    const keywords = document.createElement('div');
    keywords.className = 'keywords';
    article.keywords.forEach(keyword => {
        const span = document.createElement('span');
        span.className = 'keyword';
        span.textContent = keyword;
        keywords.appendChild(span);
    });

    const sentiment = document.createElement('span');
    sentiment.className = 'sentiment';
    const compound = article.sentiment.compound;
    sentiment.textContent = getSentimentText(compound);
    sentiment.style.backgroundColor = getSentimentColor(compound);

    meta.appendChild(keywords);
    meta.appendChild(sentiment);

    articleDiv.appendChild(title);
    articleDiv.appendChild(summary);
    articleDiv.appendChild(meta);

    return articleDiv;
}

function getSentimentText(compound) {
    if (compound > 0.05) return 'Positive';
    if (compound < -0.05) return 'Negative';
    return 'Neutral';
}

function getSentimentColor(compound) {
    if (compound > 0.05) return '#4caf50';
    if (compound < -0.05) return '#f44336';
    return '#ffc107';
}

function handleSearch() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const filteredArticles = allArticles.filter(article => 
        article.title.toLowerCase().includes(searchTerm) ||
        article.summary.toLowerCase().includes(searchTerm) ||
        article.keywords.some(keyword => keyword.toLowerCase().includes(searchTerm))
    );
    displayArticles(filteredArticles);
}

function handleSentimentFilter(sentiment) {
    document.querySelectorAll('.sentiment-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.sentiment-btn[data-sentiment="${sentiment}"]`).classList.add('active');

    let filteredArticles;
    if (sentiment === 'all') {
        filteredArticles = allArticles;
    } else {
        filteredArticles = allArticles.filter(article => {
            const sentimentText = getSentimentText(article.sentiment.compound).toLowerCase();
            return sentimentText === sentiment;
        });
    }
    displayArticles(filteredArticles);
}