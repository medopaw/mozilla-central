/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/commonjs/sdk/core/promise.js");

function run_test() {
  run_next_test();
}

add_task(function test_I__checkForMigration() {

  // add an interest
  yield addInterest("cars");

  // populate history
  let microNow = Date.now() * 1000;
  yield promiseClearHistory();
  yield promiseAddVisits({uri: NetUtil.newURI("http://www.cars.com/"), visitDate: microNow});
  yield promiseAddVisits({uri: NetUtil.newURI("http://www.cars.com/"), visitDate: microNow - 15*MICROS_PER_DAY});
  yield promiseAddVisits({uri: NetUtil.newURI("http://www.cars.com/"), visitDate: microNow - 15*MICROS_PER_DAY});
  yield promiseAddVisits({uri: NetUtil.newURI("http://www.cars.com/"), visitDate: microNow - 30*MICROS_PER_DAY});
  yield promiseAddVisits({uri: NetUtil.newURI("http://www.cars.com/"), visitDate: microNow - 30*MICROS_PER_DAY});
  yield promiseAddVisits({uri: NetUtil.newURI("http://www.cars.com/"), visitDate: microNow - 30*MICROS_PER_DAY});

  // run the service test for Migration, since the database was created
  // we should have populated interests database from history
  yield iServiceObject._checkForMigration();

  // check that you have correct buckets
  yield InterestsStorage.getBucketsForInterests(["cars"]).then(data => {
        do_check_eq(data["cars"]["immediate"], 1);
        do_check_eq(data["cars"]["recent"], 2);
        do_check_eq(data["cars"]["past"], 3);
  });
});

