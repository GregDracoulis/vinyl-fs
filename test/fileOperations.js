'use strict';

var expect = require('expect');

var isOwner = require('../lib/dest/fileOperations/isOwner');
var getModeDiff = require('../lib/dest/fileOperations/getModeDiff');

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
