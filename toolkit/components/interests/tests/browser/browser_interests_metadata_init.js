/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

function test() {

  waitForExplicitFinish();
  Services.prefs.setBoolPref("interests.navigator.enabled", true);
  Services.prefs.setBoolPref("interests.enabled", true);
  yield iServiceObject._checkForMigration();


  let windowsToClose = [];
  let testURL =
    "http://mochi.test:8888/tests/toolkit/components/interests/tests/browser/cars.html";

  registerCleanupFunction(function() {
    windowsToClose.forEach(function(aWin) {
      aWin.close();
    });
  });

  function testGetInterestsAPI() {
    loadURLIntoSeparateWindow({}, testURL).then(aWindow => {
      windowsToClose.push(aWindow);
      is(aWindow.content.location.href, testURL, "must be test url");
      aWindow.content.navigator.interests.getTopInterests(5).then(ints => {
        is(ints.length,5,"array of ints must be 5 ints");
        promiseClearHistoryAndInterests().then(finish);
      },
      error => {
        of(false, "interests must be accessible");
      });
    });
  };

  let observer = {
    observe: function(aSubject, aTopic, aData) {
      if (aTopic == "interest-metadata-initialized") {
	testGetInterestsAPI();
      }
    }
  };
  Services.obs.addObserver(observer, "interest-metadata-initialized", false);
} // end of test
