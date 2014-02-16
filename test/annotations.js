// sample code to use annotations (TODO: convert to test)

var annotations = require('../lib/annotations.js');

var item = annotations.createContentItem({title: 'test title', uri: 'http://test.com/', content: 'test content'});
console.log('item', item);

var annoCategory = annotations.createAnnotation({hasTarget: item.uri, annotatedBy: 'test', type: 'category', category: 'test category'});
console.log('annoCategory', annoCategory);

var annoValue = annotations.createAnnotation({hasTarget: item.uri, annotatedBy: 'test', type: 'value', key: 'test key', value: 'test value'});
console.log('annoValue', annoValue);

var quoteRange = annotations.createRange({exact: 'quote exact', offset: 100});
var annoRange = annotations.createAnnotation({hasTarget: item.uri, annotatedBy: 'test', type: 'quote', quote: 'test', ranges: quoteRange});
console.log('annoRange', annoRange);

var valueRange = annotations.createRange({exact: 'value exact', offset: 200});
var annoValueQuote = annotations.createAnnotation({hasTarget: item.uri, annotatedBy: 'test', type: 'valueQuote', key: 'test key', value: 'test value', ranges: valueRange});
console.log('annoValueQuote', annoValueQuote);

var annoLib = require('../lib/annotateServices/annotateLib');

var text = '<html><body>This is a match1 and a match2. Here is match1 again.</body></html>';
var ranges = annoLib.rangesFromMatches('match1', text);

console.log('range', ranges);
