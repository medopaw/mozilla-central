/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/PlacesInterestsStorage.jsm");

function run_test() {
  run_next_test();
}

add_task(function test_PlacesInterestsStorage()
{
  yield promiseAddVisits(NetUtil.newURI("http://www.cars.com/"));
  yield promiseAddVisits(NetUtil.newURI("http://www.mozilla.org/"));
  yield promiseAddVisits(NetUtil.newURI("http://www.netflix.com/"));
  yield promiseAddVisits(NetUtil.newURI("http://www.samsung.com/"));

  yield PlacesInterestsStorage.addInterest("cars");
  yield PlacesInterestsStorage.addInterest("computers");
  yield PlacesInterestsStorage.addInterest("movies");
  yield PlacesInterestsStorage.addInterest("shopping");
  yield PlacesInterestsStorage.addInterest("consumer-electronics");

  yield PlacesInterestsStorage.addInterestVisit("cars");
  yield PlacesInterestsStorage.addInterestVisit("cars");
  yield PlacesInterestsStorage.addInterestVisit("computers");

  yield PlacesInterestsStorage.addInterestForHost("computers","samsung.com");
  yield PlacesInterestsStorage.addInterestForHost("computers","mozilla.org");
  yield PlacesInterestsStorage.addInterestForHost("cars","cars.com");
  yield PlacesInterestsStorage.addInterestForHost("movies","cars.com");
  yield PlacesInterestsStorage.addInterestForHost("shopping","cars.com");

  function itemsHave(items,data) {
    for (let i in items) {
      if(items[i] == data) return true;
    }
    return false;
  };

  // test promise returning results functionality
  yield PlacesInterestsStorage.getInterestsForHost("cars.com").then(function(results) {
    do_check_eq(results.length , 3);
    do_check_true(itemsHave(results,"cars"));
    do_check_true(itemsHave(results,"movies"));
    do_check_true(itemsHave(results,"shopping"));
  });

  yield PlacesInterestsStorage.getHostsForInterest("computers").then(function(results) {
    do_check_eq(results.length , 2);
    do_check_true(itemsHave(results,"mozilla.org"));
    do_check_true(itemsHave(results,"samsung.com"));
  });

  // make sure we are getting correct counts in the buckets
  yield PlacesInterestsStorage.getBucketsForInterest("computers").then(function(results) {
    do_check_eq(results.immediate , 1);
  });

  yield PlacesInterestsStorage.getBucketsForInterest("cars").then(function(results) {
    do_check_eq(results.immediate, 2);
  });

});

add_task(function test_PlacesInterestsStorageClearTables()
{
  // cleanup the tables
  yield PlacesInterestsStorage.clearRecentInterests(100);
  yield PlacesInterestsStorage.clearInterestsHosts();

  // check that tables are empty
  yield PlacesInterestsStorage.getBucketsForInterest("computers").then(function(results) {
    do_check_eq(results.immediate , 0);
    do_check_eq(results.past , 0);
    do_check_eq(results.recent , 0);
  });

  yield PlacesInterestsStorage.getBucketsForInterest("cars").then(function(results) {
    do_check_eq(results.immediate , 0);
    do_check_eq(results.past , 0);
    do_check_eq(results.recent , 0);
  });

  yield PlacesInterestsStorage.getInterestsForHost("cars.com").then(function(results) {
    do_check_true(results == null);
  });

  // make a bunch of insertions for a number of days
  const MS_PER_DAY = 86400000;
  let now = Date.now();

  for(let i = 0; i < 100; i++) {
    yield PlacesInterestsStorage.addInterestVisit("cars", {visitTime: (now - MS_PER_DAY*i)});
    yield PlacesInterestsStorage.addInterestForHost("cars","cars.com",(now - MS_PER_DAY*i));
  }

  yield PlacesInterestsStorage.getBucketsForInterest("cars").then(function(results) {
    do_check_eq(results.immediate , 14);
    do_check_eq(results.recent , 14);
    do_check_eq(results.past , 72);
  });

  yield PlacesInterestsStorage.getHostsForInterest("cars").then(function(results) {
    do_check_eq(results.length , 1);
    do_check_eq(results[0] , "cars.com");
  });

  // test deletions
  yield PlacesInterestsStorage.clearRecentInterests(14);

  yield PlacesInterestsStorage.getBucketsForInterest("cars").then(function(results) {
    do_check_eq(results.immediate , 0);
    do_check_eq(results.recent , 14);
    do_check_eq(results.past , 72);
  });

  yield PlacesInterestsStorage.getHostsForInterest("cars").then(function(results) {
    do_check_eq(results.length , 1);
    do_check_eq(results[0] , "cars.com");
  });

  yield PlacesInterestsStorage.clearRecentInterests(28);

  yield PlacesInterestsStorage.getBucketsForInterest("cars").then(function(results) {
    do_check_eq(results.immediate , 0);
    do_check_eq(results.recent , 0);
    do_check_eq(results.past , 72);
  });

  yield PlacesInterestsStorage.clearRecentInterests(50);

  yield PlacesInterestsStorage.getBucketsForInterest("cars").then(function(results) {
    do_check_eq(results.immediate , 0);
    do_check_eq(results.recent , 0);
    do_check_eq(results.past , 50);
  });

  yield PlacesInterestsStorage.clearRecentInterests(100);

  yield PlacesInterestsStorage.getBucketsForInterest("cars").then(function(results) {
    do_check_eq(results.immediate , 0);
    do_check_eq(results.recent , 0);
    do_check_eq(results.past , 0);
  });

  yield PlacesInterestsStorage.clearRecentInterests(100);

  // test visitCounts when adding visits

  // add one today
  yield PlacesInterestsStorage.addInterestVisit("cars", {visitTime: (now - MS_PER_DAY*0)});
  yield PlacesInterestsStorage.getBucketsForInterest("cars").then(function(results) {
    do_check_eq(results.immediate , 1);
    do_check_eq(results.recent , 0);
    do_check_eq(results.past , 0);
  });

  // add a couple more yesterday
  yield PlacesInterestsStorage.addInterestVisit("cars", {visitTime: (now - MS_PER_DAY*1), visitCount: 4});
  yield PlacesInterestsStorage.getBucketsForInterest("cars").then(function(results) {
    do_check_eq(results.immediate , 5);
    do_check_eq(results.recent , 0);
    do_check_eq(results.past , 0);
  });

  // add some in the recent bucket, some in the past
  // recent assumed to be 14-28 days ago, past > 28 days
  yield PlacesInterestsStorage.addInterestVisit("cars", {visitTime: (now - MS_PER_DAY*15), visitCount: 3});
  yield PlacesInterestsStorage.addInterestVisit("cars", {visitTime: (now - MS_PER_DAY*31), visitCount: 10});
  yield PlacesInterestsStorage.getBucketsForInterest("cars").then(function(results) {
    do_check_eq(results.immediate , 5);
    do_check_eq(results.recent , 3);
    do_check_eq(results.past , 10);
  });

  yield PlacesInterestsStorage.clearInterestsHosts();
  yield PlacesInterestsStorage.getInterestsForHost("cars.com").then(function(results) {
    do_check_true(results == null);
  });

});

add_task(function test_PlacesInterestsStorageResubmitHistory()
{
  const MICROS_PER_DAY = 86400000000;
  let now = Date.now();
  let microNow = now * 1000;
  yield promiseClearHistory();
  yield promiseAddVisits({uri: NetUtil.newURI("http://www.cars.com/"), visitDate: microNow});
  yield promiseAddVisits({uri: NetUtil.newURI("http://www.cars.com/"), visitDate: microNow - MICROS_PER_DAY});
  yield promiseAddVisits({uri: NetUtil.newURI("http://www.cars.com/"), visitDate: microNow - MICROS_PER_DAY});
  yield promiseAddVisits({uri: NetUtil.newURI("http://www.cars.com/"), visitDate: microNow - 2*MICROS_PER_DAY});
  yield promiseAddVisits({uri: NetUtil.newURI("http://www.cars.com/"), visitDate: microNow - 2*MICROS_PER_DAY});
  yield promiseAddVisits({uri: NetUtil.newURI("http://www.cars.com/"), visitDate: microNow - 2*MICROS_PER_DAY});

  let results = {};

  yield PlacesInterestsStorage.reprocessRecentHistoryVisits(3,function(oneRecord) {
    // make sure oneRecord looks kosher
    do_check_eq(oneRecord.url, "http://www.cars.com/");
    do_check_eq(oneRecord.title, "test visit for http://www.cars.com/");
    do_check_true(oneRecord.visitDate != null);
    do_check_true(oneRecord.visitCount != null);
    results[oneRecord.visitDate] = oneRecord.visitCount;
  }).then(function() {
    // make sure we have:
    // 3 visits for 2 days ago
    // 2 visits for 1 day ago
    // 1 visit for today
    do_check_eq(Object.keys(results).length, 3);
    do_check_eq(results["" + PlacesInterestsStorage._getRoundedTime(now)], 1);
    do_check_eq(results["" + PlacesInterestsStorage._getRoundedTime(now-MICROS_PER_DAY/1000)], 2);
    do_check_eq(results["" + PlacesInterestsStorage._getRoundedTime(now-2*MICROS_PER_DAY/1000)], 3);
  });

});


add_task(function test_PlacesInterestsStorageGetDiversity()
{
  yield promiseClearHistory();
  yield PlacesInterestsStorage.clearInterestsHosts();
  yield promiseAddVisits(NetUtil.newURI("http://www.cars.com/"));
  yield promiseAddVisits(NetUtil.newURI("http://www.mozilla.org/"));
  yield promiseAddVisits(NetUtil.newURI("http://www.netflix.com/"));
  yield promiseAddVisits(NetUtil.newURI("http://www.samsung.com/"));

  yield PlacesInterestsStorage.addInterest("cars");
  yield PlacesInterestsStorage.addInterest("computers");
  yield PlacesInterestsStorage.addInterest("movies");
  yield PlacesInterestsStorage.addInterest("shopping");

  yield PlacesInterestsStorage.addInterestForHost("computers","samsung.com");
  yield PlacesInterestsStorage.addInterestForHost("computers","mozilla.org");
  yield PlacesInterestsStorage.addInterestForHost("cars","cars.com");
  yield PlacesInterestsStorage.addInterestForHost("movies","netflix.com");
  yield PlacesInterestsStorage.addInterestForHost("shopping","samsung.com");
  yield PlacesInterestsStorage.addInterestForHost("cars","samsung.com");

  yield PlacesInterestsStorage.getDiversityForInterests(["cars","computers","movies","shopping"]).then(function(results) {
    do_check_eq(results["cars"] , 50);
    do_check_eq(results["computers"] , 50);
    do_check_eq(results["movies"] , 25);
    do_check_eq(results["shopping"] , 25);
  });

  yield PlacesInterestsStorage.getDiversityForInterests(["cars"]).then(function(results) {
    do_check_eq(results["cars"] , 50);
  });
});

