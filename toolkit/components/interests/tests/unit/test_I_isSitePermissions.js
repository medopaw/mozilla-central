/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

let domain = "example.com";

function run_test() {
  run_next_test();
}

add_task(function test_I_isSiteBlocked() {
    do_check_false(iServiceObject.isSiteBlocked(domain));
    Services.perms.add(NetUtil.newURI("http://" + domain),"interests",Services.perms.ALLOW_ACTION);
    do_check_false(iServiceObject.isSiteBlocked(domain));
    Services.perms.remove(domain,"interests");
    do_check_false(iServiceObject.isSiteBlocked(domain));
    Services.perms.add(NetUtil.newURI("http://" + domain),"interests",Services.perms.DENY_ACTION);
    do_check_true(iServiceObject.isSiteBlocked(domain));
});

add_task(function test_I_isSiteBlocked() {
    do_check_false(iServiceObject.isSiteEnabled(domain));
    Services.perms.add(NetUtil.newURI("http://" + domain),"interests",Services.perms.ALLOW_ACTION);
    do_check_true(iServiceObject.isSiteEnabled(domain));
    Services.perms.remove(domain,"interests");
    do_check_false(iServiceObject.isSiteEnabled(domain));
    Services.perms.add(NetUtil.newURI("http://" + domain),"interests",Services.perms.DENY_ACTION);
    do_check_false(iServiceObject.isSiteEnabled(domain));
});
