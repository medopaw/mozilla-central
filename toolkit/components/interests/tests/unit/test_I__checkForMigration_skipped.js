/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/commonjs/sdk/core/promise.js");

add_task(function test_I__checkForMigration_skipped() {

  // copy empty.interests.database.sqlite to profile directory
  let file = do_get_file("empty.interests.database.sqlite");
  file.copyToFollowingLinks(gProfD, "interests.sqlite");

  let interestsStorage = yield iServiceObject.InterestsStoragePromise;

  // nothing will be selected as the interests table is empty
  yield interestsStorage.getScoresForInterests(["Autos"]).then(data => {
    isIdentical(data, []);
  });
});

