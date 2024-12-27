<?php
header('Content-Type: application/json');

ob_start();
// Initial response format
$response = array('success' => false, 'message' => '', 'data' => array());

try {
    // Connect to SQLite database
    $db = new SQLite3('D:\_MSC DS Christ\Trimester-4\Project\html\articles_for.db');

    if (!$db) {
        throw new Exception('Unable to connect to the database.');
    }

    // Check if the 'articles' table exists
    $result = $db->query("SELECT name FROM sqlite_master WHERE type='table' AND name='articles'");
    if (!$result->fetchArray()) {
        throw new Exception('Table does not exist.');
    }

    // Validate date format if provided
    $date = isset($_GET['date']) ? $_GET['date'] : null;
    if ($date && !DateTime::createFromFormat('Y-m-d', $date)) {
        $response['message'] = 'Invalid date format. Expected YYYY-MM-DD.';
        echo json_encode($response);
        exit;
    }

    // Prepare the query based on the presence of the date parameter
    if ($date) {

        $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 100;
        $offset = isset($_GET['offset']) ? intval($_GET['offset']) : 0;
        //$stmt = $db->prepare('SELECT * FROM articles WHERE date(date_added) = :date ORDER BY date_added DESC LIMIT :limit OFFSET :offset');
        $stmt = $db->prepare('SELECT * FROM articles limit 100');
        $stmt->bindValue(':limit', $limit, SQLITE3_INTEGER);
        $stmt->bindValue(':offset', $offset, SQLITE3_INTEGER);

        // $stmt = $db->prepare('SELECT title, summary, authors, keywords, sentiment_neg, sentiment_neu, sentiment_pos, sentiment_compound, link, date_added FROM articles WHERE date(date_added) = :date ORDER BY date_added DESC');
        // $stmt = $db->prepare('SELECT * FROM articles WHERE date(date_added) = :date ORDER BY date_added DESC');
        $stmt->bindValue(':date', $date, SQLITE3_TEXT);
        $debugQuery = $stmt->getSQL(true); // For PDO, or manually build it
        //echo "SQL Query: " . $debugQuery;
        $results = $stmt->execute();
    } else {
        $results = $db->query('SELECT * FROM articles ORDER BY date_added DESC');
    }

    // Debug: Check if the query results object is valid
    if ($results) {
        //echo "/* Query executed successfully. */";
    } else {
        echo "/* Query execution failed. */";
        exit;
    }

    if ($results) {
       // var_dump($results);
    } else {
        echo "/* No result object created */";
    }

    
    // Output the initial part of the JSON response
    echo '{"success": true, "data": [';
    $first = true; // To handle the commas between objects

    $rowsFetched = false;
    // Stream the results row by row
    while ($row = $results->fetchArray(SQLITE3_ASSOC)) {

        if (!$first) {
            echo ','; // Add a comma between JSON objects
        }
        $first = false;

        // Process row data
        $row['keywords'] = json_decode($row['keywords']);
        $row['authors'] = json_decode($row['authors']);
        $row['sentiment'] = array(
            'neg' => $row['sentiment_neg'],
            'neu' => $row['sentiment_neu'],
            'pos' => $row['sentiment_pos'],
            'compound' => $row['sentiment_compound']
        );
        unset($row['sentiment_neg'], $row['sentiment_neu'], $row['sentiment_pos'], $row['sentiment_compound']);

        // Output the row as JSON
        echo json_encode($row);

        // Flush the output buffer to send data immediately
        // ob_flush();
        // flush();
    }

    // End of the data array in JSON
    echo ']}';

} catch (Exception $e) {
    // Handle exceptions
    $response['message'] = 'Error: ' . $e->getMessage();
    echo json_encode($response);
} finally {
    if ($db) {
        $db->close();
    }
}
ob_end_flush();
?>
