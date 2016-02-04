'use strict';

var expect = require('expect');

var isOwner = require('../lib/dest/fileOperations/isOwner');
var getModeDiff = require('../lib/dest/fileOperations/getModeDiff');
var getTimesDiff = require('../lib/dest/fileOperations/getTimesDiff');

function noop() {}

describe('isOwner', function() {

  var ownerStat = {
    uid: 9001,
  };

  var nonOwnerStat = {
    uid: 9002,
  };

  var getuidSpy;
  var geteuidSpy;

  beforeEach(function(done) {
    if (typeof process.geteuid !== 'function') {
      process.geteuid = noop;
    }

    getuidSpy = expect.spyOn(process, 'getuid').andReturn(ownerStat.uid);
    geteuidSpy = expect.spyOn(process, 'geteuid').andReturn(ownerStat.uid);

    done();
  });

  afterEach(function(done) {
    expect.restoreSpies();

    if (process.geteuid === noop) {
      delete process.geteuid;
    }

    done();
  });

  it('uses process.geteuid() when available', function(done) {

    isOwner(ownerStat);

    expect(getuidSpy.calls.length).toEqual(0);
    expect(geteuidSpy.calls.length).toEqual(1);

    done();
  });

  it('uses process.getuid() when geteuid() is not available', function(done) {
    delete process.geteuid;

    isOwner(ownerStat);

    expect(getuidSpy.calls.length).toEqual(1);

    done();
  });

  it('returns false when non-root and non-owner', function(done) {
    var result = isOwner(nonOwnerStat);

    expect(result).toEqual(false);

    done();
  });

  it('returns true when owner and non-root', function(done) {
    var result = isOwner(ownerStat);

    expect(result).toEqual(true);

    done();
  });

  it('returns true when non-owner but root', function(done) {
    expect.spyOn(process, 'geteuid').andReturn(0); // 0 is root uid

    var result = isOwner(nonOwnerStat);

    expect(result).toEqual(true);

    done();
  });
});

describe('getModeDiff', function() {

  it('returns 0 if both modes are the same', function(done) {
    var fsMode = parseInt('777', 8);
    var vfsMode = parseInt('777', 8);

    var result = getModeDiff(fsMode, vfsMode);

    expect(result).toEqual(0);

    done();
  });

  it('returns a value greater than 0 if modes are different', function(done) {
    var fsMode = parseInt('777', 8);
    var vfsMode = parseInt('744', 8);

    var result = getModeDiff(fsMode, vfsMode);

    expect(result).toEqual(27);

    done();
  });

  it('does not matter the order of diffing', function(done) {
    var fsMode = parseInt('655', 8);
    var vfsMode = parseInt('777', 8);

    var result = getModeDiff(fsMode, vfsMode);

    expect(result).toEqual(82);

    done();
  });

  it('ignores the sticky/setuid/setgid bits', function(done) {
    var fsMode = parseInt('1777', 8);
    var vfsMode = parseInt('4777', 8);

    var result = getModeDiff(fsMode, vfsMode);

    expect(result).toEqual(0);

    done();
  });
});

describe('getTimesDiff', function() {

  it('returns undefined if vinyl mtime is not a valid date', function(done) {
    var fsStat = {
      mtime: new Date(),
    };
    var vfsStat = {
      mtime: new Date(undefined),
    };

    var result = getTimesDiff(fsStat, vfsStat);

    expect(result).toEqual(undefined);

    done();
  });

  it('returns undefined if vinyl mtime & atime are both equal to counterparts', function(done) {
    var now = Date.now();
    var fsStat = {
      mtime: new Date(now),
      atime: new Date(now),
    };
    var vfsStat = {
      mtime: new Date(now),
      atime: new Date(now),
    };

    var result = getTimesDiff(fsStat, vfsStat);

    expect(result).toEqual(undefined);

    done();
  });

  // TODO: is this proper/expected?
  it('returns undefined if vinyl mtimes equals the counterpart and atimes are null', function(done) {
    var now = Date.now();
    var fsStat = {
      mtime: new Date(now),
      atime: null,
    };
    var vfsStat = {
      mtime: new Date(now),
      atime: null,
    };

    var result = getTimesDiff(fsStat, vfsStat);

    expect(result).toEqual(undefined);

    done();
  });

  it('returns a diff object if mtimes do not match', function(done) {
    var now = Date.now();
    var then = now - 1000;
    var fsStat = {
      mtime: new Date(now),
    };
    var vfsStat = {
      mtime: new Date(then),
    };
    var expected = {
      mtime: new Date(then),
      atime: undefined,
    };

    var result = getTimesDiff(fsStat, vfsStat);

    expect(result).toEqual(expected);

    done();
  });

  it('returns a diff object if atimes do not match', function(done) {
    var now = Date.now();
    var then = now - 1000;
    var fsStat = {
      mtime: new Date(now),
      atime: new Date(now),
    };
    var vfsStat = {
      mtime: new Date(now),
      atime: new Date(then),
    };
    var expected = {
      mtime: new Date(now),
      atime: new Date(then),
    };

    var result = getTimesDiff(fsStat, vfsStat);

    expect(result).toEqual(expected);

    done();
  });

  it('returns the fs atime if the vinyl atime is invalid', function(done) {
    var now = Date.now();
    var fsStat = {
      mtime: new Date(now),
      atime: new Date(now),
    };
    var vfsStat = {
      mtime: new Date(now),
      atime: new Date(undefined),
    };
    var expected = {
      mtime: new Date(now),
      atime: new Date(now),
    };

    var result = getTimesDiff(fsStat, vfsStat);

    expect(result).toEqual(expected);

    done();
  });

  // TODO: is this proper/expected?
  it('makes atime diff undefined if fs and vinyl atime are invalid', function(done) {
    var now = Date.now();
    var fsStat = {
      mtime: new Date(now),
      atime: new Date(undefined),
    };
    var vfsStat = {
      mtime: new Date(now),
      atime: new Date(undefined),
    };
    var expected = {
      mtime: new Date(now),
      atime: undefined,
    };

    var result = getTimesDiff(fsStat, vfsStat);

    expect(result).toEqual(expected);

    done();
  });
});
