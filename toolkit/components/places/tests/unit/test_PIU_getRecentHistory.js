/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

Cu.import("resource://gre/modules/PlacesInterestsUtils.jsm");
const MICROS_PER_DAY = 86400000000;

function run_test() {
  run_next_test();
}

add_task(function test_GetRecentHistory()
{
  let now = Date.now();
  let today = PlacesInterestsUtils._convertDateToDays(now);
  let microNow = now * 1000;
  yield promiseClearHistory();
  yield promiseAddVisits({uri: NetUtil.newURI("http://www.cars.com/"), visitDate: microNow});
  yield promiseAddVisits({uri: NetUtil.newURI("http://www.cars.com/"), visitDate: microNow - 1000});
  yield promiseAddVisits({uri: NetUtil.newURI("http://www.cars.com/"), visitDate: microNow - 2000});
  yield promiseAddVisits({uri: NetUtil.newURI("http://www.cars.com/"), visitDate: microNow - MICROS_PER_DAY + 1000});
  yield promiseAddVisits({uri: NetUtil.newURI("http://www.cars.com/"), visitDate: microNow - MICROS_PER_DAY + 10000});
  yield promiseAddVisits({uri: NetUtil.newURI("http://www.cars.com/"), visitDate: microNow - 2*MICROS_PER_DAY});
  yield promiseAddVisits({uri: NetUtil.newURI("http://www.cars.com/"), visitDate: microNow - 2*MICROS_PER_DAY});
  yield promiseAddVisits({uri: NetUtil.newURI("http://www.cars.com/"), visitDate: microNow - 2*MICROS_PER_DAY});

  let results = {};

  yield PlacesInterestsUtils.getRecentHistory(3, function(oneRecord) {
    // make sure oneRecord looks kosher
    do_check_eq(oneRecord.id, 1);
    do_check_eq(oneRecord.url, "http://www.cars.com/");
    do_check_eq(oneRecord.title, "test visit for http://www.cars.com/");
    do_check_true(oneRecord.visitDate != null);
    do_check_true(oneRecord.visitCount != null);
    let day = PlacesInterestsUtils._convertDateToDays(oneRecord.visitDate);
    results[day] = oneRecord.visitCount;
  }).then(function() {
    // make sure we have:
    // 3 visits for 2 days ago
    // 2 visits for 1 day ago
    // 1 visit for today
    do_check_eq(Object.keys(results).length, 3);
    do_check_eq(results[today], 3);
    do_check_eq(results[today - 1], 2);
    do_check_eq(results[today - 2], 3);
  });

  yield PlacesInterestsUtils.getRecentHistory(1, function(oneRecord) {
    //we should only see one record
    do_check_eq(oneRecord.id, 1);
    do_check_eq(oneRecord.url, "http://www.cars.com/");
    do_check_eq(oneRecord.title, "test visit for http://www.cars.com/");
    do_check_eq(oneRecord.visitCount,3);
    do_check_eq(oneRecord.visitDate,today*MS_PER_DAY);
  });

  yield PlacesInterestsUtils.getRecentHistory(0, function(oneRecord) {
    // we should not ever be here
    do_check_true(false);
  });

});

add_task(function test_GetRecentHistoryChunked()
{
  yield promiseClearHistory();
  let now = Date.now();
  let today = PlacesInterestsUtils._convertDateToDays(now);
  let microNow = now * 1000;
  let visits = [];
  for (let i = 0; i<5; i++) {
    visits.push({uri: NetUtil.newURI("http://www.cars.com/" + i), visitDate: microNow - MICROS_PER_DAY * i});
  }
  yield promiseAddVisits(visits);

  yield PlacesInterestsUtils.getRecentHistory(20,null,{chunkSize: 10}).then(results => {
    do_check_eq(results.length, 5);
    do_check_eq(results[0].id,1);
    do_check_eq(results[0].url,"http://www.cars.com/0");
    do_check_eq(results[4].id,5);
    do_check_eq(results[4].url,"http://www.cars.com/4");
  });

  yield PlacesInterestsUtils.getRecentHistory(20,null,{chunkSize: 2,lastPlacesId: 1}).then(results => {
    do_check_eq(results.length, 2);
    do_check_eq(results[0].id,2);
    do_check_eq(results[0].url,"http://www.cars.com/1");
    do_check_eq(results[1].id,3);
    do_check_eq(results[1].url,"http://www.cars.com/2");
  });

  yield PlacesInterestsUtils.getRecentHistory(20,null,{chunkSize: 5,lastPlacesId: 5}).then(results => {
    do_check_eq(results.length, 0);
  });

});
