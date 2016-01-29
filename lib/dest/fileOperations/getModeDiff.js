'use strict';

// TODO shared module
// TODO include sticky/setuid/setgid, i.e. 7777?
var MASK_MODE = parseInt('0777', 8);

function getModeDiff(fsMode, vinylMode) {
  var modeDiff = 0;

  if (typeof vinylMode === 'number') {
    modeDiff = (vinylMode ^ fsMode) & MASK_MODE;
  }

  return modeDiff;
}

module.exports = getModeDiff;
