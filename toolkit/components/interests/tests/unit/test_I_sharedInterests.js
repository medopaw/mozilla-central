/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");

add_task(function test_I_sharedInterestsSetting()
{
  let interestsStorage = yield iServiceObject.InterestsStoragePromise;
  yield addInterest("cars");
  yield addInterest("movies");
  yield addInterest("technology");

  // make a bunch of insertions for a number of days
  let now = Date.now();
  let today = interestsStorage._convertDateToDays(now);

  // add visit
  yield interestsStorage.addInterestHostVisit("technology", "samsung.com", {visitTime: (now - MS_PER_DAY*0)});
  yield interestsStorage.addInterestHostVisit("cars", "cars.com", {visitTime: (now - MS_PER_DAY*1)});
  yield interestsStorage.addInterestHostVisit("movies", "netflix.com", {visitTime: (now - MS_PER_DAY*2)});

  // get top 2 visits, test result limiting
  results = yield iServiceObject.getInterestsByNamespace("", {
    checkSharable: true,
    excludeMeta: true,
    interestLimit: 2,
  });

  isIdentical(results,[
                        {"name":"cars",
                         "score":1,
                         "diversity":1,
                        },
                        {"name":"movies",
                         "score":1,
                         "diversity":1,
                        }
                      ]);

  // no shared interests should be found
  yield interestsStorage.getHostsForSharedInterests(["cars","movies"]).then(results => {
    do_check_eq(results.length,0);
  });

  // try out with requestingHost 
  results = yield iServiceObject.getInterestsByNamespace("", {
    checkSharable: true,
    excludeMeta: true,
    interestLimit: 2,
    requestingHost: "foo.com",
  });

  isIdentical(results,[
                        {"name":"cars",
                         "score":1,
                         "diversity":1,
                        },
                        {"name":"movies",
                         "score":1,
                         "diversity":1,
                        }
                      ]);


  // do it with another host
  results = yield iServiceObject.getInterestsByNames(["cars","movies","technology"], {
    checkSharable: true,
    excludeMeta: true,
    requestingHost: "bar.com",
  });

  yield interestsStorage.getPersonalizedHosts().then(results => {
    isIdentical(results,[
                          {"interest":"cars","host":"bar.com","day":today},
                          {"interest":"movies","host":"bar.com","day":today},
                          {"interest":"technology","host":"bar.com","day":today},
                          {"interest":"cars","host":"foo.com","day":today},
                          {"interest":"movies","host":"foo.com","day":today},
                        ]);
  });
});

