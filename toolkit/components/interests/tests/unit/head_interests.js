/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const Ci = Components.interfaces;
const Cc = Components.classes;
const Cr = Components.results;
const Cu = Components.utils;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/commonjs/sdk/core/promise.js");
Cu.import("resource://gre/modules/NetUtil.jsm");
Cu.import("resource://gre/modules/interests/InterestsStorage.jsm");
Cu.import("resource://gre/modules/Task.jsm");


// Import common head.
let (commonFile = do_get_file("../head_common.js", false)) {
  let uri = Services.io.newFileURI(commonFile);
  Services.scriptloader.loadSubScript(uri.spec, this);
}

let iServiceObject = Cc["@mozilla.org/interests;1"].getService(Ci.nsISupports).wrappedJSObject;

// Put any other stuff relative to this test folder below.

const kValidMessages = {
  "bootstrapComplete": true,
  "swapRulesComplete": true,
  "InterestsForDocumentRules": true,
  "InterestsForDocumentText": true,
  "InterestsForDocument": true
}

function addInterest(interest) {
  return iServiceObject.InterestsStoragePromise.then((storage) => {
    return storage.setInterest(interest, {});
  });
}

function promiseClearHistoryAndVisits() {
  return Task.spawn(function() {
    let storage = yield iServiceObject.InterestsStoragePromise;
    yield isPromiseClearInterests(storage);
    yield promiseClearHistory();
  });
}

function promiseAddMultipleUrlInterestsVisits(aVisitInfo) {
  return Task.spawn(function() {
    let visits = [];
    if (Array.isArray(aVisitInfo)) {
      visits = visits.concat(aVisitInfo);
    } else {
      visits.push(aVisitInfo)
    }

    // add URL visits and run syc between moz_hosts and moz_interests_frecent_hosts
    visits.forEach(function(visit) {
      yield promiseAddVisits(uri);
    });

    let storage = yield iServiceObject.InterestsStoragePromise;
    yield isPromiseAddInterestsVisits(storage,visits);
  });
}

function promiseAddUrlInterestsVisit(url,interests,count,daysAgo) {
  return promiseAddMultipleUrlInterestsVisits(
    { url: url,
      interests: interests,
      count: count || 1,
      daysAgo: daysAgo || 0
    });
}

Services.prefs.setBoolPref("interests.enabled", true);
