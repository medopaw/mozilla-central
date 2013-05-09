/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/PlacesInterestsStorage.jsm");

let iServiceObject = Cc["@mozilla.org/places/interests;1"].getService(Ci.nsISupports).wrappedJSObject;

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

add_task(function test_getJSONPayload() {
  Services.prefs.setBoolPref("interests.enabled", false);
  Services.prefs.setBoolPref("interests.enabled", true);
  yield promiseWaitForMetadataInit();
  let expected = yield PlacesInterestsStorage.getInterests(kInterests);
  let results = yield iServiceObject.getJSONPayload();
  isIdentical(expected, JSON.parse(results));
});
