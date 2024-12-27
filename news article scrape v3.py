import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
import newspaper
import nltk
from nltk.sentiment.vader import SentimentIntensityAnalyzer
import time
import json
import os
import sqlite3
from datetime import datetime

def create_database():
    conn = sqlite3.connect('articles.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS articles
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  title TEXT,
                  summary TEXT,
                  authors TEXT,
                  keywords TEXT,
                  sentiment_neg REAL,
                  sentiment_neu REAL,
                  sentiment_pos REAL,
                  sentiment_compound REAL,
                  link TEXT,
                  date_added DATE)''')
    conn.commit()
    return conn

def insert_article(conn, article):
    c = conn.cursor()
    current_date = datetime.now().strftime('%Y-%m-%d')
    c.execute('''INSERT INTO articles
                 (title, summary, authors,keywords, sentiment_neg, sentiment_neu, sentiment_pos, sentiment_compound, link, date_added)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
              (article['title'],
               article['summary'],
               json.dumps(article['authors']),
               json.dumps(article['keywords']),
               article['sentiment']['neg'],
               article['sentiment']['neu'],
               article['sentiment']['pos'],
               article['sentiment']['compound'],
               article['link'],
               current_date))
    conn.commit()


def process_article(url):
    # Download and parse the article
    try:
        article = newspaper.Article(url)
        article.download()
        article.parse()
    except Exception as e:
        print(f"Failed to download or parse article at {url}: {e}")
        return None, None, None, None, None

    # Extract authors
    authors = article.authors if article.authors else ["Unknown"]

    # Download NLTK data if not already downloaded
    nltk.download('vader_lexicon', quiet=True)

    try:
        # Perform NLP tasks
        article.nlp()
    except Exception as e:
        print(f"Failed to perform NLP on article at {url}: {e}")
        return authors, None, None, None, None

    # Extract keywords, full text, and summary
    keywords = article.keywords if article.keywords else ["No keywords found"]
    full_text = article.text
    summary = article.summary if article.summary else "No summary available"

    # Sentiment Analysis
    if full_text:
        sia = SentimentIntensityAnalyzer()
        sentiment = sia.polarity_scores(full_text)
    else:
        sentiment = {"compound": 0, "pos": 0, "neu": 0, "neg": 0}

    return authors, keywords, full_text, summary, sentiment

def write_to_json(file_name, data):
    # Check if the file exists
    if not os.path.exists(file_name):
        # Create an empty list in the file if it doesn't exist
        with open(file_name, 'w') as f:
            json.dump([], f)

    # Load existing data
    with open(file_name, 'r') as f:
        file_data = json.load(f)

    # Append new data
    file_data.append(data)

    # Write updated data back to the file
    with open(file_name, 'w') as f:
        json.dump(file_data, f, indent=4)

# Step 1: Send a request to the website
i = 45530
url = f'https://timesofindia.indiatimes.com/archivelist/starttime-{i}.cms'
response = requests.get(url, verify=False)

# Step 2: Validate response status
if response.status_code != 200:
    print(f"Failed to retrieve page. Status code: {response.status_code}")
    exit()

# Step 3: Parse the HTML content using BeautifulSoup
soup = BeautifulSoup(response.text, 'html.parser')

# Step 4: Find all <a> tags with href attributes
article_links = soup.find_all('a', href=True)

# File to store results
output_file = 'articles.json'

# Process articles in a loop
while True:
    try:
        for link in article_links:
            href = link['href']
            if 'articleshow' in href:  # This filters out non-article links
                full_url = urljoin(url, href)
                title = link.text.strip() or "No title available"
                authors, keywords, full_text, summary, sentiment = process_article(full_url)
                
                if authors is not None:
                    print("Title:", title)
                    print("Link:", full_url)
                    print(f'Authors: {authors}')
                    print("Summary:", summary)
                    print("Keywords:", keywords)
                    print('Sentiment Scores:', sentiment)
                    overall_sentiment = 'Positive' if sentiment['compound'] > 0 else 'Negative' if sentiment['compound'] < 0 else 'Neutral'
                    print(f'Overall Sentiment: {overall_sentiment}')
                    print("-" * 50)
                    
                    # Prepare data for JSON
                    article_data = {
                        'title': title,
                        'full_text': full_text,
                        'summary': summary,
                        'keywords': keywords,
                        'sentiment': sentiment,
                        'authors': authors,
                        'link': full_url
                    }
                    
                    # Write to JSON file
                    write_to_json(output_file, article_data)
                    conn=create_database()
                    insert_article(conn, article_data)
                    conn.close()
                time.sleep(2)  # Adjust sleep time as necessary
    except Exception as e:
        print(f"An error occurred: {e}")
        break
