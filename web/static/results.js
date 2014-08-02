
// hasQueuedUpdates and noUpdates are used to delay updates when content is being edited or viewed
var queryRefresher, hasQueuedUpdates, noUpdates, queuedNotifier;
var resultViews = {};

// sets the current annotation loc
function setCurrentURI(u) {
  currentURI = u.replace(/#.*/, '');
  console.log('currentURI', currentURI);
}

console.log('/annotations/' + window.clientID);
// receive annotations
fayeClient.subscribe('/annotations/' + window.clientID, function(data) {
  console.log('/annotations', data);
  // update query items
  if (data.annotationSummary && lastResults.hits) {
    var i = 0, l = lastResults.hits.hits.length;
    for (i; i < l; i++) {
      if (lastResults.hits.hits[i]._id === data.uri) {
        lastResults.hits.hits[i]._source.annotationSummary = data.annotationSummary;
        break;
      }
    }
    updateResults(lastResults);
  }

  if (data.uri === currentURI) {
    displayAnnoTree(data.annotations, data.uri, treeInterface);
  }
});

// delete an item
fayeClient.subscribe('/deletedItem', function(item) {
  console.log('/deletedItem', item, lastResults);
  if (lastResults.hits) {
    var i = 0, l = lastResults.hits.hits.length;
    for (i; i < l; i++) {
      if (lastResults.hits.hits[i]._id === item._id) {
        lastResults.hits.hits.splice(i, 1);
        updateResults(lastResults);
        return;
      }
    }
    console.log('deletedItem not found', item);
  }
});

// FIXME normalize fields between base and _source
function normalizeResult(result) {
  if (result.uri) {
    console.log('normalizing', result);
    if (!result._source) {
      result._source = {};
    }
    ['title', 'timestamp', 'uri'].forEach(function(f) {
      result._source[f] = result[f];
    });
  }
  return result;
}

// add a new or updated item
fayeClient.subscribe('/updateItem', function(result) {
  console.log('/updateItem', result, lastResults);
  result = normalizeResult(result);
  if (!lastResults.hits) {
    lastResults = { hits: { total : 0, hits: [] } };
  } else {
    var i = 0, l = lastResults.hits.hits.length;
    for (i; i < l; i++) {
      if (lastResults.hits.hits[i]._source.uri === result._source.uri) {
        lastResults.hits.hits.splice(i, 1);
        break;
      }
    }
  }
  lastResults.hits.hits.unshift(result);
  updateResults(lastResults);
});

// set up form
$('.query.input').keyup(function(e) {
  if (e.keyCode == 13) submitQuery();
});
$('.query.submit').click(submitQuery);

$('#fromDate').datepicker();
$('#toDate').datepicker();
$('#refreshQueries').click(function(e) {
  if ($(e.target).prop('checked')) {
    setupQueryRefresher(5000);
  } else {
    clearQueryRefresher();
  }
});

function clearQueryRefresher() {
  if (queryRefresher) {
    clearInterval(queryRefresher);
  }
}

function setupQueryRefresher(interval) {
  clearQueryRefresher();
  queryRefresher = setInterval(doQuery, interval);
}

var ULEN = 70;
function shortenURI(u) {
  return (!u || u.length < ULEN) ? u : (u.substring(0, ULEN - 3) + '…' + u.substring(u.length - 3));
}

function updateResults(results) {
  // content is being viewed or edited, delay updates
  lastResults = results;
  if (noUpdates) {
    console.log('in noUpdates');
    hasQueuedUpdates = true;
    clearTimeout(queuedNotifier);
    queuedNotifier = setInterval(function() { $('.toggle.item').toggleClass('red') }, 2000);
    return;
  }
  // clear queued notifier
  $('.toggle.item').removeClass('red');
  clearInterval(queuedNotifier);
  $('.query.button').animate({opacity: 1}, 500, 'linear');
  // use arbitrary rendering to fill results
  var container = '#results';
  if (results.hits) {
    $(container).html('');
    $('#queryCount').html(results.hits.hits.length === results.hits.total ? results.hits.total : (results.hits.hits.length + '/' + results.hits.total));
    resultView.render(container, results);
  } else {
    $(container).html('<i>No items.</i>');
    $('#queryCount').html('0');
  }
}

// populate and display the URI's sidebar
function displayItemSidebar(uri) {
  $('#itemContext').html(
    '<div class="item"><a target="' + encodeURIComponent(uri) + '" href="' + uri + '"><i class="external url icon"></i>New window</a></div>' +
    '<div onclick="moreLikeThis(\'' + uri +'\')" class="item"><i class="puzzle piece icon"></i>More like this</div>' +
    '<div onclick="refreshAnnos(\'' + uri +'\')" class="item"><i class="refresh icon"></i>Refresh</div>' +
    '<div class="item"><i class="delete icon"></i>Delete</div>' +
    '<div class="item"><a target="_debug" href="http://undefined:9200/ps/contentItem/' + encodeURIComponent(uri) + '?pretty=true"><i class="bug icon"></i>Debug</a></div>'
    );
  $('.context.dropdown').dropdown();
  setCurrentURI(uri);
  fayeClient.publish('/annotate', { clientID: window.clientID, uri: uri });
  $('#startingPage').val(uri);
  $('.details.sidebar').sidebar('show');
}

function hideItemSidebar() {
  $('.details.sidebar').sidebar('hide');
}

// render results in an html table
resultViews.table = {
  render: function(dest, results) {
    var curURI, shown = false;

    // display or close uri controls and frame (for link)
    selectedURI = function(ev) {
  // FIXME firing twice
      $('.selectRow').removeClass('active');
      var $el = $(this), id = $el.parents('tr').attr('id'), uri = decodeURIComponent(deEncID(id));
      if (curURI !== uri) {
        $('#preview').remove();
        shown = false;
      }

      if (shown) {
        $('#preview').remove();
        if ($el.hasClass('selectURI')) {
          window.location.hash = '';
          window.location.hash = id;
        }
        if (hasQueuedUpdates) {
          console.log('displaying queued updates');
          updateResults(lastResults);
          hasQueuedUpdates = null;
        }
        hideItemSidebar();
        curURI = null;
        shown = false;
        noUpdates = false;
      } else {
        displayItemSidebar(uri);
        curURI = uri;
        if ($el.hasClass('selectURI')) {
          $('#preview').remove();
          // use cached address FIXME canonicalize URIs
          //$el.parent().after('<iframe style="width: 100%" id="preview" src="http://es.fungalgenomics.ca/cached/'+ encodeURIComponent(uri) +'"></iframe>');
          if ($el.hasClass('content')) { // text content
            uri = 'http://es.fungalgenomics.ca/content/' + encodeURIComponent(uri);
          }
          console.log($el, uri);
          $el.parent().after('<iframe style="width: 100%" id="preview" src="' + uri +'"></iframe>');
          window.location.hash = id;
          noUpdates = true;
        } else {
          noUpdates = false;
          window.location.hash = '';
        }
        shown = true;
        $el.parents('tr').addClass('active');
      }
      return false;
    }

    checkSelected = function() {
      var hasSelected = 0;
      $('.selectItem').each(function() {
        if ($(this).is(':checked')) {
          hasSelected++;
        }
      });

      $('.requires.selected').toggleClass('disabled', !(hasSelected > 0));
      $('.selected.count').html(hasSelected);
    } 

    setupTable = function() {
      $('.selectURI').click(selectedURI);
      $('.annotations.button').click(selectedURI);
      $('.showa').click(function() {
        $(this).next().toggle();
      });
      $('.selectItem').click(checkSelected);
      $('table').on('tablesort:complete', function(event, tablesort) {
        setupTable();
      });
    }

    $(dest).append('<table id="resultsTable" class="ui sortable table"><thead><tr><th class="descending">' +
      'Rank</th><th>Document</th><th>Visitors</th><th>Annotations</th></tr></thead><tbody></tbody></table>');
    var count = 0;
    results.hits.hits.forEach(function(r) {
      var v = r.fields || r._source, highlight = '';
      if (r.highlight) {
        highlight = r.highlight.text;
      }
      var rankVal = r._score ? r._score : ++count;
      var row = '<tr class="selectRow" id="' + encID(v.uri) + '"><td data-sort-value="' + rankVal + '"><input class="selectItem" type="checkbox" name="cb_' + encID(v.uri) + '" />' + rankVal + '</td><td data-sort-value="' + v.title + '">' +
        '<div><a href="javascript:void(0)"></a><a class="selectURI" href="'+ v.uri + '">' + (v.title ? v.title : '(no title)') + '</a><br />' + 
        '<a class="selectURI content"><i class="text file icon"></i></a> <a class="selectURI uri" href="'+ v.uri + '"> ' + shortenURI(v.uri) + '</a></div><div class="highlighted">' + highlight +
  '</div></td><td class="rowVisitors" data-sort-value="' + (v.visitors ? v.visitors.length : 0) + '">';
      // roll up visitors
      if (v.visitors) {
        var vv = '', va = {};
        v.visitors.forEach(function(visitor) {
          var a = va[visitor.member] || { visits: []};
          a.visits.push(visitor['@timestamp']);
          va[visitor.member] = a;
        });
        for (var a in va) {
          vv += '<div class="showa"><span class="mini ui basic button"><a class="mini ui black basic circular label">' + va[a].visits.length + '</a> ' + a + '</span></div><div class="hidden">' + JSON.stringify(va[a].visits) + '</div>';
        }
        row += '' + vv;
      }
      row += '</td><td class="rowAnnotations">';
      if (v.annotationSummary !== undefined) {
        if (v.annotationSummary.validated > 0) { 
          row += '<div class="ui tiny green annotations button"><i class="checked checkbox icon"></i> ' + v.annotationSummary.validated + '</div><div class="hidden validatedSummary"></div>';
        }
        if (v.annotationSummary.unvalidated > 0) { 
          row += '<div class="ui tiny blue annotations button"><i class="empty checkbox icon"></i> ' + v.annotationSummary.unvalidated + '</div><div class="hidden unvalidatedSummary"></div>';
        }
      }
      row += '</td>';
      $('#resultsTable tbody').append(row);
    });

    $('.sortable.table').tablesort();
    setupTable();
  }
}

resultViews.scatter = {
  render: function(dest, results) {
    resultsData = function(fields, results) { //# groups,# points per group
      var data = [],
        shapes = ['circle', 'cross', 'triangle-up', 'triangle-down', 'diamond', 'square'],
        random = d3.random.normal();

      fields.forEach(function(field) {
        var cur = { key : field, values : [] };

        for (j = 0; j < results.hits.hits.length; j++) {
          var hit = results.hits.hits[j]._source;
          if (hit.annotationSummary) {
            var annos = hit.annotationSummary.validated + hit.annotationSummary.unvalidated + 1;
            var annosVal = hit.annotationSummary.validated + 1;
          } else {
            annos = 1;
            annosVal = 1;
          }
          annos = random(); //FIXME

          cur.values.push({
            x: new Date(hit[field]),
            y: annos,
            data: hit,
            size: annosVal,   //Configure the size of each scatter point
            shape: "circle"  //Configure the shape of each scatter point.
          });
        }
        data.push(cur);
      });

      return data;
    }
    $(dest).append('<svg>');
    nv.addGraph(function() {
      var chart = nv.models.scatterChart()
        .showDistX(true)    //showDist, when true, will display those little distribution lines on the axis.
        .showDistY(true)
        .transitionDuration(350)
        .color(d3.scale.category10().range());

      //Configure how the tooltip looks.
      chart.tooltipContent(function(key, x, y, e, graph) {
        var sel= encID(e.point.data.uri);
        return '<h3>' + e.point.data.title + '</h3>';
      });

      //Axis settings
  //    chart.xAxis.tickFormat(d3.format('.02f'));
      chart.xAxis.tickFormat(function(d) { return d3.time.format('%b %d')(new Date(d)); })
      chart.yAxis.tickFormat(d3.format('.02f'));

      //We want to show shapes other than circles.
      chart.scatter.onlyCircles(false);

      var myData = resultsData(['timestamp'], results);
      d3.select(dest + ' svg')
        .datum(myData)
        .call(chart);

      nv.utils.windowResize(chart.update);

      return chart;
    });
  }
}

resultViews.debug = {
  render: function(dest, results) {
    $(dest).html('<pre>'+JSON.stringify(results, null, 2) + '<br />Length: ' + JSON.stringify(results, null, 2).length + '</pre>');
  },
  annotations: '*'
}


resultView = resultViews.table;
