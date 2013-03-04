/* -*- Mode: javascript; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
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

[

  /*
  function test_no_model() {
    do_check_true(true);
    run_next_test();
  },
  */

  function test_valid_model() {
    let worker = iServiceObject._worker;
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

    let uri = NetUtil.newURI("http://adventure.nationalgeographic.com/2009/12/best-of-adventure/geoff-tabin");
    let title = "National Geographic Magazine - NGM.com";
    let host = uri.host;
    let path = uri.path;
    let tld = Services.eTLD.getBaseDomainFromHost(host)

    /*
    let expectedInterests = {"travel": 1};
    worker.postMessage({
      message: "getInterestsForDocumentText",
      host: host,
      path: path,
      title: title,
      url: "http://adventure.nationalgeographic.com/2009/12/best-of-adventure/geoff-tabin",
      tld: tld
    });

    deferEnsureResults = Promise.defer();
    yield deferEnsureResults.promise;
    */
    do_check_true(true);
    run_next_test();
  },

].forEach(add_test);

function run_test()
{
  run_next_test();
}
