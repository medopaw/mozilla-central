/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");

function run_test() {
  run_next_test();
}

add_task(function test_checkSharable() {
});

add_task(function test_excludeMeta() {
});

add_task(function test_interestLimit() {
});

add_task(function test_roundDiversity() {
});

add_task(function test_roundScore() {
});

add_task(function test_getEmptyNamespace()
{
  yield addInterest("cars");
  yield addInterest("computers");
  yield addInterest("movies");
  yield addInterest("technology");
  yield addInterest("video-games");
  yield addInterest("history");

  // make a bunch of insertions for a number of days
  let now = Date.now();
  let results;

  // no visits, empty results
  results = yield iServiceObject.getInterestsByNamespace("", {
    checkSharable: true,
    excludeMeta: true,
    roundDiversity: true,
  });
  checkScores([], 5, results);

  // add visit
  yield InterestsStorage.addInterestHostVisit("technology", "samsung.com", {visitTime: (now - MS_PER_DAY*0)});
  results = yield iServiceObject.getInterestsByNamespace("", {
    checkSharable: true,
    excludeMeta: true,
    roundDiversity: false,
  });
  checkScores([
    {"name":"technology","score":1,"diversity":1},
  ], 4, results);

  // add another visit for the same category, same day
  yield InterestsStorage.addInterestHostVisit("technology", "mozilla.org", {visitTime: (now - MS_PER_DAY*1)});
  results = yield iServiceObject.getInterestsByNamespace("", {
    checkSharable: true,
    excludeMeta: true,
    roundDiversity: false,
  });
  checkScores([
    {"name":"technology","score":2,"diversity":2},
  ], 4, results);

  // add 3 visits for another category, same day, new top interest
  yield InterestsStorage.addInterestHostVisit("cars", "cars.com", {visitTime: (now - MS_PER_DAY*1)});
  yield InterestsStorage.addInterestHostVisit("cars", "cars.com", {visitTime: (now - MS_PER_DAY*2)});
  yield InterestsStorage.addInterestHostVisit("cars", "cars.com", {visitTime: (now - MS_PER_DAY*3)});
  results = yield iServiceObject.getInterestsByNamespace("", {
    checkSharable: true,
    excludeMeta: true,
    roundDiversity: true,
  });
  checkScores([
      {"name":"cars","score":3,"diversity":50},
      {"name":"technology","score":2,"diversity":100},
  ], 3, results);

  // add visits for another category, one day ago
  yield InterestsStorage.addInterestHostVisit("movies", "netflix.com", {visitTime: (now - MS_PER_DAY*1)});
  results = yield iServiceObject.getInterestsByNamespace("", {
    checkSharable: true,
    excludeMeta: true,
    roundDiversity: true,
  });
  checkScores([
      {"name":"cars","score":3,"diversity":50},
      {"name":"technology","score":2,"diversity":100},
      {"name":"movies","score":1,"diversity":50},
  ], 2, results);

  // get top 2 visits, test result limiting
  results = yield iServiceObject.getInterestsByNamespace("", {
    checkSharable: true,
    excludeMeta: true,
    roundDiversity: true,
    interestLimit: 2,
  });
  checkScores([
      {"name":"cars","score":3,"diversity":50},
      {"name":"technology","score":2,"diversity":100},
  ], 0, results);

  // add visits to the same category over multiple days
  yield InterestsStorage.addInterestHostVisit("video-games", "neogaf.com", {visitTime: (now - MS_PER_DAY*5)});
  yield InterestsStorage.addInterestHostVisit("video-games", "foo.com", {visitTime: (now - MS_PER_DAY*6)});
  yield InterestsStorage.addInterestHostVisit("video-games", "foo.com", {visitTime: (now - MS_PER_DAY*25)});
  results = yield iServiceObject.getInterestsByNamespace("", {
    checkSharable: true,
    excludeMeta: true,
    roundDiversity: true,
  });
  checkScores([
      {"name":"cars","score":3,"diversity":50},
      {"name":"video-games","score":3,"diversity":100},
      {"name":"technology","score":2,"diversity":100},
      {"name":"movies","score":1,"diversity":50},
  ], 1, results);

  // set ignored for an interest
  yield iServiceObject._setIgnoredForInterest("video-games");
  results = yield iServiceObject.getInterestsByNamespace("", {
    checkSharable: true,
    excludeMeta: true,
    roundDiversity: true,
  });
  checkScores([
      {"name":"cars","score":3,"diversity":50},
      {"name":"technology","score":2,"diversity":100},
      {"name":"movies","score":1,"diversity":50},
  ], 2, results);

  // unset ignored for an interest
  yield iServiceObject._unsetIgnoredForInterest("video-games");
  results = yield iServiceObject.getInterestsByNamespace("", {
    checkSharable: true,
    excludeMeta: true,
    roundDiversity: true,
  });
  checkScores([
      {"name":"cars","score":3,"diversity":50},
      {"name":"video-games","score":3,"diversity":100},
      {"name":"technology","score":2,"diversity":100},
      {"name":"movies","score":1,"diversity":50},
  ], 1, results);

  yield InterestsStorage.clearRecentVisits(100);
  yield InterestsStorage.addInterestHostVisit("history", "history.com", {visitTime: (now - MS_PER_DAY*100)});
  results = yield iServiceObject.getInterestsByNamespace("", {
    checkSharable: true,
    excludeMeta: true,
  });
  checkScores([
      {"name":"history","score":1,"diversity":1},
  ], 4, results);
});

