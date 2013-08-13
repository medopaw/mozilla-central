/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

function run_test() {
  run_next_test();
}

add_task(function test_checkSharable()
{
  yield promiseAddUrlInterestsVisit("http://www.samsung.com/", "computers");
  yield promiseAddUrlInterestsVisit("http://www.netflix.com/", "movies");

  // Sanity check that diversity is computed for both
  yield InterestsStorage.getHostCountsForInterests(["computers","movies"]).then(function(results) {
    do_check_eq(results["computers"] , 1);
    do_check_eq(results["movies"] , 1);
  });
  yield InterestsStorage.getHostCountsForInterests(["computers","movies"], {
    checkSharable: true,
  }).then(function(results) {
    do_check_eq(results["computers"] , 1);
    do_check_eq(results["movies"] , 1);
  });
  yield InterestsStorage.getHostCountsForInterests(["computers","movies"], {
    checkSharable: false,
  }).then(function(results) {
    do_check_eq(results["computers"] , 1);
    do_check_eq(results["movies"] , 1);
  });

  // Unshare one interest with no change
  yield InterestsStorage.setInterest("movies", {sharable: false});
  yield InterestsStorage.getHostCountsForInterests(["computers","movies"]).then(function(results) {
    do_check_eq(results["computers"] , 1);
    do_check_eq(results["movies"] , 1);
  });

  // Explicitly factor in the sharability
  yield InterestsStorage.getHostCountsForInterests(["computers","movies"], {
    checkSharable: true,
  }).then(function(results) {
    do_check_eq(results["computers"] , 1);
    do_check_eq(results["movies"] , 0);
  });

  // Sanity check with explicit false check
  yield InterestsStorage.getHostCountsForInterests(["computers","movies"], {
    checkSharable: false,
  }).then(function(results) {
    do_check_eq(results["computers"] , 1);
    do_check_eq(results["movies"] , 1);
  });
});

add_task(function test_InterestsStorageGetHostCount()
{
  yield promiseClearHistory();
  yield clearInterestsHosts();

  yield promiseAddUrlInterestsVisit("http://www.cars.com/", ["cars","shopping"]);
  yield promiseAddUrlInterestsVisit("http://www.samsung.com/", "computers");
  yield promiseAddUrlInterestsVisit("http://www.mozilla.org/", ["cars","computers"]);
  yield promiseAddUrlInterestsVisit("http://www.netflix.com/", "movies");

  yield InterestsStorage.getHostCountsForInterests(["cars","computers","movies","shopping"]).then(function(results) {
    do_check_eq(results["cars"] , 2);
    do_check_eq(results["computers"] , 2);
    do_check_eq(results["movies"] , 1);
    do_check_eq(results["shopping"] , 1);
  });

  yield InterestsStorage.getHostCountsForInterests(["cars"]).then(function(results) {
    do_check_eq(results["cars"] , 2);
  });
});

add_task(function test_InterestsStorageGetHostCountForManyHosts()
{
  yield promiseClearHistoryAndVisits();

  let sitesData = [];
  function pushSite(site,interest,count) {
    for (let i=0; i<count; i++) {
      sitesData.push({
        url: site,
        interests: interest,
      });
    }
  };

  for (let i = 1; i <= 50; i++) {
    let site = "http://" + i + ".site.com";
    if (i<=10)      pushSite(site,"cars",1);
    else if (i<=20) pushSite(site,"movies",1);
    else             pushSite(site,"shopping",1);
  }

  yield bulkAddInterestVisitsToSite(sitesData);

  // so "cars" and "movies" will have each 10 sites and shopping is 30
  yield InterestsStorage.getHostCountsForInterests(["cars","computers","movies","shopping"]).then(function(results) {
    do_check_eq(Object.keys(results).length, 3);
    do_check_eq(results["cars"] , 10);
    do_check_eq(results["movies"] , 10);
    do_check_eq(results["shopping"], 30);
  });

});
