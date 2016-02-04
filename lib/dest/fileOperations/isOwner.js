'use strict';

function isOwner(fsStat) {
  var uid;
  if (typeof process.geteuid === 'function') {
    uid = process.geteuid();
  } else {
    uid = process.getuid();
  }

  if (fsStat.uid !== uid && uid !== 0) {
    return false;
  }

  return true;
}

module.exports = isOwner;
