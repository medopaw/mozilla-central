/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

function run_test() {
  run_next_test();
}

add_task(function test_I__getBaseDomain()
{
  do_check_eq(iServiceObject._getBaseDomain("foo.bar.com"),"bar.com");
  do_check_eq(iServiceObject._getBaseDomain("bar.com"),"bar.com");
  do_check_eq(iServiceObject._getBaseDomain(1111),"");
  do_check_eq(iServiceObject._getBaseDomain(""),"");
  do_check_eq(iServiceObject._getBaseDomain(null),"");
});
