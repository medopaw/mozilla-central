/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

add_task(function test_checkSharable()
{
  yield promiseAddInterestsVisit("http://www.samsung.com/", "computers");
  yield promiseAddInterestsVisit("http://www.netflix.com/", "movies");

  // Sanity check that diversity is computed for both
  yield gInterestsStorage.getHostCountsForInterests(["computers","movies"]).then(function(results) {
    do_check_eq(results["computers"] , 1);
    do_check_eq(results["movies"] , 1);
  });
  yield gInterestsStorage.getHostCountsForInterests(["computers","movies"], {
    checkSharable: true,
  }).then(function(results) {
    do_check_eq(results["computers"] , 1);
    do_check_eq(results["movies"] , 1);
  });
  yield gInterestsStorage.getHostCountsForInterests(["computers","movies"], {
    checkSharable: false,
  }).then(function(results) {
    do_check_eq(results["computers"] , 1);
    do_check_eq(results["movies"] , 1);
  });

  // Unshare one interest with no change
  yield gInterestsStorage.setInterest("movies", {sharable: false});
  yield gInterestsStorage.getHostCountsForInterests(["computers","movies"]).then(function(results) {
    do_check_eq(results["computers"] , 1);
    do_check_eq(results["movies"] , 1);
  });

  // Explicitly factor in the sharability
  yield gInterestsStorage.getHostCountsForInterests(["computers","movies"], {
    checkSharable: true,
  }).then(function(results) {
    do_check_eq(results["computers"] , 1);
    do_check_eq(results["movies"] , 0);
  });

  // Sanity check with explicit false check
  yield gInterestsStorage.getHostCountsForInterests(["computers","movies"], {
    checkSharable: false,
  }).then(function(results) {
    do_check_eq(results["computers"] , 1);
    do_check_eq(results["movies"] , 1);
  });
});

add_task(function test_gInterestsStorageGetHostCount()
{
  yield promiseClearHistory();

  yield promiseAddInterestsVisit("http://www.cars.com/", ["cars","shopping"]);
  yield promiseAddInterestsVisit("http://www.samsung.com/", "computers");
  yield promiseAddInterestsVisit("http://www.mozilla.org/", ["cars","computers"]);
  yield promiseAddInterestsVisit("http://www.netflix.com/", "movies");

  yield gInterestsStorage.getHostCountsForInterests(["cars","computers","movies","shopping"]).then(function(results) {
    do_check_eq(results["cars"] , 2);
    do_check_eq(results["computers"] , 2);
    do_check_eq(results["movies"] , 1);
    do_check_eq(results["shopping"] , 1);
  });

  yield gInterestsStorage.getHostCountsForInterests(["cars"]).then(function(results) {
    do_check_eq(results["cars"] , 2);
  });
});

add_task(function test_gInterestsStorageGetHostCountForManyHosts()
{
  yield promiseClearHistory();
  yield promiseClearInterests();

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
  yield gInterestsStorage.getHostCountsForInterests(["cars","computers","movies","shopping"]).then(function(results) {
    do_check_eq(Object.keys(results).length, 3);
    do_check_eq(results["cars"] , 10);
    do_check_eq(results["movies"] , 10);
    do_check_eq(results["shopping"], 30);
  });

});
