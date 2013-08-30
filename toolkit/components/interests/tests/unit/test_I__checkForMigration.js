/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/commonjs/sdk/core/promise.js");

add_task(function test_I__checkForMigration() {

  // populate history
  let microNow = Date.now() * 1000;
  yield promiseAddVisits({uri: NetUtil.newURI("http://www.autoblog.com/"), visitDate: microNow});
  yield promiseAddVisits({uri: NetUtil.newURI("http://www.autoblog.com/"), visitDate: microNow - 1*MICROS_PER_DAY});
  yield promiseAddVisits({uri: NetUtil.newURI("http://www.autoblog.com/"), visitDate: microNow - 2*MICROS_PER_DAY});

  // initialize the storage and cause places resubmition
  let interestsStorage = yield iServiceObject.InterestsStoragePromise;
  yield promiseAddVisits({uri: NetUtil.newURI("http://www.autoblog.com/"), visitDate: microNow - 2*MICROS_PER_DAY});
  yield iServiceObject._ResubmitRecentHistoryDeferred.promise;

  // this was a new database, so migration should have happened, and history should have been re-processed
  yield interestsStorage.getScoresForInterests(["Autos"]).then(data => {
        do_check_eq(data[0]["score"], 3);
  });
});

