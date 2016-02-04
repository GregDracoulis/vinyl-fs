'use strict';

var expect = require('expect');

var isOwner = require('../lib/dest/fileOperations/isOwner');

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
