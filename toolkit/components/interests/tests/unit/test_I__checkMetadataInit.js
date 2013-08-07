/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/commonjs/sdk/core/promise.js");

const kInterests = ["Android", "Apple", "Arts", "Autos", "Baseball", "Basketball",
"Boxing", "Business", "Cooking", "Design", "Do-It-Yourself", "Entrepreneur",
"Fashion-Men", "Fashion-Women", "Football", "Gardening", "Golf", "Gossip",
"Health-Men", "Health-Women", "Hockey", "Home-Design", "Humor", "Ideas",
"Mixed-Martial-Arts", "Movies", "Music", "Parenting", "Photography", "Politics",
"Programming", "Science", "Soccer", "Sports", "Technology", "Tennis", "Travel",
"Television", "Video-Games", "Weddings"];

function run_test() {
  run_next_test();
}

add_task(function test_I__checkMetadataInit() {
  // no metadata
  yield InterestsStorage.getInterests(kInterests).then(data => {
    do_check_eq(0, Object.keys(data).length)
  });
  yield iServiceObject._checkForMigration();

  // metadata populated
  yield InterestsStorage.getInterests(kInterests).then(data => {
    do_check_eq(kInterests.length, Object.keys(data).length);
  });
});
