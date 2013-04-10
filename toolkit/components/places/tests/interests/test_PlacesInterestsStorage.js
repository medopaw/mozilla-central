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
  yield promiseAddUrlInterestsVisit("http://www.cars.com/", ["cars","movies","shopping"], 2);
  yield promiseAddUrlInterestsVisit("http://www.samsung.com/", "consumer-electronics");
  yield promiseAddUrlInterestsVisit("http://www.mozilla.org/", "computers");

  // test promise returning results functionality
  yield PlacesInterestsStorage.getInterestsForHost("cars.com").then(function(results) {
    do_check_eq(results.length , 3);
    do_check_true(itemsHave(results,"cars"));
    do_check_true(itemsHave(results,"movies"));
    do_check_true(itemsHave(results,"shopping"));
  });

  yield PlacesInterestsStorage.getHostsForInterest("computers").then(function(results) {
    do_check_eq(results.length , 1);
    do_check_true(itemsHave(results,"mozilla.org"));
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
  for(let i = 0; i < 100; i++) {
    yield promiseAddUrlInterestsVisit("http://www.cars.com/", "cars", 1, i);
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
  yield promiseAddInterestVisits("cars");
  yield PlacesInterestsStorage.getBucketsForInterest("cars").then(function(results) {
    do_check_eq(results.immediate , 1);
    do_check_eq(results.recent , 0);
    do_check_eq(results.past , 0);
  });

  // add a couple more yesterday
  yield promiseAddInterestVisits("cars", 4, 1);
  yield PlacesInterestsStorage.getBucketsForInterest("cars").then(function(results) {
    do_check_eq(results.immediate , 5);
    do_check_eq(results.recent , 0);
    do_check_eq(results.past , 0);
  });

  // add some in the recent bucket, some in the past
  // recent assumed to be 14-28 days ago, past > 28 days
  yield promiseAddInterestVisits("cars", 3, 15);
  yield promiseAddInterestVisits("cars", 10, 31);
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

  yield promiseAddUrlInterestsVisit("http://www.cars.com/", ["cars","shopping"]);
  yield promiseAddUrlInterestsVisit("http://www.samsung.com/", "computers");
  yield promiseAddUrlInterestsVisit("http://www.mozilla.org/", ["cars","computers"]);
  yield promiseAddUrlInterestsVisit("http://www.netflix.com/", "movies");

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

add_task(function test_PlacesInterestsStorageMostFrecentHosts() {
  yield promiseClearHistory();
  yield PlacesInterestsStorage.clearInterestsHosts();
  yield promiseAddUrlInterestsVisit("http://www.baz.com","cars");

  yield promiseAddUrlInterestsVisit("http://www.bar.com","cars");
  yield promiseAddUrlInterestsVisit("http://www.bar.com","cars");

  yield promiseAddUrlInterestsVisit("http://www.foo.com","cars");
  yield promiseAddUrlInterestsVisit("http://www.foo.com","cars");
  yield promiseAddUrlInterestsVisit("http://www.foo.com","cars");

  yield promiseAddUrlInterestsVisit("http://www.foobar.com","cars");
  yield promiseAddUrlInterestsVisit("http://www.foobar.com","cars");
  yield promiseAddUrlInterestsVisit("http://www.foobar.com","cars");
  yield promiseAddUrlInterestsVisit("http://www.foobar.com","cars");

  // moz_hosts table now looks like this
  // id|name|frecency
  // 1|baz.com|100
  // 2|bar.com|200
  // 3|foo.com|300
  // 4|foobar.com|400
  yield PlacesInterestsStorage.getHostsForInterest("cars").then(function(results) {
    do_check_eq(results.length , 4);
    do_check_true(itemsHave(results,"foobar.com"));
    do_check_true(itemsHave(results,"foo.com"));
    do_check_true(itemsHave(results,"bar.com"));
    do_check_true(itemsHave(results,"baz.com"));
  });

  yield PlacesInterestsStorage.clearInterestsHosts();

  // now attempt to insert only those who fall into 3 most frecent
  yield PlacesInterestsStorage.addInterestForHost("cars","foobar.com",1);
  yield PlacesInterestsStorage.addInterestForHost("cars","foo.com",1);
  yield PlacesInterestsStorage.addInterestForHost("cars","bar.com",1);
  yield PlacesInterestsStorage.addInterestForHost("cars","baz.com",1);

  yield PlacesInterestsStorage.getHostsForInterest("cars").then(function(results) {
    do_check_eq(results.length , 1);
    do_check_true(itemsHave(results,"foobar.com"));
  });

  yield PlacesInterestsStorage.addInterestForHost("cars","foobar.com",2);
  yield PlacesInterestsStorage.addInterestForHost("cars","foo.com",2);
  yield PlacesInterestsStorage.addInterestForHost("cars","bar.com",2);
  yield PlacesInterestsStorage.addInterestForHost("cars","baz.com",2);
  yield PlacesInterestsStorage.getHostsForInterest("cars").then(function(results) {
    do_check_eq(results.length , 2);
    do_check_true(itemsHave(results,"foobar.com"));
    do_check_true(itemsHave(results,"foo.com"));
  });

  yield PlacesInterestsStorage.addInterestForHost("cars","foobar.com",3);
  yield PlacesInterestsStorage.addInterestForHost("cars","foo.com",3);
  yield PlacesInterestsStorage.addInterestForHost("cars","bar.com",3);
  yield PlacesInterestsStorage.addInterestForHost("cars","baz.com",3);
  yield PlacesInterestsStorage.getHostsForInterest("cars").then(function(results) {
    do_check_eq(results.length , 3);
    do_check_true(itemsHave(results,"foobar.com"));
    do_check_true(itemsHave(results,"foo.com"));
    do_check_true(itemsHave(results,"bar.com"));
  });

  yield PlacesInterestsStorage.addInterestForHost("cars","foobar.com",4);
  yield PlacesInterestsStorage.addInterestForHost("cars","foo.com",4);
  yield PlacesInterestsStorage.addInterestForHost("cars","bar.com",4);
  yield PlacesInterestsStorage.addInterestForHost("cars","baz.com",4);
  yield PlacesInterestsStorage.getHostsForInterest("cars").then(function(results) {
    do_check_eq(results.length , 4);
    do_check_true(itemsHave(results,"foobar.com"));
    do_check_true(itemsHave(results,"foo.com"));
    do_check_true(itemsHave(results,"bar.com"));
    do_check_true(itemsHave(results,"baz.com"));
  });

});
