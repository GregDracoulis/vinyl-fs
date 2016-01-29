'use strict';

var isEqual = require('lodash.isequal');
var isValidDate = require('vali-date');

function getTimesDiff(fsStat, vinylStat) {

  if (!isValidDate(vinylStat.mtime)) {
    return;
  }

  if (isEqual(vinylStat.mtime, fsStat.mtime) &&
      isEqual(vinylStat.atime, fsStat.atime)) {
    return;
  }

  var timesDiff = {
    mtime: vinylStat.mtime,
    atime: isValidDate(vinylStat.atime) ? vinylStat.atime : fsStat.atime,
  };

  return timesDiff;
}

module.exports = getTimesDiff;
