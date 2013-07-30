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
  yield InterestsStorage.getDiversityForInterests(["computers","movies"]).then(function(results) {
    do_check_eq(results["computers"] , 50);
    do_check_eq(results["movies"] , 50);
  });
  yield InterestsStorage.getDiversityForInterests(["computers","movies"], {
    checkSharable: true,
  }).then(function(results) {
    do_check_eq(results["computers"] , 50);
    do_check_eq(results["movies"] , 50);
  });
  yield InterestsStorage.getDiversityForInterests(["computers","movies"], {
    checkSharable: false,
  }).then(function(results) {
    do_check_eq(results["computers"] , 50);
    do_check_eq(results["movies"] , 50);
  });

  // Unshare one interest with no change
  yield InterestsStorage.setInterest("movies", {sharable: false});
  yield InterestsStorage.getDiversityForInterests(["computers","movies"]).then(function(results) {
    do_check_eq(results["computers"] , 50);
    do_check_eq(results["movies"] , 50);
  });

  // Explicitly factor in the sharability
  yield InterestsStorage.getDiversityForInterests(["computers","movies"], {
    checkSharable: true,
  }).then(function(results) {
    do_check_eq(results["computers"] , 50);
    do_check_eq(results["movies"] , 0);
  });

  // Sanity check with explicit false check
  yield InterestsStorage.getDiversityForInterests(["computers","movies"], {
    checkSharable: false,
  }).then(function(results) {
    do_check_eq(results["computers"] , 50);
    do_check_eq(results["movies"] , 50);
  });
});

add_task(function test_InterestsStorageGetDiversity()
{
  yield promiseClearHistory();
  yield clearInterestsHosts();

  yield promiseAddUrlInterestsVisit("http://www.cars.com/", ["cars","shopping"]);
  yield promiseAddUrlInterestsVisit("http://www.samsung.com/", "computers");
  yield promiseAddUrlInterestsVisit("http://www.mozilla.org/", ["cars","computers"]);
  yield promiseAddUrlInterestsVisit("http://www.netflix.com/", "movies");

  yield InterestsStorage.getDiversityForInterests(["cars","computers","movies","shopping"]).then(function(results) {
    do_check_eq(results["cars"] , 50);
    do_check_eq(results["computers"] , 50);
    do_check_eq(results["movies"] , 25);
    do_check_eq(results["shopping"] , 25);
  });

  yield InterestsStorage.getDiversityForInterests(["cars"]).then(function(results) {
    do_check_eq(results["cars"] , 50);
  });
});

add_task(function test_InterestsStorageGetDiversityForManyHosts()
{
  yield promiseClearHistory();
  yield clearInterestsHosts();

  let sitesData = [];
  function pushSite(site,interest,count) {
    for (let i=0; i<count; i++) {
      sitesData.push({
        url: site,
        interests: interest,
      });
    }
  };

  for (let i = 1; i <= 200; i++) {
    let site = "http://" + i + ".site.com";
    if (i<=50)      pushSite(site,"cars",1);
    else if (i<=100) pushSite(site,"movies",1);
    else             pushSite(site,"shopping",1);
  }

  yield bulkAddInterestVisitsToSite(sitesData);

  // so "cars" and "movies" will have each 100 sites in the interests_hosts tables
  // however, shopping should have no entry, since it's sites frecencies will lower
  // 200 previous sites.  Diversity for cars must be = diversity for movies = 50
  // shopping diversity must be 0
  yield InterestsStorage.getDiversityForInterests(["cars","computers","movies","shopping"]).then(function(results) {
    dump(JSON.stringify(results) + " <<<<<<<<<\n");
    do_check_eq(Object.keys(results).length, 4);
    do_check_eq(results["cars"] , 25);
    do_check_eq(results["movies"] , 25);
    do_check_eq(results["shopping"], 50);
    do_check_eq(results["computers"], 0);
  });

});
