/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/PlacesInterestsStorage.jsm");

const kInterests = ["arts", "banking", "blogging", "business", "career",
"cars", "clothes", "computers", "consumer-electronics", "cuisine", "dance",
"discounts", "drinks", "education", "email", "entertainment", "family",
"fashion", "finance", "food", "games", "government", "health", "history",
"hobby", "home", "image-sharing", "law", "maps", "marketing", "men",
"motorcycles", "movies", "music", "news", "outdoors", "pets", "photography",
"politics", "radio", "reading", "real-estate", "reference", "relationship",
"religion", "reviews", "science", "shoes", "shopping", "society", "sports",
"technology", "travel", "tv", "video-games", "weather", "women", "writing"];

function run_test() {
  run_next_test();
}

add_task(function test_getPagePayload() {
  yield addInterest("computers");
  yield addInterest("real-estate");

  yield promiseAddUrlInterestsVisit("http://techmeme.com", ["computers"], 1, 1);
  yield promiseAddUrlInterestsVisit("http://realtor.com", ["real-estate"], 2, 13);
  yield promiseAsyncUpdates();

  let expected = yield iServiceObject.getInterestsByNamespace("", {
    checkSharable: false,
    excludeMeta: false,
    interestLimit: kInterests.length,
    roundDiversity: true,
    roundRecency: true,
    roundScore: true,
    requestingHost: "www.foo.com",
  });

  let results = yield iServiceObject.getPagePayload();
  dump(JSON.stringify(results) + " <<<<<<<<<<<<===\n");
  isIdentical(expected, results.interestsProfile);
  isIdentical({"computers":[{"host":"techmeme.com","frecency":100}],"real-estate":[{"host":"realtor.com","frecency":100}]}, results.interestsHosts);

  // limiting interests
  let results = yield iServiceObject.getPagePayload(1);
  isIdentical(expected.slice(0,1), results.interestsProfile);
  isIdentical({"real-estate":[{"host":"realtor.com","frecency":100}]}, results.interestsHosts);

  // chek requesting sites
  do_check_eq(results.requestingSites[0].name,"www.foo.com");
  do_check_eq(results.requestingSites[0].isBlocked,false);
});

add_task(function test_setInterestSharable() {
  let expected = yield iServiceObject.getInterestsByNamespace("", {
    checkSharable: false,
    excludeMeta: false,
    interestLimit: kInterests.length,
    roundDiversity: true,
    roundRecency: true,
    roundScore: true,
  });
  expected = expected.slice(0,1);

  // verify that the interest is sharable
  let results = yield iServiceObject.getPagePayload(1);
  do_check_true(expected[0].meta.sharable == 1);
  isIdentical(expected, results.interestsProfile);

  // set sharable to false
  dump("set sharable to false\n");
  yield iServiceObject.setInterestSharable(expected[0].name, false);
  expected[0].meta.sharable = 0;
  let results = yield iServiceObject.getPagePayload(1);
  isIdentical(expected, results.interestsProfile);

  // set sharable to true again
  yield iServiceObject.setInterestSharable(expected[0].name, true);
  expected[0].meta.sharable = 1;
  let results = yield iServiceObject.getPagePayload(1);
  isIdentical(expected, results.interestsProfile);
});
