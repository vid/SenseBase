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
