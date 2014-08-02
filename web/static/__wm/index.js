(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var treeFilterTimeout;
// display all annotations, then return a structure containing instances mapped to IDs
exports.display = function(annotations, uri, treeInterface) {
  // utility to manage IDs for items
  var treeItems = {
    // ids and their items
    map : {},
    // id issued in sequence
    _id : 0,
    reset : function() {
      this.map = {};
      this._id = 0;
    },
    // get an id
    id : function(o) {
      this._id++;
      o.__id = this._id;
      this.map[this._id] = o;
      return this._id;
    },
    // return the item for this id
    get : function(i) {
      return this.map[i];
    }
  };

  // create positions of tree items
  var treeMap = {}, treeRoot = { text: 'Annotations', children: []}, annoTotal = 0, curParent;
  annotations.forEach(function(cur) {
    annoTotal++;
    // get parent position (position without current)
    if (!cur.position) {
      console.log('missing position', cur);
      return;
    }
    var ppos = cur.position.slice(0, cur.position.length - 1);
    // find or create parents
    var roots = [], curAdd = treeRoot;

    ppos.forEach(function(cpos) {
      roots.push(cpos);
      curParent = treeMap[roots];
      if (!curParent) {
        curParent = { text: cpos, children: [] };
        console.log('creating', curParent, roots);
        treeMap[roots] = curParent;
        curAdd.children.push(curParent);
      }
        curAdd = curParent;
    });

    if (treeMap[cur.position]) {
      cur.children = treeMap[cur.position].children;
      cur.id = treeMap[cur.position].id || treeItems.id(cur);
    } else {
      cur.children = [];
      cur.id = treeItems.id(cur);
    }
    cur.text = cur.position[cur.position.length - 1];

    // add ranges
    if (cur.type === 'quote') {
      var instances = [];
      cur.ranges.forEach(function(r) {
        instances.push({ type: 'range', text: r.exact, id: treeItems.id(r) });
      });
      cur.children = instances;
    // display key : value
    } else if (cur.type === 'value' || cur.type === 'valueQuote') {
      cur.text = cur.key + ':' + cur.value;
    // should be ok as-is
    } else if (cur.type === 'category') {
    }

    curParent.children.push(cur);
    treeMap[cur.position] = cur;
  });

  console.log('TREE', treeRoot, annoTotal);

  $('#annotationCount').html(annoTotal);

  $.jstree.defaults.core.themes.responsive = false;
  $.jstree.defaults.search.fuzzy = false;

  $('#treeContainer').html('<div id="annoTree"></div>');
  $('#annoTree').jstree('open_all');
  $('#annoTree').on('hover_node.jstree', function(e, data) {
    var anno = treeItems.get(data.node.id);
    treeInterface.hover(anno, e, data);
  }).on('select_node.jstree', function(e, data) {
    var anno = treeItems.get(data.node.id);
    treeInterface.select(anno, e, data);
  }).jstree({
    core : { data: treeRoot },
    plugins : [ "search", "types", "wholerow" ],
    types : {
      default : {
        icon : "tags icon"
      },
      range : {
        icon : "ellipsis horizontal icon"
      },
      category : {
        icon : "tag icon"
      },
      valueQuote : {
        icon : "text width icon"
      },
      value : {
        icon : "info letter icon"
      },
      quote : {
        icon : "quote left icon"
      }
   }
  });
  $('#annoTree').jstree('open_all');
  $('#treeFilter').keyup(function () {
    if(treeFilterTimeout) { clearTimeout(treeFilterTimeout); }
    treeFilterTimeout = setTimeout(function () {
      var v = $('#treeFilter').val();
      $('#annoTree').jstree(true).search(v);
    }, 250);
  });

  console.log('treeAnnos', treeMap);
  return treeItems;
};

},{}],2:[function(require,module,exports){
// ### browseAnnotations
/*jslint node: true */

'use strict';

var utils = require('./clientUtils');

exports.doTreemap = function(results, target, resultView) {
  $(target).addClass('treemap');
  renderTreemap(results.annotationOverview, target);
  window.onresize = function() { renderTreemap(results.annotationOverview, target)};

  function renderTreemap(root, target) {
    $(target).html('');
    var $target = $(target),
      w = $target.innerWidth(),
      h = $target.innerHeight(),
      x = d3.scale.linear().range([0, w]),
      y = d3.scale.linear().range([0, h]);

    var vis = d3.select(target).append("div")
        .attr("class", "chart")
        .style("width", w + "px")
        .style("height", h + "px")
      .append("svg:svg")
        .attr("width", w)
        .attr("height", h);

    var div = d3.select("body").append('div')
      .attr("class", "tooltip")
      .style("opacity", 0);

    var partition = d3.layout.partition()
        .value(function(d) { return d.size; });

    var g = vis.selectAll("g")
        .data(partition.nodes(root))
      .enter().append("svg:g")
        .attr("transform", function(d) { return "translate(" + x(d.y) + "," + y(d.x) + ")"; })
        .on('mouseover', function(d) {
          div.transition()
            .duration(200)
            .style("opacity", .9);
            div.html(d.name + ' (' + (d.children ? d.children.length + ' sub' : d.size + ' items') + ')')
              .style("left", (d3.event.pageX) + "px")
              .style("top", (d3.event.pageY - 28) + "px");
          })
        .on('mouseout', function(d) {
          div.transition()
            .duration(500)
            .style("opacity", 0);
        })
        .on("click", click);

    var kx = w / root.dx,
      ky = h / 1;

    g.append("svg:rect")
      .attr("width", root.dy * kx)
      .attr("height", function(d) { return d.dx * ky; })
      .attr("class", function(d) { return d.children ? "parent" : "child"; });

    g.append("svg:text")
      .attr("transform", transform)
      .attr("dy", ".35em")
      .style("opacity", function(d) { return d.dx * ky > 12 ? 1 : 0; })
      .text(function(d) { return d.name; });

/*
    d3.select(window)
      .on("click", function() { click(root); })
*/

    function click(d) {
      if (!d.children) {
        // check selected
        if (d.items.length) {
          d.items.forEach(function(uri) {
            $('input[name=cb_' + utils.encID(uri) + ']').prop('checked', 'true');
          });
          // update selected count
          resultView.checkSelected();
        }
        return;
      }

      kx = (d.y ? w - 40 : w) / (1 - d.y);
      ky = h / d.dx;
      x.domain([d.y, 1]).range([d.y ? 40 : 0, w]);
      y.domain([d.x, d.x + d.dx]);

      var t = g.transition()
          .duration(d3.event.altKey ? 7500 : 750)
          .attr("transform", function(d) { return "translate(" + x(d.y) + "," + y(d.x) + ")"; });

      t.select("rect")
          .attr("width", d.dy * kx)
          .attr("height", function(d) { return d.dx * ky; });

      t.select("text")
          .attr("transform", transform)
          .style("opacity", function(d) { return d.dx * ky > 12 ? 1 : 0; });

      d3.event.stopPropagation();
    }

    function transform(d) {
      return "translate(8," + d.dx * ky / 2 + ")";
    }
  }
};

},{"./clientUtils":4}],3:[function(require,module,exports){
// ### browseCluster
/*jslint node: true */

'use strict';

var utils = require('./clientUtils');

exports.doTreemap = function(data, target, resultView) {
  $(target).removeClass('treemap');
  data.forEach(function(d) {
    d.size = d.documents.length;
  });

  var visualization = d3plus.viz()
    .container(target)
    .data(data)
    .type('tree_map')
    .id('label')         // key for which our data is unique on
    .text('label')       // key to use for display text
    .size('size')      // sizing of blocks
    .draw();

  d3.select(target).on('click', function(d) {
    // select selected items
    var docs = d3.event.target.__data__.documents;
    docs.forEach(function(uri) {
      $('input[name=cb_' + utils.encID(uri) + ']').prop('checked', 'true');
    });
    // update selected count
    resultView.checkSelected();
  });
}

},{"./clientUtils":4}],4:[function(require,module,exports){
// ### clientUtils

var encIDs = [];

// Maximum length of display label
var ULEN = 70;

// encode a string (URI) for an ID
exports.encID = function(c) {
  return 'enc' + (encIDs.indexOf(c) > -1 ? encIDs.indexOf(c) : encIDs.push(c) - 1);
};

exports.deEncID = function(c) {
  return encIDs[c.replace('enc', '')];
};

exports.shortenURI = function(u) {
  return (!u || u.length < ULEN) ? u : (u.substring(0, ULEN - 3) + '…' + u.substring(u.length - 3));
};

},{}],5:[function(require,module,exports){
// ### Dashboard
//
// General module for SenseBase browser client.
/*jslint node: true */

'use strict';

// module variables

var resultViews = { scatter: require('./results.scatter'), table: require('./results.table'), debug: require('./results.debug')},
  resultView = resultViews.table,
  querySub, clusterSub, qs;
var faye = require('faye');
var fayeClient = new faye.Client(location.protocol + '//' + location.hostname + (location.port ? ':' + location.port : '') + '/faye/');

var queryFields = ['termSearch', 'annoSearch', 'fromDate', 'toDate', 'annoMember', 'browseNav', 'browseNum'];

// Unique ID for pubsub
var clientID;

var resultsLib = require('./results'), membersLib = require('./members'), searchLib = require('./search'), utils = require('./clientUtils');

var browseCluster = require('./browseCluster');
var browseAnnotations = require('./browseAnnotations');

// initialize page functions
exports.init = function(sbUser) {
  resultsLib.init(fayeClient, submitQuery, resultView);
  searchLib.init(fayeClient, sbUser, resultsLib);
  membersLib.init(fayeClient, clientID);

  setupDND('uploadItem', '/upload');
  setupDND('uploadWorkfile', '/workfile');
  // General setup and functions
  clientID = sbUser + new Date().getTime();
  console.log('clientID', window.clientID);

  // main menu interaction
  $('.query.toggle').click(function() { $('.query.content').toggle('hidden'); $('.query.toggle').toggleClass('active');});
  $('.search.toggle').click(function() { $('.search.content').toggle('hidden'); $('.search.toggle').toggleClass('active'); });
  $('.team.toggle').click(function() { $('.team.content').toggle('hidden'); $('.team.toggle').toggleClass('active'); $('.member.content').hide(); $('#lastUsername').val(''); /* FIXME move to members.js */ });

  $('.details.toggle').click(function() { $('.details.sidebar').sidebar('toggle'); });

  $('.dashboard.toggle').click(function() { $('.dashboard.sidebar').sidebar('toggle'); });

  $('.dropdown').dropdown('hide');

  $('.dashboard.sidebar').sidebar({ onShow : function() { $('.dashboard.toggle').addClass('active'); $('.dashboard.sidebar').addClass('floating'); }, onHide : function() { $('.dashboard.toggle').removeClass('active'); $('.dashboard.sidebar').removeClass('floating'); }});
  $('.details.sidebar').sidebar({ onShow : function() { $('.details.toggle').addClass('active'); $('.details.sidebar').addClass('floating'); }, onHide : function() { $('.details.toggle').removeClass('active'); $('.details.sidebar').removeClass('floating'); }});
  $('.sidebar').sidebar('hide');

  $('.add.button').click(function() { $('#annotateEditor').toggle(); return false;});
  $('.member.item').click(function() {
    $('.member.item').removeClass('active');
    $('.member.segment').hide();
  });

  $('.member.options').click(function() {
    $('.member.options').addClass('active');
    $('.member.options.segment').show();
  });

  $('.member.statistics').click(function() {
    $('.member.statistics').addClass('active');
    $('.member.statistics.segment').show();
  });

  //  $(document).tooltip();
  // input element
  var spinner = $(".spinner").spinner({
    spin: function( event, ui ) {
      if ( ui.value < 0 ) {
        $( this ).spinner( "value", 'once only' );
        return false;
      }
    }
  });

  // annotate selected
  $('.annotate.selected').click(function() {
    if ($('.selected.label').text() > 0) {
      $('.annotate.modal').modal('show');
    }
  });

  $('.confirm.annotate.button').click(function() {
    var annotations = $('#selectedAnnotations').val().split(',').map(function(a) { return { type: 'category', category: a.trim()} });
    if (annotations.length) {
      fayeClient.publish('/saveAnnotations', { clientID: clientID, uris: getSelected(), annotatedBy: sbUser, annotations: annotations});
      return false;
    }
  });

  // remove selected
  $('.remove.selected').click(function() {
    var i = resultsLib.lastResults.hits.hits.length, sel = getSelected();
    for (i; i > 0; ) {
      i--;
      if (sel.indexOf(resultsLib.lastResults.hits.hits[i]._source.uri) < 0) {
        delete resultsLib.lastResults.hits.hits[i];
      }
    }
    resultsLib.updateResults(resultsLib.lastResults);
  });

  // delete selected
  $('.delete.selected').click(function() {
    if ($('.selected.label').text() > 0) {
      $('.delete.modal').modal('show');
    }
  });

  $('.confirm.delete.button').click(function() {
    fayeClient.publish('/delete', { clientID: clientID, selected: getSelected()});
    return false;
  });

  $('.signout.item').click(function() {
    fayeClient.publish('/logout');
    document.location.href = '/logout';
  });

  // FIXME toggle graph or table view
  $('.visualisation.item').click(function() {
    if ($(this).hasClass('scatter')) {
      resultView = resultViews.scatter;
    } else if ($(this).hasClass('debug')) {
      resultView = resultViews.debug;
    } else {
      resultView = resultViews.table;
    }
    resultsLib.updateResults(resultsLib.lastResults, resultView);
  });

  $('.select.all').click(function() {
    $('.selectItem').prop('checked', true);
    resultView.checkSelected();
  });

  $('.select.invert').click(function() {
    $('.selectItem').each(function() {
      $(this).prop('checked', !$(this).prop('checked'));
    });
    resultView.checkSelected();
  });

  // drag and drop members
  $('.team.container').droppable({
    drop: function(event, ui) {
      console.log('DROP', this, event, ui);
      window.ee = ui;
    }
  });


  // set up qs for parameters (from http://stackoverflow.com/a/3855394 )
  // initial query
  updateQueryForm();
  submitQuery();

  // needed by filter
  window.doQuery = doQuery;
  window.submitQuery = submitQuery;
  window.updateQuerySub = updateQuerySub;

};
// end of init

// formulate query parameters
function getQueryOptions() {
  var options = { clientID: clientID + '-' + new Date().getTime(), terms : $('#termSearch').val(), annotationSearch : $('#annoSearch').val(),
    validationState: $('#validationState').val(), annotationState: $('#annotationState').val(), browseNum: $('#browseNum').val(),
    from: $('#fromDate').val(), to: $('#toDate').val(),
    // FIXME normalize including annotations
    member: $('#annoMember').val(), annotations: ($("#browseNav" ).val() === 'annotations') ? '*' : null};
  return options;
}

// perform a cluster query
function doCluster() {
  // cancel any outstanding query
  if (clusterSub) {
    clusterSub.cancel();
  }

  var options = getQueryOptions();

  // use the generated clientID for the current query
  clusterSub = fayeClient.subscribe('/clusterResults/' + options.clientID, function(results) {
    console.log('/clusterResults', results);
    browseCluster.doTreemap(results.clusters, '#browse', resultView);
    resultsLib.updateResults(results);
  });
  fayeClient.publish('/cluster', options);
}

// update the query results subscription to this clientID
function updateQuerySub(clientID) {
  // cancel any outstanding query
  if (querySub) {
    querySub.cancel();
  }

  querySub = fayeClient.subscribe('/queryResults/' + clientID, function(results) {
    console.log('/queryResults', results);

    resultsLib.updateResults(results);

// query browse
    if ($("#browseNav" ).val() === 'annotations') {
      $('.browse.sidebar').sidebar('show');
      browseAnnotations.doTreemap(results, '#browse', resultView);
    } else {
      $('.browse.sidebar').sidebar('hide');
    }
  });
}

// perform a general query
function doQuery() {

  var options = getQueryOptions();
  // use the generated clientID for the current query
  updateQuerySub(options.clientID);

  fayeClient.publish('/query', options);
  $('.query.button').animate({opacity: 0.2}, 200, 'linear');
}

// return all items selected
function getSelected() {
  var selected = [];
  $('.selectItem').each(function() {
    if ($(this).is(':checked')) {
      selected.push(utils.deEncID($(this).attr('name').replace('cb_', '')));
    }
  });
  return selected;
}

// submit a query
function submitQuery() {
// save form contents in querystring
  var ss = [];
  queryFields.forEach(function(i) {
    if ($('#'+i).val()) {
      ss.push(i + '=' + $('#'+i).val());
    }
  });

  window.history.pushState('query form', 'Query', 'index.html?' + ss.join('&'));

  if ($("#browseNav" ).val() === 'cluster') {
    $('#browse').html('<img src="/__wm/loading.gif" alt="loading" /><br />Loading cluster treemap');
    $('.browse.sidebar').sidebar('show');
    doCluster();
  } else {
    doQuery();
  }
  return false;
}

// update the query form based on query fields
function updateQueryForm() {
  // populate the querystring object
  if (!qs) {
    qs = (function(a) {
      if (a === "") return {};
      var b = {};
      for (var i = 0; i < a.length; ++i) {
        var p=a[i].split('=');
        if (p.length != 2) continue;
        b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
      }
      return b;
    })(window.location.search.substr(1).split('&'));
  }

  queryFields.forEach(function(f) {
    if (qs[f]) {
      $('#'+f).val(qs[f]);
    }
  });
}

function moreLikeThis(uri) {
  fayeClient.publish('/moreLikeThis', { clientID: clientID, uri: uri});
  updateQuerySub(clientID);
}

function refreshAnnos(uri) {
  fayeClient.publish('/updateContent', { clientID : clientID, uri: uri } );
}

},{"./browseAnnotations":2,"./browseCluster":3,"./clientUtils":4,"./members":7,"./results":9,"./results.debug":8,"./results.scatter":10,"./results.table":11,"./search":12,"faye":13}],6:[function(require,module,exports){
require('./dashboard').init('hiiii');

},{"./dashboard":5}],7:[function(require,module,exports){
// ## Members
//
/*jslint node: true */
'use strict';

var justEdited, rTeams, editingMember;

exports.init = function(fayeClient, clientID) {
  fayeClient.subscribe('/teamList/' + clientID, function(teams) {
    $('#aneditor').hide();
    console.log('teams', teams);
    // populate any team containers
    $('.team.container').find('option').remove();
    var teamTypes = {};
    teams.forEach(function(m) {
      // create selects
      if (m.status === 'available' && m.type === 'Searcher') {
        // group by type
        teamTypes[m.type] = (teamTypes[m.type] || '') + '<option value="' + m.username + '">' + m.username + '</option>';
      }
      var row = '<a style="margin: 4px" id="' + m.username + '" class="ui small ' + (m.status === 'available' ? 'enabled' : 'disabled') + ' member image label">' +
        (m.class ? '<i class="' + m.class + ' icon"></i>' :
          '<img style="height: 24px" class="image '  + '" src="http://es.fungalgenomics.ca/__wm/icons/' + (m.icon || 'unknown.png') + '" alt="' + m.username + '" />') +
        ' ' + m.username + '</a>';
      $('.teamlist.field').prepend(row);
    });
    for (var type in teamTypes) {
      $('.team.container').append('<optgroup label="' + type + '">' + teamTypes[type] + '</optgroup>');
    }
    $('.enabled.member').draggable({stack: 'a', helper: 'clone'});

    $('#newName').val('');
    $('#newEmail').val('');
    $('.teamCancel').click(function() { $('#aneditor').hide(); });
    $('.member.image').click(function(i) {
      var id = $(this).attr('id');
      if ($('#lastUsername').val() === id) {
        $('#lastUsername').val('');
        $('.member.form').hide();
      } else {
        $('.member.form').show();
        $('.member.button').removeClass('active');
        $(this).addClass('active');
        showEdit(id);
      }
    });
    rTeams = teams;
    if (justEdited) {
      showEdit(justEdited);
      justEdited = null;
    }
  });
  fayeClient.publish('/team/list', { clientID: clientID});

  $('#newCreate').click(function() {
    fayeClient.publish('/team/add', { clientID: clientID, name: $('#newName').val(), type: $('#newType').val() });
    justEdited = $('#newName').val();
    return false;
  });

  function showEdit(username) {
    if (!rTeams) {
      return;
    }
    // hide all types
    $('.anedit').hide();
    rTeams.forEach(function(m) {
      console.log(m.username, username);
      if (m.username === username) {
        editingMember = m;
      }
    });
    console.log('member', editingMember);
    $('#username').val(editingMember.username);
    $('#lastUsername').val(editingMember.username);
    $('#memberDescription').val(editingMember.description);
    $('#needsValidation').prop('checked', editingMember.needsValidation === true);
    if (editingMember.type === 'User') {
      setupValidation();
      $('#canValidate').prop('checked', (editingMember.canValidate === true) && editingMember.needsValidation !== true);
      $('#teamRemove').show();
      $('#editUser').show();
      $('#newEmail').val(editingMember.email);
      $('#memberPassword').val(editingMember.password);
      $('#passwordRepeat').val(editingMember.password);
    } else if (editingMember.type === 'Scraper') {
      $('#teamRemove').show();
      $('#editScraper').show();
    } else if (editingMember.type === 'Annotation set') {
      $('#teamRemove').show();
      $('#positiveTerms').val(editingMember.positiveTerms);
      $('#negativeTerms').val(editingMember.negativeTerms);
      $('#editAnnoSet').show();
    } else if (editingMember.type === 'Searcher') {
      $('#teamRemove').show();
      $('#searchTemplate').val(editingMember.template);
      $('#searchAPI').val(editingMember.api);
      $('#editSearcher').show();
    } else {
      $('#teamRemove').hide();
      $('#editAgent').show();
    }
    $('#aneditor').show();
  }

  $('#teamRemove').click(function() {
    fayeClient.publish('/team/remove', { clientID: clientID, username: editingMember.username});
    return false;
  });

  $('#needsValidation').click(function() {
    setupValidation();
  });

  function setupValidation() {
    if ($('#needsValidation').is(':checked')) {
      $('#canValidate').prop('checked', false);
      $('#canValidate').prop('disabled', true);
    } else {
      $('#canValidate').prop('disabled', false);
    }
  }

  $('#teamUpdate').click(function() {
    editingMember.description = $('#memberDescription').val();
    editingMember.needsValidation = $('#needsValidation').is(':checked');
    if (editingMember.type == 'User' || editingMember.type == 'Scraper') {
      if (editingMember.type == 'User') {
        editingMember.email = $('#newEmail').val();
        editingMember.canValidate = $('#canValidate').is(':checked');
      }
      var pw1 = $('#memberPassword').val(), pw2 = $('#passwordRepeat').val();
      if (pw1) {
        if (pw1 != pw2) {
          alert("Passwords don't match");
          return false;
        } else {
          editingMember.password = $('#memberPassword').val();
        }
      }
    } else if (editingMember.type === 'Annotation set') {
      editingMember.positiveTerms = $('#positiveTerms').val();
      editingMember.negativeTerms = $('#negativeTerms').val();
    } else {

    }
    // FIXME add clientID
    fayeClient.publish('/team/save', editingMember);
    return false;
  });
};

},{}],8:[function(require,module,exports){
// ### results.debug
/*jslint node: true */

'use strict';

exports.render = function(dest, results) {
  $(dest).html('<pre>'+JSON.stringify(results, null, 2) + '<br />Length: ' + JSON.stringify(results, null, 2).length + '</pre>');
};

exports.annotations = '*';

},{}],9:[function(require,module,exports){
// ### Results
//
// Result actions.
/*jslint node: true */

'use strict';

var currentURI, fayeClient, noUpdates;
// hasQueuedUpdates and noUpdates are used to delay updates when content is being edited or viewed
var queryRefresher, hasQueuedUpdates, queuedNotifier;

var lastResults, resultView;

// FIXME modularize these
exports.hasQueuedUpdates = hasQueuedUpdates;
exports.noUpdates = noUpdates;
exports.queuedNotifier = queuedNotifier;
exports.setupQueryRefresher = setupQueryRefresher;
exports.lastResults = lastResults;

exports.displayItemSidebar = displayItemSidebar;
exports.hideItemSidebar = hideItemSidebar;
exports.updateResults = updateResults;

var annoTree = require('./annoTree.js');

exports.init = function(fayeClientIn, submitQuery, resultViewIn) {
  fayeClient = fayeClientIn;
  resultView = resultViewIn;

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
      annoTree.display(data.annotations, data.uri, treeInterface);
    }
  });

  // delete an item
  fayeClient.subscribe('/deletedItem', function(item) {
    console.log('/deletedItem', item, lastResults);
    if (lastResults && lastResults.hits) {
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
};

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

function clearQueryRefresher() {
  if (queryRefresher) {
    clearInterval(queryRefresher);
  }
}

function setupQueryRefresher(interval) {
  clearQueryRefresher();
  queryRefresher = setInterval(doQuery, interval);
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


// sets the current annotation loc
function setCurrentURI(u) {
  currentURI = u.replace(/#.*/, '');
  console.log('currentURI', currentURI);
}

var treeInterface = {
  hover: function(anno) {},
  select: function(anno, e, data) {
    // selected an annotation
    if (anno) {
      console.log(anno);
      $('#annoType option:contains(anno.type)').prop('selected', true);
      // for now categories only
      $('#annoValue').val(anno.text);
      $('#annoBy').val(anno.annotatedBy);
      $('#annotatedAt').html(anno.annotatedAt || '&nbsp;');
      $('.filter.icon').click(function() {
        console.log(anno, 'filtering on', this);
        if ($(this).hasClass('by')) {
          $('#annoMember').val('"' + anno.annotatedBy + '"');
          $('#annotationState').val('provided');
        } else {
          $('#annoSearch').val('"' + anno.text + '"');
        }
        submitQuery();
      });

      // set state buttons accordingly
      $('.annotation.button').removeClass('disabled');
      if (anno.state === 'erased') {
        $('.erase.annotation').addClass('disabled');
      } else if (anno.state === 'validated') {
        $('.validate.button').addClass('disabled');
      } else {
        $('.unvalidate.button').addClass('disabled');
      }
      var annoFunctions = { anno: anno, select: function() { console.log(anno); } };
      $('.annotation.button').click(annoFunctions.select);
    }
    // it has children
    if (data.node.children.length < 1) {
      $('.annotation.children').hide();
    } else {
      $('.annotation.children').show();
      $('.annotation.children .count').html(data.node.children.length);
    }
  }
};

function updateResults(results, newView) {
  resultView = newView || resultView;
  if (results) {
    lastResults = results;
  } else {
    results = lastResults;
  }

  // content is being viewed or edited, delay updates
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
    console.log('RR', resultView);
    resultView.render(container, results, this);
  } else {
    $(container).html('<i>No items.</i>');
    $('#queryCount').html('0');
  }
}

},{"./annoTree.js":1}],10:[function(require,module,exports){
// ### results.scatter
/*jslint node: true */

'use strict';

var utils = require('./clientUtils');
exports.render = function(dest, results) {

  $(dest).append('<svg>');
  nv.addGraph(function() {
    var chart = nv.models.scatterChart()
      .showDistX(true)    //showDist, when true, will display those little distribution lines on the axis.
      .showDistY(true)
      .transitionDuration(350)
      .color(d3.scale.category10().range());

    //Configure how the tooltip looks.
    chart.tooltipContent(function(key, x, y, e, graph) {
      var sel= utils.encID(e.point.data.uri);
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


function resultsData(fields, results) { //# groups,# points per group
  var data = [],
    shapes = ['circle', 'cross', 'triangle-up', 'triangle-down', 'diamond', 'square'],
    random = d3.random.normal();

  fields.forEach(function(field) {
    var cur = { key : field, values : [] };

    for (var j = 0; j < results.hits.hits.length; j++) {
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

},{"./clientUtils":4}],11:[function(require,module,exports){
// ### results.table
//
// Render results in an html table.
/*jslint node: true */

'use strict';

var utils = require('./clientUtils');

exports.render = function(dest, results, resultsLib) {
  var curURI, shown = false, selectedURI;

  // display or close uri controls and frame (for link)
  selectedURI = function(ev) {
// FIXME firing twice
    $('.selectRow').removeClass('active');
    var $el = $(this), id = $el.parents('tr').attr('id'), uri = decodeURIComponent(utils.deEncID(id));
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
      if (resultsLib.hasQueuedUpdates) {
        console.log('displaying queued updates');
        resultsLib.updateResults(resultsLib.lastResults);
        resultsLib.hasQueuedUpdates = null;
      }
      resultsLib.hideItemSidebar();
      curURI = null;
      shown = false;
      resultsLib.noUpdates = false;
    } else {
      resultsLib.displayItemSidebar(uri);
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
        resultsLib.noUpdates = true;
      } else {
        resultsLib.noUpdates = false;
        window.location.hash = '';
      }
      shown = true;
      $el.parents('tr').addClass('active');
    }
    return false;
  };

  $(dest).append('<table id="resultsTable" class="ui sortable table"><thead><tr><th class="descending">' +
    'Rank</th><th>Document</th><th>Visitors</th><th>Annotations</th></tr></thead><tbody></tbody></table>');
  var count = 0;
  results.hits.hits.forEach(function(r) {
    var v = r.fields || r._source, highlight = '';
    if (r.highlight) {
      highlight = r.highlight.text;
    }
    var rankVal = r._score ? r._score : ++count;
    var row = '<tr class="selectRow" id="' + utils.encID(v.uri) + '"><td data-sort-value="' + rankVal + '"><input class="selectItem" type="checkbox" name="cb_' + utils.encID(v.uri) + '" />' + rankVal + '</td><td data-sort-value="' + v.title + '">' +
      '<div><a href="javascript:void(0)"></a><a class="selectURI" href="'+ v.uri + '">' + (v.title ? v.title : '(no title)') + '</a><br />' +
      '<a class="selectURI content"><i class="text file icon"></i></a> <a class="selectURI uri" href="'+ v.uri + '"> ' + utils.shortenURI(v.uri) + '</a></div><div class="highlighted">' + highlight +
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

  function setupTable() {
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

};

exports.checkSelected = checkSelected;

function checkSelected() {
  var hasSelected = 0;
  $('.selectItem').each(function() {
    if ($(this).is(':checked')) {
      hasSelected++;
    }
  });

  $('.requires.selected').toggleClass('disabled', !(hasSelected > 0));
  $('.selected.count').html(hasSelected);
}

},{"./clientUtils":4}],12:[function(require,module,exports){
// ### Search
//
// lookup for saved searches
/*jslint node: true */

'use strict';

var savedSearches;

exports.init = function(fayeClient, sbUser, resultsLib) {
  // set team input as select2 input
  $('.team.container').select2();

  // schedule search
  $('.schedule.button').click(function() {
    setupCronInput();
    $('.schedule.modal').modal('show');
    $('.cron.edit').html('');
  });

  // show search scheduler according to checkbox
  $('#scheduleSearch').on('change', function() {
    $('#scheduleInput').toggle(this.checked);
  });

  $('input.cron').val()

  // setup semantic-ui form validation
  $('.searching.form').form(
    {
      searchInput: {
        identifier  : 'searchInput',
        rules: [
          {
            type   : 'empty',
            prompt : 'Please enter member input'
          }
        ]
      },
      searchCategories: {
        identifier : 'searchCategories',
        rules: [
          {
            type   : 'empty',
            prompt : 'Please enter one or more comma-seperated categories'
          }
        ]
      },
      searchTeam: {
        identifier : 'searchTeam',
        rules: [
          {
            type   : 'empty',
            prompt : 'Please enter one or more members'
          }
        ]
      }
    },
    {
      onSuccess: submitSearch
    }
  );

  // populate with initial set of saved searchs
  fayeClient.publish('/search/retrieve', { member: sbUser });

  // receive list of saved searches
  fayeClient.subscribe('/search/results', function(results) {
    savedSearches = results;
    if (results && results.hits.total > 0) {
      $("#loadSearch").select2({
        data: results.hits.hits.map(function(i) { return { id: i._source.searchName, text: i._source.searchName } })
      });
      $('.load.search').attr('disabled', false);
    } else {
      $('.load.search').attr('disabled', true);
    }
  });

  // save a search
  $('.save.search').click(function() {
    var searchInput = getSearchInput();
    if (searchInput.valid && searchInput.searchName.length > 0) {
      fayeClient.publish('/search/save', searchInput);
    } else {
      alert('Missing parameters');
    }
  });

  // display saved searches
  $('.load.search').click(function() {
    $('.load.modal').modal('show');
  });

  // load a search
  $('button.search.load').click(function() {
    var v = $('#loadSearch').val();
    savedSearches.hits.hits.forEach(function(s) {
      if (s._source.searchName === v) {
        var r = s._source;
        if (r.cron) {
          $('input.cron').val(r.cron);
          $('#scheduleSearch').prop('checked', true);
        } else {
          $('#scheduleSearch').prop('checked', false);
        }
        setupCronInput(r.cron);
        $('#scheduleSearch').trigger('change');
        $('#searchName').val(v);
        $('#targetResults').val(r.targetResults);
        $('#searchInput').val(r.input);
        $('#searchContinue').val(r.relevance);
        $('#searchCategories').val(r.categories);
        $('select.searching.team').val(r.team);
        $('.team.container').select2('val', r.team);
        return;
      }
    });
  });
  // set up the cron scheduler input
  function setupCronInput(val) {
    $('input.cron').jqCron({
      enabled_minute: false,
      multiple_dom: true,
      multiple_month: true,
      multiple_mins: true,
      multiple_dow: true,
      multiple_time_hours: true,
      multiple_time_minutes: true,
      default_period: 'week',
      default_value: val || '15 12 * * 7',
      no_reset_button: true,
      lang: 'en'
    });
  }

  // convert the form values to data
  function getSearchInput() {
    var cronValue = $('#scheduleSearch').prop('checked') ? $('input.cron').val() : null, searchName = $('#searchName').val(), targetResults = $('#targetResults').val(), input = $('#searchInput').val(), searchContinue = $('#searchContinue').val(), searchCategories = $('#searchCategories').val().split(',').map(function(t) { return t.trim(); }), searchTeam = $('select.searching.team option:selected').map(function() { return this.value }).get();
    return { searchName: searchName, cron: cronValue, input: input, relevance: searchContinue, team: searchTeam, categories: searchCategories, member: sbUser, targetResults: targetResults, valid: (input.length > 0 && searchContinue.length > 0 && searchTeam.length > 0 && searchCategories.length > 0 && sbUser.length > 0 && targetResults.length > 0 )};
  }

  // submit a new search
  function submitSearch() {
    var searchInput = getSearchInput();
    // FIXME: SUI validation for select2 field
      if (!searchInput.valid) {
      alert('Please select team members');
      return;
    }
    console.log('publishing', searchInput, fayeClient);
    fayeClient.publish('/search/queue', searchInput);
    if ($('#refreshSearch').prop('checked')) {
      $('#annoSearch').val($('#searchCategories').val());
    //  $('#validationState').val('queued');
      $('#refreshQueries').prop('checked', true);
      resultsLib.setupQueryRefresher(5000);
    }
    doQuery();
  }

};

},{}],13:[function(require,module,exports){
(function (process,global){
(function() {
'use strict';

var Faye = {
  VERSION:          '1.0.1',

  BAYEUX_VERSION:   '1.0',
  ID_LENGTH:        160,
  JSONP_CALLBACK:   'jsonpcallback',
  CONNECTION_TYPES: ['long-polling', 'cross-origin-long-polling', 'callback-polling', 'websocket', 'eventsource', 'in-process'],

  MANDATORY_CONNECTION_TYPES: ['long-polling', 'callback-polling', 'in-process'],

  ENV: (typeof window !== 'undefined') ? window : global,

  extend: function(dest, source, overwrite) {
    if (!source) return dest;
    for (var key in source) {
      if (!source.hasOwnProperty(key)) continue;
      if (dest.hasOwnProperty(key) && overwrite === false) continue;
      if (dest[key] !== source[key])
        dest[key] = source[key];
    }
    return dest;
  },

  random: function(bitlength) {
    bitlength = bitlength || this.ID_LENGTH;
    return csprng(bitlength, 36);
  },

  clientIdFromMessages: function(messages) {
    var connect = this.filter([].concat(messages), function(message) {
      return message.channel === '/meta/connect';
    });
    return connect[0] && connect[0].clientId;
  },

  copyObject: function(object) {
    var clone, i, key;
    if (object instanceof Array) {
      clone = [];
      i = object.length;
      while (i--) clone[i] = Faye.copyObject(object[i]);
      return clone;
    } else if (typeof object === 'object') {
      clone = (object === null) ? null : {};
      for (key in object) clone[key] = Faye.copyObject(object[key]);
      return clone;
    } else {
      return object;
    }
  },

  commonElement: function(lista, listb) {
    for (var i = 0, n = lista.length; i < n; i++) {
      if (this.indexOf(listb, lista[i]) !== -1)
        return lista[i];
    }
    return null;
  },

  indexOf: function(list, needle) {
    if (list.indexOf) return list.indexOf(needle);

    for (var i = 0, n = list.length; i < n; i++) {
      if (list[i] === needle) return i;
    }
    return -1;
  },

  map: function(object, callback, context) {
    if (object.map) return object.map(callback, context);
    var result = [];

    if (object instanceof Array) {
      for (var i = 0, n = object.length; i < n; i++) {
        result.push(callback.call(context || null, object[i], i));
      }
    } else {
      for (var key in object) {
        if (!object.hasOwnProperty(key)) continue;
        result.push(callback.call(context || null, key, object[key]));
      }
    }
    return result;
  },

  filter: function(array, callback, context) {
    if (array.filter) return array.filter(callback, context);
    var result = [];
    for (var i = 0, n = array.length; i < n; i++) {
      if (callback.call(context || null, array[i], i))
        result.push(array[i]);
    }
    return result;
  },

  asyncEach: function(list, iterator, callback, context) {
    var n       = list.length,
        i       = -1,
        calls   = 0,
        looping = false;

    var iterate = function() {
      calls -= 1;
      i += 1;
      if (i === n) return callback && callback.call(context);
      iterator(list[i], resume);
    };

    var loop = function() {
      if (looping) return;
      looping = true;
      while (calls > 0) iterate();
      looping = false;
    };

    var resume = function() {
      calls += 1;
      loop();
    };
    resume();
  },

  // http://assanka.net/content/tech/2009/09/02/json2-js-vs-prototype/
  toJSON: function(object) {
    if (!this.stringify) return JSON.stringify(object);

    return this.stringify(object, function(key, value) {
      return (this[key] instanceof Array) ? this[key] : value;
    });
  }
};

if (typeof module !== 'undefined')
  module.exports = Faye;
else if (typeof window !== 'undefined')
  window.Faye = Faye;

Faye.Class = function(parent, methods) {
  if (typeof parent !== 'function') {
    methods = parent;
    parent  = Object;
  }

  var klass = function() {
    if (!this.initialize) return this;
    return this.initialize.apply(this, arguments) || this;
  };

  var bridge = function() {};
  bridge.prototype = parent.prototype;

  klass.prototype = new bridge();
  Faye.extend(klass.prototype, methods);

  return klass;
};

(function() {
var EventEmitter = Faye.EventEmitter = function() {};

/*
Copyright Joyent, Inc. and other Node contributors. All rights reserved.
Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

var isArray = typeof Array.isArray === 'function'
    ? Array.isArray
    : function (xs) {
        return Object.prototype.toString.call(xs) === '[object Array]'
    }
;
function indexOf (xs, x) {
    if (xs.indexOf) return xs.indexOf(x);
    for (var i = 0; i < xs.length; i++) {
        if (x === xs[i]) return i;
    }
    return -1;
}


EventEmitter.prototype.emit = function(type) {
  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events || !this._events.error ||
        (isArray(this._events.error) && !this._events.error.length))
    {
      if (arguments[1] instanceof Error) {
        throw arguments[1]; // Unhandled 'error' event
      } else {
        throw new Error("Uncaught, unspecified 'error' event.");
      }
      return false;
    }
  }

  if (!this._events) return false;
  var handler = this._events[type];
  if (!handler) return false;

  if (typeof handler == 'function') {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        var args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
    return true;

  } else if (isArray(handler)) {
    var args = Array.prototype.slice.call(arguments, 1);

    var listeners = handler.slice();
    for (var i = 0, l = listeners.length; i < l; i++) {
      listeners[i].apply(this, args);
    }
    return true;

  } else {
    return false;
  }
};

// EventEmitter is defined in src/node_events.cc
// EventEmitter.prototype.emit() is also defined there.
EventEmitter.prototype.addListener = function(type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('addListener only takes instances of Function');
  }

  if (!this._events) this._events = {};

  // To avoid recursion in the case that type == "newListeners"! Before
  // adding it to the listeners, first emit "newListeners".
  this.emit('newListener', type, listener);

  if (!this._events[type]) {
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  } else if (isArray(this._events[type])) {
    // If we've already got an array, just append.
    this._events[type].push(listener);
  } else {
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  var self = this;
  self.on(type, function g() {
    self.removeListener(type, g);
    listener.apply(this, arguments);
  });

  return this;
};

EventEmitter.prototype.removeListener = function(type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('removeListener only takes instances of Function');
  }

  // does not use listeners(), so no side effect of creating _events[type]
  if (!this._events || !this._events[type]) return this;

  var list = this._events[type];

  if (isArray(list)) {
    var i = indexOf(list, listener);
    if (i < 0) return this;
    list.splice(i, 1);
    if (list.length == 0)
      delete this._events[type];
  } else if (this._events[type] === listener) {
    delete this._events[type];
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  if (arguments.length === 0) {
    this._events = {};
    return this;
  }

  // does not use listeners(), so no side effect of creating _events[type]
  if (type && this._events && this._events[type]) this._events[type] = null;
  return this;
};

EventEmitter.prototype.listeners = function(type) {
  if (!this._events) this._events = {};
  if (!this._events[type]) this._events[type] = [];
  if (!isArray(this._events[type])) {
    this._events[type] = [this._events[type]];
  }
  return this._events[type];
};

})();

Faye.Namespace = Faye.Class({
  initialize: function() {
    this._used = {};
  },

  exists: function(id) {
    return this._used.hasOwnProperty(id);
  },

  generate: function() {
    var name = Faye.random();
    while (this._used.hasOwnProperty(name))
      name = Faye.random();
    return this._used[name] = name;
  },

  release: function(id) {
    delete this._used[id];
  }
});

(function() {
'use strict';

var timeout = setTimeout;

var defer;
if (typeof setImmediate === 'function')
  defer = function(fn) { setImmediate(fn) };
else if (typeof process === 'object' && process.nextTick)
  defer = function(fn) { process.nextTick(fn) };
else
  defer = function(fn) { timeout(fn, 0) };

var PENDING   = 0,
    FULFILLED = 1,
    REJECTED  = 2;

var RETURN = function(x) { return x },
    THROW  = function(x) { throw x  };

var Promise = function(task) {
  this._state     = PENDING;
  this._callbacks = [];
  this._errbacks  = [];

  if (typeof task !== 'function') return;
  var self = this;

  task(function(value)  { fulfill(self, value) },
       function(reason) { reject(self, reason) });
};

Promise.prototype.then = function(callback, errback) {
  var next = {}, self = this;

  next.promise = new Promise(function(fulfill, reject) {
    next.fulfill = fulfill;
    next.reject  = reject;

    registerCallback(self, callback, next);
    registerErrback(self, errback, next);
  });
  return next.promise;
};

var registerCallback = function(promise, callback, next) {
  if (typeof callback !== 'function') callback = RETURN;
  var handler = function(value) { invoke(callback, value, next) };
  if (promise._state === PENDING) {
    promise._callbacks.push(handler);
  } else if (promise._state === FULFILLED) {
    handler(promise._value);
  }
};

var registerErrback = function(promise, errback, next) {
  if (typeof errback !== 'function') errback = THROW;
  var handler = function(reason) { invoke(errback, reason, next) };
  if (promise._state === PENDING) {
    promise._errbacks.push(handler);
  } else if (promise._state === REJECTED) {
    handler(promise._reason);
  }
};

var invoke = function(fn, value, next) {
  defer(function() { _invoke(fn, value, next) });
};

var _invoke = function(fn, value, next) {
  var called = false, outcome, type, then;

  try {
    outcome = fn(value);
    type    = typeof outcome;
    then    = outcome !== null && (type === 'function' || type === 'object') && outcome.then;

    if (outcome === next.promise)
      return next.reject(new TypeError('Recursive promise chain detected'));

    if (typeof then !== 'function') return next.fulfill(outcome);

    then.call(outcome, function(v) {
      if (called) return;
      called = true;
      _invoke(RETURN, v, next);
    }, function(r) {
      if (called) return;
      called = true;
      next.reject(r);
    });

  } catch (error) {
    if (called) return;
    called = true;
    next.reject(error);
  }
};

var fulfill = Promise.fulfill = Promise.resolve = function(promise, value) {
  if (promise._state !== PENDING) return;

  promise._state    = FULFILLED;
  promise._value    = value;
  promise._errbacks = [];

  var callbacks = promise._callbacks, cb;
  while (cb = callbacks.shift()) cb(value);
};

var reject = Promise.reject = function(promise, reason) {
  if (promise._state !== PENDING) return;

  promise._state     = REJECTED;
  promise._reason    = reason;
  promise._callbacks = [];

  var errbacks = promise._errbacks, eb;
  while (eb = errbacks.shift()) eb(reason);
};

Promise.defer = defer;

Promise.deferred = Promise.pending = function() {
  var tuple = {};

  tuple.promise = new Promise(function(fulfill, reject) {
    tuple.fulfill = tuple.resolve = fulfill;
    tuple.reject  = reject;
  });
  return tuple;
};

Promise.fulfilled = Promise.resolved = function(value) {
  return new Promise(function(fulfill, reject) { fulfill(value) });
};

Promise.rejected = function(reason) {
  return new Promise(function(fulfill, reject) { reject(reason) });
};

if (typeof Faye === 'undefined')
  module.exports = Promise;
else
  Faye.Promise = Promise;

})();

Faye.Set = Faye.Class({
  initialize: function() {
    this._index = {};
  },

  add: function(item) {
    var key = (item.id !== undefined) ? item.id : item;
    if (this._index.hasOwnProperty(key)) return false;
    this._index[key] = item;
    return true;
  },

  forEach: function(block, context) {
    for (var key in this._index) {
      if (this._index.hasOwnProperty(key))
        block.call(context, this._index[key]);
    }
  },

  isEmpty: function() {
    for (var key in this._index) {
      if (this._index.hasOwnProperty(key)) return false;
    }
    return true;
  },

  member: function(item) {
    for (var key in this._index) {
      if (this._index[key] === item) return true;
    }
    return false;
  },

  remove: function(item) {
    var key = (item.id !== undefined) ? item.id : item;
    var removed = this._index[key];
    delete this._index[key];
    return removed;
  },

  toArray: function() {
    var array = [];
    this.forEach(function(item) { array.push(item) });
    return array;
  }
});

Faye.URI = {
  isURI: function(uri) {
    return uri && uri.protocol && uri.host && uri.path;
  },

  isSameOrigin: function(uri) {
    var location = Faye.ENV.location;
    return uri.protocol === location.protocol &&
           uri.hostname === location.hostname &&
           uri.port     === location.port;
  },

  parse: function(url) {
    if (typeof url !== 'string') return url;
    var uri = {}, parts, query, pairs, i, n, data;

    var consume = function(name, pattern) {
      url = url.replace(pattern, function(match) {
        uri[name] = match;
        return '';
      });
      uri[name] = uri[name] || '';
    };

    consume('protocol', /^[a-z]+\:/i);
    consume('host',     /^\/\/[^\/\?#]+/);

    if (!/^\//.test(url) && !uri.host)
      url = Faye.ENV.location.pathname.replace(/[^\/]*$/, '') + url;

    consume('pathname', /^[^\?#]*/);
    consume('search',   /^\?[^#]*/);
    consume('hash',     /^#.*/);

    uri.protocol = uri.protocol || Faye.ENV.location.protocol;

    if (uri.host) {
      uri.host     = uri.host.substr(2);
      parts        = uri.host.split(':');
      uri.hostname = parts[0];
      uri.port     = parts[1] || '';
    } else {
      uri.host     = Faye.ENV.location.host;
      uri.hostname = Faye.ENV.location.hostname;
      uri.port     = Faye.ENV.location.port;
    }

    uri.pathname = uri.pathname || '/';
    uri.path = uri.pathname + uri.search;

    query = uri.search.replace(/^\?/, '');
    pairs = query ? query.split('&') : [];
    data  = {};

    for (i = 0, n = pairs.length; i < n; i++) {
      parts = pairs[i].split('=');
      data[decodeURIComponent(parts[0] || '')] = decodeURIComponent(parts[1] || '');
    }

    uri.query = data;

    uri.href = this.stringify(uri);
    return uri;
  },

  stringify: function(uri) {
    var string = uri.protocol + '//' + uri.hostname;
    if (uri.port) string += ':' + uri.port;
    string += uri.pathname + this.queryString(uri.query) + (uri.hash || '');
    return string;
  },

  queryString: function(query) {
    var pairs = [];
    for (var key in query) {
      if (!query.hasOwnProperty(key)) continue;
      pairs.push(encodeURIComponent(key) + '=' + encodeURIComponent(query[key]));
    }
    if (pairs.length === 0) return '';
    return '?' + pairs.join('&');
  }
};

Faye.Error = Faye.Class({
  initialize: function(code, params, message) {
    this.code    = code;
    this.params  = Array.prototype.slice.call(params);
    this.message = message;
  },

  toString: function() {
    return this.code + ':' +
           this.params.join(',') + ':' +
           this.message;
  }
});

Faye.Error.parse = function(message) {
  message = message || '';
  if (!Faye.Grammar.ERROR.test(message)) return new this(null, [], message);

  var parts   = message.split(':'),
      code    = parseInt(parts[0]),
      params  = parts[1].split(','),
      message = parts[2];

  return new this(code, params, message);
};




Faye.Error.versionMismatch = function() {
  return new this(300, arguments, 'Version mismatch').toString();
};

Faye.Error.conntypeMismatch = function() {
  return new this(301, arguments, 'Connection types not supported').toString();
};

Faye.Error.extMismatch = function() {
  return new this(302, arguments, 'Extension mismatch').toString();
};

Faye.Error.badRequest = function() {
  return new this(400, arguments, 'Bad request').toString();
};

Faye.Error.clientUnknown = function() {
  return new this(401, arguments, 'Unknown client').toString();
};

Faye.Error.parameterMissing = function() {
  return new this(402, arguments, 'Missing required parameter').toString();
};

Faye.Error.channelForbidden = function() {
  return new this(403, arguments, 'Forbidden channel').toString();
};

Faye.Error.channelUnknown = function() {
  return new this(404, arguments, 'Unknown channel').toString();
};

Faye.Error.channelInvalid = function() {
  return new this(405, arguments, 'Invalid channel').toString();
};

Faye.Error.extUnknown = function() {
  return new this(406, arguments, 'Unknown extension').toString();
};

Faye.Error.publishFailed = function() {
  return new this(407, arguments, 'Failed to publish').toString();
};

Faye.Error.serverError = function() {
  return new this(500, arguments, 'Internal server error').toString();
};


Faye.Deferrable = {
  then: function(callback, errback) {
    var self = this;
    if (!this._promise)
      this._promise = new Faye.Promise(function(fulfill, reject) {
        self._fulfill = fulfill;
        self._reject  = reject;
      });

    if (arguments.length === 0)
      return this._promise;
    else
      return this._promise.then(callback, errback);
  },

  callback: function(callback, context) {
    return this.then(function(value) { callback.call(context, value) });
  },

  errback: function(callback, context) {
    return this.then(null, function(reason) { callback.call(context, reason) });
  },

  timeout: function(seconds, message) {
    this.then();
    var self = this;
    this._timer = Faye.ENV.setTimeout(function() {
      self._reject(message);
    }, seconds * 1000);
  },

  setDeferredStatus: function(status, value) {
    if (this._timer) Faye.ENV.clearTimeout(this._timer);

    var promise = this.then();

    if (status === 'succeeded')
      this._fulfill(value);
    else if (status === 'failed')
      this._reject(value);
    else
      delete this._promise;
  }
};

Faye.Publisher = {
  countListeners: function(eventType) {
    return this.listeners(eventType).length;
  },

  bind: function(eventType, listener, context) {
    var slice   = Array.prototype.slice,
        handler = function() { listener.apply(context, slice.call(arguments)) };

    this._listeners = this._listeners || [];
    this._listeners.push([eventType, listener, context, handler]);
    return this.on(eventType, handler);
  },

  unbind: function(eventType, listener, context) {
    this._listeners = this._listeners || [];
    var n = this._listeners.length, tuple;

    while (n--) {
      tuple = this._listeners[n];
      if (tuple[0] !== eventType) continue;
      if (listener && (tuple[1] !== listener || tuple[2] !== context)) continue;
      this._listeners.splice(n, 1);
      this.removeListener(eventType, tuple[3]);
    }
  }
};

Faye.extend(Faye.Publisher, Faye.EventEmitter.prototype);
Faye.Publisher.trigger = Faye.Publisher.emit;

Faye.Timeouts = {
  addTimeout: function(name, delay, callback, context) {
    this._timeouts = this._timeouts || {};
    if (this._timeouts.hasOwnProperty(name)) return;
    var self = this;
    this._timeouts[name] = Faye.ENV.setTimeout(function() {
      delete self._timeouts[name];
      callback.call(context);
    }, 1000 * delay);
  },

  removeTimeout: function(name) {
    this._timeouts = this._timeouts || {};
    var timeout = this._timeouts[name];
    if (!timeout) return;
    clearTimeout(timeout);
    delete this._timeouts[name];
  },

  removeAllTimeouts: function() {
    this._timeouts = this._timeouts || {};
    for (var name in this._timeouts) this.removeTimeout(name);
  }
};

Faye.Logging = {
  LOG_LEVELS: {
    fatal:  4,
    error:  3,
    warn:   2,
    info:   1,
    debug:  0
  },

  writeLog: function(messageArgs, level) {
    if (!Faye.logger) return;

    var messageArgs = Array.prototype.slice.apply(messageArgs),
        banner      = '[Faye',
        klass       = this.className,

        message = messageArgs.shift().replace(/\?/g, function() {
          try {
            return Faye.toJSON(messageArgs.shift());
          } catch (e) {
            return '[Object]';
          }
        });

    for (var key in Faye) {
      if (klass) continue;
      if (typeof Faye[key] !== 'function') continue;
      if (this instanceof Faye[key]) klass = key;
    }
    if (klass) banner += '.' + klass;
    banner += '] ';

    if (typeof Faye.logger[level] === 'function')
      Faye.logger[level](banner + message);
    else if (typeof Faye.logger === 'function')
      Faye.logger(banner + message);
  }
};

(function() {
  for (var key in Faye.Logging.LOG_LEVELS)
    (function(level, value) {
      Faye.Logging[level] = function() {
        this.writeLog(arguments, level);
      };
    })(key, Faye.Logging.LOG_LEVELS[key]);
})();

Faye.Grammar = {
  CHANNEL_NAME:     /^\/(((([a-z]|[A-Z])|[0-9])|(\-|\_|\!|\~|\(|\)|\$|\@)))+(\/(((([a-z]|[A-Z])|[0-9])|(\-|\_|\!|\~|\(|\)|\$|\@)))+)*$/,
  CHANNEL_PATTERN:  /^(\/(((([a-z]|[A-Z])|[0-9])|(\-|\_|\!|\~|\(|\)|\$|\@)))+)*\/\*{1,2}$/,
  ERROR:            /^([0-9][0-9][0-9]:(((([a-z]|[A-Z])|[0-9])|(\-|\_|\!|\~|\(|\)|\$|\@)| |\/|\*|\.))*(,(((([a-z]|[A-Z])|[0-9])|(\-|\_|\!|\~|\(|\)|\$|\@)| |\/|\*|\.))*)*:(((([a-z]|[A-Z])|[0-9])|(\-|\_|\!|\~|\(|\)|\$|\@)| |\/|\*|\.))*|[0-9][0-9][0-9]::(((([a-z]|[A-Z])|[0-9])|(\-|\_|\!|\~|\(|\)|\$|\@)| |\/|\*|\.))*)$/,
  VERSION:          /^([0-9])+(\.(([a-z]|[A-Z])|[0-9])(((([a-z]|[A-Z])|[0-9])|\-|\_))*)*$/
};

Faye.Extensible = {
  addExtension: function(extension) {
    this._extensions = this._extensions || [];
    this._extensions.push(extension);
    if (extension.added) extension.added(this);
  },

  removeExtension: function(extension) {
    if (!this._extensions) return;
    var i = this._extensions.length;
    while (i--) {
      if (this._extensions[i] !== extension) continue;
      this._extensions.splice(i,1);
      if (extension.removed) extension.removed(this);
    }
  },

  pipeThroughExtensions: function(stage, message, request, callback, context) {
    this.debug('Passing through ? extensions: ?', stage, message);

    if (!this._extensions) return callback.call(context, message);
    var extensions = this._extensions.slice();

    var pipe = function(message) {
      if (!message) return callback.call(context, message);

      var extension = extensions.shift();
      if (!extension) return callback.call(context, message);

      var fn = extension[stage];
      if (!fn) return pipe(message);

      if (fn.length >= 3) extension[stage](message, request, pipe);
      else                extension[stage](message, pipe);
    };
    pipe(message);
  }
};

Faye.extend(Faye.Extensible, Faye.Logging);

Faye.Channel = Faye.Class({
  initialize: function(name) {
    this.id = this.name = name;
  },

  push: function(message) {
    this.trigger('message', message);
  },

  isUnused: function() {
    return this.countListeners('message') === 0;
  }
});

Faye.extend(Faye.Channel.prototype, Faye.Publisher);

Faye.extend(Faye.Channel, {
  HANDSHAKE:    '/meta/handshake',
  CONNECT:      '/meta/connect',
  SUBSCRIBE:    '/meta/subscribe',
  UNSUBSCRIBE:  '/meta/unsubscribe',
  DISCONNECT:   '/meta/disconnect',

  META:         'meta',
  SERVICE:      'service',

  expand: function(name) {
    var segments = this.parse(name),
        channels = ['/**', name];

    var copy = segments.slice();
    copy[copy.length - 1] = '*';
    channels.push(this.unparse(copy));

    for (var i = 1, n = segments.length; i < n; i++) {
      copy = segments.slice(0, i);
      copy.push('**');
      channels.push(this.unparse(copy));
    }

    return channels;
  },

  isValid: function(name) {
    return Faye.Grammar.CHANNEL_NAME.test(name) ||
           Faye.Grammar.CHANNEL_PATTERN.test(name);
  },

  parse: function(name) {
    if (!this.isValid(name)) return null;
    return name.split('/').slice(1);
  },

  unparse: function(segments) {
    return '/' + segments.join('/');
  },

  isMeta: function(name) {
    var segments = this.parse(name);
    return segments ? (segments[0] === this.META) : null;
  },

  isService: function(name) {
    var segments = this.parse(name);
    return segments ? (segments[0] === this.SERVICE) : null;
  },

  isSubscribable: function(name) {
    if (!this.isValid(name)) return null;
    return !this.isMeta(name) && !this.isService(name);
  },

  Set: Faye.Class({
    initialize: function() {
      this._channels = {};
    },

    getKeys: function() {
      var keys = [];
      for (var key in this._channels) keys.push(key);
      return keys;
    },

    remove: function(name) {
      delete this._channels[name];
    },

    hasSubscription: function(name) {
      return this._channels.hasOwnProperty(name);
    },

    subscribe: function(names, callback, context) {
      if (!callback) return;
      var name;
      for (var i = 0, n = names.length; i < n; i++) {
        name = names[i];
        var channel = this._channels[name] = this._channels[name] || new Faye.Channel(name);
        channel.bind('message', callback, context);
      }
    },

    unsubscribe: function(name, callback, context) {
      var channel = this._channels[name];
      if (!channel) return false;
      channel.unbind('message', callback, context);

      if (channel.isUnused()) {
        this.remove(name);
        return true;
      } else {
        return false;
      }
    },

    distributeMessage: function(message) {
      var channels = Faye.Channel.expand(message.channel);

      for (var i = 0, n = channels.length; i < n; i++) {
        var channel = this._channels[channels[i]];
        if (channel) channel.trigger('message', message.data);
      }
    }
  })
});

Faye.Envelope = Faye.Class({
  initialize: function(message, timeout) {
    this.id      = message.id;
    this.message = message;

    if (timeout !== undefined) this.timeout(timeout / 1000, false);
  }
});

Faye.extend(Faye.Envelope.prototype, Faye.Deferrable);

Faye.Publication = Faye.Class(Faye.Deferrable);

Faye.Subscription = Faye.Class({
  initialize: function(client, channels, callback, context) {
    this._client    = client;
    this._channels  = channels;
    this._callback  = callback;
    this._context     = context;
    this._cancelled = false;
  },

  cancel: function() {
    if (this._cancelled) return;
    this._client.unsubscribe(this._channels, this._callback, this._context);
    this._cancelled = true;
  },

  unsubscribe: function() {
    this.cancel();
  }
});

Faye.extend(Faye.Subscription.prototype, Faye.Deferrable);

Faye.Client = Faye.Class({
  UNCONNECTED:          1,
  CONNECTING:           2,
  CONNECTED:            3,
  DISCONNECTED:         4,

  HANDSHAKE:            'handshake',
  RETRY:                'retry',
  NONE:                 'none',

  CONNECTION_TIMEOUT:   60,
  DEFAULT_RETRY:        5,
  MAX_REQUEST_SIZE:     2048,

  DEFAULT_ENDPOINT:     '/bayeux',
  INTERVAL:             0,

  initialize: function(endpoint, options) {
    this.info('New client created for ?', endpoint);

    this._options   = options || {};
    this.endpoint   = Faye.URI.parse(endpoint || this.DEFAULT_ENDPOINT);
    this.endpoints  = this._options.endpoints || {};
    this.transports = {};
    this.cookies    = Faye.CookieJar && new Faye.CookieJar();
    this.headers    = {};
    this.ca         = this._options.ca;
    this._disabled  = [];
    this._retry     = this._options.retry || this.DEFAULT_RETRY;

    for (var key in this.endpoints)
      this.endpoints[key] = Faye.URI.parse(this.endpoints[key]);

    this.maxRequestSize = this.MAX_REQUEST_SIZE;

    this._state     = this.UNCONNECTED;
    this._channels  = new Faye.Channel.Set();
    this._messageId = 0;

    this._responseCallbacks = {};

    this._advice = {
      reconnect: this.RETRY,
      interval:  1000 * (this._options.interval || this.INTERVAL),
      timeout:   1000 * (this._options.timeout  || this.CONNECTION_TIMEOUT)
    };

    if (Faye.Event && Faye.ENV.onbeforeunload !== undefined)
      Faye.Event.on(Faye.ENV, 'beforeunload', function() {
        if (Faye.indexOf(this._disabled, 'autodisconnect') < 0)
          this.disconnect();
      }, this);
  },

  disable: function(feature) {
    this._disabled.push(feature);
  },

  setHeader: function(name, value) {
    this.headers[name] = value;
  },

  // Request
  // MUST include:  * channel
  //                * version
  //                * supportedConnectionTypes
  // MAY include:   * minimumVersion
  //                * ext
  //                * id
  //
  // Success Response                             Failed Response
  // MUST include:  * channel                     MUST include:  * channel
  //                * version                                    * successful
  //                * supportedConnectionTypes                   * error
  //                * clientId                    MAY include:   * supportedConnectionTypes
  //                * successful                                 * advice
  // MAY include:   * minimumVersion                             * version
  //                * advice                                     * minimumVersion
  //                * ext                                        * ext
  //                * id                                         * id
  //                * authSuccessful
  handshake: function(callback, context) {
    if (this._advice.reconnect === this.NONE) return;
    if (this._state !== this.UNCONNECTED) return;

    this._state = this.CONNECTING;
    var self = this;

    this.info('Initiating handshake with ?', Faye.URI.stringify(this.endpoint));
    this._selectTransport(Faye.MANDATORY_CONNECTION_TYPES);

    this._send({
      channel:                  Faye.Channel.HANDSHAKE,
      version:                  Faye.BAYEUX_VERSION,
      supportedConnectionTypes: [this._transport.connectionType]

    }, function(response) {

      if (response.successful) {
        this._state     = this.CONNECTED;
        this._clientId  = response.clientId;

        this._selectTransport(response.supportedConnectionTypes);

        this.info('Handshake successful: ?', this._clientId);

        this.subscribe(this._channels.getKeys(), true);
        if (callback) Faye.Promise.defer(function() { callback.call(context) });

      } else {
        this.info('Handshake unsuccessful');
        Faye.ENV.setTimeout(function() { self.handshake(callback, context) }, this._advice.interval);
        this._state = this.UNCONNECTED;
      }
    }, this);
  },

  // Request                              Response
  // MUST include:  * channel             MUST include:  * channel
  //                * clientId                           * successful
  //                * connectionType                     * clientId
  // MAY include:   * ext                 MAY include:   * error
  //                * id                                 * advice
  //                                                     * ext
  //                                                     * id
  //                                                     * timestamp
  connect: function(callback, context) {
    if (this._advice.reconnect === this.NONE) return;
    if (this._state === this.DISCONNECTED) return;

    if (this._state === this.UNCONNECTED)
      return this.handshake(function() { this.connect(callback, context) }, this);

    this.callback(callback, context);
    if (this._state !== this.CONNECTED) return;

    this.info('Calling deferred actions for ?', this._clientId);
    this.setDeferredStatus('succeeded');
    this.setDeferredStatus('unknown');

    if (this._connectRequest) return;
    this._connectRequest = true;

    this.info('Initiating connection for ?', this._clientId);

    this._send({
      channel:        Faye.Channel.CONNECT,
      clientId:       this._clientId,
      connectionType: this._transport.connectionType

    }, this._cycleConnection, this);
  },

  // Request                              Response
  // MUST include:  * channel             MUST include:  * channel
  //                * clientId                           * successful
  // MAY include:   * ext                                * clientId
  //                * id                  MAY include:   * error
  //                                                     * ext
  //                                                     * id
  disconnect: function() {
    if (this._state !== this.CONNECTED) return;
    this._state = this.DISCONNECTED;

    this.info('Disconnecting ?', this._clientId);

    this._send({
      channel:  Faye.Channel.DISCONNECT,
      clientId: this._clientId

    }, function(response) {
      if (!response.successful) return;
      this._transport.close();
      delete this._transport;
    }, this);

    this.info('Clearing channel listeners for ?', this._clientId);
    this._channels = new Faye.Channel.Set();
  },

  // Request                              Response
  // MUST include:  * channel             MUST include:  * channel
  //                * clientId                           * successful
  //                * subscription                       * clientId
  // MAY include:   * ext                                * subscription
  //                * id                  MAY include:   * error
  //                                                     * advice
  //                                                     * ext
  //                                                     * id
  //                                                     * timestamp
  subscribe: function(channel, callback, context) {
    if (channel instanceof Array)
      return Faye.map(channel, function(c) {
        return this.subscribe(c, callback, context);
      }, this);

    var subscription = new Faye.Subscription(this, channel, callback, context),
        force        = (callback === true),
        hasSubscribe = this._channels.hasSubscription(channel);

    if (hasSubscribe && !force) {
      this._channels.subscribe([channel], callback, context);
      subscription.setDeferredStatus('succeeded');
      return subscription;
    }

    this.connect(function() {
      this.info('Client ? attempting to subscribe to ?', this._clientId, channel);
      if (!force) this._channels.subscribe([channel], callback, context);

      this._send({
        channel:      Faye.Channel.SUBSCRIBE,
        clientId:     this._clientId,
        subscription: channel

      }, function(response) {
        if (!response.successful) {
          subscription.setDeferredStatus('failed', Faye.Error.parse(response.error));
          return this._channels.unsubscribe(channel, callback, context);
        }

        var channels = [].concat(response.subscription);
        this.info('Subscription acknowledged for ? to ?', this._clientId, channels);
        subscription.setDeferredStatus('succeeded');
      }, this);
    }, this);

    return subscription;
  },

  // Request                              Response
  // MUST include:  * channel             MUST include:  * channel
  //                * clientId                           * successful
  //                * subscription                       * clientId
  // MAY include:   * ext                                * subscription
  //                * id                  MAY include:   * error
  //                                                     * advice
  //                                                     * ext
  //                                                     * id
  //                                                     * timestamp
  unsubscribe: function(channel, callback, context) {
    if (channel instanceof Array)
      return Faye.map(channel, function(c) {
        return this.unsubscribe(c, callback, context);
      }, this);

    var dead = this._channels.unsubscribe(channel, callback, context);
    if (!dead) return;

    this.connect(function() {
      this.info('Client ? attempting to unsubscribe from ?', this._clientId, channel);

      this._send({
        channel:      Faye.Channel.UNSUBSCRIBE,
        clientId:     this._clientId,
        subscription: channel

      }, function(response) {
        if (!response.successful) return;

        var channels = [].concat(response.subscription);
        this.info('Unsubscription acknowledged for ? from ?', this._clientId, channels);
      }, this);
    }, this);
  },

  // Request                              Response
  // MUST include:  * channel             MUST include:  * channel
  //                * data                               * successful
  // MAY include:   * clientId            MAY include:   * id
  //                * id                                 * error
  //                * ext                                * ext
  publish: function(channel, data) {
    var publication = new Faye.Publication();

    this.connect(function() {
      this.info('Client ? queueing published message to ?: ?', this._clientId, channel, data);

      this._send({
        channel:  channel,
        data:     data,
        clientId: this._clientId

      }, function(response) {
        if (response.successful)
          publication.setDeferredStatus('succeeded');
        else
          publication.setDeferredStatus('failed', Faye.Error.parse(response.error));
      }, this);
    }, this);

    return publication;
  },

  receiveMessage: function(message) {
    var id = message.id, timeout, callback;

    if (message.successful !== undefined) {
      callback = this._responseCallbacks[id];
      delete this._responseCallbacks[id];
    }

    this.pipeThroughExtensions('incoming', message, null, function(message) {
      if (!message) return;

      if (message.advice) this._handleAdvice(message.advice);
      this._deliverMessage(message);

      if (callback) callback[0].call(callback[1], message);
    }, this);

    if (this._transportUp === true) return;
    this._transportUp = true;
    this.trigger('transport:up');
  },

  messageError: function(messages, immediate) {
    var retry = this._retry,
        self  = this,
        id, message, timeout;

    for (var i = 0, n = messages.length; i < n; i++) {
      message = messages[i];
      id      = message.id;

      if (immediate)
        this._transportSend(message);
      else
        Faye.ENV.setTimeout(function() { self._transportSend(message) }, retry * 1000);
    }

    if (immediate || this._transportUp === false) return;
    this._transportUp = false;
    this.trigger('transport:down');
  },

  _selectTransport: function(transportTypes) {
    Faye.Transport.get(this, transportTypes, this._disabled, function(transport) {
      this.debug('Selected ? transport for ?', transport.connectionType, Faye.URI.stringify(transport.endpoint));

      if (transport === this._transport) return;
      if (this._transport) this._transport.close();

      this._transport = transport;
    }, this);
  },

  _send: function(message, callback, context) {
    if (!this._transport) return;
    message.id = message.id || this._generateMessageId();

    this.pipeThroughExtensions('outgoing', message, null, function(message) {
      if (!message) return;
      if (callback) this._responseCallbacks[message.id] = [callback, context];
      this._transportSend(message);
    }, this);
  },

  _transportSend: function(message) {
    if (!this._transport) return;

    var timeout  = 1.2 * (this._advice.timeout || this._retry * 1000),
        envelope = new Faye.Envelope(message, timeout);

    envelope.errback(function(immediate) {
      this.messageError([message], immediate);
    }, this);

    this._transport.send(envelope);
  },

  _generateMessageId: function() {
    this._messageId += 1;
    if (this._messageId >= Math.pow(2,32)) this._messageId = 0;
    return this._messageId.toString(36);
  },

  _handleAdvice: function(advice) {
    Faye.extend(this._advice, advice);

    if (this._advice.reconnect === this.HANDSHAKE && this._state !== this.DISCONNECTED) {
      this._state    = this.UNCONNECTED;
      this._clientId = null;
      this._cycleConnection();
    }
  },

  _deliverMessage: function(message) {
    if (!message.channel || message.data === undefined) return;
    this.info('Client ? calling listeners for ? with ?', this._clientId, message.channel, message.data);
    this._channels.distributeMessage(message);
  },

  _cycleConnection: function() {
    if (this._connectRequest) {
      this._connectRequest = null;
      this.info('Closed connection for ?', this._clientId);
    }
    var self = this;
    Faye.ENV.setTimeout(function() { self.connect() }, this._advice.interval);
  }
});

Faye.extend(Faye.Client.prototype, Faye.Deferrable);
Faye.extend(Faye.Client.prototype, Faye.Publisher);
Faye.extend(Faye.Client.prototype, Faye.Logging);
Faye.extend(Faye.Client.prototype, Faye.Extensible);

Faye.Transport = Faye.extend(Faye.Class({
  MAX_DELAY: 0,
  batching:  true,

  initialize: function(client, endpoint) {
    this._client  = client;
    this.endpoint = endpoint;
    this._outbox  = [];
  },

  close: function() {},

  encode: function(envelopes) {
    return '';
  },

  send: function(envelope) {
    var message = envelope.message;

    this.debug('Client ? sending message to ?: ?',
               this._client._clientId, Faye.URI.stringify(this.endpoint), message);

    if (!this.batching) return this.request([envelope]);

    this._outbox.push(envelope);

    if (message.channel === Faye.Channel.HANDSHAKE)
      return this.addTimeout('publish', 0.01, this.flush, this);

    if (message.channel === Faye.Channel.CONNECT)
      this._connectMessage = message;

    this.flushLargeBatch();
    this.addTimeout('publish', this.MAX_DELAY, this.flush, this);
  },

  flush: function() {
    this.removeTimeout('publish');

    if (this._outbox.length > 1 && this._connectMessage)
      this._connectMessage.advice = {timeout: 0};

    this.request(this._outbox);

    this._connectMessage = null;
    this._outbox = [];
  },

  flushLargeBatch: function() {
    var string = this.encode(this._outbox);
    if (string.length < this._client.maxRequestSize) return;
    var last = this._outbox.pop();
    this.flush();
    if (last) this._outbox.push(last);
  },

  receive: function(envelopes, responses) {
    var n = envelopes.length;
    while (n--) envelopes[n].setDeferredStatus('succeeded');

    responses = [].concat(responses);

    this.debug('Client ? received from ?: ?',
               this._client._clientId, Faye.URI.stringify(this.endpoint), responses);

    for (var i = 0, n = responses.length; i < n; i++)
      this._client.receiveMessage(responses[i]);
  },

  handleError: function(envelopes, immediate) {
    var n = envelopes.length;
    while (n--) envelopes[n].setDeferredStatus('failed', immediate);
  },

  _getCookies: function() {
    var cookies = this._client.cookies;
    if (!cookies) return '';

    return cookies.getCookies({
      domain: this.endpoint.hostname,
      path:   this.endpoint.path,
      secure: this.endpoint.protocol === 'https:'
    }).toValueString();
  },

  _storeCookies: function(setCookie) {
    if (!setCookie || !this._client.cookies) return;
    setCookie = [].concat(setCookie);
    var cookie;

    for (var i = 0, n = setCookie.length; i < n; i++) {
      cookie = this._client.cookies.setCookie(setCookie[i]);
      cookie = cookie[0] || cookie;
      cookie.domain = cookie.domain || this.endpoint.hostname;
    }
  }

}), {
  get: function(client, allowed, disabled, callback, context) {
    var endpoint = client.endpoint;

    Faye.asyncEach(this._transports, function(pair, resume) {
      var connType     = pair[0], klass = pair[1],
          connEndpoint = client.endpoints[connType] || endpoint;

      if (Faye.indexOf(disabled, connType) >= 0)
        return resume();

      if (Faye.indexOf(allowed, connType) < 0) {
        klass.isUsable(client, connEndpoint, function() {});
        return resume();
      }

      klass.isUsable(client, connEndpoint, function(isUsable) {
        if (!isUsable) return resume();
        var transport = klass.hasOwnProperty('create') ? klass.create(client, connEndpoint) : new klass(client, connEndpoint);
        callback.call(context, transport);
      });
    }, function() {
      throw new Error('Could not find a usable connection type for ' + Faye.URI.stringify(endpoint));
    });
  },

  register: function(type, klass) {
    this._transports.push([type, klass]);
    klass.prototype.connectionType = type;
  },

  _transports: []
});

Faye.extend(Faye.Transport.prototype, Faye.Logging);
Faye.extend(Faye.Transport.prototype, Faye.Timeouts);

Faye.Event = {
  _registry: [],

  on: function(element, eventName, callback, context) {
    var wrapped = function() { callback.call(context) };

    if (element.addEventListener)
      element.addEventListener(eventName, wrapped, false);
    else
      element.attachEvent('on' + eventName, wrapped);

    this._registry.push({
      _element:   element,
      _type:      eventName,
      _callback:  callback,
      _context:     context,
      _handler:   wrapped
    });
  },

  detach: function(element, eventName, callback, context) {
    var i = this._registry.length, register;
    while (i--) {
      register = this._registry[i];

      if ((element    && element    !== register._element)   ||
          (eventName  && eventName  !== register._type)      ||
          (callback   && callback   !== register._callback)  ||
          (context      && context      !== register._context))
        continue;

      if (register._element.removeEventListener)
        register._element.removeEventListener(register._type, register._handler, false);
      else
        register._element.detachEvent('on' + register._type, register._handler);

      this._registry.splice(i,1);
      register = null;
    }
  }
};

if (Faye.ENV.onunload !== undefined) Faye.Event.on(Faye.ENV, 'unload', Faye.Event.detach, Faye.Event);

/*
    json2.js
    2013-05-26

    Public Domain.

    NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.

    See http://www.JSON.org/js.html


    This code should be minified before deployment.
    See http://javascript.crockford.com/jsmin.html

    USE YOUR OWN COPY. IT IS EXTREMELY UNWISE TO LOAD CODE FROM SERVERS YOU DO
    NOT CONTROL.


    This file creates a global JSON object containing two methods: stringify
    and parse.

        JSON.stringify(value, replacer, space)
            value       any JavaScript value, usually an object or array.

            replacer    an optional parameter that determines how object
                        values are stringified for objects. It can be a
                        function or an array of strings.

            space       an optional parameter that specifies the indentation
                        of nested structures. If it is omitted, the text will
                        be packed without extra whitespace. If it is a number,
                        it will specify the number of spaces to indent at each
                        level. If it is a string (such as '\t' or '&nbsp;'),
                        it contains the characters used to indent at each level.

            This method produces a JSON text from a JavaScript value.

            When an object value is found, if the object contains a toJSON
            method, its toJSON method will be called and the result will be
            stringified. A toJSON method does not serialize: it returns the
            value represented by the name/value pair that should be serialized,
            or undefined if nothing should be serialized. The toJSON method
            will be passed the key associated with the value, and this will be
            bound to the value

            For example, this would serialize Dates as ISO strings.

                Date.prototype.toJSON = function (key) {
                    function f(n) {
                        // Format integers to have at least two digits.
                        return n < 10 ? '0' + n : n;
                    }

                    return this.getUTCFullYear()   + '-' +
                         f(this.getUTCMonth() + 1) + '-' +
                         f(this.getUTCDate())      + 'T' +
                         f(this.getUTCHours())     + ':' +
                         f(this.getUTCMinutes())   + ':' +
                         f(this.getUTCSeconds())   + 'Z';
                };

            You can provide an optional replacer method. It will be passed the
            key and value of each member, with this bound to the containing
            object. The value that is returned from your method will be
            serialized. If your method returns undefined, then the member will
            be excluded from the serialization.

            If the replacer parameter is an array of strings, then it will be
            used to select the members to be serialized. It filters the results
            such that only members with keys listed in the replacer array are
            stringified.

            Values that do not have JSON representations, such as undefined or
            functions, will not be serialized. Such values in objects will be
            dropped; in arrays they will be replaced with null. You can use
            a replacer function to replace those with JSON values.
            JSON.stringify(undefined) returns undefined.

            The optional space parameter produces a stringification of the
            value that is filled with line breaks and indentation to make it
            easier to read.

            If the space parameter is a non-empty string, then that string will
            be used for indentation. If the space parameter is a number, then
            the indentation will be that many spaces.

            Example:

            text = JSON.stringify(['e', {pluribus: 'unum'}]);
            // text is '["e",{"pluribus":"unum"}]'


            text = JSON.stringify(['e', {pluribus: 'unum'}], null, '\t');
            // text is '[\n\t"e",\n\t{\n\t\t"pluribus": "unum"\n\t}\n]'

            text = JSON.stringify([new Date()], function (key, value) {
                return this[key] instanceof Date ?
                    'Date(' + this[key] + ')' : value;
            });
            // text is '["Date(---current time---)"]'


        JSON.parse(text, reviver)
            This method parses a JSON text to produce an object or array.
            It can throw a SyntaxError exception.

            The optional reviver parameter is a function that can filter and
            transform the results. It receives each of the keys and values,
            and its return value is used instead of the original value.
            If it returns what it received, then the structure is not modified.
            If it returns undefined then the member is deleted.

            Example:

            // Parse the text. Values that look like ISO date strings will
            // be converted to Date objects.

            myData = JSON.parse(text, function (key, value) {
                var a;
                if (typeof value === 'string') {
                    a =
/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/.exec(value);
                    if (a) {
                        return new Date(Date.UTC(+a[1], +a[2] - 1, +a[3], +a[4],
                            +a[5], +a[6]));
                    }
                }
                return value;
            });

            myData = JSON.parse('["Date(09/09/2001)"]', function (key, value) {
                var d;
                if (typeof value === 'string' &&
                        value.slice(0, 5) === 'Date(' &&
                        value.slice(-1) === ')') {
                    d = new Date(value.slice(5, -1));
                    if (d) {
                        return d;
                    }
                }
                return value;
            });


    This is a reference implementation. You are free to copy, modify, or
    redistribute.
*/

/*jslint evil: true, regexp: true */

/*members "", "\b", "\t", "\n", "\f", "\r", "\"", JSON, "\\", apply,
    call, charCodeAt, getUTCDate, getUTCFullYear, getUTCHours,
    getUTCMinutes, getUTCMonth, getUTCSeconds, hasOwnProperty, join,
    lastIndex, length, parse, prototype, push, replace, slice, stringify,
    test, toJSON, toString, valueOf
*/


// Create a JSON object only if one does not already exist. We create the
// methods in a closure to avoid creating global variables.

if (typeof JSON !== 'object') {
    JSON = {};
}

(function () {
    'use strict';

    function f(n) {
        // Format integers to have at least two digits.
        return n < 10 ? '0' + n : n;
    }

    if (typeof Date.prototype.toJSON !== 'function') {

        Date.prototype.toJSON = function () {

            return isFinite(this.valueOf())
                ? this.getUTCFullYear()     + '-' +
                    f(this.getUTCMonth() + 1) + '-' +
                    f(this.getUTCDate())      + 'T' +
                    f(this.getUTCHours())     + ':' +
                    f(this.getUTCMinutes())   + ':' +
                    f(this.getUTCSeconds())   + 'Z'
                : null;
        };

        String.prototype.toJSON      =
            Number.prototype.toJSON  =
            Boolean.prototype.toJSON = function () {
                return this.valueOf();
            };
    }

    var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        gap,
        indent,
        meta = {    // table of character substitutions
            '\b': '\\b',
            '\t': '\\t',
            '\n': '\\n',
            '\f': '\\f',
            '\r': '\\r',
            '"' : '\\"',
            '\\': '\\\\'
        },
        rep;


    function quote(string) {

// If the string contains no control characters, no quote characters, and no
// backslash characters, then we can safely slap some quotes around it.
// Otherwise we must also replace the offending characters with safe escape
// sequences.

        escapable.lastIndex = 0;
        return escapable.test(string) ? '"' + string.replace(escapable, function (a) {
            var c = meta[a];
            return typeof c === 'string'
                ? c
                : '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
        }) + '"' : '"' + string + '"';
    }


    function str(key, holder) {

// Produce a string from holder[key].

        var i,          // The loop counter.
            k,          // The member key.
            v,          // The member value.
            length,
            mind = gap,
            partial,
            value = holder[key];

// If the value has a toJSON method, call it to obtain a replacement value.

        if (value && typeof value === 'object' &&
                typeof value.toJSON === 'function') {
            value = value.toJSON(key);
        }

// If we were called with a replacer function, then call the replacer to
// obtain a replacement value.

        if (typeof rep === 'function') {
            value = rep.call(holder, key, value);
        }

// What happens next depends on the value's type.

        switch (typeof value) {
        case 'string':
            return quote(value);

        case 'number':

// JSON numbers must be finite. Encode non-finite numbers as null.

            return isFinite(value) ? String(value) : 'null';

        case 'boolean':
        case 'null':

// If the value is a boolean or null, convert it to a string. Note:
// typeof null does not produce 'null'. The case is included here in
// the remote chance that this gets fixed someday.

            return String(value);

// If the type is 'object', we might be dealing with an object or an array or
// null.

        case 'object':

// Due to a specification blunder in ECMAScript, typeof null is 'object',
// so watch out for that case.

            if (!value) {
                return 'null';
            }

// Make an array to hold the partial results of stringifying this object value.

            gap += indent;
            partial = [];

// Is the value an array?

            if (Object.prototype.toString.apply(value) === '[object Array]') {

// The value is an array. Stringify every element. Use null as a placeholder
// for non-JSON values.

                length = value.length;
                for (i = 0; i < length; i += 1) {
                    partial[i] = str(i, value) || 'null';
                }

// Join all of the elements together, separated with commas, and wrap them in
// brackets.

                v = partial.length === 0
                    ? '[]'
                    : gap
                    ? '[\n' + gap + partial.join(',\n' + gap) + '\n' + mind + ']'
                    : '[' + partial.join(',') + ']';
                gap = mind;
                return v;
            }

// If the replacer is an array, use it to select the members to be stringified.

            if (rep && typeof rep === 'object') {
                length = rep.length;
                for (i = 0; i < length; i += 1) {
                    if (typeof rep[i] === 'string') {
                        k = rep[i];
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            } else {

// Otherwise, iterate through all of the keys in the object.

                for (k in value) {
                    if (Object.prototype.hasOwnProperty.call(value, k)) {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            }

// Join all of the member texts together, separated with commas,
// and wrap them in braces.

            v = partial.length === 0
                ? '{}'
                : gap
                ? '{\n' + gap + partial.join(',\n' + gap) + '\n' + mind + '}'
                : '{' + partial.join(',') + '}';
            gap = mind;
            return v;
        }
    }

// If the JSON object does not yet have a stringify method, give it one.

    Faye.stringify = function (value, replacer, space) {

// The stringify method takes a value and an optional replacer, and an optional
// space parameter, and returns a JSON text. The replacer can be a function
// that can replace values, or an array of strings that will select the keys.
// A default replacer method can be provided. Use of the space parameter can
// produce text that is more easily readable.

        var i;
        gap = '';
        indent = '';

// If the space parameter is a number, make an indent string containing that
// many spaces.

        if (typeof space === 'number') {
            for (i = 0; i < space; i += 1) {
                indent += ' ';
            }

// If the space parameter is a string, it will be used as the indent string.

        } else if (typeof space === 'string') {
            indent = space;
        }

// If there is a replacer, it must be a function or an array.
// Otherwise, throw an error.

        rep = replacer;
        if (replacer && typeof replacer !== 'function' &&
                (typeof replacer !== 'object' ||
                typeof replacer.length !== 'number')) {
            throw new Error('JSON.stringify');
        }

// Make a fake root object containing our value under the key of ''.
// Return the result of stringifying the value.

        return str('', {'': value});
    };

    if (typeof JSON.stringify !== 'function') {
        JSON.stringify = Faye.stringify;
    }

// If the JSON object does not yet have a parse method, give it one.

    if (typeof JSON.parse !== 'function') {
        JSON.parse = function (text, reviver) {

// The parse method takes a text and an optional reviver function, and returns
// a JavaScript value if the text is a valid JSON text.

            var j;

            function walk(holder, key) {

// The walk method is used to recursively walk the resulting structure so
// that modifications can be made.

                var k, v, value = holder[key];
                if (value && typeof value === 'object') {
                    for (k in value) {
                        if (Object.prototype.hasOwnProperty.call(value, k)) {
                            v = walk(value, k);
                            if (v !== undefined) {
                                value[k] = v;
                            } else {
                                delete value[k];
                            }
                        }
                    }
                }
                return reviver.call(holder, key, value);
            }


// Parsing happens in four stages. In the first stage, we replace certain
// Unicode characters with escape sequences. JavaScript handles many characters
// incorrectly, either silently deleting them, or treating them as line endings.

            text = String(text);
            cx.lastIndex = 0;
            if (cx.test(text)) {
                text = text.replace(cx, function (a) {
                    return '\\u' +
                        ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
                });
            }

// In the second stage, we run the text against regular expressions that look
// for non-JSON patterns. We are especially concerned with '()' and 'new'
// because they can cause invocation, and '=' because it can cause mutation.
// But just to be safe, we want to reject all unexpected forms.

// We split the second stage into 4 regexp operations in order to work around
// crippling inefficiencies in IE's and Safari's regexp engines. First we
// replace the JSON backslash pairs with '@' (a non-JSON character). Second, we
// replace all simple value tokens with ']' characters. Third, we delete all
// open brackets that follow a colon or comma or that begin the text. Finally,
// we look to see that the remaining characters are only whitespace or ']' or
// ',' or ':' or '{' or '}'. If that is so, then the text is safe for eval.

            if (/^[\],:{}\s]*$/
                    .test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@')
                        .replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']')
                        .replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {

// In the third stage we use the eval function to compile the text into a
// JavaScript structure. The '{' operator is subject to a syntactic ambiguity
// in JavaScript: it can begin a block or an object literal. We wrap the text
// in parens to eliminate the ambiguity.

                j = eval('(' + text + ')');

// In the optional fourth stage, we recursively walk the new structure, passing
// each name/value pair to a reviver function for possible transformation.

                return typeof reviver === 'function'
                    ? walk({'': j}, '')
                    : j;
            }

// If the text is not JSON parseable, then a SyntaxError is thrown.

            throw new SyntaxError('JSON.parse');
        };
    }
}());

Faye.Transport.WebSocket = Faye.extend(Faye.Class(Faye.Transport, {
  UNCONNECTED:  1,
  CONNECTING:   2,
  CONNECTED:    3,

  batching:     false,

  isUsable: function(callback, context) {
    this.callback(function() { callback.call(context, true) });
    this.errback(function() { callback.call(context, false) });
    this.connect();
  },

  request: function(envelopes) {
    this._pending = this._pending || new Faye.Set();
    for (var i = 0, n = envelopes.length; i < n; i++) this._pending.add(envelopes[i]);

    this.callback(function(socket) {
      if (!socket) return;
      var messages = Faye.map(envelopes, function(e) { return e.message });
      socket.send(Faye.toJSON(messages));
    }, this);
    this.connect();
  },

  connect: function() {
    if (Faye.Transport.WebSocket._unloaded) return;

    this._state = this._state || this.UNCONNECTED;
    if (this._state !== this.UNCONNECTED) return;
    this._state = this.CONNECTING;

    var socket = this._createSocket();
    if (!socket) return this.setDeferredStatus('failed');

    var self = this;

    socket.onopen = function() {
      if (socket.headers) self._storeCookies(socket.headers['set-cookie']);
      self._socket = socket;
      self._state = self.CONNECTED;
      self._everConnected = true;
      self._ping();
      self.setDeferredStatus('succeeded', socket);
    };

    var closed = false;
    socket.onclose = socket.onerror = function() {
      if (closed) return;
      closed = true;

      var wasConnected = (self._state === self.CONNECTED);
      socket.onopen = socket.onclose = socket.onerror = socket.onmessage = null;

      delete self._socket;
      self._state = self.UNCONNECTED;
      self.removeTimeout('ping');
      self.setDeferredStatus('unknown');

      var pending = self._pending ? self._pending.toArray() : [];
      delete self._pending;

      if (wasConnected) {
        self.handleError(pending, true);
      } else if (self._everConnected) {
        self.handleError(pending);
      } else {
        self.setDeferredStatus('failed');
      }
    };

    socket.onmessage = function(event) {
      var messages  = JSON.parse(event.data),
          envelopes = [],
          envelope;

      if (!messages) return;
      messages = [].concat(messages);

      for (var i = 0, n = messages.length; i < n; i++) {
        if (messages[i].successful === undefined) continue;
        envelope = self._pending.remove(messages[i]);
        if (envelope) envelopes.push(envelope);
      }
      self.receive(envelopes, messages);
    };
  },

  close: function() {
    if (!this._socket) return;
    this._socket.close();
  },

  _createSocket: function() {
    var url     = Faye.Transport.WebSocket.getSocketUrl(this.endpoint),
        options = {headers: Faye.copyObject(this._client.headers), ca: this._client.ca};

    options.headers['Cookie'] = this._getCookies();

    if (Faye.WebSocket)        return new Faye.WebSocket.Client(url, [], options);
    if (Faye.ENV.MozWebSocket) return new MozWebSocket(url);
    if (Faye.ENV.WebSocket)    return new WebSocket(url);
  },

  _ping: function() {
    if (!this._socket) return;
    this._socket.send('[]');
    this.addTimeout('ping', this._client._advice.timeout/2000, this._ping, this);
  }

}), {
  PROTOCOLS: {
    'http:':  'ws:',
    'https:': 'wss:'
  },

  create: function(client, endpoint) {
    var sockets = client.transports.websocket = client.transports.websocket || {};
    sockets[endpoint.href] = sockets[endpoint.href] || new this(client, endpoint);
    return sockets[endpoint.href];
  },

  getSocketUrl: function(endpoint) {
    endpoint = Faye.copyObject(endpoint);
    endpoint.protocol = this.PROTOCOLS[endpoint.protocol];
    return Faye.URI.stringify(endpoint);
  },

  isUsable: function(client, endpoint, callback, context) {
    this.create(client, endpoint).isUsable(callback, context);
  }
});

Faye.extend(Faye.Transport.WebSocket.prototype, Faye.Deferrable);
Faye.Transport.register('websocket', Faye.Transport.WebSocket);

if (Faye.Event)
  Faye.Event.on(Faye.ENV, 'beforeunload', function() {
    Faye.Transport.WebSocket._unloaded = true;
  });

Faye.Transport.EventSource = Faye.extend(Faye.Class(Faye.Transport, {
  initialize: function(client, endpoint) {
    Faye.Transport.prototype.initialize.call(this, client, endpoint);
    if (!Faye.ENV.EventSource) return this.setDeferredStatus('failed');

    this._xhr = new Faye.Transport.XHR(client, endpoint);

    endpoint = Faye.copyObject(endpoint);
    endpoint.pathname += '/' + client._clientId;

    var socket = new EventSource(Faye.URI.stringify(endpoint)),
        self   = this;

    socket.onopen = function() {
      self._everConnected = true;
      self.setDeferredStatus('succeeded');
    };

    socket.onerror = function() {
      if (self._everConnected) {
        self._client.messageError([]);
      } else {
        self.setDeferredStatus('failed');
        socket.close();
      }
    };

    socket.onmessage = function(event) {
      self.receive([], JSON.parse(event.data));
    };

    this._socket = socket;
  },

  close: function() {
    if (!this._socket) return;
    this._socket.onopen = this._socket.onerror = this._socket.onmessage = null;
    this._socket.close();
    delete this._socket;
  },

  isUsable: function(callback, context) {
    this.callback(function() { callback.call(context, true) });
    this.errback(function() { callback.call(context, false) });
  },

  encode: function(envelopes) {
    return this._xhr.encode(envelopes);
  },

  request: function(envelopes) {
    this._xhr.request(envelopes);
  }

}), {
  isUsable: function(client, endpoint, callback, context) {
    var id = client._clientId;
    if (!id) return callback.call(context, false);

    Faye.Transport.XHR.isUsable(client, endpoint, function(usable) {
      if (!usable) return callback.call(context, false);
      this.create(client, endpoint).isUsable(callback, context);
    }, this);
  },

  create: function(client, endpoint) {
    var sockets = client.transports.eventsource = client.transports.eventsource || {},
        id      = client._clientId;

    endpoint = Faye.copyObject(endpoint);
    endpoint.pathname += '/' + (id || '');
    var url = Faye.URI.stringify(endpoint);

    sockets[url] = sockets[url] || new this(client, endpoint);
    return sockets[url];
  }
});

Faye.extend(Faye.Transport.EventSource.prototype, Faye.Deferrable);
Faye.Transport.register('eventsource', Faye.Transport.EventSource);

Faye.Transport.XHR = Faye.extend(Faye.Class(Faye.Transport, {
  encode: function(envelopes) {
    var messages = Faye.map(envelopes, function(e) { return e.message });
    return Faye.toJSON(messages);
  },

  request: function(envelopes) {
    var path = this.endpoint.path,
        xhr  = Faye.ENV.ActiveXObject ? new ActiveXObject('Microsoft.XMLHTTP') : new XMLHttpRequest(),
        self = this;

    xhr.open('POST', path, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Pragma', 'no-cache');
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

    var headers = this._client.headers;
    for (var key in headers) {
      if (!headers.hasOwnProperty(key)) continue;
      xhr.setRequestHeader(key, headers[key]);
    }

    var abort = function() { xhr.abort() };
    Faye.Event.on(Faye.ENV, 'beforeunload', abort);

    xhr.onreadystatechange = function() {
      if (!xhr || xhr.readyState !== 4) return;

      var parsedMessage = null,
          status        = xhr.status,
          text          = xhr.responseText,
          successful    = (status >= 200 && status < 300) || status === 304 || status === 1223;

      Faye.Event.detach(Faye.ENV, 'beforeunload', abort);
      xhr.onreadystatechange = function() {};
      xhr = null;

      if (!successful) return self.handleError(envelopes);

      try {
        parsedMessage = JSON.parse(text);
      } catch (e) {}

      if (parsedMessage)
        self.receive(envelopes, parsedMessage);
      else
        self.handleError(envelopes);
    };

    xhr.send(this.encode(envelopes));
  }
}), {
  isUsable: function(client, endpoint, callback, context) {
    callback.call(context, Faye.URI.isSameOrigin(endpoint));
  }
});

Faye.Transport.register('long-polling', Faye.Transport.XHR);

Faye.Transport.CORS = Faye.extend(Faye.Class(Faye.Transport, {
  encode: function(envelopes) {
    var messages = Faye.map(envelopes, function(e) { return e.message });
    return 'message=' + encodeURIComponent(Faye.toJSON(messages));
  },

  request: function(envelopes) {
    var xhrClass = Faye.ENV.XDomainRequest ? XDomainRequest : XMLHttpRequest,
        xhr      = new xhrClass(),
        headers  = this._client.headers,
        self     = this,
        key;

    xhr.open('POST', Faye.URI.stringify(this.endpoint), true);

    if (xhr.setRequestHeader) {
      xhr.setRequestHeader('Pragma', 'no-cache');
      for (key in headers) {
        if (!headers.hasOwnProperty(key)) continue;
        xhr.setRequestHeader(key, headers[key]);
      }
    }

    var cleanUp = function() {
      if (!xhr) return false;
      xhr.onload = xhr.onerror = xhr.ontimeout = xhr.onprogress = null;
      xhr = null;
    };

    xhr.onload = function() {
      var parsedMessage = null;
      try {
        parsedMessage = JSON.parse(xhr.responseText);
      } catch (e) {}

      cleanUp();

      if (parsedMessage)
        self.receive(envelopes, parsedMessage);
      else
        self.handleError(envelopes);
    };

    xhr.onerror = xhr.ontimeout = function() {
      cleanUp();
      self.handleError(envelopes);
    };

    xhr.onprogress = function() {};
    xhr.send(this.encode(envelopes));
  }
}), {
  isUsable: function(client, endpoint, callback, context) {
    if (Faye.URI.isSameOrigin(endpoint))
      return callback.call(context, false);

    if (Faye.ENV.XDomainRequest)
      return callback.call(context, endpoint.protocol === Faye.ENV.location.protocol);

    if (Faye.ENV.XMLHttpRequest) {
      var xhr = new Faye.ENV.XMLHttpRequest();
      return callback.call(context, xhr.withCredentials !== undefined);
    }
    return callback.call(context, false);
  }
});

Faye.Transport.register('cross-origin-long-polling', Faye.Transport.CORS);

Faye.Transport.JSONP = Faye.extend(Faye.Class(Faye.Transport, {
 encode: function(envelopes) {
    var messages = Faye.map(envelopes, function(e) { return e.message });
    var url = Faye.copyObject(this.endpoint);
    url.query.message = Faye.toJSON(messages);
    url.query.jsonp   = '__jsonp' + Faye.Transport.JSONP._cbCount + '__';
    return Faye.URI.stringify(url);
  },

  request: function(envelopes) {
    var messages     = Faye.map(envelopes, function(e) { return e.message }),
        head         = document.getElementsByTagName('head')[0],
        script       = document.createElement('script'),
        callbackName = Faye.Transport.JSONP.getCallbackName(),
        endpoint     = Faye.copyObject(this.endpoint),
        self         = this;

    endpoint.query.message = Faye.toJSON(messages);
    endpoint.query.jsonp   = callbackName;

    Faye.ENV[callbackName] = function(data) {
      if (!Faye.ENV[callbackName]) return false;
      Faye.ENV[callbackName] = undefined;
      try { delete Faye.ENV[callbackName] } catch (e) {}
      script.parentNode.removeChild(script);
      self.receive(envelopes, data);
    };

    script.type = 'text/javascript';
    script.src  = Faye.URI.stringify(endpoint);
    head.appendChild(script);
  }
}), {
  _cbCount: 0,

  getCallbackName: function() {
    this._cbCount += 1;
    return '__jsonp' + this._cbCount + '__';
  },

  isUsable: function(client, endpoint, callback, context) {
    callback.call(context, true);
  }
});

Faye.Transport.register('callback-polling', Faye.Transport.JSONP);

})();
}).call(this,require("JkpR2F"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"JkpR2F":14}],14:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}]},{},[6]);