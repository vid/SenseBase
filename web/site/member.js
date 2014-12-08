<% if (!user) { %>
  (parent.window || window).location = '<%= homepage %>login';
<% } else { %>
  var senseBase = {
    username : '<%= user%>',
    clientID: '<%= clientID %>',
    homepage : '<%= homepage %>',
    isScraper : <%= user.type == 'Scraper' %>
  }
  <% if (localJS) { %>
  jQuery.getScript('//' + window.location.hostname + '<%= localJS %>');
  <% } %>
<% } %>
