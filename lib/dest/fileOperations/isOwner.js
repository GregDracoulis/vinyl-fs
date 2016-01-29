'use strict';

function isOwner(fsStat) {
  var uid = process.geteuid ? process.geteuid() : process.getuid();

  if (fsStat.uid !== uid && uid !== 0) {
    return false;
  }

  return true;
}

module.exports = isOwner;
