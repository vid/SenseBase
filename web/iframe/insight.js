// # insight
/*jslint browser: true */
/*jslint node: true */
/* global $ */

'use strict';

var srcSite = 'http://lilpad.zooid.org/web/', baseDate = new Date(2013, 4);

if ($('.References').length) {
  var embedded = function() { lt(srcSite + 'index-injected.js', function() { go() }) };
  var libs = function() { lt(srcSite + 'lib/libs.min.js', embedded); };

  lt(srcSite + 'member.js', libs);
}

function go(searches, lastUpdated, URIs, title, content, callback) {
  var options = {query: {}, annotations: '.*', sourceFields: ['_id', 'uri', 'timestamp', 'title', 'visitors.*', 'annotationSummary.*', 'state', 'annotations.*'] };
  window.senseBase.svc.pubsub.query.request(updateTable, options);
}

function updateSim(results) {
  window.senseBase.svc.pubsub.query.moreLikeThisContent($('.Reference.title').text(), $('.RR'), updateTable);
}

function updateTable(res) {
  var results = res.results;
  if (results && results.hits && results.hits.hits) {
    $('.References thead th').last().after('<th>State</th><th>Similarity</th>');
    var srcURIs = $('.Reference.URI'), notFound;
    // ongoing array
    var imp = {};
    results.hits.hits.forEach(function(r) { imp[r._source.uri] = r._source; });
    srcURIs.each(function(i, s) {
      var id = $(s).attr('id'), uri = $(this).text();
      console.log(id, uri);
      var state = 'Current ';
      if (imp[uri]) {
        var sRes = imp[uri];
        console.log('IMP', sRes);
        state += getCreated(sRes);
        delete imp[uri];
      }
      $('#'+id).parent().after('<td>' + getSim() + '</td>');
      $('#'+id).parent().after('<td>' + state + '</td>');
    });
    for (var k in imp) {
      var i = imp[k], rDate = getCreated(i);
      var state = baseDate > rDate ? 'Not included' : 'New';
      console.log(state, baseDate > rDate, baseDate, rDate);
      $('.References tbody').append('<tr><td></td><td></td><td>' + i.uri + '</td><td>' + state + ' ' + rDate + '</td><td>' + getSim(i) + '</td></tr>');
    }
    updateSim();
  }
}

function getSim(res) {
  return Math.round(Math.random(1) * 90) / 10;
}

function getCreated(sRes) {
  for (var i = 0; i < sRes.annotations.length; i++) {
    var a = sRes.annotations[i];
    if (a.key === 'DateCreated') {
      try {
        return new Date(a.value);
      } catch (e) {
        return '';
      }
    }
  }
  return '';
}

function lt(l, t) {
  $.ajax({
    url: l,
    dataType: "script",
    success: function() {
      t();
    }
  });
}
