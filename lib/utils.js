
// verify the keys are present or explode
//
exports.check = function(arr, desc) {
  arr.forEach(function(k) {
    if (!desc[k]) {
     throw Error("missing field " + k + ' from ' + JSON.stringify(desc, null, 2));
    }
  });
}

