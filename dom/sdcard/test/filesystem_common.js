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
  /* try {
    const Cc = SpecialPowers.Cc;
    const Ci = SpecialPowers.Ci;
    var directoryService = Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties);
    var f = directoryService.get("TmpD", Ci.nsIFile);
    f.appendRelativePath("device-storage-testing");
    f.remove(true);
  } catch(e) {}

  SimpleTest.waitForExplicitFinish(); */
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