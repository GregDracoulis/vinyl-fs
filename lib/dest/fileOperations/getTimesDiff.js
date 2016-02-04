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

  var atime;
  if (isValidDate(vinylStat.atime)) {
    atime = vinylStat.atime;
  } else {
    atime = fsStat.atime;
  }

  if (!isValidDate(atime)) {
    atime = undefined;
  }

  var timesDiff = {
    mtime: vinylStat.mtime,
    atime: atime,
  };

  return timesDiff;
}

module.exports = getTimesDiff;
