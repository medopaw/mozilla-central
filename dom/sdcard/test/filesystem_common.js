/**

 * Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

/* Object.defineProperty(Array.prototype, "remove", {
  enumerable: false,
  configurable: false,
  writable: false,
  value: function(from, to) {
    // Array Remove - By John Resig (MIT Licensed)
    var rest = this.slice((to || from) + 1 || this.length);
    this.length = from < 0 ? this.length + from : from;
    return this.push.apply(this, rest);
  }
}); */

function filesystem_setup() {

  // ensure that the directory we are writing into is empty
  try {
    const Cc = SpecialPowers.Cc;
    const Ci = SpecialPowers.Ci;
    var directoryService = Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties);
    var f = directoryService.get("TmpD", Ci.nsIFile);
    f.appendRelativePath("file-system-testing");
    f.remove(true);
  } catch(e) {}

  SimpleTest.waitForExplicitFinish();
  if (SpecialPowers.isMainProcess()) {
    SpecialPowers.setBoolPref("file.system.testing", true);
  }
}

function filesystem_cleanup() {
  if (SpecialPowers.isMainProcess()) {
    SpecialPowers.setBoolPref("file.system.testing", false);
  }
  SimpleTest.finish();
}

function test_dump(msg) {
	dump("\n[File System Test]" + msg + "\n");
}

var testEngine = {
  tests: [],
  test: null,
  func: null,
  title: function() {
	return "Test " + (this.test.name ? ('"' + this.test.name + '" ') : "");
  },
  next: function() {
	if (this.test) {
	  if (this.test.invert) {
		ok(false, this.title() + "failed");
		filesystem_cleanup();
		return;
	  } else {
		ok(true, this.title() + "passed");
	  }
	}
	this.proceed();
  },
  fail: function(error) {
	if (this.test.invert) {
	  ok(true, this.title() + "passed");
	  this.proceed();
	} else {
	  ok(false, this.title() + "failed with error: " + error.name);
	  filesystem_cleanup();
	}
  },
  proceed: function() {
    this.test = this.tests.shift();
	if (this.test == undefined) {
	  filesystem_cleanup();
	  return;
	}
	var onsuccess = (this.test.onsuccess || this.next).bind(this);
	var onerror = (this.test.onerror || this.fail).bind(this);
	this.func(this.test.args, onsuccess, onerror);
  }
};