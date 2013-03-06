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
  info: "TextClassifier Test 1: polygon",
  url:  "http://www.polygon.com/2013/3/5/4066808/thief-screenshots-leak-next-gen",
  title: "Rumored images for new Thief game leak, reportedly in the works on next-gen platforms",
  expectedInterests:  {"video-games": 1}
}
];

add_task(function test_default_model_match() {
  //delete iServiceObject._worker;
  let worker = iServiceObject._worker;
  // there variables are need to set up array of tests
  let expectedInterests;

  worker.removeEventListener("message", iServiceObject, false); 

  let workerTester = {
    handleEvent: function(aEvent) {
     if (aEvent.type == "message") {
      let msgData = aEvent.data;
      if (msgData.message == "InterestsForDocumentText") {
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
      else if (msgData.message == "InterestsForDocumentRules") {
        // make sure rule-based classification did not happen
        do_check_eq(0, msgData.interests.length());
      }
      else if (!(msgData.message in kValidMessages)) {
          // unexpected message
          do_throw("ERROR_UNEXPECTED_MSG: " + msgData.message);
      }
     }
     else {
      do_throw("ERROR_UNEXPECTED_MSG_TYPE" + aEvent.type);
     }
    } // end of handleEvent
  };

  worker.addEventListener("message", workerTester , false);

  for (let test of matchTests) {
    do_print(test.info);
    let uri = NetUtil.newURI(test.url);
    let title = test.title;
    let host = uri.host;
    let path = uri.path;
    let tld = Services.eTLD.getBaseDomainFromHost(host)

    expectedInterests = test.expectedInterests;
    worker.postMessage({
      message: "getInterestsForDocumentText",
      host: host,
      path: path,
      title: title,
      url: test.url,
      tld: tld
    });
    worker.postMessage({
      message: "getInterestsForDocumentRules",
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

add_task(function test_text_classification() {
  delete iServiceObject._worker;
  let worker = iServiceObject._worker;
  let verifyBootstrap = {
    handleEvent: function(aEvent) {
      if (aEvent.type == "message") {
        let msgData = aEvent.data;
        if (msgData.message == "bootstrapComplete") {
          do_check_true(true);
          deferEnsureResults.resolve();
        }
      }
      else if (!(msgData.message in kValidMessages)) {
        do_throw("ERROR_UNEXPECTED_MSG_TYPE" + aEvent.type);
      }
    }
  }
  worker.addEventListener("message", verifyBootstrap, false); 

  worker.postMessage({
    message: "bootstrap",
    interestsData: {},
    interestsDataType: "",
    interestsClassifierModel: {
      priors: [0.5, 0.5],
      likelihoods: {
        qux: [0.8, 0.2],
        xyzzy: [0.2, 0.8]
      },
      classes: {
        0: "foo",
        1: "bar",
      }
    },
    interestsUrlStopwords: {}
  });
  deferEnsureResults = Promise.defer();
  yield deferEnsureResults.promise;

  worker.removeEventListener("message", iServiceObject, false); 
});
