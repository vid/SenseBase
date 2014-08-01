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
