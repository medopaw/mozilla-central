/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/InterestsDatabase.jsm");

function run_test() {
  run_next_test();
}

add_task(function test_ID_tableCreation()
{
 let db = yield InterestsDatabase.DBConnectionPromise;
 do_check_true(yield db.tableExists("moz_interests"));
 do_check_true(yield db.tableExists("moz_interests_hosts"));
 do_check_true(yield db.tableExists("moz_interests_visits"));
 do_check_true(yield db.tableExists("moz_interests_shared"));
 do_check_true(yield db.tableExists("moz_interests_frecent_hosts"));
});
