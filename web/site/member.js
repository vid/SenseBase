<% if (!user) { %>
  (parent.window || window).location = '<%= homepage %>login';
<% } else { %>
  var senseBase = {
    username : '<%= user.username %>',
    clientID: '<%= clientID %>',
    homepage : '<%= homepage %>',
    isScraper : <%= user.type == 'Scraper' %>
  }
  <% if (localJS) { %>
    $('body').prepend('<script src="//' + window.location.hostname + '<%= localJS %>"></script>');
  <% } %>
<% } %>
