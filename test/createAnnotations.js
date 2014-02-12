// sample code for creating annotation items (TODO: convert to test)

// start with a mapper
var mapper = require('./util/mapJsonToItemAnnotation');

// add any function value assigners
mapper.funcVal('uri', function(data) { return 'http://tbd'; });

// get your field mappings
var fm = require('./mock/fieldMapping.json');

mapper.init(fm);

// get your data
var data = require('./mock/mesh.json');

// process results
data.forEach(function(d) {
  console.log('\n\nITEM', JSON.stringify(mapper.mapToItem(d), null, 2));
});

// fields that were not mapped
console.log('unmapped', mapper.getUnMapped());

