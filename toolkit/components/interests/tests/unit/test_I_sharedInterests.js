/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");

function run_test() {
  run_next_test();
}

add_task(function test_I_sharedInterestsSetting()
{
  yield addInterest("cars");
  yield addInterest("movies");
  yield addInterest("technology");

  // make a bunch of insertions for a number of days
  let now = Date.now();
  let today = InterestsStorage._convertDateToDays(now);

  // add visit
  yield InterestsStorage.addInterestHostVisit("technology", "samsung.com", {visitTime: (now - MS_PER_DAY*0), visitCount: 1});
  yield InterestsStorage.addInterestHostVisit("cars", "cars.com", {visitTime: (now - MS_PER_DAY*1), visitCount: 3});
  yield InterestsStorage.addInterestHostVisit("movies", "netflix.com", {visitTime: (now - MS_PER_DAY*2), visitCount: 3});

  // get top 2 visits, test result limiting
  results = yield iServiceObject.getInterestsByNamespace("", {
    checkSharable: true,
    excludeMeta: true,
    interestLimit: 2,
  });

  isIdentical(results,[
                        {"name":"cars",
                         "score":2.896551724137931,
                         "diversity":1,
                        },
                        {"name":"movies",
                         "score":2.793103448275862,
                         "diversity":1,
                        }
                      ]);

  // no shared interests should be found
  yield InterestsStorage.getHostsForSharedInterests(["cars","movies"]).then(results => {
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
                         "score":2.896551724137931,
                         "diversity":1,
                        },
                        {"name":"movies",
                         "score":2.793103448275862,
                         "diversity":1,
                        }
                      ]);


  // do it with another host
  results = yield iServiceObject.getInterestsByNames(["cars","movies","technology"], {
    checkSharable: true,
    excludeMeta: true,
    requestingHost: "bar.com",
  });

  yield InterestsStorage.getPersonalizedHosts().then(results => {
    //dump( JSON.stringify(results)  + " <<<<\n");
    isIdentical(results,[
                          {"interest":"cars","host":"bar.com","day":today},
                          {"interest":"movies","host":"bar.com","day":today},
                          {"interest":"technology","host":"bar.com","day":today},
                          {"interest":"cars","host":"foo.com","day":today},
                          {"interest":"movies","host":"foo.com","day":today},
                        ]);
  });
});

