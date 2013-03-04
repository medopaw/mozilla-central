/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/PlacesInterestsStorage.jsm");

let iServiceObject = Cc["@mozilla.org/places/interests;1"].getService(Ci.nsISupports).wrappedJSObject;
let iServiceApi = Cc["@mozilla.org/InterestsWebAPI;1"].createInstance(Ci.mozIInterestsWebAPI)
let obsereverService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
let deferEnsureResults;


function run_test() {
  run_next_test();
}

// the test array 
let matchTests = [
{
  info: "TEST-INFO | Match Test 1: mosizlle.org",
  url:  "http://www.mozilla.org",
  title: "Hello World",
  expectedInterests:  {computers: 1}
},
{
  info: "TEST-INFO | Match Test 2: weather gov",
  url:  "http://nws.noaa.gov",
  title: "Hello World",
  expectedInterests:  {government: 1, weather: 1, science: 1}
}
];
 

add_task(function test_matcher() {
  let worker = iServiceObject._worker;
  // there variables are need to set up array of tests
  let expectedInterests;

  worker.removeEventListener("message", iServiceObject, false); 

  let workerTester = {
    handleEvent: function(aEvent) {
     if (aEvent.type == "message") {
      let msgData = aEvent.data;
      if (msgData.message == "InterestsForDocument") {
        // make sure that categorization is correct 
        let host = msgData.host;
        let interests = msgData.interests;
        let interestCount = 0;
        for (let interest of interests) {
         do_check_true(expectedInterests[interest] == 1);
         interestCount ++;
        } 
        do_check_eq(interestCount, Object.keys(expectedInterests).length);
        deferEnsureResults.resolve();
      }
      else {
        do_check_true(false);  // unexpected message 
      }
     }
     else {
      do_check_true(false);  // unexpected message type
     }
    } // end of handleEvent
  };

  worker.addEventListener("message", workerTester , false);

  for (let test of matchTests) {
    dump(test.info + "\n");
    let uri = NetUtil.newURI(test.url);
    let title = test.title;
    let host = uri.host;
    let path = uri.path;
    let tld = Services.eTLD.getBaseDomainFromHost(host)

    expectedInterests = test.expectedInterests;
    worker.postMessage({
      message: "getInterestsForDocument",
      host: host,
      path: path,
      title: title,
      url: test.url,
      tld: tld
    });

    deferEnsureResults = Promise.defer();
    yield deferEnsureResults.promise;
  }
});
