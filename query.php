<?php

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

if (isset($_GET['symbol'])) {
    $symbol = trim($_GET ['symbol']);
    $query = "http://dev.markitondemand.com/MODApis/Api/v2/Quote/json?symbol=" . $symbol;  
} else if (isset($_GET['interactive'])) {
    $parameters = trim($_GET ['interactive']);
    $query = "http://dev.markitondemand.com/MODApis/Api/v2/InteractiveChart/json?parameters=" . $parameters;
}

$json = file_get_contents($query);
echo json_encode($json);  

?>
