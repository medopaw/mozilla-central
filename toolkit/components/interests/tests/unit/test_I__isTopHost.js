/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

function run_test() {
  run_next_test();
}

add_task(function test_I__isTopHost() {
  yield promiseAddVisitsWithRefresh(["http://www.cars.com/",
                                     "http://www.mozilla.org/",
                                     "http://www.netflix.com/",
                                     "http://www.samsung.com/"]);

  do_check_true(iServiceObject._isTopHost("cars.com"));
  do_check_true(iServiceObject._isTopHost("mozilla.org"));
  do_check_true(iServiceObject._isTopHost("netflix.com"));
  do_check_true(iServiceObject._isTopHost("samsung.com"));
  do_check_false(iServiceObject._isTopHost("foo.com"));
});
