<% if (!user) { %>
  (parent.window || window).location = '<%= homepage %>login';
<% } else { %>
  var senseBase = {
    username : '<%= user.username %>',
    clientID: '<%= clientID %>',
    homepage : '<%= homepage %>',
    isScraper : <%= user.type == 'Scraper' %>
  }
<% } %>
<% if (banner) { %>
  $('body').prepend('<%= banner %>');
<% } %>

$('body').prepend('<script src="//' + window.location.host + ':35729/livereload.js"></script>');
