(function () { // elasticsearch
  'use strict';
  // setup elastic.js client for jQuery
  ejs.client = ejs.jQueryClient('http://lilpad.zooid.org:9200');

  $(function () {

    // grab the templates and compile them only once
      var viewport = $('#viewport'),

      // setup the indices and types to search across
      index = 'ps',
      type = 'cachedPage',
      request = ejs.Request({indices: index, types: type})
        .size(200)
        .facet(
        ejs.TermsFacet('tags')
          .field('tag')
          .size(20))
 ,

      // generates the elastic.js query and executes the search
      executeSearch = function (qstr) {
        request.query(ejs.QueryStringQuery(qstr || '*'))
          .doSearch(showResults);
      },

      doSearch = function () {
          $('#searchForm').submit(function (e) {
            executeSearch($('#keywordSearch').val());
            return false;
          });
      },

      // renders the results page
      showResults = function (results) {
        console.log(results.hits.hits);
        var a = $enclosure.empty().append('<table id="resultsTable"></table>').find('#resultsTable');
        results.hits.hits.forEach(function(r) {
          var v = r._source;
          var row = '<tr id="' + r._id + '">';
          ['username', '@timestamp', 'text', ].forEach(function(f) { 
            row += '<td class="' + f + '" id="'+r._id + '_' + f + '">' + v[f] + '</td>';
          });
          row += '<td id="' + r._id + '_sentimentScore">' + v.sentiment.score + '</td>';
          row += '<td id="' + r._id + '_sentimentPositive">' + safeString(v.sentiment.positive).replace(/,/g, ' ') + '</td>';
          row += '<td id="' + r._id + '_sentimentNegative">' + safeString(v.sentiment.negative).replace(/,/g, ' ') + '</td>';
          a.append(row + '</tr>\n');
        });
// $('#contentAnnotations').html(v['sentiment.score']);

        // navigation over search results

        a.find('tr').hover(function() {$(this).toggleClass('resultRowSelected')});

        a.find('tr').click(function() {
          $(this).toggleClass('resultRowClicked');
          lastSel = $(this);

          $('input[id=startingPage]').val($(this).attr('id'));
        /*    // comment the following line if you don't want to dehighlight other rows
            $(this).siblings().removeClass('clicked'); */
        });

        $('#facets').empty();
        $('#facetContainer').show();
        $('#facets').append('<b>username</b> <button title="select all">*</button> <button title="invert selection">\\</buton>');
        ['username'].forEach(function(f) {
          results.facets[f].terms.forEach(function(u) {
            $('#facets').append(' <a class="facet">' + u.term + ' (' + u.count + ')</a> ');
          });
          $('#facets').append('<button title="show more ' + f + '">more</button>');
        });
        $('.facet').on('click', function() {  $(this).toggleClass('facetSelected'); });
      };

      // load the search page as the landing page
      doSearch();
  });
  function safeString(s) {
    return s != null && s ? s.toString() : "";
  }
}).call(this);

