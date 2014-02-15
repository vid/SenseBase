// sample code to use annotations (TODO: convert to test)

var annotations = require('../lib/annotations.js');

var range = annotations.createRange({exact: 'test exact', offset: 20, range: 200});
var annoRange = annotations.createAnnotation({annotatedBy: 'test', type: 'quote', range: range});
var item = annotations.createContentItem({title: 'test title', uri: 'http://test.com/', content: 'test content', annotations: [annoRange]});
var annoTag = annotations.createAnnotation({annotatedBy: 'test', type: 'tag', tag: 'test tag'});
annotations.addAnnotation(item, annoTag);

console.log(JSON.stringify(item, null, 2));

