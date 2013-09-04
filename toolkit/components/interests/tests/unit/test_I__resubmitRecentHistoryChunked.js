/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/commonjs/sdk/core/promise.js");

let obsereverService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);

add_task(function test__ResubmitHistoryVisitsChunked() {

  let interestsStorage = yield iServiceObject.InterestsStoragePromise;

  // clean places tables and insert 200 autoblog.com urls
  let microNow = Date.now() * 1000;
  yield promiseClearHistory();
  let visits = [];
  for (let i = 0; i<200; i++) {
    visits.push({uri: NetUtil.newURI("http://www.autoblog.com/" + i), visitDate: microNow - (i%30)*MICROS_PER_DAY});
  }

  yield promiseAddVisits(visits);

  // baseline, let's make sure there is no history
  yield interestsStorage.getScoresForInterests(["Autos"]).then(data => {
        do_check_eq(data[0]["score"], 0);
  });

  // resubmit last 30 days in chunks of 10 records
  yield iServiceObject._resubmitRecentHistory(30,10);
  // so we have processed the history, let's make sure we get interests back
  yield interestsStorage.getScoresForInterests(["Autos"]).then(data => {
    // we should see 30 days score
    do_check_eq(data[0]["score"], 30);
  });

  yield iServiceObject.InterestsStoragePromise.then(storage => {
    return storage._execute("DELETE FROM moz_interests_visits");
  });
  // resubmit last 30 days in chunks of 1 record
  yield iServiceObject._resubmitRecentHistory(30,1);
  yield interestsStorage.getScoresForInterests(["Autos"]).then(data => {
    // we should see 30 days score
    do_check_eq(data[0]["score"], 30);
  });

  yield iServiceObject.InterestsStoragePromise.then(storage => {
    return storage._execute("DELETE FROM moz_interests_visits");
  });
  // resubmit last 30 days in chunks of 200 record
  yield iServiceObject._resubmitRecentHistory(30,200);
  yield interestsStorage.getScoresForInterests(["Autos"]).then(data => {
    // we should see 30 days score
    do_check_eq(data[0]["score"], 30);
  });

});

