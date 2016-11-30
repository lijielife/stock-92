var phpURL = './query.php?';
var currentStock;

$(document).ready(function () {
    loadAllStocksFromLocalStorage();
    $('[data-toggle="tooltip"]').tooltip({'placement': 'bottom'});
});

var stockListKey = 'stock_helper_stock_list';
var stockSet;

function loadAllStocksFromLocalStorage() {
    var stockSetJSON = localStorage.getItem(stockListKey);
    if (stockSetJSON === null) {
        stockSet = {};
    } else {
        stockSet = $.parseJSON(stockSetJSON);
        $.each(stockSet, function (symbol) {
            var stock = loadFromLocalStorage(symbol);
            addStockToFavoriteList(stock);
        });
    }
}

//=====local storage operations=====
function saveToLocalStorage(stock) {
    stockSet[stock.symbol] = true;
    localStorage.setItem(stockListKey, JSON.stringify(stockSet));
    localStorage.setItem(stock.symbol, JSON.stringify(stock));
}

function loadFromLocalStorage(symbol) {
    var item = localStorage.getItem(symbol);
    return $.parseJSON(item);
}

function removeFromLocalStorage(symbol) {
    delete stockSet[symbol];
    localStorage.setItem(stockListKey, JSON.stringify(stockSet));
    localStorage.removeItem(symbol);
}

function isInLocalStorage(symbol) {
    return localStorage.getItem(symbol) !== null;
}
//=====local storage operations=====

var searchMessage = $('#search-message');
var stockInput = $('#stock-input');

//stock input autocomplete
stockInput.focus().autocomplete({
    source: function (request, response) {
        $.ajax({
            beforeSend: function () {
                $('#spinner').css('visibility', 'visible');
            },
            url: 'http://dev.markitondemand.com/api/v2/Lookup/jsonp',
            dataType: 'jsonp',
            data: {
                input: request.term
            },
            success: function (data) {
                response($.map(data, function (item) {
                    return {
                        label: item.Symbol + ' - ' + item.Name + ' ( ' + item.Exchange + ' )',
                        value: item.Symbol
                    }
                }));
                $('#spinner').css('visibility', 'hidden');
            }
        });
    },
    minLength: 0,
    select: function () {
        searchMessage.css('visibility', 'hidden');
    }
});

$('#get-quote-button').click(function () {
    var symbol = stockInput.val();
    if ($.isEmptyObject(symbol)) {
        searchMessage.text('Please enter a valid entry.');
        searchMessage.css('visibility', 'visible');
        stockInput.checkValidity();
    } else {
        searchMessage.text('Searching for "' + symbol + '" ...');
        searchMessage.css('visibility', 'visible');

        var query = phpURL + 'symbol=' + symbol;
        $.getJSON(query, function (result) {
            var stock = generateStockObject(result);
            if (stock !== null) {
                showStockDetail(stock);
                searchMessage.css('visibility', 'hidden');
            }
        });
    }
});

$('#clear-button').click(function () {
    stockInput.focus();
    $('#spinner').css('visibility', 'hidden');
    searchMessage.css('visibility', 'hidden');
});

$('#refresh-button').click(function () {
    refreshFavoriteList();
});

var autoRefresh;
var autoRefreshCheckbox = $('#auto-refresh-checkbox');
autoRefreshCheckbox.bootstrapSwitch();
autoRefreshCheckbox.change(function () {
    if (this.checked) {
        autoRefresh = setInterval(refreshFavoriteList, 3000);
    } else {
        clearInterval(autoRefresh);
    }
});

var tableBody = $('#favorite-table').find('tbody');

//refresh the favorite list
function refreshFavoriteList() {
    var trs = tableBody.children('tr');

    //traverse <tr> and update data
    trs.each(function (index) {
        //bypass <th> row
        if (index != 0) {
            var tds = $(this).children();

            var symbol = tds.first().text();
            var query = phpURL + 'symbol=' + symbol;
            $.getJSON(query, function (result) {
                var stockObject = generateStockObject(result);

                tds.eq(2).html(stockObject.lastPriceText);
                tds.eq(3).html(stockObject.changeRichText);
                tds.eq(4).html(stockObject.marketCapText);
            });
        }
    });
}

//=====facebook sdk initialization=====
window.fbAsyncInit = function () {
    FB.init({
        appId: '1719230951733278',
        xfbml: true,
        version: 'v2.8'
    });
};

(function (d, s, id) {
    var js, fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) {
        return;
    }
    js = d.createElement(s);
    js.id = id;
    js.src = 'js/facebook_sdk.js';
    fjs.parentNode.insertBefore(js, fjs);
}(document, 'script', 'facebook-jssdk'));
//=====facebook sdk initialization=====

// share to facebook
$('#share-button').click(function () {
    FB.ui({
        method: 'feed',
        link: 'https://stockmarkethelper.herokuapp.com/',
        name: 'Current Stock Price of ' + currentStock.name + ' is ' + currentStock.lastPriceText,
        description: 'Stock Information of ' + currentStock.name + ' (' + currentStock.symbol + ')',
        caption: 'Last Traded Price: ' + currentStock.lastPriceText + ' Change: ' + currentStock.changeText + ' (' + currentStock.changePercentText + ') ',
        picture: getYahooChart(currentStock.symbol, 250, 250)
    }, function (response) {
        if (response && response.post_id) {
            alert('Posted Successfully');
        } else {
            alert('Not Posted');
        }
    });
});

$('#favorite-input').change(function () {
    if (this.checked) {
        saveToLocalStorage(currentStock);
        addStockToFavoriteList(currentStock);
        $('#favorite-label').attr('data-original-title', 'Remove from favorite list');
    } else {
        removeFromFavoriteList(currentStock.symbol);
        removeFromLocalStorage(currentStock.symbol);
        $('#favorite-label').attr('data-original-title', 'Add to favorite list');
    }
});

$(document).on('click', '.stock-detail-a', function () {
    var symbol = $(this).text();
    var stock = loadFromLocalStorage(symbol);
    showStockDetail(stock);
});

//delete current row in the favorite list
$(document).on('click', '.delete-favorite', function () {
    var closestTr = $(this).closest('tr');
    var symbol = closestTr.children().first().text();
    if (currentStock !== null && !$.isEmptyObject(currentStock)) {
        if (currentStock.symbol === symbol) {
            currentStock = null;
        }
    }
    removeFromLocalStorage(symbol);
    closestTr.remove();
});

function generateStockObject(result) {
    // result == false
    if (!result) {
        return null;
    }

    // {"Status":"SUCCESS","Name":"Apple Inc","Symbol":"AAPL","LastPrice":107.79,"Change":-3.08999999999999,"ChangePercent":-2.78679653679653,"Timestamp":"Thu Nov 10 00:00:00 UTC-05:00 2016","MSDate":42684,"MarketCap":574770018270,"Volume":57134541,"ChangeYTD":105.26,"ChangePercentYTD":2.40357210716322,"High":111.09,"Low":105.83,"Open":111.09}
    var stock = $.parseJSON(result);

    // {"Message":"No symbol matches found for NONE. Try another symbol such as MSFT or AAPL, or use the Lookup API."}
    if (stock.Message) {
        searchMessage.text('Please enter a valid entry.');
        searchMessage.css('visibility', 'visible');
        return null;
    }

    var stockObject = {};

    //to distinguish stock data from other data in local storage
    stockObject.isStock = true;

    stockObject.name = stock.Name;
    stockObject.symbol = stock.Symbol;
    stockObject.change = stock.Change.toFixed(2);
    stockObject.changePercent = stock.ChangePercent.toFixed(2);
    stockObject.timestamp = stock.Timestamp;
    stockObject.marketCap = stock.MarketCap;
    stockObject.volume = stock.Volume;
    stockObject.changeYTD = stock.ChangeYTD.toFixed(2);
    stockObject.changePercentYTD = stock.ChangePercentYTD.toFixed(2);

    stockObject.lastPrice = stock.LastPrice.toFixed(2);
    stockObject.highPrice = stock.High.toFixed(2);
    stockObject.lowPrice = stock.Low.toFixed(2);
    stockObject.openingPrice = stock.Open.toFixed(2);

    //to-do:
    //Mon Mar 28 15:59:00 UTC-04:00 2016 ->
    //04 March 2016, 12:59:00 pm
    stockObject.timestampText = stockObject.timestamp;

    stockObject.symbolText = '<a href="#stock-carousel" class="stock-detail-a">' + stockObject.symbol + '</a>';

    stockObject.lastPriceText = '$' + stockObject.lastPrice;
    stockObject.highPriceText = '$' + stockObject.highPrice;
    stockObject.lowPriceText = '$' + stockObject.lowPrice;
    stockObject.openingPriceText = '$' + stockObject.openingPrice;

    stockObject.changeText = (stockObject.change >= 0 ? '+' : '') + stockObject.change;
    stockObject.changePercentText = (stockObject.change >= 0 ? '+' : '') + stockObject.changePercent + '%';
    stockObject.changeRichText = stockObject.changeText + ' ( ' + stockObject.changePercentText + ' ) <img src="images/' + (stockObject.change >= 0 ? 'up.png" alt="↑" />' : 'down.png" alt="↓" />');

    stockObject.changeYTDText = (stockObject.changePercentYTD >= 0 ? '+' : '') + stockObject.changeYTD;
    stockObject.changeYTDPercentText = (stockObject.changePercentYTD >= 0 ? '+' : '') + stockObject.changePercentYTD + '%';
    stockObject.changeYTDRichText = stockObject.changeYTDText + ' ( ' + stockObject.changeYTDPercentText + '% ) <img src="images/' + (stockObject.changePercentYTD >= 0 ? 'up.png" alt="↑" />' : 'down.png" alt="↓" />');

    if (stockObject.marketCap >= 1000000000) {
        stockObject.marketCap /= 1000000000;
        stockObject.marketCapText = stockObject.marketCap.toFixed(2) + ' Billion';
    } else if (stockObject.marketCap >= 1000000) {
        stockObject.marketCap /= 1000000;
        stockObject.marketCapText = stockObject.marketCap.toFixed(2) + ' Million';
    } else {
        stockObject.marketCapText = stockObject.marketCap.toFixed(2);
    }

    return stockObject;
}

var historicalChartsDiv = $('#historical-charts-div');
var historicalCharts;

function showStockDetail(stock) {
    currentStock = stock;

    $('#stock-carousel').carousel(1);
    $('#current-stock-div-a').click();

    //set data (left div)
    var tbody = $('#stock-details-table').find('tbody');
    var trs = tbody.children('tr');

    trs.eq(0).children('td').eq(0).html(stock.name);
    trs.eq(1).children('td').eq(0).html(stock.symbol);
    trs.eq(2).children('td').eq(0).html(stock.lastPriceText);

    trs.eq(3).children('td').eq(0).prop('class', stock.change >= 0 ? 'stock-rise' : 'stock-fall');
    trs.eq(3).children('td').eq(0).html(stock.changeRichText);

    trs.eq(4).children('td').eq(0).html(stock.timestampText);
    trs.eq(5).children('td').eq(0).html(stock.marketCapText);
    trs.eq(6).children('td').eq(0).html(stock.volume);

    trs.eq(7).children('td').eq(0).prop('class', stock.changePercentYTD >= 0 ? 'stock-rise' : 'stock-fall');
    trs.eq(7).children('td').eq(0).html(stock.changeYTDRichText);

    trs.eq(8).children('td').eq(0).html(stock.highPriceText);
    trs.eq(9).children('td').eq(0).html(stock.lowPriceText);
    trs.eq(10).children('td').eq(0).html(stock.openingPriceText);

    //set favorite icon
    if (isInLocalStorage(stock.symbol)) {
        $("#favorite-input").prop('checked', true);
        $('#favorite-label').attr('data-original-title', 'Remove from favorite list');
    } else {
        $("#favorite-input").prop('checked', false);
        $('#favorite-label').attr('data-original-title', 'Add to favorite list');
    }

    //set chart, using yahoo
    var yahooChart = $('#yahoo-chart');
    yahooChart.attr('src', getYahooChart(stock.symbol, $('#yahoo-chart-div').width(), $('#stock-details-div').height() - $('#icons-div').height()));
    yahooChart.imagesLoaded(function () {
        // make historical charts div height same as detail page
        var detailHeight = $('#stock-details-div')[0].scrollHeight;
        var chartHeight = $('#current-day-stock-chart-div')[0].scrollHeight;
        historicalChartsDiv.css('height', Math.max(detailHeight, chartHeight));
    });

    //set historical charts, using highstock
    var numberOfDays = 1095;
    var interactive = {
        Normalized: false,
        NumberOfDays: numberOfDays,
        DataPeriod: 'Day',
        Elements: [{
            Symbol: stock.symbol,
            Type: 'price',
            Params: ['c']    //'ohlc'
        }]
    };

    historicalChartsDiv.html('<p>Loading...</p>');

    var highstockQuery = phpURL + 'interactive=' + JSON.stringify(interactive);
    $.getJSON(highstockQuery, function (result) {
        var stockData = $.parseJSON(result);
        if (stockData && typeof stockData === 'object' && stockData !== null) {
            var dates = stockData.Dates;

            if (stockData.Elements.length == 0) {
                var row = '<div class="alert alert-warning" role="alert">' +
                    '<div class="panel-heading"><h4>No data available</h4></div>' +
                    '<div class="panel-body row">' +
                    '<div class="col-md-12"><p>There is no data of this stock.</p></div>' +
                    '</div>' +
                    '</div>';
                historicalChartsDiv.html('');
                historicalChartsDiv.append(row);
                return;
            }

            var dataSeries = stockData.Elements[0].DataSeries;

            // var openData = dataSeries.open.values;
            // var highData = dataSeries.high.values;
            // var lowData = dataSeries.low.values;
            var closeData = dataSeries.close.values;

            //construct the data high stock needs:
            // [
            // [1317888000000, 372.5101, 375, 372.2, 372.52],
            // [1317888060000, 372.4, 373, 372.01, 372.16],
            // ......
            // [1318607940000, 421.94, 422, 421.8241, 422]
            // ]
            // [time, open, high, low, close]

            //actually, the chart only use [time, price]

            var data = '[';
            for (var i = 0; i !== dates.length; ++i) {
                var dateString = dates[i];
                var timeStamp = Date.parse(dateString);
                var price = closeData[i];
                var line = '[' + timeStamp + ',' + price + ']';
                if (i !== dates.length - 1) {
                    line += ',';
                }
                data += line;
            }
            data += ']';
            var highstockChartData = $.parseJSON(data);

            historicalChartsDiv.html('');
            historicalCharts = new Highcharts.StockChart({
                chart: {
                    renderTo: 'historical-charts-div',
                    width: $('#current-stock-div').width()
                },
                title: {
                    text: stock.symbol + ' Stock Value'
                },
                xAxis: {
                    gapGridLineWidth: 0
                },
                rangeSelector: {
                    buttons: [
                        {
                            type: 'week',
                            count: 1,
                            text: '1w'
                        }, {
                            type: 'month',
                            count: 1,
                            text: '1m'
                        }, {
                            type: 'month',
                            count: 3,
                            text: '3m'
                        }, {
                            type: 'month',
                            count: 6,
                            text: '6m'
                        }, {
                            type: 'ytd',
                            text: 'YTD'
                        }, {
                            type: 'year',
                            count: 1,
                            text: '1y'
                        }, {
                            type: 'all',
                            count: 1,
                            text: 'All'
                        }],
                    selected: 5,
                    inputEnabled: false
                },
                series: [{
                    name: stock.symbol,
                    type: 'area',
                    data: highstockChartData,
                    gapSize: 5,
                    tooltip: {
                        valueDecimals: 2
                    },
                    fillColor: {
                        linearGradient: {
                            x1: 0,
                            y1: 0,
                            x2: 0,
                            y2: 1
                        },
                        stops: [
                            [0, Highcharts.getOptions().colors[0]],
                            [1, Highcharts.Color(Highcharts.getOptions().colors[0]).setOpacity(0).get('rgba')]
                        ]
                    },
                    threshold: null
                }]
            });
        }
    });
}

$(window).resize(function () {
    historicalCharts.chart.redraw()
});

var currentStockNews;
$(document).on('click', '#news-feeds-div-a', function () {
    if (currentStockNews == currentStock.symbol) {
        return;
    }

    var newsFeedsDiv = $('#news-feeds-div');
    newsFeedsDiv.html('<p>Loading...</p>');

    var params = {
        "q": currentStock.name,
        "count": "10",
        "offset": "0",
        "mkt": "en-us",
        "safeSearch": "Off"
    };

    $.ajax({
        url: "https://api.cognitive.microsoft.com/bing/v5.0/news/search?" + $.param(params),
        beforeSend: function (xhrObj) {
            // Request headers
            xhrObj.setRequestHeader("Ocp-Apim-Subscription-Key", "53bcf18b1b3e4af9a255e2883cb3eec8");
        },
        type: "GET",
        // Request body
        data: "{body}",

        success: function (response, textStatus, xhr) {
            if (xhr.status == 200) {
                newsFeedsDiv.html(
                    '<div class="panel panel-info">\
                    <div class="panel-body">\
                    <div class="row">\
                    <div class="col-md-12">\
                    <a href="//bing.com" target="_blank">Powered by <img src="images/bing.png" alt="Bing"/> News Search</a>\
                    </div>\
                    </div>\
                    </div>\
                    </div>'
                );

                var articles = response.value;
                $.each(articles, function (index, article) {
                    newsFeedsDiv.append(
                        '<div class="panel panel-info">\
                        <div class="panel-heading">\
                        <h4><a href="' + article.url + '" target="_blank">' + article.name + '</a></h4>\
                        </div>\
                        <div class="panel-body">\
                        <div class="row"><div class="col-md-12"><p>' + article.description + '</p></div></div>\
                        <hr/>\
                        <div class="row">\
                        <div class="col-md-6"><p>Provider: ' + article.provider[0].name + '</p></div>\
                        <div class="col-md-6"><p>Date: ' + article.datePublished + '</p></div>\
                        </div>\
                        </div>'
                    );
                });

                currentStockNews = currentStock.symbol;
            } else {
                var error = response.error;
                newsFeedsDiv.html(
                    '<div class="alert alert-warning" role="alert">\
                    <div class="panel-heading"><h4>News feeds temporarily not available</h4></div>\
                    <div class="panel-body row">\
                    <div class="col-md-12"><p>Response from Bing: Status: ' + error.statusCode + ', Detail: ' + error.messsage + '</p></div>\
                    </div>\
                    </div>'
                );
            }
        }
    });
});

function addStockToFavoriteList(stock) {
    removeFromFavoriteList(stock.symbol);

    var row = '<tr>\
        <td>' + stock.symbolText + '</td>\
        <td>' + stock.name + '</td>\
        <td>' + stock.lastPriceText + '</td>\
        <td class="stock-' + (stock.change >= 0 ? 'rise' : 'fall') + '">' + stock.changeRichText + '</td>\
        <td>' + stock.marketCapText + '</td>\
        <td class="text-right"><button type="button" class="btn btn-default delete-favorite" data-toggle="tooltip" title="Remove"><span class="glyphicon glyphicon-trash"></span></button></td>\
        </tr>';

    var trs = tableBody.children('tr');
    trs.eq(0).after(row);
}

function removeFromFavoriteList(symbol) {
    var trs = tableBody.children('tr');

    //if the stock already exists,
    //then delete the existing one
    trs.each(function (index) {
        //bypass <th> row
        if (index != 0) {
            var currentSymbol = $(this).children().first().text();
            if (currentSymbol === symbol) {
                $(this).remove();
                return false;
            }
        }
    });
}

function getYahooChart(symbol, width, height) {
    return 'http://chart.finance.yahoo.com/t?s=' + symbol + '&lang=en-US&width=' + width + '&height=' + height;
}
