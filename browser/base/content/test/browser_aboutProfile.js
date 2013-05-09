/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

XPCOMUtils.defineLazyModuleGetter(this, "Promise",
  "resource://gre/modules/commonjs/sdk/core/promise.js");
XPCOMUtils.defineLazyModuleGetter(this, "Task",
  "resource://gre/modules/Task.jsm");

// Wait until interest metadata is populated
function promiseWaitForMetadataInit() {
  let finishedPopulating = Promise.defer();

  let observerService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
  let observer = {
    observe: function(subject, topic, data) {
      if (topic == "interest-metadata-initialized") {
        finishedPopulating.resolve();
        observerService.removeObserver(this, "interest-metadata-initialized");
      }
    }
  };
  observerService.addObserver(observer, "interest-metadata-initialized", false);

  return finishedPopulating.promise;
}

registerCleanupFunction(function() {
  // Ensure we don't pollute prefs for next tests.
  try {
    Services.prefs.clearUserPref("interests.about.dashboardUrl");
  } catch (ex) {}
});

let gTests = [

{
  desc: "Test the remote commands",
  setup: function ()
  {
    Services.prefs.setCharPref("interests.about.dashboardUrl",
                               "https://example.com/browser/browser/base/content/test/profile_testRemoteCommands.html");
  },
  run: function ()
  {
    let deferred = Promise.defer();

    let results = 0;
    try {
      let win = gBrowser.contentWindow;
      win.addEventListener("message", function testLoad(e) {
        if (e.data.type == "testResult") {
          ok(e.data.pass, e.data.info);
          results++;
        }
        else if (e.data.type == "testsComplete") {
          is(results, e.data.count, "Checking number of results received matches the number of tests that should have run");
          win.removeEventListener("message", testLoad, false, true);
          deferred.resolve();
        }

      }, false, true);

    } catch(e) {
      ok(false, "Failed to get all commands");
      deferred.reject();
    }
    return deferred.promise;
  }
},


]; // gTests

function test()
{
  waitForExplicitFinish();

  //requestLongerTimeout(10);

  Task.spawn(function () {
    for (let test of gTests) {
      info(test.desc);
      test.setup();

      // initialize interest metadata
      let iServiceObject = Cc["@mozilla.org/places/interests;1"].getService(Ci.nsISupports).wrappedJSObject;
      yield iServiceObject._initInterestMeta();
      yield promiseWaitForMetadataInit();

      Services.prefs.setBoolPref("interests.enabled", false);
      yield promiseNewTabLoadEvent("about:profile");

      yield test.run();

      gBrowser.removeCurrentTab();
    }

    finish();
  });
}

function promiseNewTabLoadEvent(aUrl, aEventType="load")
{
  let deferred = Promise.defer();
  let tab = gBrowser.selectedTab = gBrowser.addTab(aUrl);
  tab.linkedBrowser.addEventListener(aEventType, function load(event) {
    tab.linkedBrowser.removeEventListener(aEventType, load, true);
    let iframe = tab.linkedBrowser.contentDocument.getElementById("remote-dashboard");
      iframe.addEventListener("load", function frameLoad(e) {
        iframe.removeEventListener("load", frameLoad, false);
        deferred.resolve();
      }, false);
    }, true);
  return deferred.promise;
}

