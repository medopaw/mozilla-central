/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");

add_task(function test_I_getRequestingHosts()
{
  yield addInterest("cars");
  yield addInterest("movies");
  yield addInterest("technology");
  let interestsStorage = yield iServiceObject.InterestsStoragePromise;

  // make a bunch of insertions for a number of days
  let now = Date.now();
  let today = interestsStorage._convertDateToDays(now);

  // add visit
  yield interestsStorage.addInterestHostVisit("technology", "technology.com", {visitTime: (now - MS_PER_DAY*0)});
  yield interestsStorage.addInterestHostVisit("cars", "cars.com", {visitTime: (now - MS_PER_DAY*1)});
  yield interestsStorage.addInterestHostVisit("movies", "movies.com", {visitTime: (now - MS_PER_DAY*2)});

  results = yield iServiceObject.getInterestsByNamespace("", {
    checkSharable: true,
    excludeMeta: true,
    interestLimit: 2,
    requestingHost: "foo.com",
  });

  results = yield iServiceObject.getInterestsByNames(["cars","movies","technology"], {
    checkSharable: true,
    excludeMeta: true,
    requestingHost: "bar.com",
  });

  yield iServiceObject.getRequestingHosts().then(results => {
    isIdentical(results,[
      {"name":"bar.com","interests":["cars","movies","technology"],"isBlocked":false,"isPrivileged":false},
      {"name":"foo.com","interests":["cars","movies"],"isBlocked":false,"isPrivileged":false}
    ]);
  });
});

