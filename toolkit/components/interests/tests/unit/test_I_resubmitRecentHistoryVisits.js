/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/commonjs/sdk/core/promise.js");

let obsereverService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);

function run_test() {
  run_next_test();
}

add_task(function test_ResubmitHistoryVisits() {

  yield promiseAddUrlInterestsVisit("http://www.autoblog.com/", ["Autos","movies","computers"]);

  let myDef = Promise.defer();
  yield InterestsStorage.clearRecentVisits(100).then(data => {
    // test that interests are all empty
    InterestsStorage.getScoresForInterests(["Autos" , "computers","movies"]).then(function(data) {
      myDef.resolve(data);
    });
  });

  yield myDef.promise.then(function(data) {
    do_check_eq(data[0]["score"], 0);
    do_check_eq(data[1]["score"], 0);
    do_check_eq(data[2]["score"], 0);
  });

  // the database is clean - repopulate it
  // clean places tables and re-insert autoblog.com
  let microNow = Date.now() * 1000;
  yield promiseClearHistory();
  yield promiseAddVisits({uri: NetUtil.newURI("http://www.autoblog.com/"), visitDate: microNow});
  yield promiseAddVisits({uri: NetUtil.newURI("http://www.autoblog.com/"), visitDate: microNow - 15*MICROS_PER_DAY});
  yield promiseAddVisits({uri: NetUtil.newURI("http://www.autoblog.com/"), visitDate: microNow - 15*MICROS_PER_DAY});
  yield promiseAddVisits({uri: NetUtil.newURI("http://www.autoblog.com/"), visitDate: microNow - 30*MICROS_PER_DAY});
  yield promiseAddVisits({uri: NetUtil.newURI("http://www.autoblog.com/"), visitDate: microNow - 30*MICROS_PER_DAY});
  yield promiseAddVisits({uri: NetUtil.newURI("http://www.autoblog.com/"), visitDate: microNow - 30*MICROS_PER_DAY});

  // baseline, let's make sure there is no history
  yield InterestsStorage.getScoresForInterests(["Autos"]).then(data => {
        do_check_eq(data[0]["score"], 0);
  });

  let promise1 = iServiceObject.resubmitRecentHistoryVisits(60);
  let promise2 = iServiceObject.resubmitRecentHistoryVisits(60);
  let promise3 = iServiceObject.resubmitRecentHistoryVisits(60);

  // all of the promisses above should be the same promise
  do_check_true(promise1 == promise2);
  do_check_true(promise1 == promise3);

  yield promise1;

  // so we have processed the history, let's make sure we get interests back
  yield InterestsStorage.getScoresForInterests(["Autos"]).then(data => {
        do_check_true(data[0]["score"] != 0);
  });
});

add_task(function test_ResubmitLocalHostFailure() {

  yield promiseClearHistoryAndVisits();
  yield promiseAddUrlInterestsVisit("http://www.autoblog.com/", ["Autos"]);

  let microNow = Date.now() * 1000;
  yield promiseAddVisits({uri: NetUtil.newURI("http://localhost/"), visitDate: microNow});
  yield promiseAddVisits({uri: NetUtil.newURI("http://www.autoblog.com/"), visitDate: microNow});
  yield promiseAddVisits({uri: NetUtil.newURI("http://www.autoblog.com/"), visitDate: microNow - 15*MICROS_PER_DAY});
  yield promiseAddVisits({uri: NetUtil.newURI("http://www.autoblog.com/"), visitDate: microNow - 15*MICROS_PER_DAY});
  yield promiseAddVisits({uri: NetUtil.newURI("http://www.autoblog.com/"), visitDate: microNow - 30*MICROS_PER_DAY});
  yield promiseAddVisits({uri: NetUtil.newURI("http://www.autoblog.com/"), visitDate: microNow - 30*MICROS_PER_DAY});
  yield promiseAddVisits({uri: NetUtil.newURI("http://www.autoblog.com/"), visitDate: microNow - 30*MICROS_PER_DAY});

  yield iServiceObject.resubmitRecentHistoryVisits(60);
  yield InterestsStorage.getScoresForInterests(["Autos"]).then(data => {
        do_check_true(data[0] != null);
        do_check_true(data[0]["scores"] != 0);
  });
});

add_task(function test_ResubmitEmptyHistoryFailure() {
    yield promiseClearHistoryAndVisits();
    // resubmit history
    let isDone = false;
    yield iServiceObject.resubmitRecentHistoryVisits(110).then(() => {
      // we should see promise resolved
      isDone = true;
    });
    do_check_true(isDone);
});

add_task(function test_ResubmitPrematurePromiseResolvedFailure() {

  yield promiseClearHistoryAndVisits();
  yield promiseAddUrlInterestsVisit("http://www.autoblog.com/", ["Autos"]);

  let microNow = Date.now() * 1000;
  for (let i=0; i<30; i++) {
    yield promiseAddVisits({uri: NetUtil.newURI("http://www.autoblog.com/"), visitDate: microNow - i*MICROS_PER_DAY});
  }

  // setup observer
  let urlSaved = 0;
  let observer = {
    observe: function(subject, topic, data) {
      if (topic == "interest-visit-saved") {
        urlSaved++;
      }
    }
  };
  obsereverService.addObserver(observer, "interest-visit-saved", false);

  // resubmit history
  yield iServiceObject.resubmitRecentHistoryVisits(110).then(() => {
    // we must see 101 urls being saved
    do_check_eq(urlSaved,30);
    Services.obs.removeObserver(observer, "interest-visit-saved");
  });
});

