'use strict';

var spies = require('./spy');
var chmodSpy = spies.chmodSpy;
var fchmodSpy = spies.fchmodSpy;
var futimesSpy = spies.futimesSpy;
var fstatSpy = spies.fstatSpy;

var vfs = require('../');

var os = require('os');
var path = require('path');
var fs = require('graceful-fs');
var del = require('del');
var Writeable = require('readable-stream/writable');
var expect = require('expect');

var bufEqual = require('buffer-equal');
var through = require('through2');
var File = require('vinyl');

var should = require('should');
require('mocha');

var wipeOut = function() {
  this.timeout(20000);
  spies.setError('false');
  fstatSpy.reset();
  chmodSpy.reset();
  fchmodSpy.reset();
  futimesSpy.reset();
  expect.restoreSpies();
  del.sync(path.join(__dirname, './fixtures/highwatermark'));
  del.sync(path.join(__dirname, './out-fixtures/'));
};

var dataWrap = function(fn) {
  return function(data, enc, cb) {
    fn(data);
    cb();
  };
};

var realMode = function(n) {
  return n & parseInt('777', 8);
};

function noop() {}

describe('dest stream', function() {
  beforeEach(wipeOut);
  afterEach(wipeOut);

  it.skip('should explode on invalid folder (empty)', function(done) {
    var stream;
    try {
      stream = vfs.dest();
    } catch (err) {
      should.exist(err);
      should.not.exist(stream);
      done();
    }
  });

  it.skip('should explode on invalid folder (empty string)', function(done) {
    var stream;
    try {
      stream = vfs.dest('');
    } catch (err) {
      should.exist(err);
      should.not.exist(stream);
      done();
    }
  });

  it('should not explode if the sourcemap option is true', function(done) {
    var inputPath = path.join(__dirname, './fixtures/test.coffee');

    var expectedFile = new File({
      base: __dirname,
      cwd: __dirname,
      path: inputPath,
      contents: null,
    });

    var buffered = [];

    var onEnd = function() {
      buffered.length.should.equal(1);
      buffered[0].should.equal(expectedFile);
      done();
    };

    var bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);

    var stream = vfs.dest(path.join(__dirname, './out-fixtures/'), { sourcemaps: true });
    stream.pipe(bufferStream);
    stream.write(expectedFile);
    stream.end();
  });

  it('should not explode if sourcemap option is an object', function(done) {
    var inputPath = path.join(__dirname, './fixtures/test.coffee');

    var options = {
      sourcemaps: {
        addComment: false,
      },
    };

    var expectedFile = new File({
      base: __dirname,
      cwd: __dirname,
      path: inputPath,
      contents: null,
    });

    var buffered = [];

    var onEnd = function() {
      buffered.length.should.equal(1);
      buffered[0].should.equal(expectedFile);
      done();
    };

    var bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);

    var stream = vfs.dest(path.join(__dirname, './out-fixtures/'), options);
    stream.pipe(bufferStream);
    stream.write(expectedFile);
    stream.end();
  });

  it('should pass through writes with cwd', function(done) {
    var inputPath = path.join(__dirname, './fixtures/test.coffee');

    var expectedFile = new File({
      base: __dirname,
      cwd: __dirname,
      path: inputPath,
      contents: null,
    });

    var buffered = [];

    var onEnd = function() {
      buffered.length.should.equal(1);
      buffered[0].should.equal(expectedFile);
      done();
    };

    var stream = vfs.dest('./out-fixtures/', { cwd: __dirname });

    var bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);
    stream.pipe(bufferStream);
    stream.write(expectedFile);
    stream.end();
  });

  it('should pass through writes with default cwd', function(done) {
    var inputPath = path.join(__dirname, './fixtures/test.coffee');

    var expectedFile = new File({
      base: __dirname,
      cwd: __dirname,
      path: inputPath,
      contents: null,
    });

    var buffered = [];

    var onEnd = function() {
      buffered.length.should.equal(1);
      buffered[0].should.equal(expectedFile);
      done();
    };

    var stream = vfs.dest(path.join(__dirname, './out-fixtures/'));

    var bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);
    stream.pipe(bufferStream);
    stream.write(expectedFile);
    stream.end();
  });

  it('should not write null files', function(done) {
    var inputPath = path.join(__dirname, './fixtures/test.coffee');
    var inputBase = path.join(__dirname, './fixtures/');
    var expectedPath = path.join(__dirname, './out-fixtures/test.coffee');
    var expectedCwd = __dirname;
    var expectedBase = path.join(__dirname, './out-fixtures');

    var expectedFile = new File({
      base: inputBase,
      cwd: __dirname,
      path: inputPath,
      contents: null,
    });

    var buffered = [];

    var onEnd = function() {
      buffered.length.should.equal(1);
      buffered[0].should.equal(expectedFile);
      buffered[0].cwd.should.equal(expectedCwd, 'cwd should have changed');
      buffered[0].base.should.equal(expectedBase, 'base should have changed');
      buffered[0].path.should.equal(expectedPath, 'path should have changed');
      fs.existsSync(expectedPath).should.equal(false);
      done();
    };

    var stream = vfs.dest('./out-fixtures/', { cwd: __dirname });

    var bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);
    stream.pipe(bufferStream);
    stream.write(expectedFile);
    stream.end();
  });

  it('should write buffer files to the right folder with relative cwd', function(done) {
    var inputPath = path.join(__dirname, './fixtures/test.coffee');
    var inputBase = path.join(__dirname, './fixtures/');
    var expectedPath = path.join(__dirname, './out-fixtures/test.coffee');
    var expectedCwd = __dirname;
    var expectedBase = path.join(__dirname, './out-fixtures');
    var expectedContents = fs.readFileSync(inputPath);

    var expectedFile = new File({
      base: inputBase,
      cwd: __dirname,
      path: inputPath,
      contents: expectedContents,
    });

    var buffered = [];

    var onEnd = function() {
      buffered.length.should.equal(1);
      buffered[0].should.equal(expectedFile);
      buffered[0].cwd.should.equal(expectedCwd, 'cwd should have changed');
      buffered[0].base.should.equal(expectedBase, 'base should have changed');
      buffered[0].path.should.equal(expectedPath, 'path should have changed');
      fs.existsSync(expectedPath).should.equal(true);
      bufEqual(fs.readFileSync(expectedPath), expectedContents).should.equal(true);
      done();
    };

    var stream = vfs.dest('./out-fixtures/', { cwd: path.relative(process.cwd(), __dirname) });

    var bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);
    stream.pipe(bufferStream);
    stream.write(expectedFile);
    stream.end();
  });

  it('should write buffer files to the right folder with function and relative cwd', function(done) {
    var inputPath = path.join(__dirname, './fixtures/test.coffee');
    var inputBase = path.join(__dirname, './fixtures/');
    var expectedPath = path.join(__dirname, './out-fixtures/test.coffee');
    var expectedCwd = __dirname;
    var expectedBase = path.join(__dirname, './out-fixtures');
    var expectedContents = fs.readFileSync(inputPath);

    var expectedFile = new File({
      base: inputBase,
      cwd: __dirname,
      path: inputPath,
      contents: expectedContents,
    });

    var buffered = [];

    var onEnd = function() {
      buffered.length.should.equal(1);
      buffered[0].should.equal(expectedFile);
      buffered[0].cwd.should.equal(expectedCwd, 'cwd should have changed');
      buffered[0].base.should.equal(expectedBase, 'base should have changed');
      buffered[0].path.should.equal(expectedPath, 'path should have changed');
      fs.existsSync(expectedPath).should.equal(true);
      bufEqual(fs.readFileSync(expectedPath), expectedContents).should.equal(true);
      done();
    };

    var stream = vfs.dest(function(file) {
      should.exist(file);
      file.should.equal(expectedFile);
      return './out-fixtures';
    }, { cwd: path.relative(process.cwd(), __dirname) });

    var bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);
    stream.pipe(bufferStream);
    stream.write(expectedFile);
    stream.end();
  });

  it('should write buffer files to the right folder', function(done) {
    var inputPath = path.join(__dirname, './fixtures/test.coffee');
    var inputBase = path.join(__dirname, './fixtures/');
    var expectedPath = path.join(__dirname, './out-fixtures/test.coffee');
    var expectedContents = fs.readFileSync(inputPath);
    var expectedCwd = __dirname;
    var expectedBase = path.join(__dirname, './out-fixtures');

    var expectedFile = new File({
      base: inputBase,
      cwd: __dirname,
      path: inputPath,
      contents: expectedContents,
    });

    var buffered = [];

    var onEnd = function() {
      buffered.length.should.equal(1);
      buffered[0].should.equal(expectedFile);
      buffered[0].cwd.should.equal(expectedCwd, 'cwd should have changed');
      buffered[0].base.should.equal(expectedBase, 'base should have changed');
      buffered[0].path.should.equal(expectedPath, 'path should have changed');
      fs.existsSync(expectedPath).should.equal(true);
      bufEqual(fs.readFileSync(expectedPath), expectedContents).should.equal(true);
      done();
    };

    var stream = vfs.dest('./out-fixtures/', { cwd: __dirname });

    var bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);
    stream.pipe(bufferStream);
    stream.write(expectedFile);
    stream.end();
  });

  it('should set the mode of a written buffer file if set on the vinyl object', function(done) {
    if (os.platform() === 'win32') {
      console.log('Changing the mode of a file is not supported by node.js in Windows.');
      this.skip();
      return;
    }

    var inputPath = path.join(__dirname, './fixtures/test.coffee');
    var inputBase = path.join(__dirname, './fixtures/');
    var expectedPath = path.join(__dirname, './out-fixtures/test.coffee');
    var expectedContents = fs.readFileSync(inputPath);
    var expectedMode = parseInt('655', 8);

    var expectedFile = new File({
      base: inputBase,
      cwd: __dirname,
      path: inputPath,
      contents: expectedContents,
      stat: {
        mode: expectedMode,
      },
    });

    var onEnd = function() {
      realMode(fs.lstatSync(expectedPath).mode).should.equal(expectedMode);
      done();
    };

    var stream = vfs.dest('./out-fixtures/', { cwd: __dirname });
    stream.on('end', onEnd);
    stream.write(expectedFile);
    stream.end();
  });

  it('should write streaming files to the right folder', function(done) {
    var inputPath = path.join(__dirname, './fixtures/test.coffee');
    var inputBase = path.join(__dirname, './fixtures/');
    var expectedPath = path.join(__dirname, './out-fixtures/test.coffee');
    var expectedContents = fs.readFileSync(inputPath);
    var expectedCwd = __dirname;
    var expectedBase = path.join(__dirname, './out-fixtures');

    var contentStream = through.obj();
    var expectedFile = new File({
      base: inputBase,
      cwd: __dirname,
      path: inputPath,
      contents: contentStream,
    });

    var buffered = [];

    var onEnd = function() {
      buffered.length.should.equal(1);
      buffered[0].should.equal(expectedFile);
      buffered[0].cwd.should.equal(expectedCwd, 'cwd should have changed');
      buffered[0].base.should.equal(expectedBase, 'base should have changed');
      buffered[0].path.should.equal(expectedPath, 'path should have changed');
      fs.existsSync(expectedPath).should.equal(true);
      bufEqual(fs.readFileSync(expectedPath), expectedContents).should.equal(true);
      done();
    };

    var stream = vfs.dest('./out-fixtures/', { cwd: __dirname });

    var bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);
    stream.pipe(bufferStream);
    stream.write(expectedFile);
    setTimeout(function() {
      contentStream.write(expectedContents);
      contentStream.end();
    }, 100);
    stream.end();
  });

  it('should set the mode of a written stream file if set on the vinyl object', function(done) {
    if (os.platform() === 'win32') {
      console.log('Changing the mode of a file is not supported by node.js in Windows.');
      this.skip();
      return;
    }

    var inputPath = path.join(__dirname, './fixtures/test.coffee');
    var inputBase = path.join(__dirname, './fixtures/');
    var expectedPath = path.join(__dirname, './out-fixtures/test.coffee');
    var expectedContents = fs.readFileSync(inputPath);
    var expectedMode = parseInt('655', 8);

    var contentStream = through.obj();
    var expectedFile = new File({
      base: inputBase,
      cwd: __dirname,
      path: inputPath,
      contents: contentStream,
      stat: {
        mode: expectedMode,
      },
    });

    var onEnd = function() {
      realMode(fs.lstatSync(expectedPath).mode).should.equal(expectedMode);
      done();
    };

    var stream = vfs.dest('./out-fixtures/', { cwd: __dirname });
    stream.on('end', onEnd);
    stream.write(expectedFile);
    setTimeout(function() {
      contentStream.write(expectedContents);
      contentStream.end();
    }, 100);
    stream.end();
  });

  it('should write directories to the right folder', function(done) {
    var inputPath = path.join(__dirname, './fixtures/test');
    var inputBase = path.join(__dirname, './fixtures/');
    var expectedPath = path.join(__dirname, './out-fixtures/test');
    var expectedCwd = __dirname;
    var expectedBase = path.join(__dirname, './out-fixtures');
    var expectedMode = parseInt('655', 8);

    var expectedFile = new File({
      base: inputBase,
      cwd: __dirname,
      path: inputPath,
      contents: null,
      stat: {
        isDirectory: function() {
          return true;
        },
        mode: expectedMode,
      },
    });

    var buffered = [];

    var onEnd = function() {
      buffered.length.should.equal(1);
      buffered[0].should.equal(expectedFile);
      buffered[0].cwd.should.equal(expectedCwd, 'cwd should have changed');
      buffered[0].base.should.equal(expectedBase, 'base should have changed');
      buffered[0].path.should.equal(expectedPath, 'path should have changed');
      fs.existsSync(expectedPath).should.equal(true);
      fs.lstatSync(expectedPath).isDirectory().should.equal(true);
      realMode(fs.lstatSync(expectedPath).mode).should.equal(expectedMode);
      done();
    };

    var stream = vfs.dest('./out-fixtures/', { cwd: __dirname });

    var bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);
    stream.pipe(bufferStream);
    stream.write(expectedFile);
    stream.end();
  });

  it('should allow piping multiple dests in streaming mode', function(done) {
    var inputPath1 = path.join(__dirname, './out-fixtures/multiple-first');
    var inputPath2 = path.join(__dirname, './out-fixtures/multiple-second');
    var inputBase = path.join(__dirname, './out-fixtures/');
    var srcPath = path.join(__dirname, './fixtures/test.coffee');
    var stream1 = vfs.dest('./out-fixtures/', { cwd: __dirname });
    var stream2 = vfs.dest('./out-fixtures/', { cwd: __dirname });
    var content = fs.readFileSync(srcPath);
    var rename = through.obj(function(file, _, next) {
      file.path = inputPath2;
      this.push(file);
      next();
    });

    stream1.on('data', function(file) {
      file.path.should.equal(inputPath1);
    });

    stream1.pipe(rename).pipe(stream2);
    stream2.on('data', function(file) {
      file.path.should.equal(inputPath2);
    }).once('end', function() {
      fs.readFileSync(inputPath1, 'utf8').should.equal(content.toString());
      fs.readFileSync(inputPath2, 'utf8').should.equal(content.toString());
      done();
    });

    var file = new File({
      base: inputBase,
      path: inputPath1,
      cwd: __dirname,
      contents: content,
    });

    stream1.write(file);
    stream1.end();
  });

  it('should write new files with the default user mode', function(done) {
    var inputPath = path.join(__dirname, './fixtures/test.coffee');
    var inputBase = path.join(__dirname, './fixtures/');
    var expectedPath = path.join(__dirname, './out-fixtures/test.coffee');
    var expectedContents = fs.readFileSync(inputPath);
    var expectedMode = parseInt('666', 8) & (~process.umask());

    var expectedFile = new File({
      base: inputBase,
      cwd: __dirname,
      path: inputPath,
      contents: expectedContents,
    });

    var buffered = [];

    var onEnd = function() {
      buffered.length.should.equal(1);
      buffered[0].should.equal(expectedFile);
      fs.existsSync(expectedPath).should.equal(true);
      realMode(fs.lstatSync(expectedPath).mode).should.equal(expectedMode);
      done();
    };

    chmodSpy.reset();
    var stream = vfs.dest('./out-fixtures/', { cwd: __dirname });

    var bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);

    stream.pipe(bufferStream);
    stream.write(expectedFile);
    stream.end();
  });

  it('should write new files with the specified mode', function(done) {
    var inputPath = path.join(__dirname, './fixtures/test.coffee');
    var inputBase = path.join(__dirname, './fixtures/');
    var expectedPath = path.join(__dirname, './out-fixtures/test.coffee');
    var expectedContents = fs.readFileSync(inputPath);
    var expectedMode = parseInt('744', 8);

    var expectedFile = new File({
      base: inputBase,
      cwd: __dirname,
      path: inputPath,
      contents: expectedContents,
    });

    var buffered = [];

    var onEnd = function() {
      buffered.length.should.equal(1);
      buffered[0].should.equal(expectedFile);
      fs.existsSync(expectedPath).should.equal(true);
      realMode(fs.lstatSync(expectedPath).mode).should.equal(expectedMode);
      done();
    };

    chmodSpy.reset();
    var stream = vfs.dest('./out-fixtures/', { cwd: __dirname, mode: expectedMode });

    var bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);

    stream.pipe(bufferStream);
    stream.write(expectedFile);
    stream.end();
  });

  it('should update file mode to match the vinyl mode', function(done) {
    var inputPath = path.join(__dirname, './fixtures/test.coffee');
    var inputBase = path.join(__dirname, './fixtures/');
    var expectedPath = path.join(__dirname, './out-fixtures/test.coffee');
    var expectedContents = fs.readFileSync(inputPath);
    var expectedBase = path.join(__dirname, './out-fixtures');
    var startMode = parseInt('0655', 8);
    var expectedMode = parseInt('0722', 8);

    var expectedFile = new File({
      base: inputBase,
      cwd: __dirname,
      path: inputPath,
      contents: expectedContents,
      stat: {
        mode: expectedMode,
      },
    });

    var buffered = [];

    var onEnd = function() {
      should(chmodSpy.called).be.ok;
      buffered.length.should.equal(1);
      buffered[0].should.equal(expectedFile);
      fs.existsSync(expectedPath).should.equal(true);
      realMode(fs.lstatSync(expectedPath).mode).should.equal(expectedMode);
      done();
    };

    fs.mkdirSync(expectedBase);
    fs.closeSync(fs.openSync(expectedPath, 'w'));
    fs.chmodSync(expectedPath, startMode);

    chmodSpy.reset();
    var stream = vfs.dest('./out-fixtures/', { cwd: __dirname });

    var bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);

    stream.pipe(bufferStream);
    stream.write(expectedFile);
    stream.end();
  });

  it('should update directory mode to match the vinyl mode', function(done) {
    var inputBase = path.join(__dirname, './fixtures/');
    var inputPath = path.join(__dirname, './fixtures/wow');
    var expectedPath = path.join(__dirname, './out-fixtures/wow');
    var expectedCwd = __dirname;
    var expectedBase = path.join(__dirname, './out-fixtures');

    var firstFile = new File({
      base: inputBase,
      cwd: __dirname,
      path: expectedPath,
      stat: fs.statSync(inputPath),
    });
    var startMode = firstFile.stat.mode;
    var expectedMode = parseInt('727', 8);

    var expectedFile = new File(firstFile);
    expectedFile.stat.mode = (startMode & ~parseInt('7777', 8)) | expectedMode;

    var buffered = [];

    var onEnd = function() {
      buffered.length.should.equal(2);
      buffered[0].should.equal(firstFile);
      buffered[1].should.equal(expectedFile);
      buffered[0].cwd.should.equal(expectedCwd, 'cwd should have changed');
      buffered[0].base.should.equal(expectedBase, 'base should have changed');
      buffered[0].path.should.equal(expectedPath, 'path should have changed');
      realMode(fs.lstatSync(expectedPath).mode).should.equal(expectedMode);
      done();
    };

    fs.mkdirSync(expectedBase);

    var stream = vfs.dest('./out-fixtures/', { cwd: __dirname });

    var bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);

    stream.pipe(bufferStream);
    stream.write(firstFile);
    stream.write(expectedFile);
    stream.end();
  });

  it('should use different modes for files and directories', function(done) {
    var inputBase = path.join(__dirname, './fixtures');
    var inputPath = path.join(__dirname, './fixtures/wow/suchempty');
    var expectedBase = path.join(__dirname, './out-fixtures/wow');
    var expectedDirMode = parseInt('755', 8);
    var expectedFileMode = parseInt('655', 8);

    var firstFile = new File({
      base: inputBase,
      cwd: __dirname,
      path: inputPath,
      stat: fs.statSync(inputPath),
    });

    var buffered = [];

    var onEnd = function() {
      realMode(fs.lstatSync(expectedBase).mode).should.equal(expectedDirMode);
      realMode(buffered[0].stat.mode).should.equal(expectedFileMode);
      done();
    };

    var stream = vfs.dest('./out-fixtures/', {
      cwd: __dirname,
      mode: expectedFileMode,
      dirMode: expectedDirMode,
    });

    var bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);

    stream.pipe(bufferStream);
    stream.write(firstFile);
    stream.end();
  });

  it('should not call futimes when no mtime is provided on the vinyl stat', function(done) {
    var inputPath = path.join(__dirname, './fixtures/test.coffee');
    var inputBase = path.join(__dirname, './fixtures/');
    var expectedPath = path.join(__dirname, './out-fixtures/test.coffee');
    var expectedContents = fs.readFileSync(inputPath);
    var expectedAtime = new Date();
    var expectedMtime = new Date();

    var expectedFile = new File({
      base: inputBase,
      cwd: __dirname,
      path: inputPath,
      contents: expectedContents,
      stat: {},
    });

    var buffered = [];

    var onEnd = function() {
      futimesSpy.called.should.equal(false);
      buffered.length.should.equal(1);
      buffered[0].should.equal(expectedFile);
      fs.existsSync(expectedPath).should.equal(true);
      fs.lstatSync(expectedPath).atime.setMilliseconds(0).should.equal(expectedAtime.setMilliseconds(0));
      fs.lstatSync(expectedPath).mtime.setMilliseconds(0).should.equal(expectedMtime.setMilliseconds(0));
      done();
    };

    var stream = vfs.dest('./out-fixtures/', { cwd: __dirname });

    var bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);

    stream.pipe(bufferStream);
    stream.write(expectedFile);
    stream.end();
  });

  it('should call futimes when an mtime is provided on the vinyl stat', function(done) {
    var inputPath = path.join(__dirname, './fixtures/test.coffee');
    var inputBase = path.join(__dirname, './fixtures/');
    var expectedPath = path.join(__dirname, './out-fixtures/test.coffee');
    var expectedContents = fs.readFileSync(inputPath);
    var expectedMtime = fs.lstatSync(inputPath).mtime;

    var expectedFile = new File({
      base: inputBase,
      cwd: __dirname,
      path: inputPath,
      contents: expectedContents,
      stat: {
        mtime: expectedMtime,
      },
    });

    var buffered = [];

    var onEnd = function() {
      futimesSpy.called.should.equal(true);
      buffered.length.should.equal(1);
      buffered[0].should.equal(expectedFile);
      fs.existsSync(expectedPath).should.equal(true);
      fs.lstatSync(expectedPath).mtime.getTime().should.equal(expectedMtime.getTime());
      expectedFile.stat.should.have.property('mtime');
      expectedFile.stat.mtime.should.equal(expectedMtime);
      done();
    };

    var stream = vfs.dest('./out-fixtures/', { cwd: __dirname });

    var bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);

    stream.pipe(bufferStream);
    stream.write(expectedFile);
    stream.end();
  });

  it('should not call futimes when provided mtime on the vinyl stat is invalid', function(done) {
    var inputPath = path.join(__dirname, './fixtures/test.coffee');
    var inputBase = path.join(__dirname, './fixtures/');
    var expectedPath = path.join(__dirname, './out-fixtures/test.coffee');
    var expectedContents = fs.readFileSync(inputPath);
    var expectedMtime = new Date();
    var invalidMtime = new Date(undefined);

    var expectedFile = new File({
      base: inputBase,
      cwd: __dirname,
      path: inputPath,
      contents: expectedContents,
      stat: {
        mtime: invalidMtime,
      },
    });

    var buffered = [];

    var onEnd = function() {
      futimesSpy.called.should.equal(false);
      buffered.length.should.equal(1);
      buffered[0].should.equal(expectedFile);
      fs.existsSync(expectedPath).should.equal(true);
      fs.lstatSync(expectedPath).mtime.setMilliseconds(0).should.equal(expectedMtime.setMilliseconds(0));
      done();
    };

    var stream = vfs.dest('./out-fixtures/', { cwd: __dirname });

    var bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);

    stream.pipe(bufferStream);
    stream.write(expectedFile);
    stream.end();
  });

  it('should call futimes when provided mtime on the vinyl stat is valid but provided atime is invalid', function(done) {
    var inputPath = path.join(__dirname, './fixtures/test.coffee');
    var inputBase = path.join(__dirname, './fixtures/');
    var expectedPath = path.join(__dirname, './out-fixtures/test.coffee');
    var expectedContents = fs.readFileSync(inputPath);
    var expectedMtime = fs.lstatSync(inputPath).mtime;
    var invalidAtime = new Date(undefined);

    var expectedFile = new File({
      base: inputBase,
      cwd: __dirname,
      path: inputPath,
      contents: expectedContents,
      stat: {
        atime: invalidAtime,
        mtime: expectedMtime,
      },
    });

    var buffered = [];

    var onEnd = function() {
      futimesSpy.called.should.equal(true);
      buffered.length.should.equal(1);
      buffered[0].should.equal(expectedFile);
      fs.existsSync(expectedPath).should.equal(true);
      fs.lstatSync(expectedPath).mtime.getTime().should.equal(expectedMtime.getTime());
      done();
    };

    var stream = vfs.dest('./out-fixtures/', { cwd: __dirname });

    var bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);

    stream.pipe(bufferStream);
    stream.write(expectedFile);
    stream.end();
  });

  it('should write file atime and mtime using the vinyl stat', function(done) {
    var inputPath = path.join(__dirname, './fixtures/test.coffee');
    var inputBase = path.join(__dirname, './fixtures/');
    var expectedPath = path.join(__dirname, './out-fixtures/test.coffee');
    var expectedContents = fs.readFileSync(inputPath);
    var expectedAtime = fs.lstatSync(inputPath).atime;
    var expectedMtime = fs.lstatSync(inputPath).mtime;

    var expectedFile = new File({
      base: inputBase,
      cwd: __dirname,
      path: inputPath,
      contents: expectedContents,
      stat: {
        atime: expectedAtime,
        mtime: expectedMtime,
      },
    });

    var buffered = [];

    var onEnd = function() {
      buffered.length.should.equal(1);
      buffered[0].should.equal(expectedFile);
      fs.existsSync(expectedPath).should.equal(true);
      fs.lstatSync(expectedPath).atime.getTime().should.equal(expectedAtime.getTime());
      fs.lstatSync(expectedPath).mtime.getTime().should.equal(expectedMtime.getTime());
      expectedFile.stat.should.have.property('mtime');
      expectedFile.stat.mtime.should.equal(expectedMtime);
      expectedFile.stat.should.have.property('atime');
      expectedFile.stat.atime.should.equal(expectedAtime);
      done();
    };

    var stream = vfs.dest('./out-fixtures/', { cwd: __dirname });

    var bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);

    stream.pipe(bufferStream);
    stream.write(expectedFile);
    stream.end();
  });

  it('should change to the specified base as string', function(done) {
    var inputBase = path.join(__dirname, './fixtures');
    var inputPath = path.join(__dirname, './fixtures/wow/suchempty');

    var firstFile = new File({
      cwd: __dirname,
      path: inputPath,
      stat: fs.statSync(inputPath),
    });

    var buffered = [];

    var onEnd = function() {
      buffered[0].base.should.equal(inputBase);
      done();
    };

    var stream = vfs.dest('./out-fixtures/', {
      cwd: __dirname,
      base: inputBase,
    });

    var bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);

    stream.pipe(bufferStream);
    stream.write(firstFile);
    stream.end();
  });

  it('should change to the specified base as function', function(done) {
    var inputBase = path.join(__dirname, './fixtures');
    var inputPath = path.join(__dirname, './fixtures/wow/suchempty');

    var firstFile = new File({
      cwd: __dirname,
      path: inputPath,
      stat: fs.statSync(inputPath),
    });

    var buffered = [];

    var onEnd = function() {
      buffered[0].base.should.equal(inputBase);
      done();
    };

    var stream = vfs.dest('./out-fixtures/', {
      cwd: __dirname,
      base: function(file) {
        should.exist(file);
        file.path.should.equal(inputPath);
        return inputBase;
      },
    });

    var bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);

    stream.pipe(bufferStream);
    stream.write(firstFile);
    stream.end();
  });

  it('should report IO errors', function(done) {
    var inputPath = path.join(__dirname, './fixtures/test.coffee');
    var inputBase = path.join(__dirname, './fixtures/');
    var expectedPath = path.join(__dirname, './out-fixtures/test.coffee');
    var expectedContents = fs.readFileSync(inputPath);
    var expectedBase = path.join(__dirname, './out-fixtures');
    var expectedMode = parseInt('722', 8);

    var expectedFile = new File({
      base: inputBase,
      cwd: __dirname,
      path: inputPath,
      contents: expectedContents,
      stat: {
        mode: expectedMode,
      },
    });

    fs.mkdirSync(expectedBase);
    fs.closeSync(fs.openSync(expectedPath, 'w'));
    fs.chmodSync(expectedPath, 0);

    var stream = vfs.dest('./out-fixtures/', { cwd: __dirname });
    stream.on('error', function(err) {
      err.code.should.equal('EACCES');
      done();
    });
    stream.write(expectedFile);
  });

  it('should report stat errors', function(done) {
    var inputPath = path.join(__dirname, './fixtures/test.coffee');
    var inputBase = path.join(__dirname, './fixtures/');
    var expectedPath = path.join(__dirname, './out-fixtures/test.coffee');
    var expectedContents = fs.readFileSync(inputPath);
    var expectedBase = path.join(__dirname, './out-fixtures');
    var expectedMode = parseInt('722', 8);

    var expectedFile = new File({
      base: inputBase,
      cwd: __dirname,
      path: inputPath,
      contents: expectedContents,
      stat: {
        mode: expectedMode,
      },
    });

    fs.mkdirSync(expectedBase);
    fs.closeSync(fs.openSync(expectedPath, 'w'));

    spies.setError(function(mod, fn) {
      if (fn === 'fstat' && typeof arguments[2] === 'number') {
        return new Error('stat error');
      }
    });

    var stream = vfs.dest('./out-fixtures/', { cwd: __dirname });
    stream.on('error', function(err) {
      err.message.should.equal('stat error');
      done();
    });
    stream.write(expectedFile);
  });

  it('should report chmod errors', function(done) {
    var inputPath = path.join(__dirname, './fixtures/test.coffee');
    var inputBase = path.join(__dirname, './fixtures/');
    var expectedPath = path.join(__dirname, './out-fixtures/test.coffee');
    var expectedContents = fs.readFileSync(inputPath);
    var expectedBase = path.join(__dirname, './out-fixtures');
    var expectedMode = parseInt('722', 8);

    var expectedFile = new File({
      base: inputBase,
      cwd: __dirname,
      path: inputPath,
      contents: expectedContents,
      stat: {
        mode: expectedMode,
      },
    });

    fs.mkdirSync(expectedBase);
    fs.closeSync(fs.openSync(expectedPath, 'w'));

    spies.setError(function(mod, fn) {
      if (fn === 'fchmod' && typeof arguments[2] === 'number') {
        return new Error('chmod error');
      }
    });

    var stream = vfs.dest('./out-fixtures/', { cwd: __dirname });
    stream.on('error', function(err) {
      err.message.should.equal('chmod error');
      done();
    });
    stream.write(expectedFile);
  });

  it('should not chmod a matching file', function(done) {
    var inputPath = path.join(__dirname, './fixtures/test.coffee');
    var inputBase = path.join(__dirname, './fixtures/');
    var expectedPath = path.join(__dirname, './out-fixtures/test.coffee');
    var expectedContents = fs.readFileSync(inputPath);
    var expectedBase = path.join(__dirname, './out-fixtures');
    var expectedMode = parseInt('722', 8);

    var expectedFile = new File({
      base: inputBase,
      cwd: __dirname,
      path: inputPath,
      contents: expectedContents,
      stat: {
        mode: expectedMode,
      },
    });

    var expectedCount = 0;
    spies.setError(function(mod, fn) {
      if (fn === 'fstat' && typeof arguments[2] === 'number') {
        expectedCount++;
      }
    });

    var onEnd = function() {
      expectedCount.should.equal(1);
      fchmodSpy.called.should.equal(false);
      realMode(fs.lstatSync(expectedPath).mode).should.equal(expectedMode);
      done();
    };

    fs.mkdirSync(expectedBase);
    fs.closeSync(fs.openSync(expectedPath, 'w'));
    fs.chmodSync(expectedPath, expectedMode);

    fstatSpy.reset();
    fchmodSpy.reset();
    var stream = vfs.dest('./out-fixtures/', { cwd: __dirname });

    var buffered = [];
    var bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);

    stream.pipe(bufferStream);
    stream.write(expectedFile);
    stream.end();
  });

  it('should see a file with special chmod (setuid/setgid/sticky) as matching', function(done) {
    var inputPath = path.join(__dirname, './fixtures/test.coffee');
    var inputBase = path.join(__dirname, './fixtures/');
    var expectedPath = path.join(__dirname, './out-fixtures/test.coffee');
    var expectedContents = fs.readFileSync(inputPath);
    var expectedBase = path.join(__dirname, './out-fixtures');
    var expectedMode = parseInt('3722', 8);
    var normalMode = parseInt('722', 8);

    var expectedFile = new File({
      base: inputBase,
      cwd: __dirname,
      path: inputPath,
      contents: expectedContents,
      stat: {
        mode: normalMode,
      },
    });

    var expectedCount = 0;
    spies.setError(function(mod, fn) {
      if (fn === 'fstat' && typeof arguments[2] === 'number') {
        expectedCount++;
      }
    });

    var onEnd = function() {
      expectedCount.should.equal(1);
      fchmodSpy.called.should.equal(false);
      done();
    };

    fs.mkdirSync(expectedBase);
    fs.closeSync(fs.openSync(expectedPath, 'w'));
    fs.chmodSync(expectedPath, expectedMode);

    fstatSpy.reset();
    fchmodSpy.reset();
    var stream = vfs.dest('./out-fixtures/', { cwd: __dirname });

    var buffered = [];
    var bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);

    stream.pipe(bufferStream);
    stream.write(expectedFile);
    stream.end();
  });

  it('should not overwrite files with overwrite option set to false', function(done) {
    var inputPath = path.join(__dirname, './fixtures/test.coffee');
    var inputBase = path.join(__dirname, './fixtures/');
    var inputContents = fs.readFileSync(inputPath);

    var expectedPath = path.join(__dirname, './out-fixtures/test.coffee');
    var expectedBase = path.join(__dirname, './out-fixtures');
    var existingContents = 'Lorem Ipsum';

    var inputFile = new File({
      base: inputBase,
      cwd: __dirname,
      path: inputPath,
      contents: inputContents,
    });

    var buffered = [];

    var onEnd = function() {
      buffered.length.should.equal(1);
      bufEqual(fs.readFileSync(expectedPath), new Buffer(existingContents)).should.equal(true);
      done();
    };

    // Write expected file which should not be overwritten
    fs.mkdirSync(expectedBase);
    fs.writeFileSync(expectedPath, existingContents);

    var stream = vfs.dest('./out-fixtures/', { cwd: __dirname, overwrite: false });

    var bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);
    stream.pipe(bufferStream);
    stream.write(inputFile);
    stream.end();
  });

  it('should overwrite files with overwrite option set to true', function(done) {
    var inputPath = path.join(__dirname, './fixtures/test.coffee');
    var inputBase = path.join(__dirname, './fixtures/');
    var inputContents = fs.readFileSync(inputPath);

    var expectedPath = path.join(__dirname, './out-fixtures/test.coffee');
    var expectedBase = path.join(__dirname, './out-fixtures');
    var existingContents = 'Lorem Ipsum';

    var inputFile = new File({
      base: inputBase,
      cwd: __dirname,
      path: inputPath,
      contents: inputContents,
    });

    var buffered = [];

    var onEnd = function() {
      buffered.length.should.equal(1);
      bufEqual(fs.readFileSync(expectedPath), new Buffer(inputContents)).should.equal(true);
      done();
    };

    // This should be overwritten
    fs.mkdirSync(expectedBase);
    fs.writeFileSync(expectedPath, existingContents);

    var stream = vfs.dest('./out-fixtures/', { cwd: __dirname, overwrite: true });

    var bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);
    stream.pipe(bufferStream);
    stream.write(inputFile);
    stream.end();
  });

  it('should not overwrite files with overwrite option set to a function that returns false', function(done) {
    var inputPath = path.join(__dirname, './fixtures/test.coffee');
    var inputBase = path.join(__dirname, './fixtures/');
    var inputContents = fs.readFileSync(inputPath);

    var expectedPath = path.join(__dirname, './out-fixtures/test.coffee');
    var expectedBase = path.join(__dirname, './out-fixtures');
    var existingContents = 'Lorem Ipsum';

    var inputFile = new File({
      base: inputBase,
      cwd: __dirname,
      path: inputPath,
      contents: inputContents,
    });

    var buffered = [];

    var onEnd = function() {
      buffered.length.should.equal(1);
      bufEqual(fs.readFileSync(expectedPath), new Buffer(existingContents)).should.equal(true);
      done();
    };

    // Write expected file which should not be overwritten
    fs.mkdirSync(expectedBase);
    fs.writeFileSync(expectedPath, existingContents);

    var stream = vfs.dest('./out-fixtures/', { cwd: __dirname, overwrite: function() {
      return false;
    }, });

    var bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);
    stream.pipe(bufferStream);
    stream.write(inputFile);
    stream.end();
  });

  it('should overwrite files with overwrite option set to a function that returns true', function(done) {
    var inputPath = path.join(__dirname, './fixtures/test.coffee');
    var inputBase = path.join(__dirname, './fixtures/');
    var inputContents = fs.readFileSync(inputPath);

    var expectedPath = path.join(__dirname, './out-fixtures/test.coffee');
    var expectedBase = path.join(__dirname, './out-fixtures');
    var existingContents = 'Lorem Ipsum';

    var inputFile = new File({
      base: inputBase,
      cwd: __dirname,
      path: inputPath,
      contents: inputContents,
    });

    var buffered = [];

    var onEnd = function() {
      buffered.length.should.equal(1);
      bufEqual(fs.readFileSync(expectedPath), new Buffer(inputContents)).should.equal(true);
      done();
    };

    // This should be overwritten
    fs.mkdirSync(expectedBase);
    fs.writeFileSync(expectedPath, existingContents);

    var stream = vfs.dest('./out-fixtures/', { cwd: __dirname, overwrite: function() {
      return true;
    }, });

    var bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);
    stream.pipe(bufferStream);
    stream.write(inputFile);
    stream.end();
  });

  it('should create symlinks when the `symlink` attribute is set on the file', function(done) {
    var inputPath = path.join(__dirname, './fixtures/test-create-dir-symlink');
    var inputBase = path.join(__dirname, './fixtures/');
    var inputRelativeSymlinkPath = 'wow';

    var expectedPath = path.join(__dirname, './out-fixtures/test-create-dir-symlink');

    var inputFile = new File({
      base: inputBase,
      cwd: __dirname,
      path: inputPath,
      contents: null, // ''
    });

    // `src()` adds this side-effect with `keepSymlinks` option set to false
    inputFile.symlink = inputRelativeSymlinkPath;

    var buffered = [];

    var onEnd = function() {
      fs.readlink(buffered[0].path, function() {
        buffered[0].symlink.should.equal(inputFile.symlink);
        buffered[0].path.should.equal(expectedPath);
        done();
      });
    };

    var stream = vfs.dest('./out-fixtures/', { cwd: __dirname });

    var bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);

    stream.on('error', done);
    stream.pipe(bufferStream);
    stream.write(inputFile);
    stream.end();
  });

  it('should emit finish event', function(done) {
    var srcPath = path.join(__dirname, './fixtures/test.coffee');
    var stream = vfs.dest('./out-fixtures/', { cwd: __dirname });

    stream.once('finish', function() {
      done();
    });

    var file = new File({
      path: srcPath,
      cwd: __dirname,
      contents: new Buffer('1234567890'),
    });

    stream.write(file);
    stream.end();
  });

  it('does not get clogged by highWaterMark', function(done) {
    fs.mkdirSync(path.join(__dirname, './fixtures/highwatermark'));
    for (var idx = 0; idx < 17; idx++) {
      fs.writeFileSync(path.join(__dirname, './fixtures/highwatermark/', 'file' + idx + '.txt'));
    }

    var srcPath = path.join(__dirname, './fixtures/highwatermark/*.txt');
    var srcStream = vfs.src(srcPath);
    var destStream = vfs.dest('./out-fixtures/', { cwd: __dirname });

    var fileCount = 0;
    var countFiles = through.obj(function(file, enc, cb) {
      fileCount++;

      cb(null, file);
    });

    destStream.once('finish', function() {
      fileCount.should.equal(17);
      done();
    });

    srcStream.pipe(countFiles).pipe(destStream);
  });

  it('allows backpressure when piped to another, slower stream', function(done) {
    this.timeout(20000);

    fs.mkdirSync(path.join(__dirname, './fixtures/highwatermark'));
    for (var idx = 0; idx < 24; idx++) {
      fs.writeFileSync(path.join(__dirname, './fixtures/highwatermark/', 'file' + idx + '.txt'));
    }

    var srcPath = path.join(__dirname, './fixtures/highwatermark/*.txt');
    var srcStream = vfs.src(srcPath);
    var destStream = vfs.dest('./out-fixtures/', { cwd: __dirname });

    var fileCount = 0;
    var countFiles = through.obj(function(file, enc, cb) {
      fileCount++;

      cb(null, file);
    });

    var slowFileCount = 0;
    var slowCountFiles = new Writeable({
      objectMode: true,
      write: function(file, enc, cb) {
        slowFileCount++;

        setTimeout(function() {
          cb(null, file);
        }, 250);
      },
    });

    slowCountFiles.once('finish', function() {
      fileCount.should.equal(24);
      slowFileCount.should.equal(24);
      done();
    });

    srcStream
      .pipe(countFiles)
      .pipe(destStream)
      .pipe(slowCountFiles);
  });

  it('should respect readable listeners on destination stream', function(done) {
    var srcPath = path.join(__dirname, './fixtures/test.coffee');
    var srcStream = vfs.src(srcPath);
    var destStream = vfs.dest('./out-fixtures/', { cwd: __dirname });

    srcStream
      .pipe(destStream);

    var readables = 0;
    destStream.on('readable', function() {
      var data = destStream.read();

      if (data != null) {
        readables++;
      }
    });

    destStream.on('error', done);

    destStream.on('finish', function() {
      readables.should.equal(1);
      done();
    });
  });

  it('should respect data listeners on destination stream', function(done) {
    var srcPath = path.join(__dirname, './fixtures/test.coffee');
    var srcStream = vfs.src(srcPath);
    var destStream = vfs.dest('./out-fixtures/', { cwd: __dirname });

    srcStream
      .pipe(destStream);

    var datas = 0;
    destStream.on('data', function() {
      datas++;
    });

    destStream.on('error', done);

    destStream.on('finish', function() {
      datas.should.equal(1);
      done();
    });
  });

  it('sinks the stream if all the readable event handlers are removed', function(done) {
    fs.mkdirSync(path.join(__dirname, './fixtures/highwatermark'));
    for (var idx = 0; idx < 17; idx++) {
      fs.writeFileSync(path.join(__dirname, './fixtures/highwatermark/', 'file' + idx + '.txt'));
    }

    var srcPath = path.join(__dirname, './fixtures/highwatermark/*.txt');
    var srcStream = vfs.src(srcPath);
    var destStream = vfs.dest('./out-fixtures/', { cwd: __dirname });

    var fileCount = 0;
    var countFiles = through.obj(function(file, enc, cb) {
      fileCount++;

      cb(null, file);
    });

    destStream.on('readable', noop);

    destStream.once('finish', function() {
      fileCount.should.equal(17);
      done();
    });

    srcStream.pipe(countFiles).pipe(destStream);

    process.nextTick(function() {
      destStream.removeListener('readable', noop);
    });
  });

  it('sinks the stream if all the data event handlers are removed', function(done) {

    this.timeout(10000);

    fs.mkdirSync(path.join(__dirname, './fixtures/highwatermark'));
    for (var idx = 0; idx < 17; idx++) {
      fs.writeFileSync(path.join(__dirname, './fixtures/highwatermark/', 'file' + idx + '.txt'));
    }

    var srcPath = path.join(__dirname, './fixtures/highwatermark/*.txt');
    var srcStream = vfs.src(srcPath);
    var destStream = vfs.dest('./out-fixtures/', { cwd: __dirname });

    var fileCount = 0;
    function onData() {
      fileCount++;
    }

    var countFiles = through.obj(function(file, enc, cb) {
      onData();

      cb(null, file);
    });

    destStream.on('data', onData);

    destStream.once('finish', function() {
      fileCount.should.equal(17);
      done();
    });

    srcStream.pipe(countFiles).pipe(destStream);

    process.nextTick(function() {
      destStream.removeListener('data', onData);
    });
  });

  it('should pass options to through2', function(done) {
    var srcPath = path.join(__dirname, './fixtures/test.coffee');
    var content = fs.readFileSync(srcPath);
    var stream = vfs.dest('./out-fixtures/', { cwd: __dirname, objectMode: false });

    stream.on('error', function(err) {
      err.should.match(/Invalid non-string\/buffer chunk/);
      done();
    });

    var file = new File({
      path: srcPath,
      cwd: __dirname,
      contents: content,
    });

    stream.write(file);
    stream.end();
  });

  it('should successfully process unbuffered items', function(done) {
    var srcPath = path.join(__dirname, './fixtures/*');
    var srcStream = vfs.src(srcPath, { buffer: false });
    var destStream = vfs.dest('./out-fixtures', { cwd: __dirname });

    srcStream
      .pipe(destStream)
      .once('finish', done);
  });

  it('should not exhaust available file descriptors when streaming thousands of files', function(done) {
    // This can be a very slow test on boxes with slow disk i/o
    this.timeout(0);

    // Make a ton of hard links
    var numFiles = 6000;
    var srcFile = path.join(__dirname, './fixtures/test.coffee');
    fs.mkdirSync(path.join(__dirname, './out-fixtures'));
    fs.mkdirSync(path.join(__dirname, './out-fixtures/in/'));

    for (var idx = 0; idx < numFiles; idx++) {
      fs.linkSync(srcFile, path.join(__dirname, './out-fixtures/in/test' + idx + '.coffee'));
    }

    var srcStream = vfs.src(path.join(__dirname, './out-fixtures/in/*.coffee'), { buffer: false });
    var destStream = vfs.dest('./out-fixtures/out/', { cwd: __dirname });

    var fileCount = 0;

    srcStream
      .pipe(through.obj(function(file, enc, cb) {
        fileCount++;

        cb(null, file);
      }))
      .pipe(destStream)
      .once('finish', function() {
        fileCount.should.equal(numFiles);
        done();
      });
  });

  it('errors if we cannot mkdirp', function(done) {
    var outputDir = path.join(__dirname, './out-fixtures/');
    var inputPath = path.join(__dirname, './fixtures/test.coffee');

    fs.mkdirSync(outputDir, parseInt('000', 8));

    var expectedFile = new File({
      base: __dirname,
      cwd: __dirname,
      path: inputPath,
      contents: null,
    });

    var stream = vfs.dest(outputDir);
    stream.write(expectedFile);
    stream.on('error', function(err) {
      expect(err).toExist();
      done();
    });
  });

  it('errors if vinyl object is a directory and we cannot mkdirp', function(done) {
    var outputDir = path.join(__dirname, './out-fixtures/');
    var inputPath = path.join(__dirname, './other-dir/');

    var expectedFile = new File({
      base: __dirname,
      cwd: __dirname,
      path: inputPath,
      contents: null,
      stat: {
        isDirectory: function() {
          return true;
        },
      },
    });

    var stream = vfs.dest(outputDir, { dirMode: parseInt('000', 8) });
    stream.write(expectedFile);
    stream.on('error', function(err) {
      expect(err).toExist();
      done();
    });
  });

  // TODO: is this correct behavior? had to adjust it
  it('does not error if vinyl object is a directory and we cannot open it', function(done) {
    var outputDir = path.join(__dirname, './out-fixtures/');
    var inputPath = path.join(__dirname, './other-dir/');

    var expectedFile = new File({
      base: __dirname,
      cwd: __dirname,
      path: inputPath,
      contents: null,
      stat: {
        isDirectory: function() {
          return true;
        },
        mode: parseInt('000', 8),
      },
    });

    var stream = vfs.dest(outputDir);
    stream.write(expectedFile);
    stream.on('error', function(err) {
      expect(err).toNotExist();
      done(err);
    });
    stream.end(function() {
      var exists = fs.existsSync(path.join(outputDir, './other-dir/'));
      expect(exists).toEqual(true);
      done();
    });
  });

  it('errors if vinyl object is a directory and open errors', function(done) {
    var openSpy = expect.spyOn(fs, 'open').andCall(function(writePath, flag, cb) {
      cb(new Error('mocked error'));
    });

    var outputDir = path.join(__dirname, './out-fixtures/');
    var inputPath = path.join(__dirname, './other-dir/');

    var expectedFile = new File({
      base: __dirname,
      cwd: __dirname,
      path: inputPath,
      contents: null,
      stat: {
        isDirectory: function() {
          return true;
        },
      },
    });

    var stream = vfs.dest(outputDir);
    stream.write(expectedFile);
    stream.on('error', function(err) {
      expect(err).toExist();
      expect(openSpy.calls.length).toEqual(1);
      done();
    });
  });

  it('error if content stream errors', function(done) {
    var inputPath = path.join(__dirname, './fixtures/test.coffee');
    var inputBase = path.join(__dirname, './fixtures/');

    var contentStream = through.obj();
    var expectedFile = new File({
      base: inputBase,
      cwd: __dirname,
      path: inputPath,
      contents: contentStream,
    });

    var stream = vfs.dest('./out-fixtures/', { cwd: __dirname });
    stream.write(expectedFile);
    setTimeout(function() {
      contentStream.emit('error', new Error('mocked error'));
    }, 100);
    stream.on('error', function(err) {
      expect(err).toExist();
      done();
    });
  });

});
